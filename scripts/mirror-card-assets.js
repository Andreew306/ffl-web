const crypto = require("crypto")
const fs = require("fs/promises")
const path = require("path")
const mongoose = require("mongoose")
const sharp = require("sharp")

const OUTPUT_ROOT = path.join(process.cwd(), "public", "card-assets")
const CONCURRENCY = 6

function imageUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim()) ? value.trim() : ""
}

function kitUrl(kit) {
  if (typeof kit === "string") return imageUrl(kit)
  if (!kit || typeof kit !== "object") return ""
  return imageUrl(kit.image) || imageUrl(kit.imageUrl) || imageUrl(kit.url) || imageUrl(kit.src)
}

function assetName(url) {
  return `${crypto.createHash("sha256").update(url).digest("hex").slice(0, 24)}.png`
}

async function downloadPng(url) {
  let lastError
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "User-Agent": "FFL-Asset-Mirror/1.0",
        },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const input = Buffer.from(await response.arrayBuffer())
      return await sharp(input, { density: 384 }).png().toBuffer()
    } catch (error) {
      lastError = error
      if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, attempt * 750))
    } finally {
      clearTimeout(timeout)
    }
  }
  throw lastError
}

async function mapLimit(items, limit, worker) {
  let nextIndex = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      await worker(items[index], index)
    }
  })
  await Promise.all(workers)
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required")
  await mongoose.connect(process.env.MONGODB_URI)
  const db = mongoose.connection.db
  const teams = await db.collection("teams").find({}).project({ image: 1 }).toArray()
  const teamCompetitions = await db.collection("teamcompetitions").find({}).project({ kits: 1 }).toArray()

  const assets = new Map()
  for (const team of teams) {
    const url = imageUrl(team.image)
    if (url) assets.set(url, "crests")
  }
  for (const row of teamCompetitions) {
    for (const kit of row.kits || []) {
      const url = kitUrl(kit)
      if (url && !assets.has(url)) assets.set(url, "kits")
    }
  }

  await fs.mkdir(path.join(OUTPUT_ROOT, "crests"), { recursive: true })
  await fs.mkdir(path.join(OUTPUT_ROOT, "kits"), { recursive: true })

  const entries = [...assets].map(([url, category]) => ({ url, category }))
  const manifest = {}
  const failures = []
  let completed = 0
  await mapLimit(entries, CONCURRENCY, async ({ url, category }) => {
    const relativePath = `/card-assets/${category}/${assetName(url)}`
    const outputPath = path.join(process.cwd(), "public", relativePath.slice(1))
    try {
      const png = await downloadPng(url)
      await fs.writeFile(outputPath, png)
      manifest[url] = relativePath
    } catch (error) {
      failures.push({ url, error: error?.message || String(error) })
    }
    completed += 1
    if (completed % 25 === 0 || completed === entries.length) {
      process.stderr.write(`Mirrored ${completed}/${entries.length}\n`)
    }
  })

  const sortedManifest = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)))
  await fs.writeFile(path.join(OUTPUT_ROOT, "manifest.json"), `${JSON.stringify(sortedManifest, null, 2)}\n`)

  const files = await Promise.all(
    Object.values(sortedManifest).map(async (relativePath) => {
      const stat = await fs.stat(path.join(process.cwd(), "public", relativePath.slice(1)))
      return stat.size
    }),
  )
  console.log(JSON.stringify({
    discovered: entries.length,
    mirrored: Object.keys(sortedManifest).length,
    failed: failures.length,
    failures,
    mebibytes: Number((files.reduce((sum, size) => sum + size, 0) / 1024 / 1024).toFixed(2)),
  }, null, 2))
  await mongoose.disconnect()
  if (failures.length) process.exitCode = 1
}

main().catch(async (error) => {
  console.error(error)
  await mongoose.disconnect()
  process.exit(1)
})

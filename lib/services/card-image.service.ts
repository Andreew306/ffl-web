import fs from "fs/promises"
import path from "path"
import { pathToFileURL } from "url"
import type { GeneratedCardData } from "@/lib/services/card-rating.service"
import sharp from "sharp"

const opentype = require("opentype.js")

const DESIGN_WIDTH = 670
const DESIGN_HEIGHT = 1080
const CARD_WIDTH = 1191
const CARD_HEIGHT = 1921
const OVR_CENTER = { x: 595, y: 193 }
const CREST_CENTER = { x: 304, y: 277 }
const FLAG_CENTER = { x: 886, y: 277 }
const CREST_BADGE_SIZE = 154
const FLAG_BADGE_SIZE = 158
const STAT_VALUE_CENTERS = [159, 449, 739, 1029] as const
const NAME_CENTER = { x: 432, y: 1248 }
const POSITION_CENTER = { x: 1010, y: 1248 }
const TEMPLATE_PATH = path.join(process.cwd(), "public", "card-templates", "base.png")
const FONT_PATHS = [
  path.join(process.cwd(), "public", "fonts", "Azonix.otf"),
  path.join(process.cwd(), "public", "fonts", "Azonix.ttf"),
]

let azonixFontPromise: Promise<any | null> | null = null

function sx(value: number) {
  return Math.round((value / DESIGN_WIDTH) * CARD_WIDTH)
}

function sy(value: number) {
  return Math.round((value / DESIGN_HEIGHT) * CARD_HEIGHT)
}

function ss(value: number) {
  return Math.round((value / DESIGN_WIDTH) * CARD_WIDTH)
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function countryCode(country: string) {
  const value = country.trim()
  if (/^[a-zA-Z]{2}$/.test(value)) return value.toLowerCase()

  const codePoints = [...value].map((character) => character.codePointAt(0) ?? 0)
  if (codePoints.length === 2 && codePoints.every((point) => point >= 0x1f1e6 && point <= 0x1f1ff)) {
    return codePoints.map((point) => String.fromCharCode(point - 0x1f1e6 + 97)).join("")
  }

  return ""
}

function isImageUrl(value?: string) {
  return Boolean(value && /^https?:\/\//i.test(value.trim()))
}

function isEmojiLike(value?: string) {
  return Boolean(value && /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u.test(value))
}

function twemojiCode(value: string, stripVariationSelectors = false) {
  return Array.from(value.trim())
    .filter((character) => !stripVariationSelectors || character.codePointAt(0) !== 0xfe0f)
    .map((character) => character.codePointAt(0)?.toString(16))
    .filter(Boolean)
    .join("-")
}

function twemojiUrls(emoji: string) {
  const fullCode = twemojiCode(emoji)
  const strippedCode = twemojiCode(emoji, true)
  return Array.from(new Set([fullCode, strippedCode].filter(Boolean))).map(
    (code) => `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${code}.svg`,
  )
}

type ImageDataUriOptions = {
  width?: number
  height?: number
  fit?: keyof sharp.FitEnum
  trim?: boolean
  sharpen?: boolean
}

async function fetchImageBuffer(url?: string) {
  if (!isImageUrl(url)) return null

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const response = await fetch(url!.trim(), { signal: controller.signal, cache: "no-store" })
    clearTimeout(timeout)

    if (!response.ok) return null

    const buffer = Buffer.from(await response.arrayBuffer())
    const contentType = response.headers.get("content-type") || "image/png"
    return { buffer, contentType }
  } catch {
    return null
  }
}

function bufferToDataUri(buffer: Buffer, contentType = "image/png") {
  return `data:${contentType};base64,${buffer.toString("base64")}`
}

async function imageToDataUri(url?: string, options: ImageDataUriOptions = {}) {
  const image = await fetchImageBuffer(url)
  if (!image) return ""

  try {
    const { buffer, contentType } = image

    if (contentType.includes("svg") && !options.width && !options.height && !options.trim) {
      return bufferToDataUri(buffer, contentType)
    }

    let pipeline = sharp(buffer, { density: 384 })
    if (options.trim) {
      pipeline = pipeline.trim({ threshold: 8 })
    }
    if (options.width || options.height) {
      pipeline = pipeline.resize(options.width, options.height, {
        fit: options.fit ?? "contain",
        position: "center",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: sharp.kernel.lanczos3,
      })
    }
    if (options.sharpen) {
      pipeline = pipeline.sharpen({ sigma: 0.8, m1: 0.7, m2: 1.1 })
    }

    const normalized = await pipeline.png().toBuffer()
    return bufferToDataUri(normalized)
  } catch {
    return ""
  }
}

async function firstImageToDataUri(urls: string[], options: ImageDataUriOptions = {}) {
  for (const url of urls) {
    const image = await imageToDataUri(url, options)
    if (image) return image
  }
  return ""
}

async function circularImageToDataUri(
  url: string | undefined,
  size: number,
  options: { fit?: keyof sharp.FitEnum; trim?: boolean; innerScale?: number; sharpen?: boolean } = {},
) {
  const image = await fetchImageBuffer(url)
  if (!image) return ""

  try {
    const innerSize = Math.round(size * (options.innerScale ?? 1))
    let subject = sharp(image.buffer, { density: 512 })

    if (options.trim) {
      subject = subject.trim({ threshold: 8 })
    }

    const subjectBuffer = await subject
      .resize(innerSize, innerSize, {
        fit: options.fit ?? "contain",
        position: "center",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: sharp.kernel.lanczos3,
      })
      .extend({
        top: Math.floor((size - innerSize) / 2),
        bottom: Math.ceil((size - innerSize) / 2),
        left: Math.floor((size - innerSize) / 2),
        right: Math.ceil((size - innerSize) / 2),
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .resize(size, size, { fit: "fill", kernel: sharp.kernel.lanczos3 })
      .png()
      .toBuffer()

    const mask = Buffer.from(
      `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/>
      </svg>`,
    )

    let output = sharp(subjectBuffer)
      .composite([{ input: mask, blend: "dest-in" }])

    if (options.sharpen) {
      output = output.sharpen({ sigma: 0.7, m1: 0.5, m2: 1 })
    }

    return bufferToDataUri(await output.png().toBuffer())
  } catch {
    return ""
  }
}

function fitText(text: string, maxChars: number) {
  if (text.length <= maxChars) return text
  return `${text.slice(0, Math.max(1, maxChars - 1))}.`
}

function textAvatar(avatar: string | undefined) {
  const value = avatar?.trim()
  if (value && !isImageUrl(value)) return value
  return ""
}

function avatarTextBox(text: string) {
  const fontSize = ss(text.length <= 2 ? 150 : 112)
  return `<text x="${sx(335)}" y="${sy(408)}"
    text-anchor="middle"
    dominant-baseline="central"
    font-family="Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, Segoe UI Symbol, Noto Sans Symbols, Arial Unicode MS, Arial, sans-serif"
    font-size="${fontSize}"
    fill="#ffffff">${escapeXml(text)}</text>`
}

function avatarTextMarkup(text: string) {
  if (/^[\x20-\x7E]+$/.test(text)) {
    return azonixText(text, sx(335), sy(463), ss(text.length <= 2 ? 150 : 112), "#ffffff", "middle")
  }
  return avatarTextBox(text)
}

function statValue(value: number, centerX: number) {
  return azonixTextBox(String(value), centerX, sy(885), ss(35), "#f9fffb")
}

async function readTemplate() {
  try {
    return await fs.readFile(TEMPLATE_PATH)
  } catch {
    throw new Error(`Card template not found. Put the clean template PNG at ${TEMPLATE_PATH}.`)
  }
}

async function azonixFontFace() {
  for (const fontPath of FONT_PATHS) {
    try {
      await fs.access(fontPath)
      const format = fontPath.toLowerCase().endsWith(".ttf") ? "truetype" : "opentype"
      return `@font-face { font-family: 'Azonix'; src: url('${pathToFileURL(fontPath).href}') format('${format}'); font-weight: normal; font-style: normal; }`
    } catch {}
  }

  return ""
}

async function loadAzonixFont() {
  if (!azonixFontPromise) {
    azonixFontPromise = (async () => {
      for (const fontPath of FONT_PATHS) {
        try {
          const fontBuffer = await fs.readFile(fontPath)
          const arrayBuffer = fontBuffer.buffer.slice(
            fontBuffer.byteOffset,
            fontBuffer.byteOffset + fontBuffer.byteLength,
          )
          return opentype.parse(arrayBuffer)
        } catch {}
      }
      return null
    })()
  }

  return azonixFontPromise
}

let currentAzonixFont: any = null

function azonixText(
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fill: string,
  anchor: "start" | "middle" = "start",
) {
  const font = currentAzonixFont
  if (!font) {
    return `<text x="${x}" y="${y}" text-anchor="${anchor}" class="azonix" font-size="${fontSize}" fill="${fill}">${escapeXml(text)}</text>`
  }

  const width = font.getAdvanceWidth(text, fontSize)
  const startX = anchor === "middle" ? x - width / 2 : x
  const pathData = font.getPath(text, startX, y, fontSize).toPathData(2)
  return `<path d="${pathData}" fill="${fill}"/>`
}

function azonixTextBox(text: string, centerX: number, centerY: number, fontSize: number, fill: string) {
  const font = currentAzonixFont
  if (!font) {
    return `<text x="${centerX}" y="${centerY}" text-anchor="middle" dominant-baseline="central" class="azonix" font-size="${fontSize}" fill="${fill}">${escapeXml(text)}</text>`
  }

  const probe = font.getPath(text, 0, 0, fontSize)
  const box = probe.getBoundingBox()
  const offsetX = centerX - (box.x1 + box.x2) / 2
  const offsetY = centerY - (box.y1 + box.y2) / 2
  const pathData = font.getPath(text, offsetX, offsetY, fontSize).toPathData(2)
  return `<path d="${pathData}" fill="${fill}"/>`
}

export async function renderPlayerCardOverlaySvg(card: GeneratedCardData) {
  const code = countryCode(card.player.country)
  const avatarIsEmoji = isEmojiLike(card.player.avatar) && !isImageUrl(card.player.avatar)
  const [avatarImage, crest, kitBadge, flag] = await Promise.all([
    avatarIsEmoji
      ? firstImageToDataUri(twemojiUrls(card.player.avatar || ""))
      : imageToDataUri(card.player.avatar, { width: sx(352), height: sx(352), fit: "cover" }),
    imageToDataUri(card.team.image, {
      width: CREST_BADGE_SIZE,
      height: CREST_BADGE_SIZE,
      fit: "contain",
      trim: true,
      sharpen: true,
    }),
    imageToDataUri(card.team.kit, {
      width: CREST_BADGE_SIZE,
      height: CREST_BADGE_SIZE,
      fit: "contain",
      trim: true,
      sharpen: true,
    }),
    circularImageToDataUri(code ? `https://flagcdn.com/w640/${code}.png` : "", FLAG_BADGE_SIZE, { fit: "cover" }),
  ])
  const name = fitText(card.player.name.toUpperCase(), 16)
  const position = card.position.toUpperCase()
  const avatarText = textAvatar(card.player.avatar)
  const rating = card.rating
  const fontFace = await azonixFontFace()
  currentAzonixFont = await loadAzonixFont()

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
  <defs>
    <style>
      ${fontFace}
      .azonix { font-family: Azonix, Orbitron, Eurostile, "Arial Black", Arial, sans-serif; font-weight: 400; }
      .statLabel { font-family: Azonix, Orbitron, Eurostile, "Arial Black", Arial, sans-serif; font-size: ${ss(34)}px; font-weight: 400; fill: #050607; }
      .statValue { font-family: Azonix, Orbitron, Eurostile, "Arial Black", Arial, sans-serif; font-size: ${ss(35)}px; font-weight: 400; fill: #f9fffb; }
    </style>
    <clipPath id="avatarClip"><circle cx="${sx(335)}" cy="${sy(408)}" r="${ss(176)}"/></clipPath>
  </defs>

  ${azonixTextBox(String(rating.ovr), OVR_CENTER.x, OVR_CENTER.y, ss(65), "#f9fffb")}

  ${
    crest || kitBadge
      ? `<image href="${crest || kitBadge}" x="${CREST_CENTER.x - CREST_BADGE_SIZE / 2}" y="${CREST_CENTER.y - CREST_BADGE_SIZE / 2}" width="${CREST_BADGE_SIZE}" height="${CREST_BADGE_SIZE}" preserveAspectRatio="xMidYMid meet"/>`
      : `${azonixText("FC", CREST_CENTER.x, CREST_CENTER.y + ss(8), ss(24), "#111", "middle")}`
  }

  ${
    flag
      ? `<image href="${flag}" x="${FLAG_CENTER.x - FLAG_BADGE_SIZE / 2}" y="${FLAG_CENTER.y - FLAG_BADGE_SIZE / 2}" width="${FLAG_BADGE_SIZE}" height="${FLAG_BADGE_SIZE}" preserveAspectRatio="xMidYMid meet"/>`
      : `${azonixText(card.player.country, FLAG_CENTER.x, FLAG_CENTER.y + ss(8), ss(22), "#111", "middle")}`
  }

  ${
    avatarImage
      ? avatarIsEmoji
        ? `<image href="${avatarImage}" x="${sx(229)}" y="${sy(309)}" width="${ss(212)}" height="${ss(212)}" preserveAspectRatio="xMidYMid meet"/>`
        : `<image href="${avatarImage}" x="${sx(159)}" y="${sy(222)}" width="${ss(352)}" height="${ss(352)}" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid meet"/>`
      : avatarText
        ? avatarTextMarkup(avatarText)
        : ""
  }

  ${azonixTextBox(name, NAME_CENTER.x, NAME_CENTER.y, ss(35), "#151515")}
  ${azonixTextBox(position, POSITION_CENTER.x, POSITION_CENTER.y, ss(40), "#ffffff")}

  ${statValue(rating.sho, STAT_VALUE_CENTERS[0])}
  ${statValue(rating.pas, STAT_VALUE_CENTERS[1])}
  ${statValue(rating.def, STAT_VALUE_CENTERS[2])}
  ${statValue(rating.dri, STAT_VALUE_CENTERS[3])}
</svg>`
}

export async function renderPlayerCardPng(card: GeneratedCardData) {
  const template = await readTemplate()
  const overlay = await renderPlayerCardOverlaySvg(card)

  return sharp(template)
    .resize(CARD_WIDTH, CARD_HEIGHT, { fit: "fill" })
    .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
    .png()
    .toBuffer()
}

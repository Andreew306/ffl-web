import fs from "fs/promises"
import path from "path"
import { pathToFileURL } from "url"
import type { GeneratedCardData } from "@/lib/services/card-rating.service"
import cardAssetManifest from "@/public/card-assets/manifest.json"
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
const KIT_BACKGROUND_SIZE = 444
const KIT_CENTER_Y = 413
const STAT_VALUE_CENTERS = [159, 449, 739, 1029] as const
const NAME_CENTER = { x: 432, y: 1248 }
const POSITION_CENTER = { x: 1010, y: 1248 }
const SEER_AVATAR_PATH = "M579.98 851.76Q574.11 851.76 568.77 851.09Q563.43 850.42 558.09 848.82L563.16 832.27Q569.03 834.13 579.45 834.13Q592.80 834.13 600.27 826.26Q607.75 818.38 607.75 804.76Q607.75 795.42 605.61 784.61Q603.48 773.79 598 758.97Q592.53 744.16 582.38 722.53Q572.24 700.90 566.63 685.68Q561.02 670.46 558.75 659.52Q556.48 648.57 556.48 639.49Q556.48 622.67 566.10 611.46Q575.71 600.24 594.40 600.24Q614.96 600.24 625.24 616.40Q635.52 632.55 635.52 660.32L618.16 660.32Q618.16 639.23 612.02 628.28Q605.88 617.33 594.40 617.33Q585.05 617.33 579.58 623.61Q574.11 629.88 574.11 639.49Q574.11 650.44 578.11 664.32Q582.12 678.21 587.86 691.56Q593.60 704.91 598.14 714.79Q612.82 746.02 619.10 767.25Q625.37 788.48 625.37 804.76Q625.37 827.46 613.76 839.61Q602.14 851.76 579.98 851.76"
const SPECIAL_AVATAR_PATHS: Record<string, string> = {
  "\u275B\u275C": "M512.84 817.14Q484.35 817.14 465.18 797.58Q446 778.03 446 741.19Q446 719.54 453.41 700.75Q460.81 681.95 473.72 667.71Q486.63 653.47 502.96 646.25Q528.03 634.86 576.63 634.86L576.63 644.73Q527.65 644.73 505.81 660.68Q483.97 676.63 483.97 705.49Q487.01 701.32 497.84 698.09Q508.66 694.86 520.43 694.86Q537.14 694.86 549.67 702.84Q562.20 710.81 569.42 724.29Q576.63 737.77 576.63 754.10Q576.63 781.44 559.35 799.29Q542.08 817.14 512.84 817.14M615.37 817.14L615.37 807.27L628.28 806.89Q647.27 806.89 667.01 800.62Q686.76 794.35 697.39 780.68Q708.03 766.63 708.03 746.51Q704.23 751.06 693.78 754.10Q683.34 757.14 671.57 757.14Q655.24 757.14 642.52 749.16Q629.80 741.19 622.58 727.71Q615.37 714.23 615.37 697.90Q615.37 670.18 632.84 652.52Q650.30 634.86 679.16 634.86Q698.15 634.86 713.34 643.78Q728.53 652.71 737.27 669.61Q746 686.51 746 710.81Q746 734.73 736.70 755.81Q727.39 776.89 711.82 790.94Q701.57 800.05 689.04 805.94Q676.51 811.82 658.85 814.48Q641.19 817.14 615.37 817.14",
  "\u271E": "M626.06 851L580.10 851L565.94 835.39L565.94 723.83L520.86 723.83L506.69 708.23L506.69 663.72L565.94 663.72L565.94 601L611.03 601L626.06 618.34L626.06 663.72L670.28 663.72L685.31 681.06L685.31 723.83L626.06 723.83L626.06 851M576.35 698.40L576.35 825.57L600.62 825.57L600.62 698.40L659.87 698.40L659.87 674.12L600.62 674.12L600.62 610.83L576.35 610.83L576.35 674.12L517.10 674.12L517.10 698.40",
  "\u035B\u035D": "M459.57 719.72L484.49 719.72L477.60 744.03L467.27 744.03L470.92 730.46L446 730.46L452.89 706.15L463.22 706.15L459.57 719.72M668.62 745.85Q639.25 745.85 618.79 736.23Q598.33 726.61 589.82 707.77L604 707.77Q611.09 718.71 626.89 724.99Q642.69 731.27 668.42 731.27Q690.09 731.27 706.80 725.70Q723.52 720.13 731.82 707.77L746 707.77Q735.67 728.03 715.31 736.94Q694.95 745.85 668.62 745.85",
  "\u275E": "M456.06 835.76L446.91 822.95Q458.80 822.95 476.18 818.61Q493.56 814.26 511.17 805.34Q528.77 796.43 540.21 783.62Q557.59 764.87 557.59 750.70Q553.01 755.73 540.44 759.61Q527.86 763.50 513.68 763.50Q494.02 763.50 478.70 753.90Q463.38 744.29 454.69 728.06Q446 711.82 446 692.16Q446 658.77 467.04 637.51Q488.07 616.24 522.83 616.24Q547.07 616.24 566.05 628.13Q585.02 640.02 594.17 661.06Q602.86 640.02 621.15 628.13Q639.45 616.24 665.51 616.24Q688.38 616.24 706.67 626.99Q724.96 637.74 735.48 658.09Q746 678.44 746 707.71Q746 731.03 735.94 753.21Q725.88 775.39 708.27 793Q690.66 810.60 667.34 820.66Q632.59 835.76 598.74 835.76L589.60 822.95Q601.49 822.95 618.87 818.61Q636.24 814.26 653.85 805.34Q671.46 796.43 682.89 783.62Q700.27 764.87 700.27 750.70Q695.70 755.73 683.12 759.61Q670.54 763.50 656.37 763.50Q619.78 763.50 600.57 733.32Q593.26 763.50 570.85 787.74Q548.44 811.98 516.88 823.87Q484.87 835.76 456.06 835.76",
}
const COMMON_TEMPLATE_PATH = path.join(process.cwd(), "public", "card-templates", "base_comun.png")
const SHINY_TEMPLATE_PATH = path.join(process.cwd(), "public", "card-templates", "base_brillante.png")
const FONT_PATHS = [
  path.join(process.cwd(), "public", "fonts", "Azonix.otf"),
  path.join(process.cwd(), "public", "fonts", "Azonix.ttf"),
]
const SYMBOL_FONT_PATH = path.join(process.cwd(), "public", "fonts", "NotoSansMath-Regular.ttf")

let azonixFontPromise: Promise<any | null> | null = null
let symbolFontPromise: Promise<any | null> | null = null

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

const localCardAssets = cardAssetManifest as Record<string, string>

async function localImageBuffer(url?: string) {
  if (!url) return null
  const relativePath = localCardAssets[url.trim()]
  if (!relativePath) return null

  try {
    const buffer = await fs.readFile(path.join(process.cwd(), "public", relativePath.replace(/^\/+/, "")))
    return { buffer, contentType: "image/png" }
  } catch {
    return null
  }
}

async function fetchImageBuffer(url?: string) {
  if (!isImageUrl(url)) return null

  const localImage = await localImageBuffer(url)
  if (localImage) return localImage

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)

    try {
      const response = await fetch(url!.trim(), {
        signal: controller.signal,
        cache: "force-cache",
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "User-Agent": "FFL-Card-Renderer/1.0",
        },
      })

      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer())
        const contentType = response.headers.get("content-type") || "image/png"
        return { buffer, contentType }
      }
    } catch {
      // Retry transient image-host or network failures.
    } finally {
      clearTimeout(timeout)
    }
  }

  return null
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

function avatarTextBox(text: string, fill: string) {
  const fontSize = ss(text.length <= 2 ? 150 : 112)
  return `<text x="${sx(335)}" y="${sy(408)}"
    text-anchor="middle"
    dominant-baseline="central"
    font-family="Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, Segoe UI Symbol, Noto Sans Symbols, Arial Unicode MS, Arial, sans-serif"
    font-size="${fontSize}"
    fill="${fill}">${escapeXml(text)}</text>`
}

function fontSupportsText(font: any, text: string) {
  if (!font) return false
  return Array.from(text).every((character) => {
    const glyph = font.charToGlyph(character)
    return glyph && glyph.index !== 0 && glyph.name !== ".notdef"
  })
}

function avatarTextMarkup(text: string, fill: string) {
  const specialPath = text === "\u27C6" ? SEER_AVATAR_PATH : SPECIAL_AVATAR_PATHS[text]
  if (specialPath) return `<path d="${specialPath}" fill="${fill}"/>`
  if (text === "\u2077") return azonixTextBox("7", sx(335), sy(408), ss(150), fill)
  if (text === "\u2080\u2088") return azonixTextBox("08", sx(335), sy(408), ss(112), fill)
  if (text === "\u2083\u2080") return azonixTextBox("30", sx(335), sy(408), ss(112), fill)
  if (text === "\u271F\u2E38") {
    return `<path d="M470 610H520V675H570V725H520V845H470V725H420V675H470ZM650 610H700V675H750V715H700V755H750V795H700V845H650V795H600V755H650V715H600V675H650Z" fill="${fill}"/>`
  }
  if (/^[\x20-\x7E]+$/.test(text) && fontSupportsText(currentAzonixFont, text)) {
    return azonixText(text, sx(335), sy(463), ss(text.length <= 2 ? 150 : 112), fill, "middle")
  }
  if (fontSupportsText(currentSymbolFont, text)) {
    return fontTextBox(currentSymbolFont, text, sx(335), sy(408), ss(text.length <= 2 ? 150 : 112), fill)
  }
  return avatarTextBox(text, fill)
}

function statValue(value: number, centerX: number) {
  return azonixTextBox(String(value), centerX, sy(885), ss(35), "#f9fffb")
}

async function readTemplate(ovr: number) {
  const templatePath = ovr >= 81 ? SHINY_TEMPLATE_PATH : COMMON_TEMPLATE_PATH
  try {
    return await fs.readFile(templatePath)
  } catch {
    throw new Error(`Card template not found. Put the clean template PNG at ${templatePath}.`)
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

async function loadSymbolFont() {
  if (!symbolFontPromise) {
    symbolFontPromise = (async () => {
      try {
        const fontBuffer = await fs.readFile(SYMBOL_FONT_PATH)
        const arrayBuffer = fontBuffer.buffer.slice(
          fontBuffer.byteOffset,
          fontBuffer.byteOffset + fontBuffer.byteLength,
        )
        return opentype.parse(arrayBuffer)
      } catch (error) {
        console.error("Failed to load the bundled Unicode card font.", error)
        return null
      }
    })()
  }

  return symbolFontPromise
}

let currentAzonixFont: any = null
let currentSymbolFont: any = null

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

function fontTextBox(font: any, text: string, centerX: number, centerY: number, fontSize: number, fill: string) {
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
  const [avatarImage, crest, kitBackground, flag] = await Promise.all([
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
      width: ss(KIT_BACKGROUND_SIZE),
      height: ss(KIT_BACKGROUND_SIZE),
      fit: "cover",
      trim: true,
      sharpen: true,
    }),
    circularImageToDataUri(code ? `https://flagcdn.com/w640/${code}.png` : "", FLAG_BADGE_SIZE, { fit: "cover" }),
  ])
  const name = fitText(card.player.name.toUpperCase(), 16)
  const position = card.position.toUpperCase()
  const avatarText = textAvatar(card.player.avatar)
  const avatarTextColor = card.team.kitColor || "#ffffff"
  const rating = card.rating
  const fontFace = await azonixFontFace()
  ;[currentAzonixFont, currentSymbolFont] = await Promise.all([loadAzonixFont(), loadSymbolFont()])
  const fixedAvatarMarkup = avatarText ? avatarTextMarkup(avatarText, avatarTextColor) : ""

  if (!card.team.image) {
    throw new Error(`No team crest is available for ${card.team.name || card.player.name}.`)
  }
  if (!card.team.kit) {
    throw new Error(`No team kit is available for ${card.team.name || card.player.name}.`)
  }
  if (!crest) {
    throw new Error(`Could not download the team crest for ${card.team.name || card.player.name}.`)
  }
  if (!kitBackground) {
    throw new Error(`Could not download the team kit for ${card.team.name || card.player.name}.`)
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
  <defs>
    <style>
      ${fontFace}
      .azonix { font-family: Azonix, Orbitron, Eurostile, "Arial Black", Arial, sans-serif; font-weight: 400; }
      .statLabel { font-family: Azonix, Orbitron, Eurostile, "Arial Black", Arial, sans-serif; font-size: ${ss(34)}px; font-weight: 400; fill: #050607; }
      .statValue { font-family: Azonix, Orbitron, Eurostile, "Arial Black", Arial, sans-serif; font-size: ${ss(35)}px; font-weight: 400; fill: #f9fffb; }
    </style>
    <clipPath id="kitClip"><circle cx="${sx(335)}" cy="${sy(KIT_CENTER_Y)}" r="${ss(195)}"/></clipPath>
    <clipPath id="avatarClip"><circle cx="${sx(335)}" cy="${sy(408)}" r="${ss(176)}"/></clipPath>
  </defs>

  ${azonixTextBox(String(rating.ovr), OVR_CENTER.x, OVR_CENTER.y, ss(65), "#f9fffb")}

  ${
    crest
      ? `<image href="${crest}" x="${CREST_CENTER.x - CREST_BADGE_SIZE / 2}" y="${CREST_CENTER.y - CREST_BADGE_SIZE / 2}" width="${CREST_BADGE_SIZE}" height="${CREST_BADGE_SIZE}" preserveAspectRatio="xMidYMid meet"/>`
      : `${azonixText("FC", CREST_CENTER.x, CREST_CENTER.y + ss(8), ss(24), "#111", "middle")}`
  }

  ${
    kitBackground
      ? `<image href="${kitBackground}" x="${sx(335) - ss(KIT_BACKGROUND_SIZE) / 2}" y="${sy(KIT_CENTER_Y) - ss(KIT_BACKGROUND_SIZE) / 2}" width="${ss(KIT_BACKGROUND_SIZE)}" height="${ss(KIT_BACKGROUND_SIZE)}" clip-path="url(#kitClip)" preserveAspectRatio="xMidYMid slice"/>`
      : ""
  }

  ${
    flag
      ? `<image href="${flag}" x="${FLAG_CENTER.x - FLAG_BADGE_SIZE / 2}" y="${FLAG_CENTER.y - FLAG_BADGE_SIZE / 2}" width="${FLAG_BADGE_SIZE}" height="${FLAG_BADGE_SIZE}" preserveAspectRatio="xMidYMid meet"/>`
      : `${azonixText(card.player.country, FLAG_CENTER.x, FLAG_CENTER.y + ss(8), ss(22), "#111", "middle")}`
  }

  ${
    fixedAvatarMarkup && (avatarText === "\u27C6" || avatarText in SPECIAL_AVATAR_PATHS || ["\u2077", "\u2080\u2088", "\u2083\u2080", "\u271F\u2E38"].includes(avatarText))
      ? fixedAvatarMarkup
      : avatarImage
      ? avatarIsEmoji
        ? `<image href="${avatarImage}" x="${sx(229)}" y="${sy(309)}" width="${ss(212)}" height="${ss(212)}" preserveAspectRatio="xMidYMid meet"/>`
        : `<image href="${avatarImage}" x="${sx(159)}" y="${sy(222)}" width="${ss(352)}" height="${ss(352)}" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid meet"/>`
      : avatarText
        ? avatarTextMarkup(avatarText, avatarTextColor)
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
  const template = await readTemplate(card.rating.ovr)
  const overlay = await renderPlayerCardOverlaySvg(card)

  return sharp(template)
    .resize(CARD_WIDTH, CARD_HEIGHT, { fit: "fill" })
    .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
    .png()
    .toBuffer()
}

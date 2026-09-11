import type { GeneratedCardData } from "@/lib/services/card-rating.service"
import sharp from "sharp"

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function countryToFlagEmoji(country: string) {
  const code = country.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return country
  return [...code].map((char) => String.fromCodePoint(127397 + char.charCodeAt(0))).join("")
}

async function imageToDataUri(url?: string) {
  if (!url || !/^https?:\/\//i.test(url)) return ""

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" })
    clearTimeout(timeout)

    if (!response.ok) return ""

    const contentType = response.headers.get("content-type") || "image/png"
    const buffer = Buffer.from(await response.arrayBuffer())
    return `data:${contentType};base64,${buffer.toString("base64")}`
  } catch {
    return ""
  }
}

function stat(label: string, value: number, x: number, y: number) {
  return `
    <text x="${x}" y="${y}" font-size="30" font-weight="900" fill="#111827">${label}</text>
    <text x="${x + 110}" y="${y}" font-size="42" font-weight="900" fill="#047a22">${value}</text>
    <line x1="${x + 100}" y1="${y + 25}" x2="${x + 205}" y2="${y + 25}" stroke="#16c843" stroke-width="4"/>
  `
}

export async function renderPlayerCardSvg(card: GeneratedCardData) {
  const avatar = await imageToDataUri(card.player.avatar)
  const crest = await imageToDataUri(card.team.image)
  const flag = countryToFlagEmoji(card.player.country)
  const name = escapeXml(card.player.name.toUpperCase())
  const position = escapeXml(card.position.toUpperCase())
  const rating = card.rating

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="760" height="1060" viewBox="0 0 760 1060">
  <defs>
    <linearGradient id="green" x1="0%" y1="10%" x2="100%" y2="80%">
      <stop offset="0%" stop-color="#053f17"/>
      <stop offset="52%" stop-color="#19bd34"/>
      <stop offset="100%" stop-color="#91ee75"/>
    </linearGradient>
    <linearGradient id="darkCut" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#052b10"/>
      <stop offset="100%" stop-color="#011f0a"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <clipPath id="avatarClip">
      <circle cx="380" cy="430" r="170"/>
    </clipPath>
  </defs>

  <rect width="760" height="1060" fill="#080b10"/>
  <path d="M380 24 C510 24 607 55 618 78 C623 129 672 138 704 138 L704 820 C704 910 642 943 548 953 C477 960 427 983 380 1032 C333 983 283 960 212 953 C118 943 56 910 56 820 L56 138 C88 138 137 129 142 78 C153 55 250 24 380 24 Z"
    fill="url(#green)" stroke="#dfffea" stroke-width="8" filter="url(#glow)"/>
  <path d="M380 43 C500 43 586 69 598 91 C606 142 653 157 684 158 L684 508 L603 590 L684 590 L684 802 C684 882 633 910 541 921 C468 929 422 955 380 996 C338 955 292 929 219 921 C127 910 76 882 76 802 L76 158 C107 157 154 142 162 91 C174 69 260 43 380 43 Z"
    fill="none" stroke="#ffffff" stroke-width="9"/>

  <path d="M94 154 L680 154 L680 508 L604 584 L680 584 L680 620 L94 620 Z" fill="url(#green)"/>
  <path d="M604 584 L680 508 L680 708 L604 708 Z" fill="url(#darkCut)"/>
  <path d="M112 180 L560 180" stroke="#b9ffbe" stroke-opacity=".35" stroke-width="2" transform="rotate(-58 112 180)"/>
  <path d="M175 210 L650 210" stroke="#b9ffbe" stroke-opacity=".35" stroke-width="2" transform="rotate(-58 175 210)"/>
  <path d="M240 250 L715 250" stroke="#b9ffbe" stroke-opacity=".35" stroke-width="2" transform="rotate(-58 240 250)"/>
  <path d="M315 285 L790 285" stroke="#b9ffbe" stroke-opacity=".35" stroke-width="2" transform="rotate(-58 315 285)"/>

  <text x="112" y="238" font-size="76" font-weight="900" fill="#ffffff" stroke="#111827" stroke-width="4" paint-order="stroke">${rating.ovr}</text>
  <text x="112" y="302" font-size="32">${escapeXml(flag)}</text>
  ${crest ? `<image href="${crest}" x="106" y="332" width="78" height="78" preserveAspectRatio="xMidYMid meet"/>` : ""}

  <circle cx="380" cy="430" r="186" fill="#070b0f" stroke="#ffffff" stroke-width="8"/>
  <circle cx="380" cy="430" r="176" fill="#070b0f" stroke="#2fe45a" stroke-width="3"/>
  ${
    avatar
      ? `<image href="${avatar}" x="215" y="265" width="330" height="330" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid meet"/>`
      : `<text x="380" y="466" text-anchor="middle" font-size="150" font-weight="900" fill="#ffffff" stroke="#111827" stroke-width="6" paint-order="stroke">${escapeXml(card.player.name.charAt(0).toUpperCase())}</text>`
  }

  <rect x="94" y="620" width="510" height="88" fill="#f7f8f4"/>
  <path d="M604 620 L680 620 L680 708 L604 708 L558 664 Z" fill="#064114"/>
  <text x="350" y="680" text-anchor="middle" font-size="44" font-weight="900" fill="#111827">${name}</text>
  <text x="641" y="680" text-anchor="middle" font-size="38" font-weight="900" fill="#ffffff">${position}</text>
  <line x1="94" y1="708" x2="680" y2="708" stroke="#0d8625" stroke-width="5"/>

  <path d="M94 708 L680 708 L680 820 C680 882 631 906 535 917 C463 925 419 952 380 988 C341 952 297 925 225 917 C129 906 94 882 94 820 Z" fill="#fbfbf8"/>
  <line x1="380" y1="734" x2="380" y2="878" stroke="#0d8625" stroke-width="5"/>
  ${stat("SHO", rating.sho, 112, 774)}
  ${stat("PAS", rating.pas, 112, 858)}
  ${stat("DEF", rating.def, 420, 774)}
  ${stat("DRI", rating.dri, 420, 858)}
  <circle cx="380" cy="940" r="46" fill="#070b0f"/>
  <text x="380" y="956" text-anchor="middle" font-size="30" font-weight="900" fill="#16c843">FFL</text>
</svg>`
}

export async function renderPlayerCardPng(card: GeneratedCardData) {
  const svg = await renderPlayerCardSvg(card)
  return sharp(Buffer.from(svg)).png().toBuffer()
}

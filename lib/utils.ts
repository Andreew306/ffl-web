import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combina clases con clsx y tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMinutesSeconds(value: number) {
  if (!Number.isFinite(value)) return "00:00"
  const totalSeconds = Math.max(0, Math.floor(value))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export function normalizeTeamImageUrl(image?: string) {
  if (!image) return ""
  const trimmed = image.trim()
  return trimmed.startsWith("data:image") ? "" : trimmed
}

function countryToIsoCode(value?: string) {
  const trimmed = (value || "").trim()
  if (!trimmed) return ""
  if (trimmed.length === 2) return trimmed.toUpperCase()
  const chars = Array.from(trimmed)
  if (chars.length < 2) return ""
  const codes = chars.slice(0, 2).map((char) => char.codePointAt(0) || 0)
  if (codes.some((code) => code < 0x1f1e6 || code > 0x1f1ff)) return ""
  return String.fromCharCode(codes[0] - 127397, codes[1] - 127397)
}

export function getFlagBgColor(code?: string) {
  const normalized = countryToIsoCode(code)
  if (!normalized) return "#F4F4F4"
  switch (normalized) {
    case "AR":
      return "#74ACDF"
    case "ES":
      return "#AA151B"
    case "TR":
      return "#E30A17"
    case "IT":
      return "#009246"
    case "FR":
      return "#0055A4"
    case "DE":
      return "#131313ff"
    case "GB":
      return "#012169"
    case "US":
      return "#B22234"
    case "EU":
      return "#003399"
    default:
      return "#F4F4F4"
  }
}

export function isImageUrl(value?: string) {
  if (!value) return false
  const trimmed = value.trim()
  return /^https?:\/\//i.test(trimmed)
}

export function getFlagBackgroundStyle(code?: string) {
  const normalized = countryToIsoCode(code)
  if (!normalized) {
    return { backgroundColor: "#F4F4F4" } as const
  }
  switch (normalized) {
    case "IT":
      return {
        backgroundImage: "linear-gradient(90deg, #009246 0%, #009246 33.33%, #F4F4F4 33.33%, #F4F4F4 66.66%, #CE2B37 66.66%, #CE2B37 100%)",
        backgroundColor: "#F4F4F4",
      } as const
    case "ES":
      return {
        backgroundImage: "linear-gradient(180deg, #ce1319c1 0%, #ce1319c1 30%, #F1BF00 30%, #F1BF00 70%, #ce1319c1 70%, #ce1319c1 100%)",
        backgroundColor: "#AA151B",
      } as const
    case "AD":
      return {
        backgroundImage: "linear-gradient(90deg, #0055A4 0%, #0055A4 33.33%, #FFCC00 33.33%, #FFCC00 66.66%, #D0103A 66.66%, #D0103A 100%)",
        backgroundColor: "#FFCC00",
      } as const
    case "AL":
      return { backgroundColor: "#E41E20" } as const
    case "AE":
      return {
        backgroundImage: "linear-gradient(90deg, #FF0000 0%, #FF0000 25%, transparent 25%, transparent 100%), linear-gradient(180deg, #00732F 0%, #00732F 33.33%, #F4F4F4 33.33%, #F4F4F4 66.66%, #131313ff 66.66%, #131313ff 100%)",
        backgroundColor: "#00732F",
      } as const
    case "AR":
      return {
        backgroundImage: "linear-gradient(180deg, #74ACDF 0%, #74ACDF 33.33%, #F4F4F4 33.33%, #F4F4F4 66.66%, #74ACDF 66.66%, #74ACDF 100%)",
        backgroundColor: "#74ACDF",
      } as const
    case "AU":
      return { backgroundColor: "#012169" } as const
    case "BA":
      return {
        backgroundColor: "#34219E",
      } as const
    case "BE":
      return {
        backgroundImage: "linear-gradient(90deg, #131313ff 0%, #131313ff 33.33%, #FFD90C 33.33%, #FFD90C 66.66%, #EF3340 66.66%, #EF3340 100%)",
        backgroundColor: "#FDDA24",
      } as const
    case "BF":
      return {
        backgroundImage: "linear-gradient(180deg, #EF2B2D 0%, #EF2B2D 50%, #009E49 50%, #009E49 100%)",
        backgroundColor: "#EF2B2D",
      } as const
    case "BG":
      return {
        backgroundImage: "linear-gradient(180deg, #F4F4F4 0%, #F4F4F4 33.33%, #00966E 33.33%, #00966E 66.66%, #D62612 66.66%, #D62612 100%)",
        backgroundColor: "#F4F4F4",
      } as const
    case "BR":
      return { backgroundColor: "#009B3A" } as const
    case "BS":
      return {
        backgroundImage: "linear-gradient(180deg, #00ABC9 0%, #00ABC9 33.33%, #FCD116 33.33%, #FCD116 66.66%, #00ABC9 66.66%, #00ABC9 100%)",
        backgroundColor: "#00ABC9",
      } as const
    case "CA":
      return {
        backgroundImage: "linear-gradient(90deg, #D52B1E 0%, #D52B1E 28%, #F4F4F4 28%, #F4F4F4 72%, #D52B1E 72%, #D52B1E 100%)",
        backgroundColor: "#D52B1E",
      } as const
    case "CH":
      return { backgroundColor: "#D52B1E" } as const
    case "CL":
      return {
        backgroundImage: "linear-gradient(90deg, #0039A6 0%, rgba(7, 58, 155, 0.94) 36%, #F4F4F4 25%, #F4F4F4 100%), linear-gradient(180deg, #D52B1E 0%, #D52B1E 100%)",
        backgroundSize: "100% 50%, 100% 50%",
        backgroundPosition: "top center, bottom center",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#F4F4F4",
      } as const
    case "CN":
      return { backgroundColor: "#DE2910" } as const
    case "CO":
      return {
        backgroundImage: "linear-gradient(180deg, #FCD116 0%, #FCD116 50%, #003893 50%, #003893 75%, #CE1126 75%, #CE1126 100%)",
        backgroundColor: "#FCD116",
      } as const
    case "CU":
      return {
        backgroundImage: "linear-gradient(180deg, #002A8F 0%, #002A8F 20%, #F4F4F4 20%, #F4F4F4 40%, #002A8F 40%, #002A8F 60%, #F4F4F4 60%, #F4F4F4 80%, #002A8F 80%, #002A8F 100%)",
        backgroundColor: "#002A8F",
      } as const
    case "CY":
      return { backgroundColor: "#F4F4F4" } as const
    case "CZ":
      return {
        backgroundImage: "linear-gradient(180deg, #eeeeeeff 0%, #eeeeeeff 50%, #D7141A 50%, #D7141A 100%)",
        backgroundColor: "#F4F4F4",
      } as const
    case "DE":
      return {
        backgroundImage: "linear-gradient(180deg, #131313ff 0%, #131313ff 33.33%, #DD0000 33.33%, #DD0000 66.66%, #FFCE00 66.66%, #FFCE00 100%)",
        backgroundColor: "#131313ff",
      } as const
    case "DZ":
      return {
        backgroundImage: "linear-gradient(90deg, #006233 0%, #006233 50%, #F4F4F4 50%, #F4F4F4 100%)",
        backgroundColor: "#006233",
      } as const
    case "EC":
      return {
        backgroundImage: "linear-gradient(180deg, #FCD116 0%, #FCD116 50%, #003893 50%, #003893 75%, #ff1732ff 75%, #ff1732ff 100%)",
        backgroundColor: "#FCD116",
      } as const
    case "EE":
      return {
        backgroundImage: "linear-gradient(180deg, #4593d4ff 0%, #4593d4ff 33.33%, #131313ff 33.33%, #131313ff 66.66%, #F4F4F4 66.66%, #F4F4F4 100%)",
        backgroundColor: "#0072CE",
      } as const
    case "EG":
      return {
        backgroundImage: "linear-gradient(180deg, #CE1126 0%, #CE1126 33.33%, #F4F4F4 33.33%, #F4F4F4 66.66%, #131313ff 66.66%, #131313ff 100%)",
        backgroundColor: "#CE1126",
      } as const
    case "FI":
      return {
        backgroundImage: "linear-gradient(90deg, transparent 0%, transparent 31%, #003580 31%, #003580 50%, transparent 45%, transparent 100%), linear-gradient(180deg, transparent 0%, transparent 40%, #003580 40%, #003580 55%, transparent 55%, transparent 100%)",
        backgroundColor: "#F4F4F4",
      } as const
    case "FM":
      return { backgroundColor: "#75B2DD" } as const
    case "FR":
      return {
        backgroundImage: "linear-gradient(90deg, #0055A4 0%, #0055A4 33.33%, #F4F4F4 33.33%, #F4F4F4 66.66%, #EF4135 66.66%, #EF4135 100%)",
        backgroundColor: "#F4F4F4",
      } as const
    case "GB":
      return {
        backgroundImage: "linear-gradient(90deg, #00257aff 0%, #00257aff 36%, #F4F4F4 36%, #F4F4F4 42%, #d21131ff 42%, #d21131ff 58%, #F4F4F4 58%, #F4F4F4 64%, #00257aff 64%, #00257aff 100%), linear-gradient(180deg, #00257aff 0%, #00257aff 40%, #F4F4F4 40%, #F4F4F4 42%, #C8102E 42%, #C8102E 48%, #F4F4F4 48%, #F4F4F4 50%, #00257aff 50%, #00257aff 100%)",
        backgroundColor: "#012169",
      } as const
    case "GE":
      return {
        backgroundImage: "linear-gradient(90deg, transparent 0%, transparent 43%, #e80e2bff 43%, #e80e2bff 57%, transparent 57%, transparent 100%), linear-gradient(180deg, transparent 0%, transparent 40%, #E8112D 40%, #E8112D 60%, transparent 60%, transparent 100%)",
        backgroundColor: "#F4F4F4",
      } as const
    case "GI":
      return {
        backgroundImage: "linear-gradient(180deg, #F4F4F4 0%, #F4F4F4 66.66%, #DA121A 66.66%, #DA121A 100%)",
        backgroundColor: "#F4F4F4",
      } as const
    case "GR":
      return {
        backgroundImage: "linear-gradient(180deg, #0D5EAF 0%, #0D5EAF 11.11%, #F4F4F4 11.11%, #F4F4F4 22.22%, #0D5EAF 22.22%, #0D5EAF 33.33%, #F4F4F4 33.33%, #F4F4F4 44.44%, #0D5EAF 44.44%, #0D5EAF 55.55%, #F4F4F4 55.55%, #F4F4F4 66.66%, #0D5EAF 66.66%, #0D5EAF 77.77%, #F4F4F4 77.77%, #F4F4F4 88.88%, #0D5EAF 88.88%, #0D5EAF 100%)",
        backgroundColor: "#0D5EAF",
      } as const
    case "HR":
      return {
        backgroundImage: "linear-gradient(180deg, #CE2939 0%, #CE2939 33.33%, #F4F4F4 33.33%, #F4F4F4 66.66%, #171796 66.66%, #171796 100%)",
        backgroundColor: "#C8102E",
      } as const
    case "HU":
      return {
        backgroundImage: "linear-gradient(180deg, #CE2939 0%, #CE2939 33.33%, #F4F4F4 33.33%, #F4F4F4 66.66%, #477050 66.66%, #477050 100%)",
        backgroundColor: "#CE2939",
      } as const
    case "IC":
      return {
        backgroundImage: "linear-gradient(90deg, #F4F4F4 0%, #F4F4F4 33.33%, #0768A9 33.33%, #0768A9 66.66%, #FCD116 66.66%, #FCD116 100%)",
        backgroundColor: "#F4F4F4",
      } as const
    case "IL":
      return {
        backgroundImage: "linear-gradient(180deg, #0038B8 0%, #0038B8 15%, #F4F4F4 15%, #F4F4F4 85%, #0038B8 85%, #0038B8 100%)",
        backgroundColor: "#F4F4F4",
      } as const
    case "JM":
      return { backgroundColor: "#009B3A" } as const
    case "JO":
      return {
        backgroundImage: "linear-gradient(180deg, #131313ff 0%, #131313ff 33.33%, #F4F4F4 33.33%, #F4F4F4 66.66%, #007A3D 66.66%, #007A3D 100%)",
        backgroundColor: "#131313ff",
      } as const
    case "JP":
      return { backgroundColor: "#F4F4F4" } as const
    case "KM":
      return {
        backgroundImage: "linear-gradient(180deg, #FCD116 0%, #FCD116 50%, #2A77B7 50%, #2A77B7 100%)",
        backgroundColor: "#FCD116",
      } as const
    case "LV":
      return {
        backgroundImage: "linear-gradient(180deg, #9E3039 0%, #9E3039 45%, #F4F4F4 45%, #F4F4F4 55%, #9E3039 55%, #9E3039 100%)",
        backgroundColor: "#9E3039",
      } as const
    case "MA":
      return { backgroundColor: "#C1272D" } as const
    case "MX":
      return {
        backgroundImage: "linear-gradient(90deg, #006847 0%, #006847 30.5%, #F4F4F4 30.5%, #F4F4F4 69.5%, #CE1126 69.6%, #CE1126 100%)",
        backgroundColor: "#F4F4F4",
      } as const
    case "NL":
      return {
        backgroundImage: "linear-gradient(180deg, #AE1C28 0%, #AE1C28 33.33%, #F4F4F4 33.33%, #F4F4F4 66.66%, #21468B 66.66%, #21468B 100%)",
        backgroundColor: "#AE1C28",
      } as const
    case "PE":
      return {
        backgroundImage: "linear-gradient(90deg, #D91023 0%, #D91023 33.33%, #F4F4F4 33.33%, #F4F4F4 66.66%, #D91023 66.66%, #D91023 100%)",
        backgroundColor: "#F4F4F4",
      } as const
    case "PL":
      return {
        backgroundImage: "linear-gradient(180deg, #F4F4F4 0%, #F4F4F4 50%, #DC143C 50%, #DC143C 100%)",
        backgroundColor: "#F4F4F4",
      } as const
    case "PS":
      return {
        backgroundImage: "linear-gradient(180deg, #131313ff 0%, #131313ff 33.33%, #F4F4F4 33.33%, #F4F4F4 66.66%, #04723bff 66.66%, #04723bff 100%)",
        backgroundColor: "#131313ff",
      } as const
    case "PT":
      return {
        backgroundImage: "linear-gradient(90deg, #006600 0%, #006600 42%, #D7141A 42%, #D7141A 100%)",
        backgroundColor: "#006600",
      } as const
    case "RO":
      return {
        backgroundImage: "linear-gradient(90deg, #002B7F 0%, #002B7F 33.33%, #FCD116 33.33%, #FCD116 66.66%, #CE1126 66.66%, #CE1126 100%)",
        backgroundColor: "#F4F4F4",
      } as const
    case "RS":
      return {
        backgroundImage: "linear-gradient(180deg, #C6363C 0%, #C6363C 33.33%, #0033A0 33.33%, #0033A0 66.66%, #F4F4F4 66.66%, #F4F4F4 100%)",
        backgroundColor: "#C6363C",
      } as const
    case "RU":
      return {
        backgroundImage: "linear-gradient(180deg, #F4F4F4 0%, #F4F4F4 33.33%, #0039A6 33.33%, #0039A6 66.66%, #D52B1E 66.66%, #D52B1E 100%)",
        backgroundColor: "#F4F4F4",
      } as const
    case "SE":
      return {
        backgroundImage: "linear-gradient(90deg, transparent 0%, transparent 29.5%, #FFCD00 29.5%, #FFCD00 43%, transparent 43%, transparent 100%), linear-gradient(180deg, transparent 0%, transparent 40%, #FCD116 40%, #FCD116 55%, transparent 55%, transparent 100%)",
        backgroundColor: "#006AA7",
      } as const
    case "SI":
      return {
        backgroundImage: "linear-gradient(180deg, #F4F4F4 0%, #F4F4F4 33.33%, #005DA4 33.33%, #005DA4 66.66%, #ec181fff 66.66%, #ec181fff 100%)",
        backgroundColor: "#F4F4F4",
      } as const
    case "SK":
      return {
        backgroundImage: "linear-gradient(180deg, #F4F4F4 0%, #F4F4F4 33.33%, #0B4EA2 33.33%, #0B4EA2 66.66%, #EE1C25 66.66%, #EE1C25 100%)",
        backgroundColor: "#F4F4F4",
      } as const
    case "SM":
      return {
        backgroundImage: "linear-gradient(180deg, #F4F4F4 0%, #F4F4F4 50%, #5EB6E4 50%, #5EB6E4 100%)",
        backgroundColor: "#F4F4F4",
      } as const
    case "SN":
      return {
        backgroundImage: "linear-gradient(90deg, #00853F 0%, #00853F 33.33%, #FDEF42 33.33%, #FDEF42 66.66%, #E31B23 66.66%, #E31B23 100%)",
        backgroundColor: "#F4F4F4",
      } as const
    case "SO":
      return { backgroundColor: "#4189DD" } as const
    case "SV":
      return {
        backgroundImage: "linear-gradient(180deg, #0047AB 0%, #0047AB 33.33%, #F4F4F4 33.33%, #F4F4F4 66.66%, #0047AB 66.66%, #0047AB 100%)",
        backgroundColor: "#0047AB",
      } as const
    case "TN":
      return { backgroundColor: "#E70013" } as const
    case "UA":
      return {
        backgroundImage: "linear-gradient(180deg, #0057B7 0%, #0057B7 50%, #FFD700 50%, #FFD700 100%)",
        backgroundColor: "#0057B7",
      } as const
    case "US":
      return {
        backgroundImage: "linear-gradient(180deg, #B22234 0%, #B22234 7.69%, #F4F4F4 7.69%, #F4F4F4 15.38%, #B22234 15.38%, #B22234 23.07%, #F4F4F4 23.07%, #F4F4F4 30.76%, #B22234 30.76%, #B22234 38.45%, #F4F4F4 38.45%, #F4F4F4 46.14%, #B22234 46.14%, #B22234 53.83%, #F4F4F4 53.83%, #F4F4F4 61.52%, #B22234 61.52%, #B22234 69.21%, #F4F4F4 69.21%, #F4F4F4 76.9%, #B22234 76.9%, #B22234 84.59%, #F4F4F4 84.59%, #F4F4F4 92.28%, #B22234 92.28%, #B22234 100%)",
        backgroundColor: "#B22234",
      } as const
    case "EU":
      return {
        backgroundColor: "#003399",
      } as const
    case "UY":
      return {
        backgroundImage: "linear-gradient(180deg, #F4F4F4 0%, #F4F4F4 11.11%, #0038A8 11.11%, #0038A8 22.22%, #F4F4F4 22.22%, #F4F4F4 33.33%, #0038A8 33.33%, #0038A8 44.44%, #F4F4F4 44.44%, #F4F4F4 55.55%, #0038A8 55.55%, #0038A8 66.66%, #F4F4F4 66.66%, #F4F4F4 77.77%, #0038A8 77.77%, #0038A8 88.88%, #F4F4F4 88.88%, #F4F4F4 100%)",
        backgroundColor: "#F4F4F4",
      } as const
    case "VE":
      return {
        backgroundImage: "linear-gradient(180deg, #FCD116 0%, #FCD116 33.33%, #003893 33.33%, #003893 66.66%, #CE1126 66.66%, #CE1126 100%)",
        backgroundColor: "#FCD116",
      } as const
    case "WA":
      return {
        backgroundImage: "linear-gradient(180deg, #F4F4F4 0%, #F4F4F4 50%, #008751 50%, #008751 100%)",
        backgroundColor: "#F4F4F4",
      } as const
    case "XK":
      return {
        backgroundColor: "#244AA5",
      } as const
    default:
      return { backgroundColor: getFlagBgColor(code) } as const
  }
}

export function shouldOverlayFlag(code?: string) {
  const normalized = countryToIsoCode(code)
  if (!normalized) return true
  return !["BE", "FR", "PE", "RO"].includes(normalized)
}

export function getKitTextColor(value?: string) {
  if (!value) return ""
  const tokens = value.trim().split(/\s+/)
  const index = tokens.findIndex((token) => token === "60")
  const colorToken = index >= 0 ? tokens[index + 1] : tokens[3]
  if (!colorToken) return ""
  const hex = colorToken.replace("#", "")
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return ""
  return `#${hex.toUpperCase()}`
}

export function hashString(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { toPng } from "html-to-image"
import { ChevronDown, Download, RefreshCcw, Search, X } from "lucide-react"
import type { Ideal7Player } from "@/lib/services/ideal7.service"
import { cn, isImageUrl } from "@/lib/utils"

type Ideal7HomeProps = {
  players: Ideal7Player[]
}

type FormationKey =
  | "1-3-2-1"
  | "1-3-1-2"
  | "1-2-1-3"
  | "1-2-2-2"
  | "1-1-2-3"
  | "1-1-3-2"

type ThemeKey = "champion" | "obsidian" | "emerald" | "ruby" | "diamond" | "gold" | "silver"

type SlotPoint = {
  x: number
  y: number
}

const formations: Array<{ id: FormationKey; label: string }> = [
  { id: "1-3-2-1", label: "1-3-2-1" },
  { id: "1-3-1-2", label: "1-3-1-2" },
  { id: "1-2-1-3", label: "1-2-1-3" },
  { id: "1-2-2-2", label: "1-2-2-2" },
  { id: "1-1-2-3", label: "1-1-2-3" },
  { id: "1-1-3-2", label: "1-1-3-2" },
]

const themes: Array<{
  id: ThemeKey
  label: string
  panelClass: string
  pitchStyle: React.CSSProperties
  overlayClass: string
  frameClass: string
  accentClass: string
  accentColor: string
  logoLeftFilter: string
  logoGlow: string
  topGlowClass: string
  sideGlowClass: string
  titleClass: string
  titleShadow: string
}> = [
  {
    id: "emerald",
    label: "Emerald",
    panelClass: "bg-[#07140f]",
    pitchStyle: {
      backgroundImage: `
        radial-gradient(circle at 50% 10%, rgba(110, 231, 183, 0.18), transparent 18%),
        radial-gradient(circle at 14% 84%, rgba(16, 185, 129, 0.13), transparent 24%),
        radial-gradient(circle at 84% 80%, rgba(5, 150, 105, 0.11), transparent 28%),
        radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0),
        repeating-linear-gradient(135deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0) 15px, rgba(74,222,128,0.03) 15px, rgba(74,222,128,0.03) 16px),
        linear-gradient(155deg, rgba(16,185,129,0.065), transparent 34%),
        radial-gradient(circle at center, rgba(34,197,94,0.05), transparent 42%),
        linear-gradient(180deg, #0b1812 0%, #08130e 38%, #081510 68%, #0b2018 100%)
      `,
      backgroundSize: "100% 100%, 100% 100%, 100% 100%, 18px 18px, 20px 20px, 100% 100%, 100% 100%, 100% 100%",
      backgroundPosition: "0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0",
    },
    overlayClass:
      "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.02),transparent_28%),linear-gradient(180deg,rgba(4,18,12,0.02)_0%,rgba(4,18,12,0.22)_68%,rgba(4,18,12,0.46)_100%)]",
    frameClass: "shadow-[inset_0_1px_0_rgba(255,255,255,0.04),inset_0_-120px_140px_rgba(6,95,70,0.18),0_30px_90px_rgba(6,95,70,0.18)]",
    accentClass: "bg-emerald-300",
    accentColor: "#6ee7b7",
    logoLeftFilter: "brightness(0) saturate(100%) invert(71%) sepia(26%) saturate(938%) hue-rotate(98deg) brightness(94%) contrast(89%)",
    logoGlow: "drop-shadow(0 0 18px rgba(52,211,153,0.24))",
    topGlowClass: "bg-[radial-gradient(ellipse_at_center,rgba(110,231,183,0.16)_0%,rgba(52,211,153,0.1)_26%,rgba(16,185,129,0.03)_52%,transparent_74%)]",
    sideGlowClass: "bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.08)_0%,rgba(16,185,129,0.045)_34%,transparent_72%)]",
    titleClass: "bg-[linear-gradient(180deg,#d1fae5_0%,#6ee7b7_45%,#34d399_100%)] bg-clip-text text-transparent",
    titleShadow: "drop-shadow(0 0 14px rgba(52,211,153,0.18))",
  },
  {
    id: "ruby",
    label: "Ruby",
    panelClass: "bg-[#19090d]",
    pitchStyle: {
      backgroundImage: `
        radial-gradient(circle at 50% 10%, rgba(252, 165, 165, 0.16), transparent 18%),
        radial-gradient(circle at 14% 84%, rgba(239, 68, 68, 0.13), transparent 24%),
        radial-gradient(circle at 84% 80%, rgba(220, 38, 38, 0.11), transparent 28%),
        radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0),
        repeating-linear-gradient(135deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0) 15px, rgba(248,113,113,0.03) 15px, rgba(248,113,113,0.03) 16px),
        linear-gradient(155deg, rgba(239,68,68,0.065), transparent 34%),
        radial-gradient(circle at center, rgba(239,68,68,0.05), transparent 42%),
        linear-gradient(180deg, #1d0b10 0%, #18090d 38%, #190a0f 68%, #281015 100%)
      `,
      backgroundSize: "100% 100%, 100% 100%, 100% 100%, 18px 18px, 20px 20px, 100% 100%, 100% 100%, 100% 100%",
      backgroundPosition: "0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0",
    },
    overlayClass:
      "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.02),transparent_28%),linear-gradient(180deg,rgba(18,4,6,0.02)_0%,rgba(18,4,6,0.22)_68%,rgba(18,4,6,0.46)_100%)]",
    frameClass: "shadow-[inset_0_1px_0_rgba(255,255,255,0.04),inset_0_-120px_140px_rgba(185,28,28,0.16),0_30px_90px_rgba(127,29,29,0.2)]",
    accentClass: "bg-red-300",
    accentColor: "#fca5a5",
    logoLeftFilter: "brightness(0) saturate(100%) invert(52%) sepia(92%) saturate(1122%) hue-rotate(325deg) brightness(100%) contrast(101%)",
    logoGlow: "drop-shadow(0 0 18px rgba(248,113,113,0.22))",
    topGlowClass: "bg-[radial-gradient(ellipse_at_center,rgba(252,165,165,0.16)_0%,rgba(248,113,113,0.1)_26%,rgba(239,68,68,0.03)_52%,transparent_74%)]",
    sideGlowClass: "bg-[radial-gradient(ellipse_at_center,rgba(248,113,113,0.08)_0%,rgba(239,68,68,0.045)_34%,transparent_72%)]",
    titleClass: "bg-[linear-gradient(180deg,#fee2e2_0%,#fca5a5_42%,#ef4444_100%)] bg-clip-text text-transparent",
    titleShadow: "drop-shadow(0 0 14px rgba(248,113,113,0.18))",
  },
  {
    id: "obsidian",
    label: "Obsidian",
    panelClass: "bg-[#050608]",
    pitchStyle: {
      backgroundImage: `
        radial-gradient(circle at 50% 9%, rgba(255,255,255,0.08), transparent 18%),
        radial-gradient(circle at 14% 82%, rgba(71,85,105,0.08), transparent 24%),
        radial-gradient(circle at 86% 80%, rgba(30,41,59,0.08), transparent 28%),
        radial-gradient(circle at 1px 1px, rgba(255,255,255,0.035) 1px, transparent 0),
        repeating-linear-gradient(135deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0) 15px, rgba(148,163,184,0.02) 15px, rgba(148,163,184,0.02) 16px),
        linear-gradient(155deg, rgba(148,163,184,0.03), transparent 34%),
        radial-gradient(circle at center, rgba(255,255,255,0.02), transparent 42%),
        linear-gradient(180deg, #040506 0%, #06080b 38%, #05070a 68%, #0a0d12 100%)
      `,
      backgroundSize: "100% 100%, 100% 100%, 100% 100%, 18px 18px, 20px 20px, 100% 100%, 100% 100%, 100% 100%",
      backgroundPosition: "0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0",
    },
    overlayClass:
      "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.02),transparent_28%),linear-gradient(180deg,rgba(3,4,6,0.02)_0%,rgba(3,4,6,0.2)_68%,rgba(3,4,6,0.44)_100%)]",
    frameClass: "shadow-[inset_0_1px_0_rgba(255,255,255,0.03),inset_0_-120px_140px_rgba(15,23,42,0.16),0_30px_90px_rgba(2,6,23,0.26)]",
    accentClass: "bg-black",
    accentColor: "#050608",
    logoLeftFilter: "brightness(0) saturate(100%) invert(95%) sepia(6%) saturate(215%) hue-rotate(180deg) brightness(100%) contrast(97%)",
    logoGlow: "drop-shadow(0 0 18px rgba(226,232,240,0.12))",
    topGlowClass: "bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08)_0%,rgba(148,163,184,0.04)_28%,transparent_72%)]",
    sideGlowClass: "bg-[radial-gradient(ellipse_at_center,rgba(148,163,184,0.05)_0%,rgba(71,85,105,0.03)_34%,transparent_72%)]",
    titleClass: "bg-[linear-gradient(180deg,#f8fafc_0%,#e2e8f0_45%,#94a3b8_100%)] bg-clip-text text-transparent",
    titleShadow: "drop-shadow(0 0 14px rgba(226,232,240,0.1))",
  },
  {
    id: "champion",
    label: "Champion",
    panelClass: "bg-[#10091a]",
    pitchStyle: {
      backgroundImage: `
        radial-gradient(circle at 50% 10%, rgba(244, 114, 182, 0.16), transparent 18%),
        radial-gradient(circle at 14% 84%, rgba(217, 70, 239, 0.13), transparent 24%),
        radial-gradient(circle at 84% 80%, rgba(168, 85, 247, 0.11), transparent 28%),
        radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0),
        repeating-linear-gradient(135deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0) 15px, rgba(216,180,254,0.03) 15px, rgba(216,180,254,0.03) 16px),
        linear-gradient(155deg, rgba(217,70,239,0.065), transparent 34%),
        radial-gradient(circle at center, rgba(217,70,239,0.05), transparent 42%),
        linear-gradient(180deg, #140c20 0%, #10091a 38%, #13091f 68%, #211033 100%)
      `,
      backgroundSize: "100% 100%, 100% 100%, 100% 100%, 18px 18px, 20px 20px, 100% 100%, 100% 100%, 100% 100%",
      backgroundPosition: "0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0",
    },
    overlayClass:
      "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.02),transparent_28%),linear-gradient(180deg,rgba(6,6,18,0.02)_0%,rgba(6,6,18,0.22)_68%,rgba(6,6,18,0.46)_100%)]",
    frameClass: "shadow-[inset_0_1px_0_rgba(255,255,255,0.04),inset_0_-120px_140px_rgba(168,85,247,0.16),0_30px_90px_rgba(126,34,206,0.22)]",
    accentClass: "bg-fuchsia-300",
    accentColor: "#e879f9",
    logoLeftFilter: "brightness(0) saturate(100%) invert(49%) sepia(75%) saturate(2228%) hue-rotate(276deg) brightness(97%) contrast(99%)",
    logoGlow: "drop-shadow(0 0 18px rgba(216,70,239,0.24))",
    topGlowClass: "bg-[radial-gradient(ellipse_at_center,rgba(244,114,182,0.16)_0%,rgba(232,121,249,0.1)_26%,rgba(168,85,247,0.03)_52%,transparent_74%)]",
    sideGlowClass: "bg-[radial-gradient(ellipse_at_center,rgba(217,70,239,0.08)_0%,rgba(168,85,247,0.045)_34%,transparent_72%)]",
    titleClass: "bg-[linear-gradient(180deg,#fae8ff_0%,#e879f9_42%,#a855f7_100%)] bg-clip-text text-transparent",
    titleShadow: "drop-shadow(0 0 14px rgba(232,121,249,0.18))",
  },
  {
    id: "diamond",
    label: "Diamond",
    panelClass: "bg-[#060d17]",
    pitchStyle: {
      backgroundImage: `
        radial-gradient(circle at 50% 10%, rgba(103, 232, 249, 0.18), transparent 18%),
        radial-gradient(circle at 14% 86%, rgba(34, 211, 238, 0.12), transparent 22%),
        radial-gradient(circle at 84% 82%, rgba(14, 165, 233, 0.1), transparent 28%),
        radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0),
        repeating-linear-gradient(135deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0) 15px, rgba(103,232,249,0.032) 15px, rgba(103,232,249,0.032) 16px),
        linear-gradient(155deg, rgba(34,211,238,0.06), transparent 34%),
        radial-gradient(circle at center, rgba(34,211,238,0.05), transparent 42%),
        linear-gradient(180deg, #0a1321 0%, #08101d 38%, #071522 68%, #0a1d2f 100%)
      `,
      backgroundSize: "100% 100%, 100% 100%, 100% 100%, 18px 18px, 20px 20px, 100% 100%, 100% 100%, 100% 100%",
      backgroundPosition: "0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0",
    },
    overlayClass:
      "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.025),transparent_28%),linear-gradient(180deg,rgba(2,6,23,0.02)_0%,rgba(2,6,23,0.2)_68%,rgba(2,6,23,0.44)_100%)]",
    frameClass: "shadow-[inset_0_1px_0_rgba(255,255,255,0.04),inset_0_-120px_140px_rgba(14,165,233,0.16),0_30px_90px_rgba(6,182,212,0.18)]",
    accentClass: "bg-cyan-300",
    accentColor: "#67e8f9",
    logoLeftFilter: "brightness(0) saturate(100%) invert(83%) sepia(35%) saturate(2458%) hue-rotate(142deg) brightness(99%) contrast(102%)",
    logoGlow: "drop-shadow(0 0 18px rgba(34,211,238,0.24))",
    topGlowClass: "bg-[radial-gradient(ellipse_at_center,rgba(125,249,255,0.16)_0%,rgba(103,232,249,0.1)_26%,rgba(34,211,238,0.03)_52%,transparent_74%)]",
    sideGlowClass: "bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.08)_0%,rgba(14,165,233,0.045)_34%,transparent_72%)]",
    titleClass: "bg-[linear-gradient(180deg,#ecfeff_0%,#67e8f9_42%,#06b6d4_100%)] bg-clip-text text-transparent",
    titleShadow: "drop-shadow(0 0 14px rgba(34,211,238,0.18))",
  },
  {
    id: "gold",
    label: "Gold",
    panelClass: "bg-[#161104]",
    pitchStyle: {
      backgroundImage: `
        radial-gradient(circle at 50% 10%, rgba(254, 240, 138, 0.18), transparent 18%),
        radial-gradient(circle at 16% 84%, rgba(250, 204, 21, 0.12), transparent 24%),
        radial-gradient(circle at 84% 80%, rgba(202, 138, 4, 0.1), transparent 28%),
        radial-gradient(circle at 1px 1px, rgba(255,248,220,0.045) 1px, transparent 0),
        repeating-linear-gradient(135deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0) 15px, rgba(250,204,21,0.03) 15px, rgba(250,204,21,0.03) 16px),
        linear-gradient(155deg, rgba(250,204,21,0.06), transparent 34%),
        radial-gradient(circle at center, rgba(250,204,21,0.05), transparent 42%),
        linear-gradient(180deg, #1d1606 0%, #171105 38%, #161004 68%, #221707 100%)
      `,
      backgroundSize: "100% 100%, 100% 100%, 100% 100%, 18px 18px, 20px 20px, 100% 100%, 100% 100%, 100% 100%",
      backgroundPosition: "0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0",
    },
    overlayClass:
      "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.025),transparent_28%),linear-gradient(180deg,rgba(20,16,4,0.02)_0%,rgba(20,16,4,0.22)_68%,rgba(20,16,4,0.46)_100%)]",
    frameClass: "shadow-[inset_0_1px_0_rgba(255,255,255,0.04),inset_0_-120px_140px_rgba(234,179,8,0.16),0_30px_90px_rgba(161,98,7,0.2)]",
    accentClass: "bg-yellow-300",
    accentColor: "#fde047",
    logoLeftFilter: "brightness(0) saturate(100%) invert(84%) sepia(53%) saturate(1138%) hue-rotate(358deg) brightness(96%) contrast(97%)",
    logoGlow: "drop-shadow(0 0 18px rgba(250,204,21,0.24))",
    topGlowClass: "bg-[radial-gradient(ellipse_at_center,rgba(254,240,138,0.16)_0%,rgba(253,224,71,0.1)_26%,rgba(234,179,8,0.03)_52%,transparent_74%)]",
    sideGlowClass: "bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.08)_0%,rgba(234,179,8,0.045)_34%,transparent_72%)]",
    titleClass: "bg-[linear-gradient(180deg,#fef9c3_0%,#fde047_42%,#eab308_100%)] bg-clip-text text-transparent",
    titleShadow: "drop-shadow(0 0 14px rgba(250,204,21,0.18))",
  },
  {
    id: "silver",
    label: "Silver",
    panelClass: "bg-[#0f1218]",
    pitchStyle: {
      backgroundImage: `
        radial-gradient(circle at 50% 10%, rgba(226, 232, 240, 0.16), transparent 18%),
        radial-gradient(circle at 14% 84%, rgba(148, 163, 184, 0.12), transparent 24%),
        radial-gradient(circle at 84% 80%, rgba(100, 116, 139, 0.1), transparent 28%),
        radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0),
        repeating-linear-gradient(135deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0) 15px, rgba(203,213,225,0.028) 15px, rgba(203,213,225,0.028) 16px),
        linear-gradient(155deg, rgba(148,163,184,0.055), transparent 34%),
        radial-gradient(circle at center, rgba(148,163,184,0.045), transparent 42%),
        linear-gradient(180deg, #131821 0%, #10141b 38%, #0f1218 68%, #161b24 100%)
      `,
      backgroundSize: "100% 100%, 100% 100%, 100% 100%, 18px 18px, 20px 20px, 100% 100%, 100% 100%, 100% 100%",
      backgroundPosition: "0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0",
    },
    overlayClass:
      "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.02),transparent_28%),linear-gradient(180deg,rgba(8,10,14,0.02)_0%,rgba(8,10,14,0.2)_68%,rgba(8,10,14,0.44)_100%)]",
    frameClass: "shadow-[inset_0_1px_0_rgba(255,255,255,0.04),inset_0_-120px_140px_rgba(148,163,184,0.12),0_30px_90px_rgba(71,85,105,0.18)]",
    accentClass: "bg-slate-300",
    accentColor: "#cbd5e1",
    logoLeftFilter: "brightness(0) saturate(100%) invert(73%) sepia(8%) saturate(522%) hue-rotate(175deg) brightness(96%) contrast(92%)",
    logoGlow: "drop-shadow(0 0 18px rgba(226,232,240,0.18))",
    topGlowClass: "bg-[radial-gradient(ellipse_at_center,rgba(226,232,240,0.14)_0%,rgba(203,213,225,0.09)_26%,rgba(148,163,184,0.025)_52%,transparent_74%)]",
    sideGlowClass: "bg-[radial-gradient(ellipse_at_center,rgba(203,213,225,0.07)_0%,rgba(148,163,184,0.04)_34%,transparent_72%)]",
    titleClass: "bg-[linear-gradient(180deg,#f8fafc_0%,#cbd5e1_42%,#94a3b8_100%)] bg-clip-text text-transparent",
    titleShadow: "drop-shadow(0 0 14px rgba(226,232,240,0.14))",
  },
]

const themeOrder: ThemeKey[] = ["champion", "obsidian", "emerald", "ruby", "diamond", "gold", "silver"]

function buildLine(count: number, y: number) {
  if (count <= 1) {
    return [{ x: 50, y }]
  }

  const start = count === 2 ? 35 : 24
  const end = count === 2 ? 65 : 76
  const gap = (end - start) / (count - 1)
  return Array.from({ length: count }, (_, index) => ({
    x: Math.round((start + gap * index) * 100) / 100,
    y,
  }))
}

function getFormationSlots(formation: FormationKey) {
  const [, def, mid, att] = formation.split("-").map(Number)
  const attackLine = buildLine(att, 28)
  const midLine = buildLine(mid, 49)
  const defLine = buildLine(def, 70)
  const goalkeeperLine = buildLine(1, 88)
  return [...attackLine, ...midLine, ...defLine, ...goalkeeperLine]
}

function toIsoCode(value?: string) {
  const trimmed = (value || "").trim()
  if (!trimmed) return ""
  if (trimmed.length === 2) return trimmed.toLowerCase()
  const chars = Array.from(trimmed)
  if (chars.length < 2) return ""
  const codes = chars.slice(0, 2).map((char) => char.codePointAt(0) || 0)
  if (codes.some((code) => code < 0x1f1e6 || code > 0x1f1ff)) return ""
  return String.fromCharCode(codes[0] - 127397, codes[1] - 127397).toLowerCase()
}

function FlagBadge({ country, className }: { country: string; className?: string }) {
  const isoCode = toIsoCode(country)
  if (!isoCode) {
    return <span aria-label={country} className={cn("bg-slate-300", className)} />
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/${isoCode}.svg`}
      alt={country}
      crossOrigin="anonymous"
      className={cn("object-cover", className)}
    />
  )
}

function PlayerBadge({
  player,
  size = "md",
}: {
  player: Ideal7Player
  size?: "md" | "sm"
}) {
  const avatarIsImage = isImageUrl(player.avatar || "")
  const avatarIsEmoji = Boolean(player.avatar && !avatarIsImage)

  return (
    <div className={cn("relative", size === "sm" ? "h-12 w-12" : "h-16 w-16 sm:h-[74px] sm:w-[74px]")}>
      <div
        className={cn(
          "flex h-full w-full items-center justify-center rounded-full border border-slate-950/90 shadow-[0_14px_34px_rgba(2,6,23,0.5)]",
          player.kitImage ? "bg-slate-900/80" : "bg-slate-900/80 ring-1 ring-white/10"
        )}
        style={
          player.kitImage
            ? {
                backgroundImage: `url(${player.kitImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        {avatarIsImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.avatar}
            alt={player.playerName}
            className={cn(
              "rounded-full border border-slate-950/70 bg-slate-950/30 object-cover",
              size === "sm" ? "h-7 w-7" : "h-10 w-10 sm:h-12 sm:w-12"
            )}
          />
        ) : avatarIsEmoji ? (
          <span className={cn("leading-none", size === "sm" ? "text-lg" : "text-2xl")}>{player.avatar}</span>
        ) : null}
      </div>

      {player.teamImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={player.teamImage}
          alt={player.teamName}
          className={cn(
            "absolute rounded-full border border-white/10 bg-slate-950 object-cover ring-2 ring-slate-950",
            size === "sm" ? "-bottom-1 -left-1 h-4 w-4" : "-bottom-1.5 -left-1.5 h-6 w-6"
          )}
        />
      ) : null}

      {player.country ? (
        <FlagBadge
          country={player.country}
          className={cn(
            "absolute rounded-full ring-2 ring-slate-950",
            size === "sm" ? "-bottom-1 -right-1 h-4 w-4" : "-bottom-1.5 -right-1.5 h-5 w-5 sm:h-6 sm:w-6"
          )}
        />
      ) : null}
    </div>
  )
}

export function Ideal7Home({ players }: Ideal7HomeProps) {
  const [selectedFormation, setSelectedFormation] = useState<FormationKey>("1-2-1-3")
  const [isFormationOpen, setIsFormationOpen] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey>("champion")
  const [isThemeOpen, setIsThemeOpen] = useState(false)
  const [slots, setSlots] = useState<Array<string | null>>(Array(7).fill(null))
  const [activeSlot, setActiveSlot] = useState<number | null>(null)
  const [title, setTitle] = useState("IDEAL 7")
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [query, setQuery] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const boardRef = useRef<HTMLDivElement | null>(null)
  const themeMenuRef = useRef<HTMLDivElement | null>(null)
  const formationMenuRef = useRef<HTMLDivElement | null>(null)

  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players])
  const formationSlots = useMemo(() => getFormationSlots(selectedFormation), [selectedFormation])
  const activeTheme = useMemo(
    () => themes.find((theme) => theme.id === selectedTheme) ?? themes[0],
    [selectedTheme]
  )
  const orderedThemes = useMemo(
    () => themeOrder.map((themeId) => themes.find((theme) => theme.id === themeId)).filter(Boolean) as typeof themes,
    []
  )

  useEffect(() => {
    if (!isThemeOpen && !isFormationOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (themeMenuRef.current && !themeMenuRef.current.contains(target)) {
        setIsThemeOpen(false)
      }
      if (formationMenuRef.current && !formationMenuRef.current.contains(target)) {
        setIsFormationOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
    }
  }, [isThemeOpen, isFormationOpen])

  const filteredPlayers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return []
    }
    return players
      .filter((player) => player.playerName.toLowerCase().includes(normalizedQuery))
      .slice(0, 14)
  }, [players, query])

  const selectedCount = slots.filter(Boolean).length

  async function handleDownload() {
    if (!boardRef.current) {
      return
    }

    setIsDownloading(true)
    try {
      const dataUrl = await toPng(boardRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "transparent",
      })
      const link = document.createElement("a")
      link.href = dataUrl
      link.download = "ideal-7.png"
      link.click()
    } finally {
      setIsDownloading(false)
    }
  }

  function assignPlayer(playerId: string) {
    if (activeSlot === null) {
      return
    }

    setSlots((current) => {
      const next = [...current]
      next[activeSlot] = playerId
      return next
    })
    setActiveSlot(null)
    setQuery("")
    setMessage(null)
    setIsFormationOpen(false)
    setIsThemeOpen(false)
  }

  function clearLineup() {
    setSlots(Array(7).fill(null))
    setActiveSlot(null)
    setQuery("")
    setMessage(null)
  }

  function commitTitle() {
    const trimmed = title.trim()
    setTitle(trimmed ? trimmed.slice(0, 48) : "IDEAL 7")
    setIsEditingTitle(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(8,47,73,0.72))] p-4 shadow-[0_22px_70px_rgba(3,10,24,0.42)]">
          <div className="flex flex-col gap-4 rounded-[24px] border border-white/10 bg-slate-950/35 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/20 bg-slate-950/80 shadow-[0_12px_30px_rgba(2,6,23,0.38)]">
                <Image src="/ffl-logo.png" alt="Ideal 7" width={34} height={34} className="h-8 w-8 object-contain" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.35em] text-cyan-100/75">Minigame</div>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">Ideal 7</h1>
              </div>
            </div>

            {players.length ? (
              <div className="grid w-full gap-3 lg:max-w-2xl lg:grid-cols-[auto_auto] lg:items-center">
                <button
                  type="button"
                  onClick={clearLineup}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-[20px] border border-white/10 bg-slate-950/80 px-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/5"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Clear
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading || selectedCount === 0}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-[20px] bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  {isDownloading ? "Exporting..." : "Download image"}
                </button>
              </div>
            ) : null}
          </div>
        </section>

        {players.length ? (
          <div className="mt-8 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <section className="rounded-[30px] border border-white/10 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between gap-4 text-[11px] uppercase tracking-[0.35em] text-slate-500">
                <span>Ideal pitch</span>
                <div className="flex items-center gap-3">
                  <span>{selectedCount}/7 selected</span>
                  <div ref={themeMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsThemeOpen((value) => !value)
                        setIsFormationOpen(false)
                      }}
                      className="inline-flex h-10 items-center gap-3 rounded-full border border-cyan-300/20 bg-slate-950/85 px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.08)] transition hover:border-cyan-300/35"
                    >
                      <span>{activeTheme.label}</span>
                      <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", isThemeOpen ? "rotate-180" : "")} />
                    </button>
                    {isThemeOpen ? (
                      <div className="absolute right-0 top-[calc(100%+10px)] z-20 min-w-[170px] rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-[0_24px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl">
                        <div className="px-3 pb-2 pt-1 text-[10px] uppercase tracking-[0.3em] text-slate-500">Theme</div>
                        {orderedThemes.map((theme) => {
                          const isActive = theme.id === selectedTheme
                          return (
                            <button
                              key={theme.id}
                              type="button"
                              onClick={() => {
                                setSelectedTheme(theme.id)
                                setIsThemeOpen(false)
                              }}
                              className={cn(
                                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                                isActive
                                  ? "bg-cyan-400/15 text-cyan-100"
                                  : "text-slate-300 hover:bg-white/5 hover:text-white"
                              )}
                            >
                              <span>{theme.label}</span>
                              <span className={cn("h-3 w-3 rounded-full border border-white/10", theme.accentClass)} />
                            </button>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                  <div ref={formationMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsFormationOpen((value) => !value)
                        setIsThemeOpen(false)
                      }}
                      className="inline-flex h-10 items-center gap-3 rounded-full border border-cyan-300/20 bg-slate-950/85 px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.08)] transition hover:border-cyan-300/35"
                    >
                      <span>{selectedFormation}</span>
                      <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", isFormationOpen ? "rotate-180" : "")} />
                    </button>
                    {isFormationOpen ? (
                      <div className="absolute right-0 top-[calc(100%+10px)] z-20 min-w-[170px] rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-[0_24px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl">
                        <div className="px-3 pb-2 pt-1 text-[10px] uppercase tracking-[0.3em] text-slate-500">Formation</div>
                        {formations.map((formation) => {
                          const isActive = formation.id === selectedFormation
                          return (
                            <button
                              key={formation.id}
                              type="button"
                              onClick={() => {
                                setSelectedFormation(formation.id)
                                setIsFormationOpen(false)
                              }}
                              className={cn(
                                "flex w-full items-center rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                                isActive
                                  ? "bg-cyan-400/15 text-cyan-100"
                                  : "text-slate-300 hover:bg-white/5 hover:text-white"
                              )}
                            >
                              {formation.label}
                            </button>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-4 sm:p-6">
                <div
                  ref={boardRef}
                  className={cn(
                    "relative overflow-visible rounded-[28px] border border-white/10 px-5 pb-8 pt-8 sm:px-8",
                    activeTheme.panelClass,
                    activeTheme.frameClass
                  )}
                  style={activeTheme.pitchStyle}
                >
                  <div className={cn("pointer-events-none absolute inset-0 rounded-[28px]", activeTheme.overlayClass)} />
                  <div className={cn("pointer-events-none absolute left-1/2 top-4 h-48 w-[72%] -translate-x-1/2 blur-3xl", activeTheme.topGlowClass)} />
                  <div className={cn("pointer-events-none absolute bottom-6 left-[10%] h-36 w-[34%] blur-3xl", activeTheme.sideGlowClass)} />
                  <div className={cn("pointer-events-none absolute bottom-6 right-[10%] h-36 w-[34%] blur-3xl", activeTheme.sideGlowClass)} />
                  <div className="relative z-10">
                    <div className="mx-auto w-fit text-center">
                      <div className="relative mx-auto h-36 w-36 sm:h-44 sm:w-44" style={{ filter: activeTheme.logoGlow }}>
                        <div
                          className="absolute inset-0"
                          style={{
                            clipPath: "inset(0 50% 0 0)",
                            backgroundColor: activeTheme.accentColor,
                            WebkitMaskImage: "url(/ffl-logo2.png)",
                            WebkitMaskRepeat: "no-repeat",
                            WebkitMaskPosition: "center",
                            WebkitMaskSize: "contain",
                            maskImage: "url(/ffl-logo2.png)",
                            maskRepeat: "no-repeat",
                            maskPosition: "center",
                            maskSize: "contain",
                          }}
                        />
                        <div
                          className="absolute inset-0"
                          style={{
                            clipPath: "inset(0 0 0 50%)",
                            backgroundColor: "#ffffff",
                            WebkitMaskImage: "url(/ffl-logo2.png)",
                            WebkitMaskRepeat: "no-repeat",
                            WebkitMaskPosition: "center",
                            WebkitMaskSize: "contain",
                            maskImage: "url(/ffl-logo2.png)",
                            maskRepeat: "no-repeat",
                            maskPosition: "center",
                            maskSize: "contain",
                          }}
                        />
                      </div>
                      {isEditingTitle ? (
                        <textarea
                          autoFocus
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                          onBlur={commitTitle}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              setTitle("IDEAL 7")
                              setIsEditingTitle(false)
                            }
                          }}
                          className={cn(
                            "mt-1 min-h-[72px] w-[260px] resize-none overflow-hidden border-none bg-transparent px-0 text-center text-2xl font-semibold uppercase tracking-[0.26em] outline-none sm:w-[320px] sm:text-3xl",
                            activeTheme.titleClass
                          )}
                          style={{ filter: activeTheme.titleShadow }}
                          rows={2}
                          maxLength={48}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsEditingTitle(true)}
                          className={cn(
                            "mt-1 whitespace-pre-line text-2xl font-semibold uppercase tracking-[0.26em] transition hover:scale-[1.01] sm:text-3xl",
                            activeTheme.titleClass
                          )}
                          style={{ filter: activeTheme.titleShadow }}
                        >
                          {title}
                        </button>
                      )}
                    </div>

                    <div className="relative mt-3 min-h-[560px] sm:min-h-[620px]">
                      {formationSlots.map((point, index) => {
                        const playerId = slots[index]
                        const player = playerId ? playersById.get(playerId) ?? null : null

                        return (
                          <div
                            key={`${selectedFormation}-${index}`}
                            className="absolute -translate-x-1/2 -translate-y-1/2"
                            style={{ left: `${point.x}%`, top: `${point.y}%` }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                    setActiveSlot(index)
                    setQuery("")
                    setMessage(null)
                    setIsFormationOpen(false)
                    setIsThemeOpen(false)
                  }}
                              className={cn(
                                "group flex w-[120px] flex-col items-center gap-3 rounded-[24px] px-3 py-4 text-center transition",
                                player
                                  ? "bg-transparent"
                                  : "border border-dashed border-white/10 bg-cyan-400/6 hover:border-cyan-300/20 hover:bg-cyan-400/10"
                              )}
                            >
                              {player ? (
                                <>
                                  <PlayerBadge player={player} />
                                  <div className="line-clamp-2 text-base font-semibold leading-5 text-white">
                                    {player.playerName}
                                  </div>
                                </>
                              ) : (
                                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-white/10 bg-slate-900/70 text-slate-500 transition group-hover:border-cyan-300/20 group-hover:text-cyan-100 sm:h-[74px] sm:w-[74px]">
                                  <Search className="h-6 w-6" />
                                </div>
                              )}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[30px] border border-white/10 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between gap-4 text-[11px] uppercase tracking-[0.35em] text-slate-500">
                <span>Selection</span>
                <span>{players.length} players</span>
              </div>

              <div className="mt-4 rounded-[24px] border border-white/10 bg-slate-950/60 p-4">
                <div className="text-xl font-semibold text-white">Your Ideal 7</div>
                <div className="mt-2 text-sm text-slate-400">
                  Pick any historical player and place them wherever you want on the pitch.
                </div>
                <div className="mt-5 space-y-3">
                  {slots.some(Boolean) ? (
                    slots.map((playerId, index) => {
                      const player = playerId ? playersById.get(playerId) ?? null : null
                      return (
                        <button
                          key={`list-${index}`}
                          type="button"
                          onClick={() => {
                            setActiveSlot(index)
                            setQuery("")
                            setMessage(null)
                          }}
                          className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-left transition hover:border-cyan-300/20"
                        >
                          <div className="flex items-center gap-3">
                            {player ? <PlayerBadge player={player} size="sm" /> : <div className="h-12 w-12 rounded-full border border-dashed border-white/10 bg-slate-900/60" />}
                            <div>
                              <div className="text-sm font-semibold text-white">{player?.playerName ?? `Empty slot ${index + 1}`}</div>
                              <div className="text-xs text-slate-400">{player?.teamName ?? "Click to select a player"}</div>
                            </div>
                          </div>
                          <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Slot {index + 1}</div>
                        </button>
                      )
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/50 px-4 py-12 text-center text-slate-400">
                      Your lineup is empty. Start by clicking any slot on the pitch.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="mt-8 rounded-[30px] border border-dashed border-white/10 bg-slate-900/60 px-6 py-10 text-center text-slate-400">
            No historical players available for Ideal 7 yet.
          </div>
        )}
      </div>

      {activeSlot !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-slate-950/95 p-5 shadow-[0_40px_120px_rgba(2,6,23,0.65)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.34em] text-slate-500">Select player</div>
                <div className="mt-2 text-3xl font-semibold text-white">Ideal 7 picker</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveSlot(null)
                  setQuery("")
                  setMessage(null)
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-slate-900/80 text-slate-300 transition hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
              Selecting for <span className="font-semibold text-white">slot {activeSlot + 1}</span> · Formation{" "}
              <span className="font-semibold text-cyan-100">{selectedFormation}</span>
            </div>

            <div className="mt-4">
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setMessage(null)
                }}
                placeholder="Search player"
                className="h-14 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-5 text-white outline-none transition focus:border-cyan-300/40"
              />
            </div>

            <div className="mt-4 max-h-[460px] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/70 p-3">
              {query.trim() ? (
                filteredPlayers.length ? (
                  <div className="space-y-2">
                    {filteredPlayers.map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => assignPlayer(player.id)}
                        className="flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-left transition hover:border-cyan-300/25 hover:bg-slate-900"
                      >
                        <PlayerBadge player={player} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-white">{player.playerName}</div>
                          <div className="mt-1 truncate text-xs text-slate-400">
                            {player.teamName}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-400">
                    No players found for that search.
                  </div>
                )
              ) : (
                <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-400">
                  Start typing to search any historical player.
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-sm text-rose-200">{message}</div>
              <div className="flex gap-3">
                {slots[activeSlot] ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSlots((current) => {
                        const next = [...current]
                        next[activeSlot] = null
                        return next
                      })
                      setActiveSlot(null)
                      setQuery("")
                      setMessage(null)
                      setIsFormationOpen(false)
                      setIsThemeOpen(false)
                    }}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 font-medium text-rose-100 transition hover:bg-rose-400/15"
                  >
                    Remove player
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setActiveSlot(null)
                    setQuery("")
                    setMessage(null)
                    setIsFormationOpen(false)
                    setIsThemeOpen(false)
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/80 px-4 font-medium text-white transition hover:border-white/20"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}


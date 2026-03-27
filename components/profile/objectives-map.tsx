"use client"

import type { ProfileObjective } from "@/lib/services/profile.service"

type ObjectivesMapProps = {
  objectives: ProfileObjective[]
}

const GRID_ROWS = 7
const GRID_COLS = 14

const DIFFICULTY_LABELS = [
  "I - Rookie",
  "II - Por definir",
  "III - Por definir",
  "IV - Por definir",
  "V - Por definir",
  "VI - Champion",
  "VII - Fusion",
]

const ROOKIE_ORDER: Record<string, number> = {
  "matches-1": 1,
  "wins-1": 2,
  "goals-1": 3,
  "assists-1": 4,
  "cs-1": 5,
  "kicks-100": 6,
  "mvp-1": 7,
  "totw-1": 8,
  "impact-sub": 9,
  "new-colours": 10,
  captain: 11,
  "full-shift": 12,
  ups: 13,
  "double-threat": 14,
}

const SECOND_ORDER: Record<string, number> = {
  "matches-5": 1,
  "wins-5": 2,
  "goals-5": 3,
  "assists-5": 4,
  "cs-5": 5,
  "kicks-500": 6,
  "mvp-5": 7,
  "totw-5": 8,
  "all-stars": 9,
  nations: 10,
  "no-mercy": 11,
  comeback: 12,
  "seasons-3": 13,
  "pokers-1": 14,
}

const THIRD_ORDER: Record<string, number> = {
  "matches-10": 1,
  "wins-10": 2,
  "goals-10": 3,
  "assists-10": 4,
  "cs-10": 5,
  "kicks-1000": 6,
  "mvp-10": 7,
  "totw-10": 8,
  "rookie-placeholder-3": 9,
  "league-winner": 10,
  "summer-winner": 11,
  globetrotter: 12,
  "opening-strike": 13,
  versatile: 14,
}

const FOURTH_ORDER: Record<string, number> = {
  "matches-25": 1,
  "wins-25": 2,
  "goals-25": 3,
  "assists-25": 4,
  "cs-25": 5,
  "kicks-2500": 6,
  "mvp-15": 7,
  "totw-15": 8,
  "placeholder-4a": 9,
  "silent-genius": 10,
  "placeholder-4b": 11,
  "placeholder-4c": 12,
  "late-hero": 13,
  "placeholder-4d": 14,
}

const FIFTH_ORDER: Record<string, number> = {
  "matches-50": 1,
  "wins-50": 2,
  "goals-50": 3,
  "assists-50": 4,
  "cs-50": 5,
  "kicks-5000": 6,
  "mvp-20": 7,
  "totw-20": 8,
  "placeholder-5a": 9,
  "cup-winner": 10,
  "supercup-winner": 11,
  "perfect-start": 12,
  "one-club-man": 13,
  "placeholder-5b": 14,
}

const SIXTH_ORDER: Record<string, number> = {
  "matches-75": 1,
  "wins-75": 2,
  "goals-100": 3,
  "assists-100": 4,
  "cs-75": 5,
  "kicks-7500": 6,
  "mvp-25": 7,
  "totw-25": 8,
  "placeholder-6a": 9,
  treble: 10,
  "nations-winner": 11,
  "big-night": 12,
  "double-double": 13,
  invincible: 14,
}

const SEVENTH_ORDER: Record<string, number> = {
  "matches-100": 1,
  "wins-100": 2,
  "goals-250": 3,
  "assists-250": 4,
  "cs-100": 5,
  "kicks-10000": 6,
  "mvp-30": 7,
  "totw-30": 8,
  "placeholder-7a": 9,
  "league-dynasty": 10,
  "best-award": 11,
  "double-century": 12,
  "seasons-10": 13,
  "goal-minutes-0-20": 14,
}

const CATEGORY_STYLES: Record<string, { frame: string; glow: string; accent: string }> = {
  Matches: { frame: "from-orange-300 via-orange-500 to-orange-900", glow: "shadow-[0_0_18px_rgba(251,146,60,0.28)]", accent: "border-orange-300/45" },
  Wins: { frame: "from-amber-300 via-orange-500 to-orange-900", glow: "shadow-[0_0_18px_rgba(251,146,60,0.22)]", accent: "border-orange-300/40" },
  Seasons: { frame: "from-amber-200 via-orange-400 to-stone-900", glow: "shadow-[0_0_18px_rgba(251,191,36,0.22)]", accent: "border-amber-300/40" },
  Teams: { frame: "from-amber-200 via-orange-500 to-stone-900", glow: "shadow-[0_0_18px_rgba(249,115,22,0.24)]", accent: "border-amber-300/40" },
  Goals: { frame: "from-yellow-100 via-amber-400 to-yellow-900", glow: "shadow-[0_0_18px_rgba(251,191,36,0.28)]", accent: "border-amber-300/45" },
  Braces: { frame: "from-yellow-100 via-amber-400 to-yellow-900", glow: "shadow-[0_0_18px_rgba(251,191,36,0.22)]", accent: "border-amber-300/40" },
  HatTricks: { frame: "from-yellow-100 via-amber-500 to-yellow-950", glow: "shadow-[0_0_18px_rgba(245,158,11,0.24)]", accent: "border-amber-300/40" },
  Pokers: { frame: "from-yellow-100 via-amber-500 to-yellow-950", glow: "shadow-[0_0_18px_rgba(245,158,11,0.24)]", accent: "border-amber-300/40" },
  Assists: { frame: "from-cyan-100 via-sky-400 to-cyan-950", glow: "shadow-[0_0_18px_rgba(34,211,238,0.24)]", accent: "border-cyan-300/40" },
  PreAssists: { frame: "from-cyan-100 via-sky-500 to-cyan-950", glow: "shadow-[0_0_18px_rgba(14,165,233,0.24)]", accent: "border-sky-300/40" },
  CS: { frame: "from-cyan-100 via-teal-400 to-cyan-950", glow: "shadow-[0_0_18px_rgba(45,212,191,0.24)]", accent: "border-teal-300/40" },
  Kicks: { frame: "from-teal-100 via-emerald-400 to-teal-950", glow: "shadow-[0_0_18px_rgba(45,212,191,0.2)]", accent: "border-emerald-300/40" },
  MVP: { frame: "from-violet-100 via-fuchsia-500 to-purple-950", glow: "shadow-[0_0_18px_rgba(168,85,247,0.24)]", accent: "border-fuchsia-300/40" },
  TOTW: { frame: "from-violet-100 via-purple-500 to-purple-950", glow: "shadow-[0_0_18px_rgba(147,51,234,0.24)]", accent: "border-purple-300/40" },
  Badges: { frame: "from-slate-100 via-slate-400 to-slate-950", glow: "shadow-[0_0_18px_rgba(148,163,184,0.18)]", accent: "border-slate-300/35" },
}

function getCategoryStyle(category: string) {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES.Badges
}

function iconColors(done: boolean) {
  return {
    stroke: done ? "rgba(255,255,255,0.88)" : "rgba(148,163,184,0.42)",
    fill: done ? "rgba(255,255,255,0.88)" : "rgba(148,163,184,0.42)",
  }
}

function GoalIcon({ done }: { done: boolean }) {
  const c = iconColors(done)
  return (
    <>
      <path d="M 0,-8.5 L 6.5,-4.5 L 4.2,4.2 L -4.2,4.2 L -6.5,-4.5 Z" fill={c.fill} />
      <path d="M 0,-13 L 0,-8.5 M 6.5,-4.5 L 11,-7 M 4.2,4.2 L 7.5,10 M -4.2,4.2 L -7.5,10 M -6.5,-4.5 L -11,-7" stroke={c.stroke} strokeWidth="1.15" strokeLinecap="round" />
    </>
  )
}

function AssistIcon({ done }: { done: boolean }) {
  const c = iconColors(done)
  return (
    <g fill="none" stroke={c.stroke} strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">
      <path d="M -10,6 Q 0,-9 10,0" />
      <path d="M 6,-3.5 L 10,0 L 5.5,3.5" />
    </g>
  )
}

function MatchIcon({ done }: { done: boolean }) {
  const c = iconColors(done)
  return (
    <g fill="none" stroke={c.stroke} strokeWidth="1.35" strokeLinecap="round">
      <rect x="-10" y="-6.5" width="20" height="13" rx="1.5" />
      <line x1="0" y1="-6.5" x2="0" y2="6.5" />
      <circle cx="0" cy="0" r="2.8" />
    </g>
  )
}

function WinIcon({ done }: { done: boolean }) {
  const c = iconColors(done)
  return <path fill="none" stroke={c.stroke} strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" d="M -5.5,-9 L 5.5,-9 L 5.5,2 Q 5.5,7.2 0,7.2 Q -5.5,7.2 -5.5,2 Z M -5.5,-5.5 Q -10,-5.5 -10,-1.2 Q -10,2.4 -5.5,2.4 M 5.5,-5.5 Q 10,-5.5 10,-1.2 Q 10,2.4 5.5,2.4 M -1.7,7.2 L -1.7,10 M 1.7,7.2 L 1.7,10 M -4.5,10 L 4.5,10" />
}

function CSIcon({ done }: { done: boolean }) {
  const c = iconColors(done)
  return <path fill="none" stroke={c.stroke} strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" d="M 0,-10 L 8,-6.2 L 8,0 Q 8,7 0,10.8 Q -8,7 -8,0 L -8,-6.2 Z" />
}

function KickIcon({ done }: { done: boolean }) {
  const c = iconColors(done)
  return <path fill="none" stroke={c.stroke} strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" d="M -4.5,-10 L -4.5,1 Q -4.5,4.5 -1,5.8 L 9,5.8 Q 10,5.8 10,4 Q 10,2 8,2 L 2,2 L 2,-10 Z" />
}

function MVPStar({ done }: { done: boolean }) {
  const c = iconColors(done)
  return <path d="M 0,-11 L 3.2,-4.2 L 11,-3.2 L 5.2,1.8 L 7.1,9.5 L 0,5.8 L -7.1,9.5 L -5.2,1.8 L -11,-3.2 L -3.2,-4.2 Z" fill={c.fill} />
}

function TotwIcon({ done }: { done: boolean }) {
  const c = iconColors(done)
  return (
    <g fill="none" stroke={c.stroke} strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round">
      <path d="M -10,-5.5 L 10,-5.5 L 7.5,9 L -7.5,9 Z" />
      <path d="M -4.5,-9 L -4.5,-5.5 M 4.5,-9 L 4.5,-5.5" />
      <path d="M -5,0 L -0.5,4 L 5.5,-2" />
    </g>
  )
}

function TeamIcon({ done }: { done: boolean }) {
  const c = iconColors(done)
  return (
    <g fill="none" stroke={c.stroke} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="0" cy="-4.5" r="2.8" />
      <circle cx="-6.5" cy="3" r="2.2" />
      <circle cx="6.5" cy="3" r="2.2" />
      <path d="M -3,-1 L -2,1.5 M 3,-1 L 2,1.5 M -4.2,7 L 4.2,7" />
    </g>
  )
}

function SeasonIcon({ done }: { done: boolean }) {
  const c = iconColors(done)
  return (
    <g fill="none" stroke={c.stroke} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
      <rect x="-9.5" y="-7" width="19" height="15" rx="2" />
      <line x1="-5.5" y1="-10" x2="-5.5" y2="-4.5" />
      <line x1="5.5" y1="-10" x2="5.5" y2="-4.5" />
      <line x1="-9.5" y1="-2.2" x2="9.5" y2="-2.2" />
    </g>
  )
}

function BadgeIcon({ badgeKey, done }: { badgeKey: string; done: boolean }) {
  const c = iconColors(done)
  switch (badgeKey) {
    case "impact-sub":
      return <path fill="none" stroke={c.stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M -9,0 L -1,0 M -5,-3.5 L -1,0 L -5,3.5 M 2,-6 L 8,-6 L 8,6 L 2,6" />
    case "new-colours":
      return <path fill="none" stroke={c.stroke} strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" d="M -9,-7 L -2,-7 L -2,8 L -9,8 Z M 2,-7 L 9,-7 L 9,8 L 2,8 Z" />
    case "captain":
      return <path fill="none" stroke={c.stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" d="M -6,8 L -1,-9 L 2,-1 L 8,-8 L 4,8" />
    case "full-shift":
      return <circle cx="0" cy="0" r="9" fill="none" stroke={c.stroke} strokeWidth="1.55" />
    case "ups":
      return <path fill="none" stroke={c.stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" d="M -9,-4 L -2,4 L 3,-1 L 9,6" />
    case "double-threat":
      return <><circle cx="-3.5" cy="0" r="2.7" fill={c.fill} /><circle cx="3.5" cy="0" r="2.7" fill={c.fill} /></>
    case "all-stars":
      return <path fill="none" stroke={c.stroke} strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" d="M -9,4 L -4,-8 L 0,2 L 4,-8 L 9,4 L 4.5,2 L 0,9 L -4.5,2 Z" />
    case "league-winner":
      return <path fill="none" stroke={c.stroke} strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" d="M -5.5,-9 L 5.5,-9 L 5.5,2 Q 5.5,7.2 0,7.2 Q -5.5,7.2 -5.5,2 Z M -1.7,7.2 L -1.7,10 M 1.7,7.2 L 1.7,10 M -4.5,10 L 4.5,10" />
    case "summer-winner":
      return <path fill="none" stroke={c.stroke} strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" d="M 0,-10 L 3,-2 L 10,-2 L 4,2.5 L 6.2,10 L 0,5.8 L -6.2,10 L -4,2.5 L -10,-2 L -3,-2 Z" />
    case "globetrotter":
      return <path fill="none" stroke={c.stroke} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" d="M -9,0 A 9,9 0 1 0 9,0 A 9,9 0 1 0 -9,0 M -9,0 L 9,0 M 0,-9 A 4,9 0 1 0 0,9 A 4,9 0 1 0 0,-9" />
    case "opening-strike":
      return <text x="0" y="4" textAnchor="middle" fontSize="10" fill={c.fill} fontFamily="system-ui,sans-serif" fontWeight="700">0’</text>
    case "silent-genius":
      return <path fill="none" stroke={c.stroke} strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" d="M -10,4 Q -3,-6 2,-1 Q 6,3 10,-2 M 3,-5 L 10,-2 L 5,4" />
    case "late-hero":
      return <path fill="none" stroke={c.stroke} strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" d="M 0,-9 A 9,9 0 1 1 -0.1,-9 M 0,-9 L 0,-1 M 0,-1 L 5,2" />
    case "cup-winner":
      return <path fill="none" stroke={c.stroke} strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" d="M -5.5,-9 L 5.5,-9 L 5.5,2 Q 5.5,7.2 0,7.2 Q -5.5,7.2 -5.5,2 Z M -5.5,-5.5 Q -10,-5.5 -10,-1.2 Q -10,2.4 -5.5,2.4 M 5.5,-5.5 Q 10,-5.5 10,-1.2 Q 10,2.4 5.5,2.4 M -1.7,7.2 L -1.7,10 M 1.7,7.2 L 1.7,10 M -4.5,10 L 4.5,10" />
    case "supercup-winner":
      return <path fill="none" stroke={c.stroke} strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" d="M 0,-10 L 2.5,-3 L 10,-3 L 4,1.5 L 6.5,9 L 0,5 L -6.5,9 L -4,1.5 L -10,-3 L -2.5,-3 Z" />
    case "perfect-start":
      return <path fill="none" stroke={c.stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" d="M -9,-2 L -4,-2 L -4,8 L -9,8 Z M -1,-6 L 4,-6 L 4,8 L -1,8 Z M 7,-10 L 12,-10 L 12,8 L 7,8 Z" />
    case "treble":
      return <path fill="none" stroke={c.stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" d="M -10,6 L -6,-6 L -2,6 M 0,6 L 4,-10 L 8,6 M -10,1 L 8,1" />
    case "nations-winner":
      return <path fill="none" stroke={c.stroke} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" d="M -9,7 Q -4,-10 1,-1 T 9,7 M -2,1 L 0,3.5 L 5,-1.5" />
    case "big-night":
      return <path fill="none" stroke={c.stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" d="M -10,5 L -4,-5 L 0,1 L 4,-8 L 10,-1" />
    case "invincible":
      return <path fill="none" stroke={c.stroke} strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" d="M 0,-10 L 8,-6 L 8,0 Q 8,7 0,10.5 Q -8,7 -8,0 L -8,-6 Z M -3,0 L -0.5,3 L 4,-2" />
    case "league-dynasty":
      return <path fill="none" stroke={c.stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" d="M -8,-8 L -3,-8 L -3,8 L -8,8 Z M -1,-10 L 4,-10 L 4,8 L -1,8 Z M 6,-6 L 11,-6 L 11,8 L 6,8 Z" />
    case "best-award":
      return <path d="M 0,-11 L 3.2,-4.2 L 11,-3.2 L 5.2,1.8 L 7.1,9.5 L 0,5.8 L -7.1,9.5 L -5.2,1.8 L -11,-3.2 L -3.2,-4.2 Z" fill="none" stroke={c.stroke} strokeWidth="1.2" />
    case "double-century":
      return <text x="0" y="4" textAnchor="middle" fontSize="8" fill={c.fill} fontFamily="system-ui,sans-serif" fontWeight="700">100</text>
    case "nations":
      return <path fill="none" stroke={c.stroke} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" d="M -9,7 Q -4,-10 1,-1 T 9,7" />
    case "no-mercy":
      return <path fill="none" stroke={c.stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M -9,7 L -3,-9 L 1,-1 L 5,-7 L 9,7" />
    case "comeback":
      return <path fill="none" stroke={c.stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M -9,3 Q -3,-6 2,-1 L 2,-7 L 9,-7 M 9,-7 L 6,-10 M 9,-7 L 6,-4" />
    case "versatile":
      return <path fill="none" stroke={c.stroke} strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" d="M 0,-10 L 0,10 M -10,0 L 10,0 M -7,-7 L 7,7 M 7,-7 L -7,7" />
    case "one-club-man":
      return <path fill="none" stroke={c.stroke} strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" d="M -9,-6 Q 0,-12 9,-6 L 9,6 Q 0,10 -9,6 Z" />
    case "invincible":
      return <path fill="none" stroke={c.stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M 0,-10 L 8,-6 L 8,0 Q 8,7 0,10.5 Q -8,7 -8,0 L -8,-6 Z M -3.5,0 L -1,3 L 4.5,-2.5" />
    case "double-double":
      return <path fill="none" stroke={c.stroke} strokeWidth="1.45" strokeLinecap="round" d="M -8,-7 L -3,-7 L -3,7 L -8,7 Z M 3,-7 L 8,-7 L 8,7 L 3,7 Z" />
    case "goal-minutes-0-20":
      return <text x="0" y="4" textAnchor="middle" fontSize="7.5" fill={c.fill} fontFamily="system-ui,sans-serif" fontWeight="700">20</text>
    default:
      return <MVPStar done={done} />
  }
}

function CategoryIcon({ category, done, badgeKey }: { category: string; done: boolean; badgeKey?: string }) {
  if (category === "Badges") return <BadgeIcon badgeKey={badgeKey || ""} done={done} />
  switch (category) {
    case "Matches": return <MatchIcon done={done} />
    case "Wins": return <WinIcon done={done} />
    case "Goals":
    case "Braces":
    case "HatTricks":
    case "Pokers": return <GoalIcon done={done} />
    case "Assists":
    case "PreAssists": return <AssistIcon done={done} />
    case "CS": return <CSIcon done={done} />
    case "Kicks": return <KickIcon done={done} />
    case "MVP": return <MVPStar done={done} />
    case "TOTW": return <TotwIcon done={done} />
    case "Teams": return <TeamIcon done={done} />
    case "Seasons": return <SeasonIcon done={done} />
    default: return <MVPStar done={done} />
  }
}

function getIconClass(category: string, badgeKey?: string) {
  if (category === "Wins") return "h-7.5 w-7.5"
  if (category === "Goals" || category === "Braces" || category === "HatTricks" || category === "Pokers") return "h-7.5 w-7.5"
  if (category === "MVP") return "h-7.5 w-7.5"
  if (category === "Badges" && badgeKey === "captain") return "h-7.5 w-7.5"
  return "h-8 w-8"
}

function buildRows(objectives: ProfileObjective[]) {
  const sortedByCategory = new Map<string, ProfileObjective[]>()

  for (const objective of objectives) {
    const list = sortedByCategory.get(objective.category) ?? []
    list.push(objective)
    sortedByCategory.set(objective.category, list)
  }

  for (const list of sortedByCategory.values()) {
    list.sort((a, b) => a.target - b.target || a.label.localeCompare(b.label, "es", { sensitivity: "base" }))
  }

  const difficultyByKey = new Map<string, number>()

  for (const [category, list] of sortedByCategory.entries()) {
    if (category === "Badges") {
      const badgeDifficulty: Record<string, number> = {
        "impact-sub": 1,
        "new-colours": 1,
        captain: 1,
        "full-shift": 1,
        ups: 1,
        "double-threat": 1,
        "all-stars": 2,
        nations: 2,
        "no-mercy": 2,
        comeback: 2,
        "league-winner": 3,
        "summer-winner": 3,
        globetrotter: 3,
        "opening-strike": 3,
        "rookie-placeholder-3": 3,
        versatile: 3,
        "placeholder-4a": 4,
        "silent-genius": 4,
        "placeholder-4b": 4,
        "placeholder-4c": 4,
        "late-hero": 4,
        "placeholder-4d": 4,
        "placeholder-5a": 5,
        "placeholder-5b": 5,
        "cup-winner": 5,
        "supercup-winner": 5,
        "perfect-start": 5,
        "one-club-man": 5,
        "placeholder-6a": 6,
        treble: 6,
        "nations-winner": 6,
        "big-night": 6,
        "double-double": 6,
        invincible: 6,
        "placeholder-7a": 7,
        "league-dynasty": 7,
        "best-award": 7,
        "double-century": 7,
        "goal-minutes-0-20": 7,
      }

      for (const objective of list) {
        difficultyByKey.set(objective.key, badgeDifficulty[objective.key] ?? 4)
      }
      continue
    }

    const maxIndex = Math.max(list.length - 1, 1)
    list.forEach((objective, index) => {
      const difficulty = Math.min(GRID_ROWS, Math.max(1, Math.round((index / maxIndex) * (GRID_ROWS - 1)) + 1))
      difficultyByKey.set(objective.key, difficulty)
    })
  }

  difficultyByKey.set("matches-1", 1)
  difficultyByKey.set("wins-1", 1)
  difficultyByKey.set("goals-1", 1)
  difficultyByKey.set("assists-1", 1)
  difficultyByKey.set("cs-1", 1)
  difficultyByKey.set("kicks-100", 1)
  difficultyByKey.set("mvp-1", 1)
  difficultyByKey.set("totw-1", 1)
  difficultyByKey.set("matches-5", 2)
  difficultyByKey.set("wins-5", 2)
  difficultyByKey.set("goals-5", 2)
  difficultyByKey.set("assists-5", 2)
  difficultyByKey.set("cs-5", 2)
  difficultyByKey.set("kicks-500", 2)
  difficultyByKey.set("mvp-5", 2)
  difficultyByKey.set("totw-5", 2)
  difficultyByKey.set("seasons-3", 2)
  difficultyByKey.set("pokers-1", 2)
  difficultyByKey.set("matches-10", 3)
  difficultyByKey.set("wins-10", 3)
  difficultyByKey.set("goals-10", 3)
  difficultyByKey.set("assists-10", 3)
  difficultyByKey.set("cs-10", 3)
  difficultyByKey.set("kicks-1000", 3)
  difficultyByKey.set("mvp-10", 3)
  difficultyByKey.set("totw-10", 3)
  difficultyByKey.set("matches-25", 4)
  difficultyByKey.set("wins-25", 4)
  difficultyByKey.set("goals-25", 4)
  difficultyByKey.set("assists-25", 4)
  difficultyByKey.set("cs-25", 4)
  difficultyByKey.set("kicks-2500", 4)
  difficultyByKey.set("mvp-15", 4)
  difficultyByKey.set("totw-15", 4)
  difficultyByKey.set("matches-50", 5)
  difficultyByKey.set("wins-50", 5)
  difficultyByKey.set("goals-50", 5)
  difficultyByKey.set("assists-50", 5)
  difficultyByKey.set("cs-50", 5)
  difficultyByKey.set("kicks-5000", 5)
  difficultyByKey.set("mvp-20", 5)
  difficultyByKey.set("totw-20", 5)
  difficultyByKey.set("braces-20", 6)
  difficultyByKey.set("matches-75", 6)
  difficultyByKey.set("wins-75", 6)
  difficultyByKey.set("goals-100", 6)
  difficultyByKey.set("assists-100", 6)
  difficultyByKey.set("cs-75", 6)
  difficultyByKey.set("kicks-7500", 6)
  difficultyByKey.set("mvp-25", 6)
  difficultyByKey.set("totw-25", 6)
  difficultyByKey.set("matches-100", 7)
  difficultyByKey.set("wins-100", 7)
  difficultyByKey.set("goals-250", 7)
  difficultyByKey.set("assists-250", 7)
  difficultyByKey.set("cs-100", 7)
  difficultyByKey.set("kicks-10000", 7)
  difficultyByKey.set("mvp-30", 7)
  difficultyByKey.set("totw-30", 7)
  difficultyByKey.set("seasons-1", 4)
  difficultyByKey.set("teams-1", 4)
  difficultyByKey.set("preassists-1", 4)
  difficultyByKey.set("seasons-10", 7)

  const rows = Array.from({ length: GRID_ROWS }, () => [] as ProfileObjective[])

  const sortedObjectives = [...objectives].sort((a, b) => {
    const difficultyDiff = (difficultyByKey.get(a.key) ?? 1) - (difficultyByKey.get(b.key) ?? 1)
    if (difficultyDiff !== 0) return difficultyDiff
    if ((difficultyByKey.get(a.key) ?? 1) === 1 && (difficultyByKey.get(b.key) ?? 1) === 1) {
      const rookieDiff = (ROOKIE_ORDER[a.key] ?? 999) - (ROOKIE_ORDER[b.key] ?? 999)
      if (rookieDiff !== 0) return rookieDiff
    }
    if ((difficultyByKey.get(a.key) ?? 1) === 2 && (difficultyByKey.get(b.key) ?? 1) === 2) {
      const secondDiff = (SECOND_ORDER[a.key] ?? 999) - (SECOND_ORDER[b.key] ?? 999)
      if (secondDiff !== 0) return secondDiff
    }
    if ((difficultyByKey.get(a.key) ?? 1) === 3 && (difficultyByKey.get(b.key) ?? 1) === 3) {
      const thirdDiff = (THIRD_ORDER[a.key] ?? 999) - (THIRD_ORDER[b.key] ?? 999)
      if (thirdDiff !== 0) return thirdDiff
    }
    if ((difficultyByKey.get(a.key) ?? 1) === 4 && (difficultyByKey.get(b.key) ?? 1) === 4) {
      const fourthDiff = (FOURTH_ORDER[a.key] ?? 999) - (FOURTH_ORDER[b.key] ?? 999)
      if (fourthDiff !== 0) return fourthDiff
    }
    if ((difficultyByKey.get(a.key) ?? 1) === 5 && (difficultyByKey.get(b.key) ?? 1) === 5) {
      const fifthDiff = (FIFTH_ORDER[a.key] ?? 999) - (FIFTH_ORDER[b.key] ?? 999)
      if (fifthDiff !== 0) return fifthDiff
    }
    if ((difficultyByKey.get(a.key) ?? 1) === 6 && (difficultyByKey.get(b.key) ?? 1) === 6) {
      const sixthDiff = (SIXTH_ORDER[a.key] ?? 999) - (SIXTH_ORDER[b.key] ?? 999)
      if (sixthDiff !== 0) return sixthDiff
    }
    if ((difficultyByKey.get(a.key) ?? 1) === 7 && (difficultyByKey.get(b.key) ?? 1) === 7) {
      const seventhDiff = (SEVENTH_ORDER[a.key] ?? 999) - (SEVENTH_ORDER[b.key] ?? 999)
      if (seventhDiff !== 0) return seventhDiff
    }
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category, "es", { sensitivity: "base" })
    }
    return a.target - b.target || a.label.localeCompare(b.label, "es", { sensitivity: "base" })
  })

  for (const objective of sortedObjectives) {
    const difficulty = difficultyByKey.get(objective.key) ?? 1
    rows[difficulty - 1].push(objective)
  }

  return rows.map((row, index) => ({
    label: DIFFICULTY_LABELS[index],
    objectives: row.slice(0, GRID_COLS),
  }))
}

function ObjectiveBadge({ objective }: { objective: ProfileObjective }) {
  const style = getCategoryStyle(objective.category)
  const done = objective.completed

  return (
    <div
      className={[
        "group relative h-[92px] rounded-[16px] border p-1.5 transition-all duration-300",
        done ? `${style.accent} bg-slate-950/85 ${style.glow}` : "border-white/8 bg-slate-950/35 opacity-60",
      ].join(" ")}
      title={`${objective.label} - ${objective.description}`}
    >
      <div className={`absolute inset-0 rounded-[14px] bg-gradient-to-b ${style.frame} ${done ? "opacity-95" : "opacity-14"} transition-opacity`} />
      <div className="absolute inset-[2px] rounded-[12px] border border-white/10 bg-[radial-gradient(circle_at_50%_24%,rgba(255,255,255,0.18),rgba(2,6,23,0.96))]" />

      <div className="relative grid h-full grid-rows-[1fr_24px] overflow-hidden rounded-[12px] px-1 pt-1 pb-1">
        <div className="-translate-y-0.5 flex items-end justify-center">
          <svg viewBox="-16 -16 32 32" className={`${getIconClass(objective.category, objective.key)} overflow-visible`}>
            <CategoryIcon category={objective.category} badgeKey={objective.key} done={done} />
          </svg>
        </div>

        <div className="flex items-end justify-center px-1 text-center">
          <div className={`line-clamp-2 text-[8px] font-semibold leading-[1.02] ${done ? "text-white" : "text-slate-300"}`}>
            {objective.label}
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyBadge() {
  return <div className="aspect-square rounded-[16px] border border-dashed border-white/6 bg-slate-950/20" />
}

export function ObjectivesMap({ objectives }: ObjectivesMapProps) {
  const rows = buildRows(objectives)
  const visibleObjectives = rows.flatMap((row) => row.objectives)
  const completedCount = visibleObjectives.filter((objective) => objective.completed).length
  const totalCount = visibleObjectives.length
  const pct = Math.round((completedCount / Math.max(totalCount, 1)) * 100)

  return (
    <section className="mt-8 rounded-[32px] border border-white/10 bg-slate-900/70 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Objectives Board</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-4">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Progress</div>
          <div className="mt-2 text-3xl font-semibold text-white">
            {completedCount}
            <span className="text-lg text-slate-400">/{totalCount}</span>
          </div>
          <div className="mt-2 h-2 w-36 rounded-full bg-white/10">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-teal-300 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-4 md:p-5">
        <div className="grid grid-cols-[96px_repeat(14,minmax(0,1fr))] gap-2">
          {rows.map((row) => (
            <div key={row.label} className="contents">
              <div className="flex min-h-[68px] flex-col justify-center rounded-[16px] border border-white/8 bg-slate-950/45 px-3">
                <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Tier</span>
                <span className="mt-1.5 text-xs font-semibold text-white">{row.label}</span>
              </div>

              {Array.from({ length: GRID_COLS }, (_, colIndex) => {
                const cell = row.objectives[colIndex]
                return cell ? (
                  <ObjectiveBadge key={cell.key} objective={cell} />
                ) : (
                  <EmptyBadge key={`empty-${row.label}-${colIndex}`} />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

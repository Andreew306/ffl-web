"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, ArrowRight, ChevronDown, Search, X } from "lucide-react"
import {
  setFantasyOpenLineupFormationAction,
  setFantasyOpenLineupPlayerAction,
} from "@/app/fantasy/actions"
import { cn, getFlagBackgroundStyle, isImageUrl, shouldOverlayFlag } from "@/lib/utils"

type OpenPlayer = {
  id: string
  playerObjectId: string
  playerId: number
  playerName: string
  country: string
  avatar?: string
  teamName?: string
  teamImage?: string
  kitImage?: string
  kitTextColor?: string
  position?: string | null
}

type OpenWeek = {
  week: number
  formation: string
  locked: boolean
  roster: Array<
    OpenPlayer & {
      slot: "GK" | "DEF" | "MID" | "ATT" | "FLEX" | "BENCH"
      slotIndex?: number
      weekPoints: number
    }
  >
}

type Props = {
  leagueId: string
  currentWeek: number
  weeks: OpenWeek[]
  availablePlayers: OpenPlayer[]
}

type FormationKey = "1-3-2-1" | "1-3-1-2" | "1-2-1-3" | "1-2-2-2" | "1-1-2-3" | "1-1-3-2"
type SlotGroup = "GK" | "DEF" | "MID" | "ATT"

const formations: Array<{ id: FormationKey; label: string }> = [
  { id: "1-3-2-1", label: "1-3-2-1" },
  { id: "1-3-1-2", label: "1-3-1-2" },
  { id: "1-2-1-3", label: "1-2-1-3" },
  { id: "1-2-2-2", label: "1-2-2-2" },
  { id: "1-1-2-3", label: "1-1-2-3" },
  { id: "1-1-3-2", label: "1-1-3-2" },
]

const slotLabels: Record<SlotGroup, string> = {
  GK: "GK",
  DEF: "CB/LB/RB",
  MID: "DM/CM/AM",
  ATT: "LW/RW/ST",
}

function getTwemojiUrl(emoji: string) {
  const codePoints = Array.from(emoji).map((c) => c.codePointAt(0)?.toString(16)).join("-")
  return `https://twemoji.maxcdn.com/v/latest/72x72/${codePoints}.png`
}

function FlagBadge({ country, className }: { country: string; className?: string }) {
  const baseStyle = getFlagBackgroundStyle(country)
  const overlayUrl = shouldOverlayFlag(country) ? getTwemojiUrl(country) : ""
  const backgroundImage = overlayUrl
    ? baseStyle.backgroundImage
      ? `url(${overlayUrl}), ${baseStyle.backgroundImage}`
      : `url(${overlayUrl})`
    : baseStyle.backgroundImage

  return (
    <span
      aria-label={country}
      className={className}
      style={{
        ...baseStyle,
        backgroundImage,
        backgroundPosition: overlayUrl ? `center, ${baseStyle.backgroundPosition || "center"}` : baseStyle.backgroundPosition,
        backgroundSize: overlayUrl ? `cover, ${baseStyle.backgroundSize || "cover"}` : baseStyle.backgroundSize,
        backgroundRepeat: overlayUrl ? `no-repeat, ${baseStyle.backgroundRepeat || "no-repeat"}` : baseStyle.backgroundRepeat,
      }}
    />
  )
}

function getOpenFormationSlots(formation: string): SlotGroup[] {
  const [gkRaw, defRaw, midRaw, attRaw] = formation.split("-").map((value) => Number.parseInt(value, 10))
  const gk = Number.isFinite(gkRaw) ? gkRaw : 1
  const def = Number.isFinite(defRaw) ? defRaw : 2
  const mid = Number.isFinite(midRaw) ? midRaw : 1
  const att = Number.isFinite(attRaw) ? attRaw : 3

  return [
    ...Array.from({ length: gk }, () => "GK" as const),
    ...Array.from({ length: def }, () => "DEF" as const),
    ...Array.from({ length: mid }, () => "MID" as const),
    ...Array.from({ length: att }, () => "ATT" as const),
  ]
}

function isPlayerValidForGroup(player: OpenPlayer, group: SlotGroup) {
  const position = String(player.position ?? "").toUpperCase()
  if (group === "GK") return position === "GK"
  if (group === "DEF") return ["CB", "LB", "RB"].includes(position)
  if (group === "MID") return ["DM", "CM", "AM"].includes(position)
  return ["LW", "RW", "ST"].includes(position)
}

function PlayerToken({
  player,
  onClick,
  compact = false,
}: {
  player: OpenPlayer & { weekPoints: number }
  onClick?: () => void
  compact?: boolean
}) {
  return (
    <div className={cn("group relative flex flex-col items-center text-center", compact ? "gap-1" : "gap-2")}>
      <div className="relative">
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "transition",
            onClick ? "cursor-pointer hover:scale-[1.03]" : "cursor-default",
            compact
              ? "flex h-12 w-12 items-center justify-center rounded-full border shadow-[0_10px_24px_rgba(2,6,23,0.45)]"
              : "flex h-16 w-16 items-center justify-center rounded-full border shadow-[0_14px_34px_rgba(2,6,23,0.5)] sm:h-20 sm:w-20",
            player.kitImage ? "border-slate-900/90 bg-slate-900/80" : "border-white/10 bg-slate-900/80"
          )}
          aria-label={player.playerName}
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
          {player.avatar && isImageUrl(player.avatar) ? (
            <div className={cn("flex items-center justify-center rounded-full border border-slate-950/70 bg-slate-950/35", compact ? "h-8 w-8" : "h-10 w-10 sm:h-12 sm:w-12")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={player.avatar} alt={player.playerName} className="h-full w-full rounded-full object-cover" />
            </div>
          ) : player.avatar ? (
            <span className={compact ? "text-lg" : "text-2xl"}>{player.avatar}</span>
          ) : null}
        </button>

        <div
          className={cn(
            "absolute rounded-full border border-cyan-300/20 bg-cyan-400/10 font-semibold text-cyan-100 ring-2 ring-slate-950",
            compact ? "-top-1 -right-1 min-w-[18px] px-1 py-0.5 text-[9px]" : "-top-1.5 -right-1.5 min-w-[22px] px-1.5 py-0.5 text-[10px] sm:min-w-[24px]"
          )}
        >
          {player.weekPoints}
        </div>

        {player.country ? (
          <FlagBadge
            country={player.country}
            className={cn(
              "absolute rounded-full ring-2 ring-slate-950",
              compact ? "-bottom-1 -right-1 h-4 w-4" : "-bottom-1.5 -right-1.5 h-5 w-5 sm:h-6 sm:w-6"
            )}
          />
        ) : null}

        {player.teamImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.teamImage}
            alt={player.teamName || player.playerName}
            className={cn(
              "absolute rounded-full border border-white/10 bg-slate-950 object-cover ring-2 ring-slate-950",
              compact ? "-bottom-1 -left-1 h-5 w-5" : "-bottom-1.5 -left-1.5 h-6 w-6 sm:h-7 sm:w-7"
            )}
          />
        ) : null}
      </div>

      <div className={cn("space-y-0.5", compact ? "max-w-[88px]" : "max-w-[110px]")}>
        <Link
          href={`/players/${player.playerId}`}
          className={cn(
            "block font-semibold text-white transition hover:text-cyan-200",
            compact ? "text-[11px] leading-3" : "text-sm leading-4 sm:text-base"
          )}
        >
          {player.playerName}
        </Link>
      </div>
    </div>
  )
}

export default function FantasyOpenRosterBoard({ leagueId, currentWeek, weeks, availablePlayers }: Props) {
  const [selectedWeek, setSelectedWeek] = useState(
    weeks.some((entry) => entry.week === currentWeek) ? currentWeek : (weeks[weeks.length - 1]?.week ?? currentWeek)
  )
  const [formationOpen, setFormationOpen] = useState(false)
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null)
  const [query, setQuery] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const formationRef = useRef<HTMLDivElement | null>(null)
  const pickerRef = useRef<HTMLDivElement | null>(null)

  const activeWeek = useMemo(
    () => weeks.find((entry) => entry.week === selectedWeek) ?? weeks[0] ?? null,
    [selectedWeek, weeks]
  )

  const formationSlots = useMemo(
    () => getOpenFormationSlots(activeWeek?.formation ?? "1-2-1-3"),
    [activeWeek?.formation]
  )

  const playersBySlot = useMemo(
    () => new Map((activeWeek?.roster ?? []).map((player) => [player.slotIndex ?? -1, player])),
    [activeWeek]
  )

  const slotsByGroup = useMemo(() => {
    const grouped: Record<SlotGroup, number[]> = { GK: [], DEF: [], MID: [], ATT: [] }
    formationSlots.forEach((slot, index) => grouped[slot].push(index))
    return grouped
  }, [formationSlots])

  const selectedSlotGroup = selectedSlotIndex !== null ? formationSlots[selectedSlotIndex] ?? null : null
  const selectedIds = useMemo(() => new Set((activeWeek?.roster ?? []).map((player) => player.playerObjectId)), [activeWeek])
  const currentSlotPlayerObjectId = selectedSlotIndex !== null ? playersBySlot.get(selectedSlotIndex)?.playerObjectId ?? null : null

  const filteredPlayers = useMemo(() => {
    const lower = query.trim().toLowerCase()

    return availablePlayers
      .filter((player) => {
        if (!selectedSlotGroup) return false
        if (!isPlayerValidForGroup(player, selectedSlotGroup)) return false
        if (selectedIds.has(player.playerObjectId) && player.playerObjectId !== currentSlotPlayerObjectId) return false
        if (!lower) return true

        return (
          player.playerName.toLowerCase().includes(lower) ||
          player.teamName?.toLowerCase().includes(lower) ||
          player.position?.toLowerCase().includes(lower)
        )
      })
      .slice(0, 30)
  }, [availablePlayers, selectedSlotGroup, selectedIds, currentSlotPlayerObjectId, query])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (formationRef.current && !formationRef.current.contains(event.target as Node)) {
        setFormationOpen(false)
      }
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setSelectedSlotIndex(null)
        setQuery("")
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function updateFormation(nextFormation: FormationKey) {
    if (!activeWeek || activeWeek.locked) return
    setFormationOpen(false)
    startTransition(async () => {
      const result = await setFantasyOpenLineupFormationAction(leagueId, activeWeek.week, nextFormation)
      if (!result.ok) {
        setMessage(result.error)
      }
    })
  }

  async function updateSlot(slotIndex: number, playerObjectId: string | null) {
    if (!activeWeek || activeWeek.locked) return
    startTransition(async () => {
      const result = await setFantasyOpenLineupPlayerAction(leagueId, activeWeek.week, slotIndex, playerObjectId)
      if (!result.ok) {
        setMessage(result.error)
        return
      }

      setSelectedSlotIndex(null)
      setQuery("")
      setMessage(null)
    })
  }

  function renderSlotButton(slotIndex: number, compact = false) {
    const player = playersBySlot.get(slotIndex)

    if (player) {
      return (
        <PlayerToken
          key={slotIndex}
          player={player}
          compact={compact}
          onClick={activeWeek?.locked ? undefined : () => setSelectedSlotIndex(slotIndex)}
        />
      )
    }

    return (
      <button
        key={slotIndex}
        type="button"
        disabled={activeWeek?.locked || pending}
        onClick={() => {
          setSelectedSlotIndex(slotIndex)
          setQuery("")
          setMessage(null)
        }}
        className={cn(
          "group flex flex-col items-center justify-center text-center transition",
          compact ? "gap-1" : "gap-2",
          activeWeek?.locked ? "cursor-not-allowed opacity-55" : "hover:scale-[1.03]"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center rounded-full border border-white/10 bg-slate-900/80 text-slate-500 shadow-[0_14px_34px_rgba(2,6,23,0.5)] transition",
            compact ? "h-12 w-12" : "h-16 w-16 sm:h-20 sm:w-20"
          )}
        >
          <Search className={compact ? "h-5 w-5" : "h-7 w-7"} />
        </div>
      </button>
    )
  }

  function renderLine(slotIndexes: number[]) {
    return slotIndexes.map((slotIndex) => renderSlotButton(slotIndex))
  }

  const fieldPattern = {
    backgroundImage: `
      radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)
    `,
    backgroundSize: "18px 18px",
    backgroundPosition: "0 0",
  } as const

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[30px] border border-white/10 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.35em] text-slate-500">
            <span>Roster pitch</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedWeek((week) => Math.max(weeks[0]?.week ?? 1, week - 1))
                  setSelectedSlotIndex(null)
                }}
                disabled={selectedWeek <= (weeks[0]?.week ?? selectedWeek)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 text-slate-300 transition hover:border-cyan-300/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div ref={formationRef} className="relative">
                <button
                  type="button"
                  disabled={activeWeek?.locked}
                  onClick={() => setFormationOpen((value) => !value)}
                  className="flex items-center gap-3 rounded-full border border-cyan-300/20 bg-slate-950/85 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.08)] disabled:opacity-60"
                >
                  Week {activeWeek?.week ?? currentWeek} · {activeWeek?.formation ?? "1-2-1-3"}
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
                {formationOpen ? (
                  <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-[0_18px_60px_rgba(2,6,23,0.5)]">
                    {formations.map((formation) => (
                      <button
                        key={formation.id}
                        type="button"
                        onClick={() => void updateFormation(formation.id)}
                        className={cn(
                          "flex w-full items-center rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-white/5",
                          activeWeek?.formation === formation.id ? "bg-cyan-400/15 text-white" : ""
                        )}
                      >
                        {formation.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedWeek((week) => Math.min(weeks[weeks.length - 1]?.week ?? week, week + 1))
                  setSelectedSlotIndex(null)
                }}
                disabled={selectedWeek >= (weeks[weeks.length - 1]?.week ?? selectedWeek)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 text-slate-300 transition hover:border-cyan-300/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-4 sm:p-6">
            <div
              className="relative min-h-[700px] overflow-visible rounded-[28px] border border-slate-800/80 bg-[#0a0f1a] p-5"
              style={fieldPattern}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_30%),linear-gradient(180deg,rgba(2,6,23,0.06)_0%,rgba(2,6,23,0.28)_100%)]" />
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-8 w-52 -translate-x-1/2 text-center sm:top-10">
                  <div className="mx-auto flex w-fit items-center justify-center p-1">
                    <Image src="/ffl-logo.png" alt="FFL Logo" width={68} height={68} className="h-16 w-16 object-contain sm:h-20 sm:w-20" />
                  </div>
                  <div className="mt-3 text-2xl font-semibold tracking-[0.26em] text-white sm:text-3xl">FANTASY</div>
                </div>
                <div className="absolute left-1/2 top-[19%] h-[67%] w-[82%] -translate-x-1/2">
                  <div className="absolute inset-0 flex flex-col justify-between">
                    {[0, 1, 2, 3].map((line) => (
                      <div key={line} className="relative h-px bg-white/8" />
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative z-10 flex h-full min-h-[520px] flex-col items-center justify-between px-3 pb-0 pt-52 sm:px-8 sm:pt-56">
                <div className="flex min-h-[126px] w-full items-center justify-center gap-8 sm:gap-16">
                  {renderLine(slotsByGroup.ATT)}
                </div>
                <div className="flex min-h-[126px] w-full items-center justify-center gap-8 sm:gap-16">
                  {renderLine(slotsByGroup.MID)}
                </div>
                <div className="flex min-h-[126px] w-full items-center justify-center gap-8 sm:gap-16">
                  {renderLine(slotsByGroup.DEF)}
                </div>
                <div className="flex min-h-[126px] w-full items-center justify-center">
                  {renderLine(slotsByGroup.GK)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.35em] text-slate-500">
            <span className="flex items-center gap-2 text-base font-semibold normal-case tracking-normal text-white">
              <Search className="h-5 w-5 text-sky-300" />
              Lineup slots
            </span>
            <span>{activeWeek?.locked ? "Locked" : "Editable"}</span>
          </div>

          <div className="mt-5 grid min-h-[700px] gap-4 content-start">
            {(["ATT", "MID", "DEF", "GK"] as const).map((group) => (
              <div key={group} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-500">{group}</div>
                    <div className="mt-1 text-sm font-semibold text-white">{slotLabels[group]}</div>
                  </div>
                  <div className="text-xs text-slate-500">{slotsByGroup[group].length} slots</div>
                </div>
                <div className="mt-4 flex min-h-[92px] flex-wrap items-start gap-4">
                  {slotsByGroup[group].map((slotIndex) => renderSlotButton(slotIndex, true))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedSlotIndex !== null ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div ref={pickerRef} className="w-full max-w-xl rounded-[28px] border border-white/10 bg-slate-900 p-6 shadow-[0_25px_80px_rgba(3,10,24,0.6)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Open lineup</div>
                <h2 className="mt-2 text-2xl font-semibold text-white">Select {selectedSlotGroup ? slotLabels[selectedSlotGroup] : "player"}</h2>
                <div className="mt-1 text-sm text-slate-400">
                  Only players valid for this slot can be selected.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSlotIndex(null)
                  setQuery("")
                  setMessage(null)
                }}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
              <div className="flex items-center gap-3 text-slate-400">
                <Search className="h-4 w-4" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={`Search ${selectedSlotGroup ? slotLabels[selectedSlotGroup] : "player"}`}
                  className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {playersBySlot.get(selectedSlotIndex) ? (
                <button
                  type="button"
                  onClick={() => void updateSlot(selectedSlotIndex, null)}
                  className="flex w-full items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100 hover:bg-rose-500/20"
                >
                  Clear this slot
                </button>
              ) : null}

              {filteredPlayers.length ? (
                filteredPlayers.map((player) => (
                  <button
                    key={player.playerObjectId}
                    type="button"
                    onClick={() => void updateSlot(selectedSlotIndex, player.playerObjectId)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-left transition hover:border-cyan-300/30 hover:bg-white/5"
                  >
                    <div
                      className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-900/80"
                      style={player.kitImage ? { backgroundImage: `url(${player.kitImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                    >
                      {player.avatar && isImageUrl(player.avatar) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={player.avatar} alt={player.playerName} className="h-9 w-9 rounded-full object-cover" />
                      ) : player.avatar ? (
                        <span className="text-lg">{player.avatar}</span>
                      ) : null}
                      {player.teamImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={player.teamImage} alt="" className="absolute -bottom-1 -left-1 h-4 w-4 rounded-full ring-2 ring-slate-950 object-cover" />
                      ) : null}
                      {player.country ? (
                        <FlagBadge country={player.country} className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full ring-2 ring-slate-950" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-white">{player.playerName}</div>
                      <div className="truncate text-sm text-slate-400">
                        {player.teamName} {player.position ? `· ${player.position}` : ""}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 px-4 py-8 text-center text-sm text-slate-500">
                  No players found for this slot.
                </div>
              )}
            </div>

            {message ? <div className="mt-4 text-sm text-rose-200">{message}</div> : null}
          </div>
        </div>
      ) : null}
    </>
  )
}

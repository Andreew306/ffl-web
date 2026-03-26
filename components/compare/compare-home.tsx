"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronDown, Search, X } from "lucide-react"
import type { ComparePageData, ComparePlayer, ComparePosition } from "@/lib/services/compare.service"
import { cn, isImageUrl } from "@/lib/utils"

type CompareStatKey =
  | "matchesPlayed"
  | "wins"
  | "draws"
  | "losses"
  | "starter"
  | "substitute"
  | "minutesPlayed"
  | "goals"
  | "assists"
  | "preassists"
  | "shotsOnGoal"
  | "kicks"
  | "passes"
  | "keypass"
  | "autopass"
  | "saves"
  | "clearances"
  | "recoveries"
  | "goalsConceded"
  | "missedPasses"
  | "ownGoals"
  | "avg"
  | "mvp"
  | "totw"
  | "cs"
  | "winRate"

type CompareStatMode = "total" | "match" | "minute"

type SelectedCompareStat = {
  id: CompareStatKey
  mode: CompareStatMode
}

const compareStatOptions: Array<{ id: CompareStatKey; label: string; format?: "percent" }> = [
  { id: "matchesPlayed", label: "Matches" },
  { id: "wins", label: "Wins" },
  { id: "draws", label: "Draws" },
  { id: "losses", label: "Losses" },
  { id: "starter", label: "Starter" },
  { id: "substitute", label: "Substitute" },
  { id: "minutesPlayed", label: "Minutes" },
  { id: "goals", label: "Goals" },
  { id: "assists", label: "Assists" },
  { id: "preassists", label: "Pre-assists" },
  { id: "shotsOnGoal", label: "Shots on goal" },
  { id: "kicks", label: "Kicks" },
  { id: "passes", label: "Passes" },
  { id: "keypass", label: "Key pass" },
  { id: "autopass", label: "Autopass" },
  { id: "saves", label: "Saves" },
  { id: "clearances", label: "Clearances" },
  { id: "recoveries", label: "Recoveries" },
  { id: "goalsConceded", label: "Goals conceded" },
  { id: "missedPasses", label: "Missed passes" },
  { id: "ownGoals", label: "Own goals" },
  { id: "avg", label: "AVG" },
  { id: "mvp", label: "MVP" },
  { id: "totw", label: "TOTW" },
  { id: "cs", label: "CS" },
  { id: "winRate", label: "Win rate", format: "percent" },
]

const defaultStatSelection: SelectedCompareStat[] = [
  { id: "matchesPlayed", mode: "total" },
  { id: "goals", mode: "total" },
  { id: "assists", mode: "total" },
  { id: "preassists", mode: "total" },
  { id: "avg", mode: "total" },
  { id: "mvp", mode: "total" },
  { id: "totw", mode: "total" },
  { id: "cs", mode: "total" },
]

type CompareHomeProps = ComparePageData

type FilterSelectProps<T extends string | number> = {
  label: string
  valueLabel: string
  open: boolean
  onToggle: () => void
  options: Array<{ id: T; label: string }>
  onSelect: (value: T) => void
}

function buildQueryString(current: URLSearchParams, patch: Record<string, string | null>) {
  const next = new URLSearchParams(current.toString())
  Object.entries(patch).forEach(([key, value]) => {
    if (!value) next.delete(key)
    else next.set(key, value)
  })
  return next.toString()
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

function canUseMode(statId: CompareStatKey, mode: CompareStatMode) {
  if (mode === "total") return true
  if (mode === "match") {
    return !["avg", "winRate"].includes(statId)
  }
  if (mode === "minute") {
    return !["avg", "mvp", "totw", "cs", "winRate", "matchesPlayed", "wins", "draws", "losses", "starter", "substitute"].includes(statId)
  }
  return true
}

function buildCompareStatLabel(statId: CompareStatKey, mode: CompareStatMode) {
  const option = compareStatOptions.find((entry) => entry.id === statId)
  if (!option) return statId
  if (mode === "match") return `${option.label} / match`
  if (mode === "minute") return `${option.label} / minute`
  return option.label
}

function formatCompareStat(player: ComparePlayer, statId: CompareStatKey, mode: CompareStatMode) {
  const option = compareStatOptions.find((entry) => entry.id === statId)
  const value = Number(player.totals[statId] ?? 0)
  if (option?.format === "percent") return `${value}%`
  if (mode === "match") {
    return player.totals.matchesPlayed > 0 ? (value / player.totals.matchesPlayed).toFixed(2) : "0.00"
  }
  if (mode === "minute") {
    return player.totals.minutesPlayed > 0 ? (value / player.totals.minutesPlayed).toFixed(4) : "0.0000"
  }
  return String(value)
}

function formatSeasonStat(
  seasonRow: ComparePlayer["seasons"][number],
  statId: CompareStatKey,
  mode: CompareStatMode
) {
  const option = compareStatOptions.find((entry) => entry.id === statId)
  const value = Number((seasonRow as Record<string, number>)[statId] ?? 0)
  if (option?.format === "percent") {
    if (statId === "winRate") {
      return seasonRow.matchesPlayed > 0 ? `${((seasonRow.wins / seasonRow.matchesPlayed) * 100).toFixed(1)}%` : "0%"
    }
    return `${value}%`
  }
  if (mode === "match") {
    return seasonRow.matchesPlayed > 0 ? (value / seasonRow.matchesPlayed).toFixed(2) : "0.00"
  }
  if (mode === "minute") {
    return seasonRow.minutesPlayed > 0 ? (value / seasonRow.minutesPlayed).toFixed(4) : "0.0000"
  }
  return String(value)
}

function FilterSelect<T extends string | number>({
  label,
  valueLabel,
  open,
  onToggle,
  options,
  onSelect,
}: FilterSelectProps<T>) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full min-w-[190px] items-center justify-between rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-left transition hover:border-white/20"
      >
        <div>
          <div className="text-[11px] uppercase tracking-[0.35em] text-slate-500">{label}</div>
          <div className="mt-2 text-sm font-semibold text-white">{valueLabel}</div>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", open ? "rotate-180" : "")} />
      </button>
      {open ? (
        <div className="absolute left-0 top-[calc(100%+10px)] z-30 min-w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-[0_24px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl">
          {options.map((option) => (
            <button
              key={String(option.id)}
              type="button"
              onClick={() => onSelect(option.id)}
              className="flex w-full items-center rounded-xl px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/5 hover:text-white"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function PlayerBadge({ player }: { player: ComparePlayer | CompareHomeProps["players"][number] }) {
  const avatarIsImage = isImageUrl(player.avatar || "")
  const avatarIsEmoji = Boolean(player.avatar && !avatarIsImage)

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-16 w-16 shrink-0">
        <div
          className="flex h-full w-full items-center justify-center rounded-full border border-slate-950/90 bg-slate-900 shadow-[0_12px_26px_rgba(2,6,23,0.45)]"
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
              className="h-9 w-9 rounded-full border border-slate-950/70 object-cover"
            />
          ) : avatarIsEmoji ? (
            <span className="text-xl leading-none">{player.avatar}</span>
          ) : null}
        </div>
        {player.teamImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.teamImage}
            alt={player.teamName}
            className="absolute -bottom-1 -left-1 z-10 h-6 w-6 rounded-full border border-slate-950/80 bg-slate-950 object-cover shadow-[0_8px_18px_rgba(2,6,23,0.45)]"
          />
        ) : null}
        {player.country ? (
          <FlagBadge
            country={player.country}
            className="absolute -bottom-1 -right-1 z-10 h-6 w-6 rounded-full border border-slate-950/80 bg-slate-950 shadow-[0_8px_18px_rgba(2,6,23,0.45)]"
          />
        ) : null}
      </div>
      <div className="min-w-0">
        <div className="truncate text-lg font-semibold text-white">{player.playerName}</div>
        <div className="truncate text-sm text-slate-400">{player.teamName}</div>
      </div>
    </div>
  )
}

const positionOptions: Array<{ id: ComparePosition; label: string }> = [
  { id: "all", label: "All positions" },
  { id: "GK", label: "GK" },
  { id: "DEF", label: "DEF" },
  { id: "MID", label: "MID" },
  { id: "WING", label: "WING" },
  { id: "ST", label: "ST" },
]

export function CompareHome({
  players,
  selectedPlayers,
  seasons,
  competitions,
  selectedCompetitionId,
  selectedPosition,
}: CompareHomeProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState("")
  const [competitionOpen, setCompetitionOpen] = useState(false)
  const [positionOpen, setPositionOpen] = useState(false)
  const [statQuery, setStatQuery] = useState("")
  const [selectedStats, setSelectedStats] = useState<SelectedCompareStat[]>(defaultStatSelection)
  const [statModeOpenFor, setStatModeOpenFor] = useState<CompareStatKey | null>(null)
  const [statBuilderOpen, setStatBuilderOpen] = useState(true)
  const statModeRef = useRef<HTMLDivElement | null>(null)

  const selectedIds = useMemo(() => selectedPlayers.map((player) => player.id), [selectedPlayers])
  const filteredPlayers = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return players
      .filter((player) => !selectedIds.includes(player.id))
      .filter((player) => (normalized ? player.playerName.toLowerCase().includes(normalized) : true))
      .slice(0, 12)
  }, [players, query, selectedIds])
  const availableStats = useMemo(() => {
    const normalized = statQuery.trim().toLowerCase()
    return compareStatOptions.filter((option) => !normalized || option.label.toLowerCase().includes(normalized))
  }, [statQuery])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!statModeRef.current) return
      if (!statModeRef.current.contains(event.target as Node)) {
        setStatModeOpenFor(null)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function pushPatch(patch: Record<string, string | null>) {
    const next = buildQueryString(new URLSearchParams(searchParams.toString()), patch)
    router.replace(next ? `${pathname}?${next}` : pathname)
  }

  function setPlayers(nextIds: string[]) {
    pushPatch({ players: nextIds.length ? nextIds.join(",") : null })
  }

  function addPlayer(playerId: string) {
    if (selectedIds.includes(playerId) || selectedIds.length >= 4) return
    setPlayers([...selectedIds, playerId])
    setQuery("")
  }

  function removePlayer(playerId: string) {
    setPlayers(selectedIds.filter((id) => id !== playerId))
  }

  function toggleStat(statId: CompareStatKey) {
    setSelectedStats((current) => {
      if (current.length >= 8) return current
      return current.some((item) => item.id === statId && item.mode === "total")
        ? current
        : [...current, { id: statId, mode: "total" }]
    })
  }

  function removeAllStatModes(statId: CompareStatKey) {
    setSelectedStats((current) => current.filter((item) => item.id !== statId))
    if (statModeOpenFor === statId) setStatModeOpenFor(null)
  }

  function toggleStatMode(statId: CompareStatKey, mode: CompareStatMode) {
    setSelectedStats((current) => {
      const exists = current.some((item) => item.id === statId && item.mode === mode)
      if (exists) {
        return current.filter((item) => !(item.id === statId && item.mode === mode))
      }
      if (current.length >= 8) return current
      return [...current, { id: statId, mode }]
    })
    setStatModeOpenFor(null)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(14,116,144,0.45))] p-4 shadow-[0_22px_70px_rgba(3,10,24,0.42)]">
          <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.35em] text-cyan-100/75">Minigame</div>
                <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">Head2Head</h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">
                  Compare multiple players historically by season, role and output.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <FilterSelect
                  label="Season"
                  valueLabel={competitions.find((competition) => competition.id === selectedCompetitionId)?.label ?? "All competitions"}
                  open={competitionOpen}
                  onToggle={() => {
                    setCompetitionOpen((value) => !value)
                    setPositionOpen(false)
                  }}
                  options={[{ id: "all", label: "All seasons" }, ...competitions]}
                  onSelect={(value) => {
                    setCompetitionOpen(false)
                    pushPatch({ competition: value === "all" ? null : String(value) })
                  }}
                />
                <FilterSelect
                  label="Position"
                  valueLabel={positionOptions.find((option) => option.id === selectedPosition)?.label ?? "All positions"}
                  open={positionOpen}
                  onToggle={() => {
                    setPositionOpen((value) => !value)
                    setCompetitionOpen(false)
                  }}
                  options={positionOptions}
                  onSelect={(value) => {
                    setPositionOpen(false)
                    pushPatch({ position: value === "all" ? null : String(value) })
                  }}
                />
                <div className="rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Selected</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{selectedPlayers.length}/4</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[360px_1fr]">
          <aside className="rounded-[30px] border border-white/10 bg-slate-900/60 p-5">
            <div className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Player pool</div>
            <div className="mt-4 relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search player"
                className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/80 pl-11 pr-4 text-white outline-none transition focus:border-cyan-300/30"
              />
            </div>
            <div className="mt-4 space-y-3">
              {selectedPlayers.map((player) => (
                <div key={player.id} className="flex items-center justify-between rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3">
                  <PlayerBadge player={player} />
                  <button
                    type="button"
                    onClick={() => removePlayer(player.id)}
                    className="rounded-full border border-white/10 bg-slate-950/60 p-2 text-slate-300 transition hover:border-white/20 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 max-h-[560px] space-y-3 overflow-y-auto pr-1">
              {filteredPlayers.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => addPlayer(player.id)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 text-left transition hover:border-cyan-300/20 hover:bg-slate-950"
                >
                  <PlayerBadge player={player} />
                </button>
              ))}
              {!filteredPlayers.length ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-500">
                  No more players for this search.
                </div>
              ) : null}
            </div>
          </aside>

          <section className="space-y-6">
            {selectedPlayers.length ? (
              <>
                <div className="overflow-hidden rounded-[30px] border border-white/10 bg-slate-900/60">
                  <button
                    type="button"
                    onClick={() => setStatBuilderOpen((value) => !value)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-white/[0.02]"
                  >
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Stat builder</div>
                      <div className="mt-2 text-2xl font-semibold text-white">Choose up to 8 stats</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-slate-400">{selectedStats.length}/8 selected</div>
                      <span className="rounded-full border border-white/10 bg-slate-950/60 p-2 text-slate-300">
                        <ChevronDown className={cn("h-4 w-4 transition-transform", statBuilderOpen ? "rotate-180" : "")} />
                      </span>
                    </div>
                  </button>

                  <div
                    className={cn(
                      "transition-all duration-300 ease-out",
                      statBuilderOpen ? "max-h-[900px] opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    <div className="border-t border-white/10 px-5 pb-5 pt-4">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <p className="max-w-2xl text-sm text-slate-400">
                          Mix totals and derived fields like goals / match or goals / minute.
                        </p>
                        <div className="w-full max-w-sm">
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                            <input
                              value={statQuery}
                              onChange={(event) => setStatQuery(event.target.value)}
                              placeholder="Search stat"
                              className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/80 pl-11 pr-4 text-white outline-none transition focus:border-cyan-300/30"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-3">
                        {availableStats.map((stat) => {
                          const activeModes = selectedStats.filter((item) => item.id === stat.id).map((item) => item.mode)
                          const active = activeModes.length > 0
                          return (
                            <div
                              key={stat.id}
                              ref={active ? (node) => {
                                if (statModeOpenFor === stat.id) statModeRef.current = node
                              } : undefined}
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                if (active) {
                                  setStatModeOpenFor((current) => (current === stat.id ? null : stat.id))
                                } else {
                                  toggleStat(stat.id)
                                }
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault()
                                  if (active) {
                                    setStatModeOpenFor((current) => (current === stat.id ? null : stat.id))
                                  } else {
                                    toggleStat(stat.id)
                                  }
                                }
                              }}
                              className={cn(
                                "relative cursor-pointer rounded-2xl border px-4 py-3 text-sm transition",
                                active
                                  ? "border-cyan-300/30 bg-cyan-400/10 text-cyan-50"
                                  : "border-white/10 bg-slate-950/65 text-slate-300 hover:border-white/20 hover:text-white"
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <button
                                  type="button"
                                  onClick={(event) => event.stopPropagation()}
                                  className="text-left font-semibold"
                                >
                                  {stat.label}
                                </button>
                                {active ? (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      removeAllStatModes(stat.id)
                                    }}
                                    className="rounded-full border border-white/10 bg-slate-950/60 p-1 text-slate-300 transition hover:text-white"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                ) : null}
                              </div>
                              {active ? (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {activeModes.map((mode) => (
                                    <span
                                      key={`${stat.id}-${mode}`}
                                      className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/80"
                                    >
                                      {mode === "total" ? "Total" : mode === "match" ? "/ Match" : "/ Minute"}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                              {statModeOpenFor === stat.id ? (
                                <div className="absolute left-1/2 top-[calc(100%+10px)] z-20 flex -translate-x-1/2 gap-2 rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-[0_24px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl transition duration-150">
                                  {(["total", "match", "minute"] as CompareStatMode[]).map((mode) =>
                                    canUseMode(stat.id, mode) ? (
                                      <button
                                        key={mode}
                                        type="button"
                                        onClick={() => toggleStatMode(stat.id, mode)}
                                        className={cn(
                                          "rounded-xl border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition",
                                          activeModes.includes(mode)
                                            ? "border-cyan-300/30 bg-cyan-400/15 text-cyan-50"
                                            : "border-white/10 bg-slate-950/60 text-slate-400 hover:border-white/20 hover:text-white"
                                        )}
                                      >
                                        {mode === "total" ? "Total" : mode === "match" ? "/ Match" : "/ Minute"}
                                      </button>
                                    ) : null
                                  )}
                                </div>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
                  {selectedPlayers.map((player) => (
                    <div key={player.id} className="rounded-[28px] border border-white/10 bg-slate-900/60 p-5">
                      <PlayerBadge player={player} />
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        {selectedStats.map((stat) => {
                          const option = compareStatOptions.find((entry) => entry.id === stat.id)
                          if (!option) return null
                          return (
                          <div key={`${stat.id}-${stat.mode}`} className="rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{buildCompareStatLabel(stat.id, stat.mode)}</div>
                            <div className="mt-2 text-xl font-semibold text-white">{formatCompareStat(player, stat.id, stat.mode)}</div>
                          </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-[30px] border border-white/10 bg-slate-900/60 p-5">
                  <div className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Season breakdown</div>
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[920px] border-separate border-spacing-y-3">
                      <thead>
                        <tr>
                          <th className="px-4 text-left text-[11px] uppercase tracking-[0.35em] text-slate-500">Season</th>
                          {selectedPlayers.map((player) => (
                            <th key={player.id} className="px-4 text-left text-[11px] uppercase tracking-[0.35em] text-slate-500">
                              {player.playerName}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {seasons.map((season) => (
                          <tr key={season}>
                            <td className="rounded-l-2xl border border-white/10 bg-slate-950/65 px-4 py-4 text-sm font-semibold text-white">
                              Season {season}
                            </td>
                            {selectedPlayers.map((player) => {
                              const seasonRow = player.seasons.find((row) => row.season === season)
                              return (
                                <td key={`${player.id}-${season}`} className="border border-white/10 bg-slate-950/65 px-4 py-4 last:rounded-r-2xl">
                                  {seasonRow ? (
                                    <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
                                      {selectedStats.map((stat) => (
                                        <div key={`${player.id}-${season}-${stat.id}-${stat.mode}`}>
                                          {buildCompareStatLabel(stat.id, stat.mode)}:{" "}
                                          <span className="font-semibold text-white">
                                            {formatSeasonStat(seasonRow, stat.id, stat.mode)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-slate-500">No data</div>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center rounded-[30px] border border-dashed border-white/10 bg-slate-900/50 text-center">
                <div>
                  <div className="text-2xl font-semibold text-white">Select up to 4 players</div>
                  <p className="mt-3 max-w-lg text-base leading-7 text-slate-400">
                    Build a historical head-to-head with up to 4 players.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

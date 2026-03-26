"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowDownRight, ArrowLeft, ArrowRight, ArrowRightLeft, ArrowUpRight, DollarSign, Shield, X } from "lucide-react"
import {
  cancelFantasyPlayerSaleAction,
  listFantasyPlayerForSaleAction,
  moveFantasyRosterPlayerAction,
  raiseFantasyPlayerClauseAction,
} from "@/app/fantasy/actions"
import { cn, getFlagBackgroundStyle, isImageUrl, shouldOverlayFlag } from "@/lib/utils"

type RosterPlayer = {
  id: string
  playerObjectId: string
  playerId: number
  playerName: string
  country: string
  avatar?: string
  slot: "GK" | "DEF" | "MID" | "ATT" | "FLEX" | "BENCH"
  position?: string | null
  teamName?: string
  teamImage?: string
  kitImage?: string
  kitTextColor?: string
  currentValue: number
  releaseClause: number
  priceChangePercent?: number
  priceChangeDirection?: "up" | "down" | "flat"
  acquiredBy: "random" | "market" | "clausulazo"
  isOnMarket?: boolean
  weekPoints: number
}

type FantasyRosterBoardProps = {
  leagueId: string
  currentWeek: number
  weeks: Array<{
    week: number
    formation: string
    locked: boolean
    roster: RosterPlayer[]
  }>
}

const slotLabels = {
  GK: "GK",
  DEF: "CB/LB/RB",
  MID: "DM/CM/AM",
  ATT: "LW/RW/ST",
} as const

type GroupKey = "GK" | "DEF" | "MID" | "ATT"

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

function getPlayerGroup(player: RosterPlayer): GroupKey {
  const position = (player.position || "").toUpperCase()
  if (position === "GK") return "GK"
  if (["CB", "LB", "RB"].includes(position)) return "DEF"
  if (["DM", "CM", "AM"].includes(position)) return "MID"
  return "ATT"
}

function PriceTrend({
  direction,
  percent,
}: {
  direction?: "up" | "down" | "flat"
  percent?: number
}) {
  if (!percent || !direction || direction === "flat") {
    return null
  }

  const isUp = direction === "up"
  const Icon = isUp ? ArrowUpRight : ArrowDownRight

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium",
        isUp
          ? "border border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
          : "border border-rose-300/20 bg-rose-400/10 text-rose-100"
      )}
    >
      <Icon className="h-3 w-3" />
      {percent}%
    </span>
  )
}

function FflCoin({ value, compact = false }: { value: number; compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "inline-flex min-w-0 items-center gap-2 rounded-2xl border border-cyan-300/20 bg-[radial-gradient(circle_at_30%_30%,rgba(34,211,238,0.2),transparent_42%),linear-gradient(135deg,#11253a_0%,#0a1220_55%,#0c1d2c_100%)] px-2.5 py-1.5 shadow-[0_10px_24px_rgba(2,6,23,0.28)]"
          : "rounded-[18px] border border-cyan-300/20 bg-[radial-gradient(circle_at_30%_30%,rgba(34,211,238,0.2),transparent_42%),linear-gradient(135deg,#11253a_0%,#0a1220_55%,#0c1d2c_100%)] px-3 py-2 shadow-[0_10px_28px_rgba(2,6,23,0.3)]"
      }
    >
      <div className={compact ? "relative h-5 w-5 rounded-full bg-slate-950/80 ring-1 ring-white/10" : "relative h-8 w-8 rounded-full bg-slate-950/80 ring-1 ring-white/10"}>
        <Image
          src="/ffl-logo2.png"
          alt="FFL Coin"
          fill
          sizes={compact ? "20px" : "32px"}
          className="object-contain invert"
        />
      </div>
      <div className={compact ? "leading-none" : ""}>
        {!compact ? <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/70">FFL Coin</div> : null}
        <div className={compact ? "text-sm font-semibold leading-none text-white" : "mt-0.5 text-sm font-semibold text-white"}>{value}</div>
      </div>
    </div>
  )
}

function PlayerToken({
  player,
  compact = false,
  onClick,
}: {
  player: RosterPlayer
  compact?: boolean
  onClick?: () => void
}) {
  const avatarIsImage = isImageUrl(player.avatar || "")

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
          {avatarIsImage ? (
            <div
              className={cn(
                "flex items-center justify-center rounded-full border border-slate-950/70 bg-slate-950/35",
                compact ? "h-8 w-8" : "h-10 w-10 sm:h-12 sm:w-12"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={player.avatar} alt={player.playerName} className="h-full w-full rounded-full object-cover" />
            </div>
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
          className={cn("block font-semibold text-white transition hover:text-cyan-200", compact ? "text-[11px] leading-3" : "text-sm leading-4 sm:text-base")}
        >
          {player.playerName}
        </Link>
      </div>

      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 hidden min-w-[20rem] max-w-[26rem] -translate-x-1/2 rounded-2xl border border-white/10 bg-slate-950/95 px-3 py-3 text-left shadow-2xl group-hover:block">
        <div className="text-sm font-semibold text-white">{player.playerName}</div>
        <div className="mt-1 text-xs text-slate-400">Player #{player.playerId}</div>
        {player.teamName ? (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-2 py-1.5">
            {player.teamImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.teamImage} alt={player.teamName} className="h-6 w-6 rounded-full object-cover" />
            ) : (
              <div className="h-6 w-6 rounded-full border border-white/10 bg-slate-800/80" />
            )}
            <span className="truncate text-xs text-slate-300">{player.teamName}</span>
          </div>
        ) : null}
        <div className="mt-3 grid grid-cols-[minmax(0,max-content)_minmax(0,max-content)] gap-2 text-[11px]">
          <div className="min-w-[9rem] rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2">
            <div className="uppercase tracking-[0.2em] text-slate-500">Value</div>
            <div className="mt-2">
              <FflCoin value={player.currentValue} compact />
            </div>
            <div className="mt-2">
              <PriceTrend direction={player.priceChangeDirection} percent={player.priceChangePercent} />
            </div>
          </div>
          <div className="min-w-[9rem] rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2">
            <div className="uppercase tracking-[0.2em] text-slate-500">Clause</div>
            <div className="mt-2">
              <FflCoin value={player.releaseClause} compact />
            </div>
          </div>
        </div>
        {player.isOnMarket ? <div className="mt-2 text-[11px] uppercase tracking-[0.2em] text-fuchsia-200">On market</div> : null}
      </div>
    </div>
  )
}

export default function FantasyRosterBoard({ leagueId, currentWeek, weeks }: FantasyRosterBoardProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [selectedWeek, setSelectedWeek] = useState(
    weeks.some((entry) => entry.week === currentWeek) ? currentWeek : (weeks[weeks.length - 1]?.week ?? currentWeek)
  )
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [clauseValue, setClauseValue] = useState("")

  const activeWeek = useMemo(
    () => weeks.find((entry) => entry.week === selectedWeek) ?? weeks[0] ?? null,
    [selectedWeek, weeks]
  )

  const roster = activeWeek?.roster ?? []
  const isEditableWeek = Boolean(activeWeek && activeWeek.week === currentWeek && !activeWeek.locked)
  const playersById = useMemo(() => new Map(roster.map((player) => [player.id, player])), [roster])

  const groupedPlayers = useMemo<Record<GroupKey, RosterPlayer[]>>(
    () => ({
      GK: roster.filter((player) => getPlayerGroup(player) === "GK"),
      DEF: roster.filter((player) => getPlayerGroup(player) === "DEF"),
      MID: roster.filter((player) => getPlayerGroup(player) === "MID"),
      ATT: roster.filter((player) => getPlayerGroup(player) === "ATT"),
    }),
    [roster]
  )

  const starterLimits = {
    GK: groupedPlayers.GK.filter((player) => player.slot !== "BENCH").length,
    DEF: groupedPlayers.DEF.filter((player) => player.slot !== "BENCH").length,
    MID: groupedPlayers.MID.filter((player) => player.slot !== "BENCH").length,
    ATT: groupedPlayers.ATT.filter((player) => player.slot !== "BENCH").length,
  } as const

  const startingPlayers = {
    gk: groupedPlayers.GK.filter((player) => player.slot !== "BENCH"),
    def: groupedPlayers.DEF.filter((player) => player.slot !== "BENCH"),
    mid: groupedPlayers.MID.filter((player) => player.slot !== "BENCH"),
    att: groupedPlayers.ATT.filter((player) => player.slot !== "BENCH"),
  }

  const benchByGroup = {
    GK: groupedPlayers.GK.filter((player) => player.slot === "BENCH"),
    DEF: groupedPlayers.DEF.filter((player) => player.slot === "BENCH"),
    MID: groupedPlayers.MID.filter((player) => player.slot === "BENCH"),
    ATT: groupedPlayers.ATT.filter((player) => player.slot === "BENCH"),
  }

  const selectedPlayer = selectedPlayerId ? playersById.get(selectedPlayerId) ?? null : null
  const selectedGroup = selectedPlayer ? getPlayerGroup(selectedPlayer) : null
  const isSelectedStarter = Boolean(selectedPlayer && selectedPlayer.slot !== "BENCH")
  const canBench = Boolean(selectedPlayer && selectedGroup && isSelectedStarter && benchByGroup[selectedGroup].length > 0 && isEditableWeek)
  const canStart = Boolean(selectedPlayer && !isSelectedStarter && isEditableWeek)

  useEffect(() => {
    if (selectedPlayer) {
      setClauseValue(String(selectedPlayer.releaseClause + 1))
    }
  }, [selectedPlayer])

  const renderLine = (players: RosterPlayer[], totalSlots: number) => {
    const items = [...players]
    while (items.length < totalSlots) items.push(null as never)

    return items.map((player, index) =>
      player ? (
        <PlayerToken key={player.id} player={player} onClick={() => setSelectedPlayerId(player.id)} />
      ) : (
        <div key={`empty-${totalSlots}-${index}`} className="flex h-[84px] w-[92px] flex-col items-center justify-center gap-2 opacity-45">
          <div className="h-12 w-12 rounded-full border border-dashed border-white/10 bg-slate-900/40" />
          <div className="h-2 w-16 rounded-full bg-white/5" />
          <div className="h-2 w-10 rounded-full bg-white/5" />
        </div>
      )
    )
  }

  const fieldPattern = {
    backgroundImage: `
      radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)
    `,
    backgroundSize: "18px 18px",
    backgroundPosition: "0 0",
  } as const

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[30px] border border-white/10 bg-slate-900/60 p-5">
        <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.35em] text-slate-500">
          <span>Roster pitch</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedWeek((week) => Math.max(weeks[0]?.week ?? 1, week - 1))
                setSelectedPlayerId(null)
              }}
              disabled={selectedWeek <= (weeks[0]?.week ?? selectedWeek)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 text-slate-300 transition hover:border-cyan-300/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="rounded-full border border-cyan-300/20 bg-slate-950/85 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
              Week {activeWeek?.week ?? currentWeek} · {activeWeek?.formation ?? "-"}
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedWeek((week) => Math.min(weeks[weeks.length - 1]?.week ?? week, week + 1))
                setSelectedPlayerId(null)
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
            className="relative min-h-[700px] overflow-visible rounded-[28px] border border-slate-800/80 bg-[#0a0f1a] p-5 sm:min-h-[760px]"
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
                {renderLine(startingPlayers.att, Math.max(1, starterLimits.ATT))}
              </div>
              <div className="flex min-h-[126px] w-full items-center justify-center gap-8 sm:gap-16">
                {renderLine(startingPlayers.mid, Math.max(1, starterLimits.MID))}
              </div>
              <div className="flex min-h-[126px] w-full items-center justify-center gap-8 sm:gap-16">
                {renderLine(startingPlayers.def, Math.max(1, starterLimits.DEF))}
              </div>
              <div className="flex min-h-[126px] w-full items-center justify-center">
                {renderLine(startingPlayers.gk, 1)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[30px] border border-white/10 bg-slate-900/60 p-5">
        <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.35em] text-slate-500">
          <span className="flex items-center gap-2 text-base font-semibold normal-case tracking-normal text-white">
            <ArrowRightLeft className="h-5 w-5 text-sky-300" />
            Bench
          </span>
          <span>{isEditableWeek ? "Editable" : "Locked"}</span>
        </div>

        <div className="mt-5 grid min-h-[700px] gap-4 content-start sm:min-h-[760px]">
          {(["ATT", "MID", "DEF", "GK"] as const).map((group) => (
            <div key={group} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-500">{group}</div>
                  <div className="mt-1 text-sm font-semibold text-white">{slotLabels[group]}</div>
                </div>
                <div className="text-xs text-slate-500">{benchByGroup[group].length} available</div>
              </div>
              <div className="mt-4 flex min-h-[92px] flex-wrap items-start gap-4">
                {benchByGroup[group].length ? (
                  benchByGroup[group].map((player) => (
                    <PlayerToken key={player.id} player={player} compact onClick={() => setSelectedPlayerId(player.id)} />
                  ))
                ) : (
                  <div className="flex w-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-900/40 px-4 py-6 text-sm text-slate-500">
                    No bench players available in this group.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedPlayer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-950/95 p-5 shadow-[0_40px_120px_rgba(2,6,23,0.65)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xl font-semibold text-white">{selectedPlayer.playerName}</div>
                <div className="mt-1 text-sm text-slate-400">Player #{selectedPlayer.playerId}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPlayerId(null)
                  setMessage(null)
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-900/80 text-slate-300 transition hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {selectedPlayer.teamName ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2">
                {selectedPlayer.teamImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedPlayer.teamImage} alt={selectedPlayer.teamName} className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <div className="h-7 w-7 rounded-full border border-white/10 bg-slate-800/80" />
                )}
                <span className="truncate text-sm text-slate-300">{selectedPlayer.teamName}</span>
              </div>
            ) : null}

            <div className="mt-3 rounded-xl border border-cyan-300/15 bg-cyan-400/5 px-3 py-2 text-sm text-cyan-100">
              Week {activeWeek?.week} points: {selectedPlayer.weekPoints}
            </div>

            {!isEditableWeek ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-300">
                Past weeks are locked. You can review this lineup but you cannot edit it.
              </div>
            ) : null}

            <div className="mt-4 grid gap-3">
              {canBench ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      setMessage(null)
                      const result = await moveFantasyRosterPlayerAction(leagueId, activeWeek?.week ?? currentWeek, selectedPlayer.playerObjectId, "BENCH")
                      if (!result.ok) {
                        setMessage(result.error)
                        return
                      }
                      setSelectedPlayerId(null)
                      router.refresh()
                    })
                  }
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/80 font-medium text-white transition hover:border-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Send to bench
                </button>
              ) : null}

              {canStart ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      setMessage(null)
                      const result = await moveFantasyRosterPlayerAction(leagueId, activeWeek?.week ?? currentWeek, selectedPlayer.playerObjectId, "START")
                      if (!result.ok) {
                        setMessage(result.error)
                        return
                      }
                      setSelectedPlayerId(null)
                      router.refresh()
                    })
                  }
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/80 font-medium text-white transition hover:border-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Move to team
                </button>
              ) : null}

              {isEditableWeek ? (
                selectedPlayer.isOnMarket ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        setMessage(null)
                        const result = await cancelFantasyPlayerSaleAction(leagueId, selectedPlayer.playerObjectId)
                        if (!result.ok) {
                          setMessage(result.error)
                          return
                        }
                        setSelectedPlayerId(null)
                        router.refresh()
                      })
                    }
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-fuchsia-300/20 bg-fuchsia-400/10 font-medium text-fuchsia-100 transition hover:bg-fuchsia-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Remove from market
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        setMessage(null)
                        const result = await listFantasyPlayerForSaleAction(leagueId, selectedPlayer.playerObjectId)
                        if (!result.ok) {
                          setMessage(result.error)
                          return
                        }
                        setSelectedPlayerId(null)
                        router.refresh()
                      })
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-400/10 font-medium text-amber-100 transition hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <DollarSign className="h-4 w-4" />
                    Sell player
                  </button>
                )
              ) : null}

              {isEditableWeek ? (
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <Shield className="h-4 w-4 text-cyan-200" />
                    Raise clause
                  </div>
                  <div className="mt-3 flex gap-3">
                    <input
                      type="number"
                      min={selectedPlayer.releaseClause + 1}
                      step={1}
                      value={clauseValue}
                      onChange={(event) => setClauseValue(event.target.value)}
                      className="h-11 flex-1 rounded-2xl border border-white/10 bg-slate-950/80 px-4 text-white outline-none transition focus:border-cyan-300/40"
                    />
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          setMessage(null)
                          const result = await raiseFantasyPlayerClauseAction(
                            leagueId,
                            selectedPlayer.playerObjectId,
                            Number(clauseValue)
                          )
                          if (!result.ok) {
                            setMessage(result.error)
                            return
                          }
                          setSelectedPlayerId(null)
                          router.refresh()
                        })
                      }
                      className="inline-flex h-11 items-center justify-center rounded-2xl bg-cyan-400 px-4 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Update
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {message ? <div className="mt-3 text-sm text-slate-300">{message}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

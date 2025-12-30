"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { cn, formatMinutesSeconds } from "@/lib/utils"

type Stats = {
  matchesPlayed: number
  matchesWon: number
  matchesDraw: number
  matchesLost: number
  minutesPlayed: number
  starter: number
  substitute: number
  goals: number
  assists: number
  preassists: number
  shotsOnGoal: number
  shotsOffGoal: number
  kicks: number
  passes: number
  keypass: number
  autopass: number
  misspass: number
  saves: number
  clearances: number
  recoveries: number
  goalsConceded: number
  cs: number
  owngoals: number
  avg: number
}

type StatsTab = {
  id: string
  label: string
  logo?: string
  stats: Stats
  seasonFilters?: {
    all: Stats
    league: Stats
    cup: Stats
    supercup: Stats
  }
  seasonFilterIds?: {
    all: string[]
    league: string[]
    cup: string[]
    supercup: string[]
  }
  playerCompetitionId?: string
}

type PlayerStatsTabsProps = {
  tabs: StatsTab[]
  totalStats: Stats
  matchSeries: {
    matchId: string
    playerCompetitionId: string
    competitionId: string
    date: string
    matchLabel: string
    competitionLabel: string
    teamA: string
    teamB: string
    teamAImage: string
    teamBImage: string
    scoreA: number
    scoreB: number
    outcome: "win" | "draw" | "loss"
    position: string
    stats: Record<string, number>
  }[]
  matchLimits: Record<string, number>
  goalsByOpponent: {
    playerCompetitionId: string
    opponentId: string
    opponentName: string
    opponentImage: string
    matchId: string
  }[]
  assistsByPlayer: {
    playerCompetitionId: string
    assistedId: string
    assistedName: string
    assistedAvatar: string
  }[]
  preassistsByPlayer: {
    playerCompetitionId: string
    assistedId: string
    assistedName: string
    assistedAvatar: string
  }[]
  goalsByTeam: {
    playerCompetitionId: string
    teamId: string
    teamName: string
    teamImage: string
    matchId: string
    goals: number
  }[]
  assistsByTeam: {
    playerCompetitionId: string
    teamId: string
    teamName: string
    teamImage: string
    matchId: string
    assists: number
  }[]
  preassistsByTeam: {
    playerCompetitionId: string
    teamId: string
    teamName: string
    teamImage: string
    matchId: string
    preassists: number
  }[]
  kicksByOpponent: {
    playerCompetitionId: string
    opponentId: string
    opponentName: string
    opponentImage: string
    matchId: string
    kicks: number
  }[]
  goalsConcededByOpponent: {
    playerCompetitionId: string
    opponentId: string
    opponentName: string
    opponentImage: string
    matchId: string
    goalsConceded: number
  }[]
  gkPartners: {
    playerCompetitionId: string
    keeperPlayerId: string
    keeperId: string
    keeperName: string
    keeperAvatar: string
    matchId: string
    cs: number
  }[]
}

const statCards: { key: keyof Stats; label: string }[] = [
  { key: "goals", label: "Goals" },
  { key: "assists", label: "Assists" },
  { key: "preassists", label: "Pre-assists" },
  { key: "shotsOnGoal", label: "Shots on goal" },
  { key: "kicks", label: "Kicks" },
  { key: "passes", label: "Passes" },
  { key: "keypass", label: "Key pass" },
  { key: "autopass", label: "Autopass" },
  { key: "saves", label: "Saves" },
  { key: "clearances", label: "Clearances" },
  { key: "recoveries", label: "Recoveries" },
  { key: "cs", label: "CS" },
  { key: "goalsConceded", label: "Goals conceded" },
  { key: "misspass", label: "Missed passes" },
  { key: "owngoals", label: "Own goals" },
  { key: "avg", label: "Avg" },
]

const statLabels: Record<string, string> = {
  goals: "Goals",
  assists: "Assists",
  preassists: "Pre-assists",
  shotsOnGoal: "Shots on goal",
  kicks: "Kicks",
  passes: "Passes",
  keypass: "Key pass",
  autopass: "Autopass",
  misspass: "Missed passes",
  saves: "Saves",
  clearances: "Clearances",
  recoveries: "Recoveries",
  goalsConceded: "Goals conceded",
  cs: "CS",
  owngoals: "Own goals",
  avg: "Avg",
}

const positionLayout = [
  ["", "ST", ""],
  ["LW", "", "RW"],
  ["", "AM", ""],
  ["", "CM", ""],
  ["", "DM", ""],
  ["LB", "", "RB"],
  ["", "CB", ""],
  ["", "GK", ""],
]

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function PositionHeatmap({
  positions,
}: {
  positions: { key: string; count: number; primary?: boolean }[]
}) {
  if (positions.length === 0) {
    return <div className="text-xs text-slate-500">No position data.</div>
  }

  const max = Math.max(...positions.map((pos) => pos.count), 1)
  const positionMap = new Map(positions.map((pos) => [pos.key, pos]))

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="relative rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <div className="absolute inset-4 rounded-md border border-slate-800" />
        <div className="absolute left-1/2 top-4 h-[calc(100%-32px)] w-px -translate-x-1/2 bg-slate-800/60" />
        <div className="grid grid-rows-7 gap-2 relative z-10">
          {positionLayout.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="grid grid-cols-3 gap-2">
              {row.map((cell, cellIndex) => {
                if (!cell) return <div key={`cell-${rowIndex}-${cellIndex}`} />
                const entry = positionMap.get(cell)
                const intensity = entry ? clamp(entry.count / max, 0.15, 1) : 0
                return (
                  <div
                    key={`cell-${rowIndex}-${cellIndex}`}
                    className="relative h-8 rounded-full"
                    style={{
                      backgroundColor: entry ? `rgba(20,184,166,${0.12 + intensity * 0.55})` : "transparent",
                      boxShadow: entry ? "0 0 18px rgba(20,184,166,0.35)" : "none",
                    }}
                    title={entry ? `${cell} (${entry.count})` : cell}
                  >
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] uppercase tracking-[0.2em] text-slate-200/80">
                      {cell}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300">
        {positions.slice(0, 2).map((pos) => (
          <div key={pos.key} className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
            <p className="text-slate-400 uppercase tracking-[0.2em] text-[10px]">
              {pos.primary ? "Primary position" : "Secondary position"}
            </p>
            <p className="text-sm font-semibold">
              {pos.key} ({pos.count})
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function MiniLineChart({
  data,
  label,
  valueSuffix = "",
}: {
  data: { value: number; date: string; matchLabel: string }[]
  label: string
  valueSuffix?: string
}) {
  if (data.length === 0) {
    return <div className="text-xs text-slate-500">No data yet.</div>
  }

  const width = 560
  const height = 120
  const padding = 16
  const values = data.map((d) => d.value)
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 1)
  const avgValue = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
  const range = max - min || 1
  const step = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0
  const points = data.map((point, index) => {
    const x = padding + step * index
    const y = height - padding - ((point.value - min) / range) * (height - padding * 2)
    return { x, y }
  })
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ")
  const areaPath = `${linePath} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`

  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [hoverX, setHoverX] = useState(0)
  const hoveredPoint = hoverIndex !== null ? data[hoverIndex] : null

  return (
    <div className="relative">
      <div className="mb-2 text-right text-[10px] uppercase tracking-[0.2em] text-slate-500">
        Avg {avgValue.toFixed(2)}{valueSuffix}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-32 w-full"
        role="img"
        aria-label="Line chart"
        onMouseLeave={() => setHoverIndex(null)}
        onMouseMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect()
          const relativeX = event.clientX - bounds.left
          const safeX = Math.max(padding, Math.min(relativeX, bounds.width - padding))
          const index =
            data.length > 1
              ? Math.round((safeX - padding) / (bounds.width - padding * 2) * (data.length - 1))
              : 0
          setHoverIndex(Math.max(0, Math.min(index, data.length - 1)))
          setHoverX(safeX)
        }}
      >
        <defs>
          <linearGradient id="statsFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line
          x1={padding}
          y1={height / 2}
          x2={width - padding}
          y2={height / 2}
          stroke="rgba(148,163,184,0.25)"
          strokeDasharray="6 6"
        />
        <path d={areaPath} fill="url(#statsFill)" stroke="none" />
        <path d={linePath} fill="none" stroke="#2dd4bf" strokeWidth="2" />
        {hoverIndex !== null && points[hoverIndex] ? (
          <>
            <line
              x1={points[hoverIndex].x}
              y1={padding}
              x2={points[hoverIndex].x}
              y2={height - padding}
              stroke="rgba(148,163,184,0.4)"
              strokeDasharray="4 4"
            />
            <circle cx={points[hoverIndex].x} cy={points[hoverIndex].y} r="4" fill="#22d3ee" />
          </>
        ) : null}
      </svg>
      {hoveredPoint ? (
        <div
          className="pointer-events-none absolute top-3 w-56 -translate-x-1/2 rounded-lg border border-slate-700/60 bg-slate-950/90 px-3 py-2 text-xs text-slate-200 shadow-lg"
          style={{
            left: `${Math.min(Math.max(hoverX, 112), width - 112)}px`,
          }}
        >
          <div className="text-slate-400">{label}</div>
          <div className="font-semibold">
            {valueSuffix ? `${hoveredPoint.value.toFixed(2)}${valueSuffix}` : hoveredPoint.value}
          </div>
          <div className="text-slate-400">{hoveredPoint.matchLabel}</div>
          <div className="text-slate-500">
            {new Date(hoveredPoint.date).toLocaleDateString()}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function PlayerStatsTabs({
  tabs,
  totalStats,
  matchSeries,
  matchLimits,
  goalsByOpponent,
  assistsByPlayer,
  preassistsByPlayer,
  goalsByTeam,
  assistsByTeam,
  preassistsByTeam,
  kicksByOpponent,
  goalsConcededByOpponent,
  gkPartners,
}: PlayerStatsTabsProps) {
  const allTabs = useMemo(
    () => [{ id: "total", label: "Total", stats: totalStats }, ...tabs],
    [tabs, totalStats]
  )
  const [activeId, setActiveId] = useState(allTabs[0]?.id ?? "total")
  const [activeFilter, setActiveFilter] = useState<"all" | "league" | "cup" | "supercup">("all")
  const [activeChart, setActiveChart] = useState<keyof Stats | null>(null)
  const [matchListFilter, setMatchListFilter] = useState<
    "wins" | "draws" | "losses" | "starter" | "substitute" | null
  >(null)
  const [matchListPage, setMatchListPage] = useState(1)
  const [opponentPage, setOpponentPage] = useState(1)
  const [assistPage, setAssistPage] = useState(1)
  const [preassistPage, setPreassistPage] = useState(1)
  const [kicksOpponentPage, setKicksOpponentPage] = useState(1)
  const [assistComboPage, setAssistComboPage] = useState(1)
  const [gkPartnerPage, setGkPartnerPage] = useState(1)
  const [concededOpponentPage, setConcededOpponentPage] = useState(1)
  const [goalsPanel, setGoalsPanel] = useState<"opponents" | "teams">("opponents")
  const [assistsPanel, setAssistsPanel] = useState<"players" | "teams">("players")
  const [preassistsPanel, setPreassistsPanel] = useState<"players" | "teams">("players")
  const [goalsTeamPage, setGoalsTeamPage] = useState(1)
  const [assistsTeamPage, setAssistsTeamPage] = useState(1)
  const [preassistsTeamPage, setPreassistsTeamPage] = useState(1)
  const activeTab = allTabs.find((tab) => tab.id === activeId) || allTabs[0]

  useEffect(() => {
    if (activeTab?.seasonFilters) {
      const defaultFilter = activeTab.seasonFilters.league.matchesPlayed > 0 ? "league" : "all"
      setActiveFilter(defaultFilter)
    } else {
      setActiveFilter("all")
    }
    setActiveChart(null)
    setOpponentPage(1)
    setAssistPage(1)
    setPreassistPage(1)
    setKicksOpponentPage(1)
    setAssistComboPage(1)
    setGkPartnerPage(1)
    setConcededOpponentPage(1)
    setGoalsPanel("opponents")
    setAssistsPanel("players")
    setPreassistsPanel("players")
    setGoalsTeamPage(1)
    setAssistsTeamPage(1)
    setPreassistsTeamPage(1)
    setMatchListFilter(null)
    setMatchListPage(1)
  }, [activeId, activeTab?.seasonFilters])

  const stats = activeTab?.seasonFilters
    ? activeTab.seasonFilters[activeFilter]
    : activeTab?.stats || totalStats
  const winRatio = stats.matchesPlayed ? stats.matchesWon / stats.matchesPlayed : 0
  const ringDegrees = Math.round(winRatio * 360)
  const avgRating = Number.isFinite(stats.avg) ? stats.avg : 0
  const avgDisplay = Math.floor(avgRating * 100) / 100
  const winRateLabel = `${Math.round(winRatio * 100)}%`
  const starterTotal = stats.starter + stats.substitute
  const starterRatio = starterTotal ? stats.starter / starterTotal : 0
  const starterDegrees = Math.round(starterRatio * 360)
  const minutesLabel = formatMinutesSeconds(stats.minutesPlayed)
  const seriesIds =
    activeTab?.seasonFilterIds?.[activeFilter] ||
    (activeTab?.playerCompetitionId ? [activeTab.playerCompetitionId] : [])
  const filterSeriesByMatchesPlayed = (series: typeof matchSeries, ids: string[]) => {
    if (ids.length === 0) return []
    const byId = series.reduce<Record<string, typeof matchSeries>>((acc, item) => {
      if (!ids.includes(item.playerCompetitionId)) return acc
      if (!acc[item.playerCompetitionId]) acc[item.playerCompetitionId] = []
      acc[item.playerCompetitionId].push(item)
      return acc
    }, {})

    return ids.flatMap((id) => {
      const items = (byId[id] || []).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      const limit = matchLimits[id] ?? items.length
      return limit > 0 ? items.slice(-limit) : items
    })
  }

  const filteredSeries =
    activeTab?.id === "total"
      ? matchSeries
      : filterSeriesByMatchesPlayed(matchSeries, seriesIds)
  const matchListItems =
    matchListFilter === "wins"
      ? filteredSeries.filter((item) => item.outcome === "win")
      : matchListFilter === "draws"
        ? filteredSeries.filter((item) => item.outcome === "draw")
        : matchListFilter === "losses"
          ? filteredSeries.filter((item) => item.outcome === "loss")
          : matchListFilter === "starter"
            ? filteredSeries.filter((item) => Number(item.stats?.starter) > 0)
            : matchListFilter === "substitute"
              ? filteredSeries.filter((item) => Number(item.stats?.substitute) > 0)
              : []
  const matchListSorted = [...matchListItems].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  const matchListPageSize = 9
  const matchListTotalPages = Math.max(
    1,
    Math.ceil(matchListSorted.length / matchListPageSize)
  )
  const matchListPageClamped = Math.min(
    Math.max(1, matchListPage),
    matchListTotalPages
  )
  const matchListPageItems = matchListSorted.slice(
    (matchListPageClamped - 1) * matchListPageSize,
    matchListPageClamped * matchListPageSize
  )
  const filteredGoalOpponents =
    activeTab?.id === "total"
      ? goalsByOpponent
      : goalsByOpponent.filter((item) => seriesIds.includes(item.playerCompetitionId))
  const filteredAssistPlayers =
    activeTab?.id === "total"
      ? assistsByPlayer
      : assistsByPlayer.filter((item) => seriesIds.includes(item.playerCompetitionId))
  const filteredPreassistPlayers =
    activeTab?.id === "total"
      ? preassistsByPlayer
      : preassistsByPlayer.filter((item) => seriesIds.includes(item.playerCompetitionId))
  const filteredGoalsByTeam =
    activeTab?.id === "total"
      ? goalsByTeam
      : goalsByTeam.filter((item) => seriesIds.includes(item.playerCompetitionId))
  const filteredAssistsByTeam =
    activeTab?.id === "total"
      ? assistsByTeam
      : assistsByTeam.filter((item) => seriesIds.includes(item.playerCompetitionId))
  const filteredPreassistsByTeam =
    activeTab?.id === "total"
      ? preassistsByTeam
      : preassistsByTeam.filter((item) => seriesIds.includes(item.playerCompetitionId))
  const filteredKicksOpponents =
    activeTab?.id === "total"
      ? kicksByOpponent
      : kicksByOpponent.filter((item) => seriesIds.includes(item.playerCompetitionId))
  const filteredConcededOpponents =
    activeTab?.id === "total"
      ? goalsConcededByOpponent
      : goalsConcededByOpponent.filter((item) => seriesIds.includes(item.playerCompetitionId))
  const filteredGkPartners =
    activeTab?.id === "total"
      ? gkPartners
      : gkPartners.filter((item) => seriesIds.includes(item.playerCompetitionId))
  const chartData =
    activeChart &&
    filteredSeries
      .map((item) => ({
        date: item.date,
        value: Number(item.stats?.[activeChart]) || 0,
        matchLabel: item.matchLabel,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const perMinuteStat =
    activeChart &&
    (() => {
      const totals = filteredSeries.reduce(
        (acc, item) => {
          acc.value += Number(item.stats?.[activeChart]) || 0
          acc.minutes += Number(item.stats?.minutesPlayed) || 0
          return acc
        },
        { value: 0, minutes: 0 }
      )
      if (!totals.minutes) return 0
      const perMinute = totals.value / (totals.minutes / 60)
      return Number.isFinite(perMinute) ? perMinute : 0
    })()

  const activeChartLabel = activeChart ? statLabels[String(activeChart)] || "Stat" : ""
  const goalAccuracy =
    activeChart === "goals"
      ? (() => {
          const totals = filteredSeries.reduce(
            (acc, item) => {
              acc.goals += Number(item.stats?.goals) || 0
              acc.shotsOn += Number(item.stats?.shotsOnGoal) || 0
              acc.shotsOff += Number(item.stats?.shotsOffGoal) || 0
              return acc
            },
            { goals: 0, shotsOn: 0, shotsOff: 0 }
          )
          const totalShots = totals.shotsOn + totals.shotsOff
          if (!totalShots) return 0
          const accuracy = (totals.goals / totalShots) * 100
          return Number.isFinite(accuracy) ? accuracy : 0
        })()
      : null
  const assistMatchRate =
    activeChart === "assists"
      ? (() => {
          if (!filteredSeries.length) return 0
          const assistedMatches = filteredSeries.reduce((acc, item) => {
            const assists = Number(item.stats?.assists) || 0
            return assists > 0 ? acc + 1 : acc
          }, 0)
          return (assistedMatches / filteredSeries.length) * 100
        })()
      : null
  const onTargetRate =
    activeChart === "shotsOnGoal"
      ? (() => {
          const totals = filteredSeries.reduce(
            (acc, item) => {
              acc.shotsOn += Number(item.stats?.shotsOnGoal) || 0
              acc.shotsOff += Number(item.stats?.shotsOffGoal) || 0
              return acc
            },
            { shotsOn: 0, shotsOff: 0 }
          )
          const totalShots = totals.shotsOn + totals.shotsOff
          if (!totalShots) return 0
          const rate = (totals.shotsOn / totalShots) * 100
          return Number.isFinite(rate) ? rate : 0
        })()
      : null
  const passAccuracy =
    activeChart === "passes"
      ? (() => {
          const hasSeries = filteredSeries.length > 0
          const totals = hasSeries
            ? filteredSeries.reduce(
                (acc, item) => {
                  acc.kicks += Number(item.stats?.kicks) || 0
                  acc.passes += Number(item.stats?.passes) || 0
                  acc.autopass += Number(item.stats?.autopass) || 0
                  return acc
                },
                { kicks: 0, passes: 0, autopass: 0 }
              )
            : {
                kicks: stats.kicks || 0,
                passes: stats.passes || 0,
                autopass: stats.autopass || 0,
              }
          if (!totals.kicks) return 0
          const accuracy = ((totals.passes + totals.autopass) / totals.kicks) * 100
          return Number.isFinite(accuracy) ? accuracy : 0
        })()
      : null
  const passDirectionBreakdown =
    activeChart === "passes"
      ? (() => {
          if (!filteredSeries.length) return null
          const totals = filteredSeries.reduce(
            (acc, item) => {
              acc.forward += Number(item.stats?.passesForward) || 0
              acc.lateral += Number(item.stats?.passesLateral) || 0
              acc.backward += Number(item.stats?.passesBackward) || 0
              return acc
            },
            { forward: 0, lateral: 0, backward: 0 }
          )
          const total = totals.forward + totals.lateral + totals.backward
          if (!total) return null
          return { ...totals, total }
        })()
      : null
  const keypassRate =
    activeChart === "keypass"
      ? (() => {
          const hasSeries = filteredSeries.length > 0
          const totals = hasSeries
            ? filteredSeries.reduce(
                (acc, item) => {
                  acc.keypass += Number(item.stats?.keypass) || 0
                  acc.passes += Number(item.stats?.passes) || 0
                  return acc
                },
                { keypass: 0, passes: 0 }
              )
            : {
                keypass: stats.keypass || 0,
                passes: stats.passes || 0,
              }
          if (!totals.passes) return 0
          const rate = (totals.keypass / totals.passes) * 100
          return Number.isFinite(rate) ? rate : 0
        })()
      : null
  const autopassRate =
    activeChart === "autopass"
      ? (() => {
          const hasSeries = filteredSeries.length > 0
          const totals = hasSeries
            ? filteredSeries.reduce(
                (acc, item) => {
                  acc.autopass += Number(item.stats?.autopass) || 0
                  acc.kicks += Number(item.stats?.kicks) || 0
                  return acc
                },
                { autopass: 0, kicks: 0 }
              )
            : {
                autopass: stats.autopass || 0,
                kicks: stats.kicks || 0,
              }
          if (!totals.kicks) return 0
          const rate = (totals.autopass / totals.kicks) * 100
          return Number.isFinite(rate) ? rate : 0
        })()
      : null
  const saveRate =
    activeChart === "saves"
      ? (() => {
          const hasSeries = filteredSeries.length > 0
          const totals = hasSeries
            ? filteredSeries.reduce(
                (acc, item) => {
                  acc.saves += Number(item.stats?.saves) || 0
                  acc.conceded += Number(item.stats?.goalsConceded) || 0
                  return acc
                },
                { saves: 0, conceded: 0 }
              )
            : {
                saves: stats.saves || 0,
                conceded: stats.goalsConceded || 0,
              }
          const totalShots = totals.saves + totals.conceded
          if (!totalShots) return 0
          const rate = (totals.saves / totalShots) * 100
          return Number.isFinite(rate) ? rate : 0
        })()
      : null
  const cleanSheetRate =
    activeChart === "cs"
      ? (() => {
          if (!filteredSeries.length) return 0
          const matchesWithCs = filteredSeries.reduce((acc, item) => {
            const cs = Number(item.stats?.cs) || 0
            return cs > 0 ? acc + 1 : acc
          }, 0)
          const rate = (matchesWithCs / filteredSeries.length) * 100
          return Number.isFinite(rate) ? rate : 0
        })()
      : null
  const concededMatchRate =
    activeChart === "goalsConceded"
      ? (() => {
          if (!filteredSeries.length) return 0
          const matchesConceded = filteredSeries.reduce((acc, item) => {
            const conceded = Number(item.stats?.goalsConceded) || 0
            return conceded > 0 ? acc + 1 : acc
          }, 0)
          const rate = (matchesConceded / filteredSeries.length) * 100
          return Number.isFinite(rate) ? rate : 0
        })()
      : null
  const misspassRate =
    activeChart === "misspass"
      ? (() => {
          const hasSeries = filteredSeries.length > 0
          const totals = hasSeries
            ? filteredSeries.reduce(
                (acc, item) => {
                  acc.misspass += Number(item.stats?.misspass) || 0
                  acc.kicks += Number(item.stats?.kicks) || 0
                  return acc
                },
                { misspass: 0, kicks: 0 }
              )
            : {
                misspass: stats.misspass || 0,
                kicks: stats.kicks || 0,
              }
          if (!totals.kicks) return 0
          const rate = (totals.misspass / totals.kicks) * 100
          return Number.isFinite(rate) ? rate : 0
        })()
      : null
  const keypassImpact =
    activeChart === "keypass"
      ? (() => {
          const hasSeries = filteredSeries.length > 0
          const totals = hasSeries
            ? filteredSeries.reduce(
                (acc, item) => {
                  acc.keypass += Number(item.stats?.keypass) || 0
                  acc.assists += Number(item.stats?.assists) || 0
                  acc.preassists += Number(item.stats?.preassists) || 0
                  return acc
                },
                { keypass: 0, assists: 0, preassists: 0 }
              )
            : {
                keypass: stats.keypass || 0,
                assists: stats.assists || 0,
                preassists: stats.preassists || 0,
              }
          if (!totals.keypass) return 0
          const rate = ((totals.assists + totals.preassists) / totals.keypass) * 100
          return Number.isFinite(rate) ? rate : 0
        })()
      : null
  const kicksBreakdown =
    activeChart === "kicks"
      ? (() => {
          const hasSeries = filteredSeries.length > 0
          const totals = hasSeries
            ? filteredSeries.reduce(
                (acc, item) => {
                  acc.kicks += Number(item.stats?.kicks) || 0
                  acc.passes += Number(item.stats?.passes) || 0
                  acc.autopass += Number(item.stats?.autopass) || 0
                  acc.misspass += Number(item.stats?.misspass) || 0
                  return acc
                },
                { kicks: 0, passes: 0, autopass: 0, misspass: 0 }
              )
            : {
                kicks: stats.kicks || 0,
                passes: stats.passes || 0,
                autopass: stats.autopass || 0,
                misspass: stats.misspass || 0,
              }
          const others = Math.max(
            0,
            totals.kicks - (totals.passes + totals.autopass + totals.misspass)
          )
          return {
            total: totals.kicks,
            passes: totals.passes,
            autopass: totals.autopass,
            misspass: totals.misspass,
            others,
          }
        })()
      : null
  const positionCounts = filteredSeries.reduce<Record<string, number>>((acc, item) => {
    const key = item.position || ""
    if (!key) return acc
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
  const sortedPositions = Object.entries(positionCounts)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .map((pos, index) => ({ ...pos, primary: index === 0 }))
  const goalMilestones = filteredSeries.reduce(
    (acc, item) => {
      const goals = Number(item.stats?.goals) || 0
      if (goals >= 2) acc.braces += 1
      if (goals >= 3) acc.hatTricks += 1
      if (goals >= 4) acc.pokers += 1
      return acc
    },
    { braces: 0, hatTricks: 0, pokers: 0 }
  )
  const opponentGoals = filteredGoalOpponents.reduce<
    Record<string, { name: string; image: string; count: number; matchIds: Set<string> }>
  >((acc, item) => {
    const key = item.opponentId || item.opponentName
    if (!acc[key]) {
      acc[key] = {
        name: item.opponentName,
        image: item.opponentImage,
        count: 0,
        matchIds: new Set<string>(),
      }
    }
    acc[key].count += 1
    if (item.matchId) acc[key].matchIds.add(item.matchId)
    return acc
  }, {})
  const opponentGoalsList = Object.values(opponentGoals)
    .map((item) => ({ ...item, matches: item.matchIds.size }))
    .sort((a, b) => b.count - a.count)
  const opponentsPerPage = 7
  const opponentTotalPages = Math.max(1, Math.ceil(opponentGoalsList.length / opponentsPerPage))
  const opponentPageClamped = Math.min(opponentPage, opponentTotalPages)
  const opponentStart = (opponentPageClamped - 1) * opponentsPerPage
  const opponentPageItems = opponentGoalsList.slice(
    opponentStart,
    opponentStart + opponentsPerPage
  )
  const assistsByPlayerMap = filteredAssistPlayers.reduce<
    Record<string, { name: string; avatar: string; count: number }>
  >((acc, item) => {
    const key = item.assistedId || item.assistedName
    if (!acc[key]) acc[key] = { name: item.assistedName, avatar: item.assistedAvatar, count: 0 }
    acc[key].count += 1
    return acc
  }, {})
  const assistsByPlayerList = Object.values(assistsByPlayerMap).sort((a, b) => b.count - a.count)
  const assistsPerPage = 7
  const assistTotalPages = Math.max(1, Math.ceil(assistsByPlayerList.length / assistsPerPage))
  const assistPageClamped = Math.min(assistPage, assistTotalPages)
  const assistStart = (assistPageClamped - 1) * assistsPerPage
  const assistPageItems = assistsByPlayerList.slice(assistStart, assistStart + assistsPerPage)
  const preassistsByPlayerMap = filteredPreassistPlayers.reduce<
    Record<string, { name: string; avatar: string; count: number }>
  >((acc, item) => {
    const key = item.assistedId || item.assistedName
    if (!acc[key]) acc[key] = { name: item.assistedName, avatar: item.assistedAvatar, count: 0 }
    acc[key].count += 1
    return acc
  }, {})
  const preassistsByPlayerList = Object.values(preassistsByPlayerMap).sort((a, b) => b.count - a.count)
  const preassistsPerPage = 7
  const preassistTotalPages = Math.max(
    1,
    Math.ceil(preassistsByPlayerList.length / preassistsPerPage)
  )
  const preassistPageClamped = Math.min(preassistPage, preassistTotalPages)
  const preassistStart = (preassistPageClamped - 1) * preassistsPerPage
  const preassistPageItems = preassistsByPlayerList.slice(
    preassistStart,
    preassistStart + preassistsPerPage
  )
  const assistComboMap = filteredAssistPlayers.reduce<
    Record<string, { name: string; avatar: string; assists: number; preassists: number }>
  >((acc, item) => {
    const key = item.assistedId || item.assistedName
    if (!acc[key]) {
      acc[key] = {
        name: item.assistedName,
        avatar: item.assistedAvatar,
        assists: 0,
        preassists: 0,
      }
    }
    acc[key].assists += 1
    return acc
  }, {})
  filteredPreassistPlayers.forEach((item) => {
    const key = item.assistedId || item.assistedName
    if (!assistComboMap[key]) {
      assistComboMap[key] = {
        name: item.assistedName,
        avatar: item.assistedAvatar,
        assists: 0,
        preassists: 0,
      }
    }
    assistComboMap[key].preassists += 1
  })
  const assistComboList = Object.values(assistComboMap)
    .map((item) => ({ ...item, total: item.assists + item.preassists }))
    .sort((a, b) => b.total - a.total)
  const assistComboPerPage = 7
  const assistComboTotalPages = Math.max(
    1,
    Math.ceil(assistComboList.length / assistComboPerPage)
  )
  const assistComboPageClamped = Math.min(assistComboPage, assistComboTotalPages)
  const assistComboStart = (assistComboPageClamped - 1) * assistComboPerPage
  const assistComboPageItems = assistComboList.slice(
    assistComboStart,
    assistComboStart + assistComboPerPage
  )
  const goalsByTeamMap = filteredGoalsByTeam.reduce<
    Record<string, { name: string; image: string; goals: number; matchIds: Set<string> }>
  >((acc, item) => {
    const key = item.teamId || item.teamName
    if (!acc[key]) {
      acc[key] = {
        name: item.teamName,
        image: item.teamImage,
        goals: 0,
        matchIds: new Set<string>(),
      }
    }
    acc[key].goals += Number(item.goals) || 0
    if (item.matchId) acc[key].matchIds.add(item.matchId)
    return acc
  }, {})
  const goalsByTeamList = Object.values(goalsByTeamMap)
    .map((item) => ({ ...item, matches: item.matchIds.size }))
    .sort((a, b) => b.goals - a.goals)
  const goalsByTeamMax = goalsByTeamList[0]?.goals || 1
  const goalsByTeamPerPage = 7
  const goalsByTeamTotalPages = Math.max(
    1,
    Math.ceil(goalsByTeamList.length / goalsByTeamPerPage)
  )
  const goalsByTeamPageClamped = Math.min(goalsTeamPage, goalsByTeamTotalPages)
  const goalsByTeamStart = (goalsByTeamPageClamped - 1) * goalsByTeamPerPage
  const goalsByTeamPageItems = goalsByTeamList.slice(
    goalsByTeamStart,
    goalsByTeamStart + goalsByTeamPerPage
  )
  const assistsByTeamMap = filteredAssistsByTeam.reduce<
    Record<string, { name: string; image: string; assists: number; matchIds: Set<string> }>
  >((acc, item) => {
    const key = item.teamId || item.teamName
    if (!acc[key]) {
      acc[key] = {
        name: item.teamName,
        image: item.teamImage,
        assists: 0,
        matchIds: new Set<string>(),
      }
    }
    acc[key].assists += Number(item.assists) || 0
    if (item.matchId) acc[key].matchIds.add(item.matchId)
    return acc
  }, {})
  const assistsByTeamList = Object.values(assistsByTeamMap)
    .map((item) => ({ ...item, matches: item.matchIds.size }))
    .sort((a, b) => b.assists - a.assists)
  const assistsByTeamMax = assistsByTeamList[0]?.assists || 1
  const assistsByTeamPerPage = 7
  const assistsByTeamTotalPages = Math.max(
    1,
    Math.ceil(assistsByTeamList.length / assistsByTeamPerPage)
  )
  const assistsByTeamPageClamped = Math.min(assistsTeamPage, assistsByTeamTotalPages)
  const assistsByTeamStart = (assistsByTeamPageClamped - 1) * assistsByTeamPerPage
  const assistsByTeamPageItems = assistsByTeamList.slice(
    assistsByTeamStart,
    assistsByTeamStart + assistsByTeamPerPage
  )
  const preassistsByTeamMap = filteredPreassistsByTeam.reduce<
    Record<string, { name: string; image: string; preassists: number; matchIds: Set<string> }>
  >((acc, item) => {
    const key = item.teamId || item.teamName
    if (!acc[key]) {
      acc[key] = {
        name: item.teamName,
        image: item.teamImage,
        preassists: 0,
        matchIds: new Set<string>(),
      }
    }
    acc[key].preassists += Number(item.preassists) || 0
    if (item.matchId) acc[key].matchIds.add(item.matchId)
    return acc
  }, {})
  const preassistsByTeamList = Object.values(preassistsByTeamMap)
    .map((item) => ({ ...item, matches: item.matchIds.size }))
    .sort((a, b) => b.preassists - a.preassists)
  const preassistsByTeamMax = preassistsByTeamList[0]?.preassists || 1
  const preassistsByTeamPerPage = 7
  const preassistsByTeamTotalPages = Math.max(
    1,
    Math.ceil(preassistsByTeamList.length / preassistsByTeamPerPage)
  )
  const preassistsByTeamPageClamped = Math.min(preassistsTeamPage, preassistsByTeamTotalPages)
  const preassistsByTeamStart = (preassistsByTeamPageClamped - 1) * preassistsByTeamPerPage
  const preassistsByTeamPageItems = preassistsByTeamList.slice(
    preassistsByTeamStart,
    preassistsByTeamStart + preassistsByTeamPerPage
  )
  const gkPartnerMap = filteredGkPartners.reduce<
    Record<string, { name: string; avatar: string; cs: number; matchIds: Set<string> }>
  >((acc, item) => {
    const key = item.keeperPlayerId || item.keeperId || item.keeperName
    if (!acc[key]) {
      acc[key] = {
        name: item.keeperName,
        avatar: item.keeperAvatar,
        cs: 0,
        matchIds: new Set<string>(),
      }
    }
    acc[key].cs += Number(item.cs) || 0
    if (item.matchId) acc[key].matchIds.add(item.matchId)
    return acc
  }, {})
  const gkPartnerList = Object.values(gkPartnerMap)
    .map((item) => ({ ...item, matches: item.matchIds.size }))
    .sort((a, b) => b.cs - a.cs)
  const gkPartnersPerPage = 7
  const gkPartnersTotalPages = Math.max(
    1,
    Math.ceil(gkPartnerList.length / gkPartnersPerPage)
  )
  const gkPartnerPageClamped = Math.min(gkPartnerPage, gkPartnersTotalPages)
  const gkPartnerStart = (gkPartnerPageClamped - 1) * gkPartnersPerPage
  const gkPartnerPageItems = gkPartnerList.slice(
    gkPartnerStart,
    gkPartnerStart + gkPartnersPerPage
  )
  const concededOpponents = filteredConcededOpponents.reduce<
    Record<string, { name: string; image: string; conceded: number; matchIds: Set<string> }>
  >((acc, item) => {
    const key = item.opponentId || item.opponentName
    if (!acc[key]) {
      acc[key] = {
        name: item.opponentName,
        image: item.opponentImage,
        conceded: 0,
        matchIds: new Set<string>(),
      }
    }
    acc[key].conceded += Number(item.goalsConceded) || 0
    if (item.matchId) acc[key].matchIds.add(item.matchId)
    return acc
  }, {})
  const concededOpponentsList = Object.values(concededOpponents)
    .map((item) => ({ ...item, matches: item.matchIds.size }))
    .sort((a, b) => b.conceded - a.conceded)
  const concededOpponentsPerPage = 7
  const concededOpponentsTotalPages = Math.max(
    1,
    Math.ceil(concededOpponentsList.length / concededOpponentsPerPage)
  )
  const concededOpponentPageClamped = Math.min(
    concededOpponentPage,
    concededOpponentsTotalPages
  )
  const concededOpponentStart = (concededOpponentPageClamped - 1) * concededOpponentsPerPage
  const concededOpponentPageItems = concededOpponentsList.slice(
    concededOpponentStart,
    concededOpponentStart + concededOpponentsPerPage
  )
  const kicksOpponents = filteredKicksOpponents.reduce<
    Record<string, { name: string; image: string; kicks: number; matchIds: Set<string> }>
  >((acc, item) => {
    const key = item.opponentId || item.opponentName
    if (!acc[key]) {
      acc[key] = {
        name: item.opponentName,
        image: item.opponentImage,
        kicks: 0,
        matchIds: new Set<string>(),
      }
    }
    acc[key].kicks += Number(item.kicks) || 0
    if (item.matchId) acc[key].matchIds.add(item.matchId)
    return acc
  }, {})
  const kicksOpponentsList = Object.values(kicksOpponents)
    .map((item) => ({ ...item, matches: item.matchIds.size }))
    .sort((a, b) => b.kicks - a.kicks)
  const kicksOpponentsPerPage = 7
  const kicksOpponentsTotalPages = Math.max(
    1,
    Math.ceil(kicksOpponentsList.length / kicksOpponentsPerPage)
  )
  const kicksOpponentPageClamped = Math.min(kicksOpponentPage, kicksOpponentsTotalPages)
  const kicksOpponentStart = (kicksOpponentPageClamped - 1) * kicksOpponentsPerPage
  const kicksOpponentPageItems = kicksOpponentsList.slice(
    kicksOpponentStart,
    kicksOpponentStart + kicksOpponentsPerPage
  )
  const shotsOffGoalChartData =
    activeChart === "shotsOnGoal"
      ? filteredSeries
          .map((item) => ({
            date: item.date,
            value: Number(item.stats?.shotsOffGoal) || 0,
            matchLabel: item.matchLabel,
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      : null

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {allTabs.map((tab) => {
          const isActive = tab.id === activeId
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveId(tab.id)}
              className={cn(
                "flex items-center justify-center h-12 w-12 rounded-full border transition",
                isActive
                  ? "border-teal-400/80 bg-slate-900 shadow-[0_0_0_2px_rgba(20,184,166,0.15)]"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-600"
              )}
              aria-pressed={isActive}
              title={tab.label}
            >
              {tab.logo ? (
                <img
                  src={tab.logo}
                  alt={tab.label}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <span className="text-[10px] uppercase tracking-[0.2em] text-slate-300">Total</span>
              )}
            </button>
          )
        })}
      </div>

      {activeTab?.seasonFilters ? (
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "all", label: "All" },
            { key: "league", label: "League" },
            { key: "cup", label: "Cup" },
            { key: "supercup", label: "Supercup" },
          ].map((item) => {
            const isActive = activeFilter === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveFilter(item.key as "all" | "league" | "cup" | "supercup")}
                className={cn(
                  "rounded-full border px-4 py-2 text-xs uppercase tracking-[0.2em] transition",
                  isActive
                    ? "border-teal-400/70 bg-teal-500/10 text-teal-200"
                    : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-600"
                )}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Matches</p>
          <div className="mt-6 flex items-center justify-center">
            <div
              className="relative h-36 w-36 rounded-full p-3"
              style={{
                background: `conic-gradient(#14b8a6 0deg, #14b8a6 ${ringDegrees}deg, rgba(148,163,184,0.25) ${ringDegrees}deg, rgba(148,163,184,0.25) 360deg)`,
              }}
            >
              <div className="absolute inset-3 rounded-full bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-semibold">{winRateLabel}</span>
                <span className="text-xs text-slate-400">Win rate</span>
                <span className="mt-1 text-xs text-slate-500">
                  {stats.matchesPlayed} played
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
            {[
              { key: "wins", label: "Wins", value: stats.matchesWon },
              { key: "draws", label: "Draws", value: stats.matchesDraw },
              { key: "losses", label: "Losses", value: stats.matchesLost },
            ].map((item) => {
              const isActive = matchListFilter === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setMatchListFilter(item.key as "wins" | "draws" | "losses")
                    setMatchListPage(1)
                    setActiveChart(null)
                  }}
                  className={cn(
                    "rounded-xl border bg-slate-900/70 px-3 py-2 text-center transition",
                    isActive
                      ? "border-teal-400/60 text-teal-100 shadow-[0_0_0_1px_rgba(45,212,191,0.25)]"
                      : "border-slate-800 text-white hover:border-slate-600"
                  )}
                >
                  <p className="text-slate-400 text-xs">{item.label}</p>
                  <p className="text-base font-semibold">{item.value}</p>
                </button>
              )
            })}
          </div>
          <div className="mt-6">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
              Minutes and starts
            </div>
            <div className="mt-4 flex items-center justify-center">
              <div
                className="relative h-36 w-36 rounded-full p-3"
                style={{
                  background: `conic-gradient(#38bdf8 0deg, #38bdf8 ${starterDegrees}deg, rgba(148,163,184,0.25) ${starterDegrees}deg, rgba(148,163,184,0.25) 360deg)`,
                }}
              >
                <div className="absolute inset-3 rounded-full bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-semibold">
                    {Math.round(starterRatio * 100)}%
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    Starter
                  </span>
                  <span className="mt-1 text-xs text-slate-500">{minutesLabel}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center text-sm">
              {[
                { key: "starter", label: "Starter", value: stats.starter },
                { key: "substitute", label: "Substitute", value: stats.substitute },
              ].map((item) => {
                const isActive = matchListFilter === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setMatchListFilter(item.key as "starter" | "substitute")
                      setMatchListPage(1)
                      setActiveChart(null)
                    }}
                    className={cn(
                      "rounded-xl border bg-slate-900/70 px-3 py-2 text-center transition",
                      isActive
                        ? "border-sky-400/60 text-sky-100 shadow-[0_0_0_1px_rgba(56,189,248,0.25)]"
                        : "border-slate-800 text-white hover:border-slate-600"
                    )}
                  >
                    <p className="text-slate-400 text-xs">{item.label}</p>
                    <p className="text-base font-semibold">{item.value}</p>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
              Position detail
            </div>
            <div className="mt-4">
              <PositionHeatmap positions={sortedPositions} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              {matchListFilter
                ? `${matchListFilter} matches`
                : `Statistics${activeTab?.label ? ` - ${activeTab.label}` : ""}`}
            </p>
            {matchListFilter ? (
              <button
                type="button"
                onClick={() => setMatchListFilter(null)}
                className="rounded-full border border-slate-800 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400 hover:border-slate-600"
              >
                Back to stats
              </button>
            ) : null}
          </div>
          {matchListFilter ? (
            <div className="mt-6 space-y-3">
              {matchListPageItems.length ? (
                matchListPageItems.map((match) => {
                  const matchDate = match.date
                    ? new Date(match.date).toLocaleDateString("es-ES")
                    : "-"
                  return (
                    <Link
                      key={match.matchId || match.matchLabel}
                      href={match.matchId ? `/matches/${match.matchId}` : "#"}
                      className={cn(
                        "block rounded-xl border border-slate-800 bg-slate-900/70 px-5 py-4 transition",
                        match.matchId
                          ? "hover:-translate-y-0.5 hover:border-teal-400/50 hover:shadow-[0_12px_24px_rgba(15,23,42,0.45)]"
                          : "pointer-events-none"
                      )}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{matchDate}</span>
                        <span>{match.competitionLabel || "Match"}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          {match.teamAImage ? (
                            <img
                              src={match.teamAImage}
                              alt={match.teamA}
                              className="h-10 w-10 rounded-full object-cover border border-slate-700"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full border border-slate-800 bg-slate-900/60" />
                          )}
                          <span className="truncate">{match.teamA}</span>
                        </div>
                        <div className="text-base font-semibold text-slate-100">
                          {match.scoreA} : {match.scoreB}
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <span className="truncate">{match.teamB}</span>
                          {match.teamBImage ? (
                            <img
                              src={match.teamBImage}
                              alt={match.teamB}
                              className="h-10 w-10 rounded-full object-cover border border-slate-700"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full border border-slate-800 bg-slate-900/60" />
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-6 text-center text-sm text-slate-400">
                  No matches in this view.
                </div>
              )}
              {matchListTotalPages > 1 ? (
                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                  <button
                    type="button"
                    onClick={() => setMatchListPage((prev) => Math.max(1, prev - 1))}
                    className={cn(
                      "rounded-full border px-3 py-1",
                      matchListPageClamped === 1
                        ? "pointer-events-none opacity-40"
                        : "border-slate-800 hover:border-teal-400/60"
                    )}
                  >
                    Previous
                  </button>
                  <span>
                    Page {matchListPageClamped} of {matchListTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setMatchListPage((prev) =>
                        Math.min(matchListTotalPages, prev + 1)
                      )
                    }
                    className={cn(
                      "rounded-full border px-3 py-1",
                      matchListPageClamped === matchListTotalPages
                        ? "pointer-events-none opacity-40"
                        : "border-slate-800 hover:border-teal-400/60"
                    )}
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className={cn(matchListFilter ? "hidden" : "")}>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
            {statCards.map((card) => (
              <div
                key={card.key}
                className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3"
              >
                <p className="text-slate-400 text-xs">{card.label}</p>
                <p className="text-lg font-semibold">
                  {card.key === "avg" ? avgDisplay.toFixed(2) : stats[card.key]}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setActiveChart(activeChart === card.key ? null : card.key)
                  }
                  className="mt-2 text-[10px] uppercase tracking-[0.2em] text-slate-400 hover:text-slate-200"
                >
                  {activeChart === card.key ? "hide graphics" : "show graphics"}
                </button>
              </div>
            ))}
          </div>
          {activeChart && chartData ? (
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-4">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-400">
                <span>{activeChartLabel}</span>
                <span>{filteredSeries.length} matches</span>
              </div>
              <div className="mt-3">
                <MiniLineChart data={chartData} label={activeChartLabel} />
              </div>
            </div>
          ) : null}
          {activeChart === "shotsOnGoal" && shotsOffGoalChartData ? (
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-4">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-400">
                <span>Shots off goal</span>
                <span>{filteredSeries.length} matches</span>
              </div>
              <div className="mt-3">
                <MiniLineChart data={shotsOffGoalChartData} label="Shots off goal" />
              </div>
            </div>
          ) : null}
          {activeChart ? (
            <div className="mt-4 flex items-center justify-start gap-6">
              <div className="flex h-32 items-center gap-4 text-left">
                <div className="flex h-full w-fit flex-col justify-center rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 whitespace-nowrap">
                  <div className="text-3xl font-semibold">
                    {activeChart === "avg" ? avgDisplay.toFixed(2) : stats[activeChart]}
                  </div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Total</div>
                </div>
                <div className="flex h-full w-fit flex-col justify-center rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 whitespace-nowrap">
                  <div className="text-3xl font-semibold">{perMinuteStat.toFixed(2)}</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {activeChartLabel} / min
                  </div>
                </div>
                {kicksBreakdown ? (
                  <div className="flex items-center gap-4">
                    <div
                      className="relative h-32 w-32 rounded-full p-3"
                      style={{
                        background: (() => {
                          const total = kicksBreakdown.total
                          const segments = [
                            { value: kicksBreakdown.passes, color: "#22d3ee" },
                            { value: kicksBreakdown.autopass, color: "#a855f7" },
                            { value: kicksBreakdown.misspass, color: "#ef4444" },
                            { value: kicksBreakdown.others, color: "#facc15" },
                          ]
                          let start = 0
                          const parts = segments.map((seg) => {
                            const pct = (seg.value / total) * 360
                            const end = start + pct
                            const part = `${seg.color} ${start}deg ${end}deg`
                            start = end
                            return part
                          })
                          if (start < 360) {
                            parts.push(`rgba(148,163,184,0.25) ${start}deg 360deg`)
                          }
                          return `conic-gradient(${parts.join(", ")})`
                        })(),
                      }}
                    >
                      <div className="absolute inset-3 rounded-full bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                        <span className="text-lg font-semibold">{kicksBreakdown.total}</span>
                        <span className="text-[10px] text-slate-400">Kicks</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="h-2 w-2 rounded-full bg-cyan-400" />
                        Passes {kicksBreakdown.passes}
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="h-2 w-2 rounded-full bg-purple-400" />
                        Autopass {kicksBreakdown.autopass}
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="h-2 w-2 rounded-full bg-red-400" />
                        Misspass {kicksBreakdown.misspass}
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="h-2 w-2 rounded-full bg-yellow-300" />
                        Others {kicksBreakdown.others}
                      </div>
                    </div>
                  </div>
                ) : null}
                {passAccuracy !== null ? (
                  <div
                    className="relative h-32 w-32 rounded-full p-3"
                    style={{
                      background: `conic-gradient(#22d3ee 0deg, #22d3ee ${Math.round(
                        passAccuracy * 3.6
                      )}deg, rgba(148,163,184,0.25) ${Math.round(
                        passAccuracy * 3.6
                      )}deg, rgba(148,163,184,0.25) 360deg)`,
                    }}
                  >
                    <div className="absolute inset-3 rounded-full bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                      <span className="text-xl font-semibold">{passAccuracy.toFixed(2)}%</span>
                      <span className="text-[10px] text-slate-400">Pass accuracy</span>
                    </div>
                  </div>
                ) : null}
                {passDirectionBreakdown ? (
                  <div className="flex items-center gap-4">
                    <div
                      className="relative h-32 w-32 rounded-full p-3"
                      style={{
                        background: (() => {
                          const total = passDirectionBreakdown.total
                          const segments = [
                            { value: passDirectionBreakdown.forward, color: "#22d3ee" },
                            { value: passDirectionBreakdown.lateral, color: "#a3e635" },
                            { value: passDirectionBreakdown.backward, color: "#f97316" },
                          ]
                          let start = 0
                          const parts = segments.map((seg) => {
                            const pct = (seg.value / total) * 360
                            const end = start + pct
                            const part = `${seg.color} ${start}deg ${end}deg`
                            start = end
                            return part
                          })
                          if (start < 360) {
                            parts.push(`rgba(148,163,184,0.25) ${start}deg 360deg`)
                          }
                          return `conic-gradient(${parts.join(", ")})`
                        })(),
                      }}
                    >
                      <div className="absolute inset-3 rounded-full bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                        <span className="text-lg font-semibold">{passDirectionBreakdown.total}</span>
                        <span className="text-[10px] text-slate-400">Passes</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="h-2 w-2 rounded-full bg-cyan-400" />
                        Forward {passDirectionBreakdown.forward}
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="h-2 w-2 rounded-full bg-lime-400" />
                        Lateral {passDirectionBreakdown.lateral}
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="h-2 w-2 rounded-full bg-orange-400" />
                        Backward {passDirectionBreakdown.backward}
                      </div>
                    </div>
                  </div>
                ) : null}
                {keypassRate !== null ? (
                  <div
                    className="relative h-32 w-32 rounded-full p-3"
                    style={{
                      background: `conic-gradient(#f59e0b 0deg, #f59e0b ${Math.round(
                        keypassRate * 3.6
                      )}deg, rgba(148,163,184,0.25) ${Math.round(
                        keypassRate * 3.6
                      )}deg, rgba(148,163,184,0.25) 360deg)`,
                    }}
                  >
                    <div className="absolute inset-3 rounded-full bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                      <span className="text-xl font-semibold">{keypassRate.toFixed(2)}%</span>
                      <span className="text-[10px] text-slate-400">Key pass rate</span>
                    </div>
                  </div>
                ) : null}
                {keypassImpact !== null ? (
                  <div
                    className="relative h-32 w-32 rounded-full p-3"
                    style={{
                      background: `conic-gradient(#ec4899 0deg, #ec4899 ${Math.round(
                        keypassImpact * 3.6
                      )}deg, rgba(148,163,184,0.25) ${Math.round(
                        keypassImpact * 3.6
                      )}deg, rgba(148,163,184,0.25) 360deg)`,
                    }}
                  >
                    <div className="absolute inset-3 rounded-full bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                      <span className="text-xl font-semibold">{keypassImpact.toFixed(2)}%</span>
                      <span className="text-[10px] text-slate-400">Goal yield</span>
                    </div>
                  </div>
                ) : null}
                {autopassRate !== null ? (
                  <div
                    className="relative h-32 w-32 rounded-full p-3"
                    style={{
                      background: `conic-gradient(#38bdf8 0deg, #38bdf8 ${Math.round(
                        autopassRate * 3.6
                      )}deg, rgba(148,163,184,0.25) ${Math.round(
                        autopassRate * 3.6
                      )}deg, rgba(148,163,184,0.25) 360deg)`,
                    }}
                  >
                    <div className="absolute inset-3 rounded-full bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                      <span className="text-xl font-semibold">{autopassRate.toFixed(2)}%</span>
                      <span className="text-[10px] text-slate-400">Autopass rate</span>
                    </div>
                  </div>
                ) : null}
                {saveRate !== null ? (
                  <div
                    className="relative h-32 w-32 rounded-full p-3"
                    style={{
                      background: `conic-gradient(#0ea5e9 0deg, #0ea5e9 ${Math.round(
                        saveRate * 3.6
                      )}deg, rgba(148,163,184,0.25) ${Math.round(
                        saveRate * 3.6
                      )}deg, rgba(148,163,184,0.25) 360deg)`,
                    }}
                  >
                    <div className="absolute inset-3 rounded-full bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                      <span className="text-xl font-semibold">{saveRate.toFixed(2)}%</span>
                      <span className="text-[10px] text-slate-400">Save rate</span>
                    </div>
                  </div>
                ) : null}
                {cleanSheetRate !== null ? (
                  <div
                    className="relative h-32 w-32 rounded-full p-3"
                    style={{
                      background: `conic-gradient(#14b8a6 0deg, #14b8a6 ${Math.round(
                        cleanSheetRate * 3.6
                      )}deg, rgba(148,163,184,0.25) ${Math.round(
                        cleanSheetRate * 3.6
                      )}deg, rgba(148,163,184,0.25) 360deg)`,
                    }}
                  >
                    <div className="absolute inset-3 rounded-full bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                      <span className="text-xl font-semibold">{cleanSheetRate.toFixed(2)}%</span>
                      <span className="text-[10px] text-slate-400">CS rate</span>
                    </div>
                  </div>
                ) : null}
                {concededMatchRate !== null ? (
                  <div
                    className="relative h-32 w-32 rounded-full p-3"
                    style={{
                      background: `conic-gradient(#f97316 0deg, #f97316 ${Math.round(
                        concededMatchRate * 3.6
                      )}deg, rgba(148,163,184,0.25) ${Math.round(
                        concededMatchRate * 3.6
                      )}deg, rgba(148,163,184,0.25) 360deg)`,
                    }}
                  >
                    <div className="absolute inset-3 rounded-full bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                      <span className="text-xl font-semibold">
                        {concededMatchRate.toFixed(2)}%
                      </span>
                      <span className="text-[10px] text-slate-400">Conceded rate</span>
                    </div>
                  </div>
                ) : null}
                {misspassRate !== null ? (
                  <div
                    className="relative h-32 w-32 rounded-full p-3"
                    style={{
                      background: `conic-gradient(#ef4444 0deg, #ef4444 ${Math.round(
                        misspassRate * 3.6
                      )}deg, rgba(148,163,184,0.25) ${Math.round(
                        misspassRate * 3.6
                      )}deg, rgba(148,163,184,0.25) 360deg)`,
                    }}
                  >
                    <div className="absolute inset-3 rounded-full bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                      <span className="text-xl font-semibold">{misspassRate.toFixed(2)}%</span>
                      <span className="text-[10px] text-slate-400">Misspass rate</span>
                    </div>
                  </div>
                ) : null}
                {onTargetRate !== null ? (
                  <div
                    className="relative h-32 w-32 rounded-full p-3"
                    style={{
                      background: `conic-gradient(#22c55e 0deg, #22c55e ${Math.round(
                        onTargetRate * 3.6
                      )}deg, rgba(148,163,184,0.25) ${Math.round(
                        onTargetRate * 3.6
                      )}deg, rgba(148,163,184,0.25) 360deg)`,
                    }}
                  >
                    <div className="absolute inset-3 rounded-full bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                      <span className="text-xl font-semibold">{onTargetRate.toFixed(2)}%</span>
                      <span className="text-[10px] text-slate-400">On target</span>
                    </div>
                  </div>
                ) : null}
                {assistMatchRate !== null ? (
                  <div
                    className="relative h-32 w-32 rounded-full p-3"
                    style={{
                      background: `conic-gradient(#38bdf8 0deg, #38bdf8 ${Math.round(
                        assistMatchRate * 3.6
                      )}deg, rgba(148,163,184,0.25) ${Math.round(
                        assistMatchRate * 3.6
                      )}deg, rgba(148,163,184,0.25) 360deg)`,
                    }}
                  >
                    <div className="absolute inset-3 rounded-full bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                      <span className="text-xl font-semibold">{assistMatchRate.toFixed(2)}%</span>
                      <span className="text-[10px] text-slate-400">Assist matches</span>
                    </div>
                  </div>
                ) : null}
              </div>
              {goalAccuracy !== null ? (
                <div className="ml-auto flex items-center gap-4">
                  <div
                    className="relative h-32 w-32 rounded-full p-3"
                    style={{
                      background: `conic-gradient(#a855f7 0deg, #a855f7 ${Math.round(
                        goalAccuracy * 3.6
                      )}deg, rgba(148,163,184,0.25) ${Math.round(
                        goalAccuracy * 3.6
                      )}deg, rgba(148,163,184,0.25) 360deg)`,
                    }}
                  >
                    <div className="absolute inset-3 rounded-full bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                      <span className="text-xl font-semibold">{goalAccuracy.toFixed(2)}%</span>
                      <span className="text-[10px] text-slate-400">Goal accuracy</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
                      <p className="text-slate-400">Braces</p>
                      <p className="text-base font-semibold">{goalMilestones.braces}</p>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
                      <p className="text-slate-400 whitespace-nowrap">Hat tricks</p>
                      <p className="text-base font-semibold">{goalMilestones.hatTricks}</p>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
                      <p className="text-slate-400">Pokers</p>
                      <p className="text-base font-semibold">{goalMilestones.pokers}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          {activeChart === "goals" && (opponentGoalsList.length || goalsByTeamList.length) ? (
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  {goalsPanel === "opponents" ? "Goals by opponent" : "Goals by team"}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGoalsPanel("opponents")}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em]",
                      goalsPanel === "opponents"
                        ? "border-teal-400/80 bg-slate-900 text-slate-100"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-600"
                    )}
                  >
                    Opponents
                  </button>
                  <button
                    type="button"
                    onClick={() => setGoalsPanel("teams")}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em]",
                      goalsPanel === "teams"
                        ? "border-teal-400/80 bg-slate-900 text-slate-100"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-600"
                    )}
                  >
                    Teams
                  </button>
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  {goalsPanel === "opponents"
                    ? `${opponentGoalsList.reduce((sum, item) => sum + item.count, 0)} goals`
                    : `${goalsByTeamList.reduce((sum, item) => sum + item.goals, 0)} goals`}
                </div>
              </div>
              {goalsPanel === "opponents" ? (
                <>
                  <div className="mt-4 grid gap-3">
                    {opponentPageItems.map((item) => (
                      <div key={item.name} className="flex items-center gap-3 text-sm text-slate-200">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-10 w-10 rounded-full object-cover border border-slate-800"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full border border-slate-800 bg-slate-900/60" />
                        )}
                        <div className="flex-1">
                          <div className="text-sm">{item.name}</div>
                          <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                            <div
                              className="h-1.5 rounded-full bg-teal-500"
                              style={{
                                width: `${Math.max(
                                  6,
                                  (item.count / opponentGoalsList[0].count) * 100
                                )}%`,
                              }}
                            />
                          </div>
                          <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                            {item.matches} matches
                          </div>
                        </div>
                        <div className="text-sm font-semibold">{item.count}</div>
                      </div>
                    ))}
                  </div>
                  {opponentTotalPages > 1 ? (
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                      <button
                        type="button"
                        onClick={() => setOpponentPage((prev) => Math.max(1, prev - 1))}
                        className={cn(
                          "rounded-full border px-3 py-1",
                          opponentPageClamped === 1
                            ? "pointer-events-none opacity-40"
                            : "border-slate-800 hover:border-teal-400/60"
                        )}
                      >
                        Previous
                      </button>
                      <span>
                        Page {opponentPageClamped} of {opponentTotalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setOpponentPage((prev) => Math.min(opponentTotalPages, prev + 1))
                        }
                        className={cn(
                          "rounded-full border px-3 py-1",
                          opponentPageClamped === opponentTotalPages
                            ? "pointer-events-none opacity-40"
                            : "border-slate-800 hover:border-teal-400/60"
                        )}
                      >
                        Next
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="mt-4 grid gap-3">
                    {goalsByTeamPageItems.map((item) => (
                      <div key={item.name} className="flex items-center gap-3 text-sm text-slate-200">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-10 w-10 rounded-full object-cover border border-slate-800"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full border border-slate-800 bg-slate-900/60" />
                        )}
                        <div className="flex-1">
                          <div className="text-sm">{item.name}</div>
                          <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                            <div
                              className="h-1.5 rounded-full bg-teal-500"
                              style={{
                                width: `${Math.max(
                                  6,
                                  (item.goals / goalsByTeamMax) * 100
                                )}%`,
                              }}
                            />
                          </div>
                          <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                            {item.matches} matches
                          </div>
                        </div>
                        <div className="text-sm font-semibold">{item.goals}</div>
                      </div>
                    ))}
                  </div>
                  {goalsByTeamTotalPages > 1 ? (
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                      <button
                        type="button"
                        onClick={() => setGoalsTeamPage((prev) => Math.max(1, prev - 1))}
                        className={cn(
                          "rounded-full border px-3 py-1",
                          goalsByTeamPageClamped === 1
                            ? "pointer-events-none opacity-40"
                            : "border-slate-800 hover:border-teal-400/60"
                        )}
                      >
                        Previous
                      </button>
                      <span>
                        Page {goalsByTeamPageClamped} of {goalsByTeamTotalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setGoalsTeamPage((prev) =>
                            Math.min(goalsByTeamTotalPages, prev + 1)
                          )
                        }
                        className={cn(
                          "rounded-full border px-3 py-1",
                          goalsByTeamPageClamped === goalsByTeamTotalPages
                            ? "pointer-events-none opacity-40"
                            : "border-slate-800 hover:border-teal-400/60"
                        )}
                      >
                        Next
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
          {activeChart === "assists" && (assistsByPlayerList.length || assistsByTeamList.length) ? (
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  {assistsPanel === "players" ? "Assists by player" : "Assists by team"}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAssistsPanel("players")}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em]",
                      assistsPanel === "players"
                        ? "border-teal-400/80 bg-slate-900 text-slate-100"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-600"
                    )}
                  >
                    Players
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssistsPanel("teams")}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em]",
                      assistsPanel === "teams"
                        ? "border-teal-400/80 bg-slate-900 text-slate-100"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-600"
                    )}
                  >
                    Teams
                  </button>
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  {assistsPanel === "players"
                    ? `${assistsByPlayerList.reduce((sum, item) => sum + item.count, 0)} assists`
                    : `${assistsByTeamList.reduce((sum, item) => sum + item.assists, 0)} assists`}
                </div>
              </div>
              {assistsPanel === "players" ? (
                <>
                  <div className="mt-4 grid gap-3">
                    {assistPageItems.map((item) => (
                      <div key={item.name} className="flex items-center gap-3 text-sm text-slate-200">
                        {item.avatar ? (
                          <img
                            src={item.avatar}
                            alt={item.name}
                            className="h-10 w-10 rounded-full object-cover border border-slate-800"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full border border-slate-800 bg-slate-900/60" />
                        )}
                        <div className="flex-1">
                          <div className="text-sm">{item.name}</div>
                          <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                            <div
                              className="h-1.5 rounded-full bg-teal-500"
                              style={{
                                width: `${Math.max(
                                  6,
                                  (item.count / assistsByPlayerList[0].count) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="text-sm font-semibold">{item.count}</div>
                      </div>
                    ))}
                  </div>
                  {assistTotalPages > 1 ? (
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                      <button
                        type="button"
                        onClick={() => setAssistPage((prev) => Math.max(1, prev - 1))}
                        className={cn(
                          "rounded-full border px-3 py-1",
                          assistPageClamped === 1
                            ? "pointer-events-none opacity-40"
                            : "border-slate-800 hover:border-teal-400/60"
                        )}
                      >
                        Previous
                      </button>
                      <span>
                        Page {assistPageClamped} of {assistTotalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setAssistPage((prev) => Math.min(assistTotalPages, prev + 1))
                        }
                        className={cn(
                          "rounded-full border px-3 py-1",
                          assistPageClamped === assistTotalPages
                            ? "pointer-events-none opacity-40"
                            : "border-slate-800 hover:border-teal-400/60"
                        )}
                      >
                        Next
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="mt-4 grid gap-3">
                    {assistsByTeamPageItems.map((item) => (
                      <div key={item.name} className="flex items-center gap-3 text-sm text-slate-200">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-10 w-10 rounded-full object-cover border border-slate-800"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full border border-slate-800 bg-slate-900/60" />
                        )}
                        <div className="flex-1">
                          <div className="text-sm">{item.name}</div>
                          <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                            <div
                              className="h-1.5 rounded-full bg-teal-500"
                              style={{
                                width: `${Math.max(
                                  6,
                                  (item.assists / assistsByTeamMax) * 100
                                )}%`,
                              }}
                            />
                          </div>
                          <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                            {item.matches} matches
                          </div>
                        </div>
                        <div className="text-sm font-semibold">{item.assists}</div>
                      </div>
                    ))}
                  </div>
                  {assistsByTeamTotalPages > 1 ? (
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                      <button
                        type="button"
                        onClick={() => setAssistsTeamPage((prev) => Math.max(1, prev - 1))}
                        className={cn(
                          "rounded-full border px-3 py-1",
                          assistsByTeamPageClamped === 1
                            ? "pointer-events-none opacity-40"
                            : "border-slate-800 hover:border-teal-400/60"
                        )}
                      >
                        Previous
                      </button>
                      <span>
                        Page {assistsByTeamPageClamped} of {assistsByTeamTotalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setAssistsTeamPage((prev) =>
                            Math.min(assistsByTeamTotalPages, prev + 1)
                          )
                        }
                        className={cn(
                          "rounded-full border px-3 py-1",
                          assistsByTeamPageClamped === assistsByTeamTotalPages
                            ? "pointer-events-none opacity-40"
                            : "border-slate-800 hover:border-teal-400/60"
                        )}
                      >
                        Next
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
          {activeChart === "preassists" && (preassistsByPlayerList.length || preassistsByTeamList.length) ? (
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  {preassistsPanel === "players" ? "Pre-assists by player" : "Pre-assists by team"}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreassistsPanel("players")}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em]",
                      preassistsPanel === "players"
                        ? "border-teal-400/80 bg-slate-900 text-slate-100"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-600"
                    )}
                  >
                    Players
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreassistsPanel("teams")}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em]",
                      preassistsPanel === "teams"
                        ? "border-teal-400/80 bg-slate-900 text-slate-100"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-600"
                    )}
                  >
                    Teams
                  </button>
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  {preassistsPanel === "players"
                    ? `${preassistsByPlayerList.reduce((sum, item) => sum + item.count, 0)} pre-assists`
                    : `${preassistsByTeamList.reduce((sum, item) => sum + item.preassists, 0)} pre-assists`}
                </div>
              </div>
              {preassistsPanel === "players" ? (
                <>
                  <div className="mt-4 grid gap-3">
                    {preassistPageItems.map((item) => (
                      <div key={item.name} className="flex items-center gap-3 text-sm text-slate-200">
                        {item.avatar ? (
                          <img
                            src={item.avatar}
                            alt={item.name}
                            className="h-10 w-10 rounded-full object-cover border border-slate-800"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full border border-slate-800 bg-slate-900/60" />
                        )}
                        <div className="flex-1">
                          <div className="text-sm">{item.name}</div>
                          <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                            <div
                              className="h-1.5 rounded-full bg-teal-500"
                              style={{
                                width: `${Math.max(
                                  6,
                                  (item.count / preassistsByPlayerList[0].count) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="text-sm font-semibold">{item.count}</div>
                      </div>
                    ))}
                  </div>
                  {preassistTotalPages > 1 ? (
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                      <button
                        type="button"
                        onClick={() => setPreassistPage((prev) => Math.max(1, prev - 1))}
                        className={cn(
                          "rounded-full border px-3 py-1",
                          preassistPageClamped === 1
                            ? "pointer-events-none opacity-40"
                            : "border-slate-800 hover:border-teal-400/60"
                        )}
                      >
                        Previous
                      </button>
                      <span>
                        Page {preassistPageClamped} of {preassistTotalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPreassistPage((prev) => Math.min(preassistTotalPages, prev + 1))
                        }
                        className={cn(
                          "rounded-full border px-3 py-1",
                          preassistPageClamped === preassistTotalPages
                            ? "pointer-events-none opacity-40"
                            : "border-slate-800 hover:border-teal-400/60"
                        )}
                      >
                        Next
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="mt-4 grid gap-3">
                    {preassistsByTeamPageItems.map((item) => (
                      <div key={item.name} className="flex items-center gap-3 text-sm text-slate-200">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-10 w-10 rounded-full object-cover border border-slate-800"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full border border-slate-800 bg-slate-900/60" />
                        )}
                        <div className="flex-1">
                          <div className="text-sm">{item.name}</div>
                          <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                            <div
                              className="h-1.5 rounded-full bg-teal-500"
                              style={{
                                width: `${Math.max(
                                  6,
                                  (item.preassists / preassistsByTeamMax) * 100
                                )}%`,
                              }}
                            />
                          </div>
                          <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                            {item.matches} matches
                          </div>
                        </div>
                        <div className="text-sm font-semibold">{item.preassists}</div>
                      </div>
                    ))}
                  </div>
                  {preassistsByTeamTotalPages > 1 ? (
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                      <button
                        type="button"
                        onClick={() => setPreassistsTeamPage((prev) => Math.max(1, prev - 1))}
                        className={cn(
                          "rounded-full border px-3 py-1",
                          preassistsByTeamPageClamped === 1
                            ? "pointer-events-none opacity-40"
                            : "border-slate-800 hover:border-teal-400/60"
                        )}
                      >
                        Previous
                      </button>
                      <span>
                        Page {preassistsByTeamPageClamped} of {preassistsByTeamTotalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPreassistsTeamPage((prev) =>
                            Math.min(preassistsByTeamTotalPages, prev + 1)
                          )
                        }
                        className={cn(
                          "rounded-full border px-3 py-1",
                          preassistsByTeamPageClamped === preassistsByTeamTotalPages
                            ? "pointer-events-none opacity-40"
                            : "border-slate-800 hover:border-teal-400/60"
                        )}
                      >
                        Next
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
          {activeChart === "keypass" && assistComboList.length ? (
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-4">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-400">
                <span>Assisted players</span>
                <span>
                  {assistComboList.reduce((sum, item) => sum + item.total, 0)} actions
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {assistComboPageItems.map((item) => (
                  <div key={item.name} className="flex items-center gap-3 text-sm text-slate-200">
                    {item.avatar ? (
                      <img
                        src={item.avatar}
                        alt={item.name}
                        className="h-10 w-10 rounded-full object-cover border border-slate-800"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full border border-slate-800 bg-slate-900/60" />
                    )}
                    <div className="flex-1">
                      <div className="text-sm">{item.name}</div>
                      <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                        <div
                          className="h-1.5 rounded-full bg-teal-500"
                          style={{
                            width: `${Math.max(
                              6,
                              (item.total / assistComboList[0].total) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        {item.assists} assists · {item.preassists} pre-assists
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{item.total}</div>
                  </div>
                ))}
              </div>
              {assistComboTotalPages > 1 ? (
                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                  <button
                    type="button"
                    onClick={() => setAssistComboPage((prev) => Math.max(1, prev - 1))}
                    className={cn(
                      "rounded-full border px-3 py-1",
                      assistComboPageClamped === 1
                        ? "pointer-events-none opacity-40"
                        : "border-slate-800 hover:border-teal-400/60"
                    )}
                  >
                    Previous
                  </button>
                  <span>
                    Page {assistComboPageClamped} of {assistComboTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setAssistComboPage((prev) =>
                        Math.min(assistComboTotalPages, prev + 1)
                      )
                    }
                    className={cn(
                      "rounded-full border px-3 py-1",
                      assistComboPageClamped === assistComboTotalPages
                        ? "pointer-events-none opacity-40"
                        : "border-slate-800 hover:border-teal-400/60"
                    )}
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          {activeChart === "cs" && gkPartnerList.length ? (
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-4">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-400">
                <span>Goalkeepers with clean sheets</span>
                <span>{gkPartnerList.reduce((sum, item) => sum + item.cs, 0)} cs</span>
              </div>
              <div className="mt-4 grid gap-3">
                {gkPartnerPageItems.map((item) => (
                  <div key={item.name} className="flex items-center gap-3 text-sm text-slate-200">
                    {item.avatar ? (
                      <img
                        src={item.avatar}
                        alt={item.name}
                        className="h-10 w-10 rounded-full object-cover border border-slate-800"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full border border-slate-800 bg-slate-900/60" />
                    )}
                    <div className="flex-1">
                      <div className="text-sm">{item.name}</div>
                      <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                        <div
                          className="h-1.5 rounded-full bg-teal-500"
                          style={{
                            width: `${Math.max(6, (item.cs / gkPartnerList[0].cs) * 100)}%`,
                          }}
                        />
                      </div>
                      <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        {item.matches} matches
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{item.cs}</div>
                  </div>
                ))}
              </div>
              {gkPartnersTotalPages > 1 ? (
                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                  <button
                    type="button"
                    onClick={() => setGkPartnerPage((prev) => Math.max(1, prev - 1))}
                    className={cn(
                      "rounded-full border px-3 py-1",
                      gkPartnerPageClamped === 1
                        ? "pointer-events-none opacity-40"
                        : "border-slate-800 hover:border-teal-400/60"
                    )}
                  >
                    Previous
                  </button>
                  <span>
                    Page {gkPartnerPageClamped} of {gkPartnersTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setGkPartnerPage((prev) =>
                        Math.min(gkPartnersTotalPages, prev + 1)
                      )
                    }
                    className={cn(
                      "rounded-full border px-3 py-1",
                      gkPartnerPageClamped === gkPartnersTotalPages
                        ? "pointer-events-none opacity-40"
                        : "border-slate-800 hover:border-teal-400/60"
                    )}
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          {activeChart === "goalsConceded" && concededOpponentsList.length ? (
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-4">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-400">
                <span>Goals conceded by opponent</span>
                <span>
                  {concededOpponentsList.reduce((sum, item) => sum + item.conceded, 0)} conceded
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {concededOpponentPageItems.map((item) => (
                  <div key={item.name} className="flex items-center gap-3 text-sm text-slate-200">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-10 w-10 rounded-full object-cover border border-slate-800"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full border border-slate-800 bg-slate-900/60" />
                    )}
                    <div className="flex-1">
                      <div className="text-sm">{item.name}</div>
                      <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                        <div
                          className="h-1.5 rounded-full bg-orange-500"
                          style={{
                            width: `${Math.max(
                              6,
                              (item.conceded / concededOpponentsList[0].conceded) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        {item.matches} matches
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{item.conceded}</div>
                  </div>
                ))}
              </div>
              {concededOpponentsTotalPages > 1 ? (
                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                  <button
                    type="button"
                    onClick={() => setConcededOpponentPage((prev) => Math.max(1, prev - 1))}
                    className={cn(
                      "rounded-full border px-3 py-1",
                      concededOpponentPageClamped === 1
                        ? "pointer-events-none opacity-40"
                        : "border-slate-800 hover:border-orange-400/60"
                    )}
                  >
                    Previous
                  </button>
                  <span>
                    Page {concededOpponentPageClamped} of {concededOpponentsTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setConcededOpponentPage((prev) =>
                        Math.min(concededOpponentsTotalPages, prev + 1)
                      )
                    }
                    className={cn(
                      "rounded-full border px-3 py-1",
                      concededOpponentPageClamped === concededOpponentsTotalPages
                        ? "pointer-events-none opacity-40"
                        : "border-slate-800 hover:border-orange-400/60"
                    )}
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          {activeChart === "kicks" && kicksOpponentsList.length ? (
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-4">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-400">
                <span>Kicks by opponent</span>
                <span>{kicksOpponentsList.reduce((sum, item) => sum + item.kicks, 0)} kicks</span>
              </div>
              <div className="mt-4 grid gap-3">
                {kicksOpponentPageItems.map((item) => (
                  <div key={item.name} className="flex items-center gap-3 text-sm text-slate-200">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-10 w-10 rounded-full object-cover border border-slate-800"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full border border-slate-800 bg-slate-900/60" />
                    )}
                    <div className="flex-1">
                      <div className="text-sm">{item.name}</div>
                      <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                        <div
                          className="h-1.5 rounded-full bg-teal-500"
                          style={{
                            width: `${Math.max(
                              6,
                              (item.kicks / kicksOpponentsList[0].kicks) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        {item.matches} matches
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{item.kicks}</div>
                  </div>
                ))}
              </div>
              {kicksOpponentsTotalPages > 1 ? (
                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                  <button
                    type="button"
                    onClick={() => setKicksOpponentPage((prev) => Math.max(1, prev - 1))}
                    className={cn(
                      "rounded-full border px-3 py-1",
                      kicksOpponentPageClamped === 1
                        ? "pointer-events-none opacity-40"
                        : "border-slate-800 hover:border-teal-400/60"
                    )}
                  >
                    Previous
                  </button>
                  <span>
                    Page {kicksOpponentPageClamped} of {kicksOpponentsTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setKicksOpponentPage((prev) =>
                        Math.min(kicksOpponentsTotalPages, prev + 1)
                      )
                    }
                    className={cn(
                      "rounded-full border px-3 py-1",
                      kicksOpponentPageClamped === kicksOpponentsTotalPages
                        ? "pointer-events-none opacity-40"
                        : "border-slate-800 hover:border-teal-400/60"
                    )}
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

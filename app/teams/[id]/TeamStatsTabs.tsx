"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { cn, getFlagBackgroundStyle, isImageUrl, shouldOverlayFlag } from "@/lib/utils"

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
  const baseSize = baseStyle.backgroundSize || "cover"
  const basePosition = baseStyle.backgroundPosition || "center"
  const baseRepeat = baseStyle.backgroundRepeat || "no-repeat"
  return (
    <span
      aria-label={country}
      className={className}
      style={{
        ...baseStyle,
        backgroundImage,
        backgroundPosition: overlayUrl ? `center, ${basePosition}` : basePosition,
        backgroundSize: overlayUrl ? `cover, ${baseSize}` : baseSize,
        backgroundRepeat: overlayUrl ? `no-repeat, ${baseRepeat}` : baseRepeat,
      }}
    />
  )
}

type TeamStats = {
  matchesPlayed: number
  matchesWon: number
  matchesDraw: number
  matchesLost: number
  goalsScored: number
  goalsConceded: number
  saves: number
  cs: number
  points: number
  possessionAvg: number
  kicks: number
  passes: number
  shotsOnGoal: number
}

type TeamStatsTab = {
  id: string
  label: string
  stats: TeamStats
  seasonFilters?: {
    all: TeamStats
    league: TeamStats
    cup: TeamStats
    supercup: TeamStats
  }
  seasonFilterIds?: {
    all: string[]
    league: string[]
    cup: string[]
    supercup: string[]
  }
  teamCompetitionId?: string
}

type TeamStatsTabsProps = {
  tabs: TeamStatsTab[]
  totalStats: TeamStats
  matchSeries: {
    matchId: string
    teamCompetitionId: string
    competitionType?: string
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
    stats: Record<string, number>
  }[]
  matchLimits: Record<string, number>
  goalsByOpponent: {
    teamCompetitionId: string
    opponentId: string
    opponentName: string
    opponentImage: string
    matchId: string
    goalsScored: number
  }[]
  goalsConcededByOpponent: {
    teamCompetitionId: string
    opponentId: string
    opponentName: string
    opponentImage: string
    matchId: string
    goalsConceded: number
  }[]
  topScorers: {
    teamCompetitionId: string
    playerId: string
    playerName: string
    playerAvatar: string
    goals: number
  }[]
  concedingScorers: {
    teamCompetitionId: string
    playerId: string
    playerName: string
    playerAvatar: string
    goals: number
  }[]
  matchesByPlayer: {
    teamCompetitionId: string
    playerId: string
    playerName: string
    playerAvatar: string
    matchesPlayed: number
  }[]
  roster: {
    teamCompetitionId: string
    playerId: string
    playerName: string
    playerAvatar: string
    country: string
    position: string
    matchesPlayed: number
  }[]
  teamCompetitionKits: Record<string, { image: string; textColor: string }>
}

const statCards: { key: keyof TeamStats; label: string }[] = [
  { key: "goalsScored", label: "Goals scored" },
  { key: "goalsConceded", label: "Goals conceded" },
  { key: "possessionAvg", label: "Possession avg" },
  { key: "shotsOnGoal", label: "Shots on goal" },
  { key: "kicks", label: "Kicks" },
  { key: "passes", label: "Passes" },
  { key: "saves", label: "Saves" },
  { key: "cs", label: "Clean sheets" },
  { key: "matchesPlayed", label: "Matches played" },
  { key: "matchesWon", label: "Matches won" },
  { key: "matchesDraw", label: "Matches draw" },
  { key: "matchesLost", label: "Matches lost" },
]

const statLabels: Record<string, string> = {
  goalsScored: "Goals scored",
  goalsConceded: "Goals conceded",
  saves: "Saves",
  shotsOnGoal: "Shots on goal",
  kicks: "Kicks",
  passes: "Passes",
  possessionAvg: "Possession avg",
  points: "Points",
  matchesPlayed: "Matches played",
  matchesWon: "Matches won",
  matchesDraw: "Matches draw",
  matchesLost: "Matches lost",
  cs: "Clean sheets",
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
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [hoverX, setHoverX] = useState(0)

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
  const areaPath = `${linePath} L ${width - padding} ${height - padding} L ${padding} ${
    height - padding
  } Z`

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
          <linearGradient id="teamStatsFill" x1="0" x2="0" y1="0" y2="1">
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
        <path d={areaPath} fill="url(#teamStatsFill)" stroke="none" />
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

export default function TeamStatsTabs({
  tabs,
  totalStats,
  matchSeries,
  matchLimits,
  goalsByOpponent,
  goalsConcededByOpponent,
  topScorers,
  concedingScorers,
  matchesByPlayer,
  roster,
  teamCompetitionKits,
}: TeamStatsTabsProps) {
  const allTabs = useMemo(
    () => [{ id: "total", label: "Total", stats: totalStats }, ...tabs],
    [tabs, totalStats]
  )
  const [activeView, setActiveView] = useState<"stats" | "squad">("stats")
  const [activeId, setActiveId] = useState(allTabs[0]?.id ?? "total")
  const [activeFilter, setActiveFilter] = useState<"all" | "league" | "cup" | "supercup">("all")
  const [activeChart, setActiveChart] = useState<keyof TeamStats | null>(null)
  const [matchListFilter, setMatchListFilter] = useState<"wins" | "draws" | "losses" | null>(null)
  const [matchListPage, setMatchListPage] = useState(1)
  const [rosterPage, setRosterPage] = useState(1)
  const [opponentGoalsPage, setOpponentGoalsPage] = useState(1)
  const [concededOpponentPage, setConcededOpponentPage] = useState(1)
  const [scorersPage, setScorersPage] = useState(1)
  const [goalsPanel, setGoalsPanel] = useState<"opponents" | "scorers">("opponents")
  const [concededScorersPage, setConcededScorersPage] = useState(1)
  const [concededPanel, setConcededPanel] = useState<"opponents" | "scorers">("opponents")
  const [matchesPage, setMatchesPage] = useState(1)
  const [squadSortKey, setSquadSortKey] = useState<"position" | "player" | "matches">("position")
  const [squadSortDir, setSquadSortDir] = useState<"asc" | "desc">("asc")
  const activeTab = allTabs.find((tab) => tab.id === activeId) || allTabs[0]

  useEffect(() => {
    if (activeTab?.seasonFilters) {
      const defaultFilter = activeTab.seasonFilters.league.matchesPlayed > 0 ? "league" : "all"
      setActiveFilter(defaultFilter)
    } else {
      setActiveFilter("all")
    }
    setActiveChart(null)
    setOpponentGoalsPage(1)
    setConcededOpponentPage(1)
    setScorersPage(1)
    setGoalsPanel("opponents")
    setConcededScorersPage(1)
    setConcededPanel("opponents")
    setMatchesPage(1)
    setMatchListFilter(null)
    setMatchListPage(1)
    setRosterPage(1)
  }, [activeId, activeTab?.seasonFilters])

  const stats = activeTab?.seasonFilters
    ? activeTab.seasonFilters[activeFilter]
    : activeTab?.stats || totalStats
  const winRatio = stats.matchesPlayed ? stats.matchesWon / stats.matchesPlayed : 0
  const winRateLabel = `${Math.round(winRatio * 100)}%`
  const winRingDegrees = Math.round(winRatio * 360)

  const seriesIds =
    activeTab?.seasonFilterIds?.[activeFilter] ||
    (activeTab?.teamCompetitionId ? [activeTab.teamCompetitionId] : [])
  const filterSeriesByMatchesPlayed = (series: typeof matchSeries, ids: string[]) => {
    if (ids.length === 0) return []
    const byId = series.reduce<Record<string, typeof matchSeries>>((acc, item) => {
      if (!ids.includes(item.teamCompetitionId)) return acc
      if (!acc[item.teamCompetitionId]) acc[item.teamCompetitionId] = []
      acc[item.teamCompetitionId].push(item)
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
  const filteredSeriesLimited = filteredSeries
  const rosterFiltered =
    activeTab?.id === "total"
      ? roster
      : roster.filter((item) => seriesIds.includes(item.teamCompetitionId))
  const positionOrder = new Map([
    ["GK", 0],
    ["CB", 1],
    ["LB", 2],
    ["RB", 3],
    ["DM", 4],
    ["CM", 5],
    ["AM", 6],
    ["LW", 7],
    ["RW", 8],
    ["ST", 9],
  ])
  const rosterSummary = Object.values(
    rosterFiltered.reduce<
      Record<
        string,
        {
          playerId: string
          playerName: string
          playerAvatar: string
          country: string
          position: string
          matchesPlayed: number
          kitImage: string
          kitTextColor: string
          teamCompetitionId: string
        }
      >
    >((acc, row) => {
      const key = row.playerId || row.playerName
      const kit = teamCompetitionKits[row.teamCompetitionId]
      if (!acc[key]) {
        acc[key] = {
          playerId: row.playerId,
          playerName: row.playerName,
          playerAvatar: row.playerAvatar,
          country: row.country,
          position: row.position,
          matchesPlayed: 0,
          kitImage: kit?.image || "",
          kitTextColor: kit?.textColor || "",
          teamCompetitionId: row.teamCompetitionId,
        }
      } else if (!acc[key].kitImage && kit?.image) {
        acc[key].kitImage = kit.image
        acc[key].kitTextColor = kit.textColor || ""
        acc[key].teamCompetitionId = row.teamCompetitionId
      }
      acc[key].matchesPlayed += Number(row.matchesPlayed) || 0
      return acc
    }, {})
  )
  const rosterList = [...rosterSummary].sort((a, b) => {
    const direction = squadSortDir === "asc" ? 1 : -1
    if (squadSortKey === "player") {
      return a.playerName.localeCompare(b.playerName) * direction
    }
    if (squadSortKey === "matches") {
      return (a.matchesPlayed - b.matchesPlayed) * direction
    }
    const aOrder = positionOrder.get(a.position) ?? 99
    const bOrder = positionOrder.get(b.position) ?? 99
    if (aOrder !== bOrder) return (aOrder - bOrder) * direction
    return b.matchesPlayed - a.matchesPlayed
  })
  const rosterPageSize = 14
  const rosterTotalPages = Math.max(1, Math.ceil(rosterList.length / rosterPageSize))
  const rosterPageClamped = Math.min(Math.max(1, rosterPage), rosterTotalPages)
  const rosterPageItems = rosterList.slice(
    (rosterPageClamped - 1) * rosterPageSize,
    rosterPageClamped * rosterPageSize
  )
  const historicSeven = useMemo(() => {
    const sorted = [...rosterSummary].sort((a, b) => b.matchesPlayed - a.matchesPlayed)
    const topSeven = sorted.slice(0, 7)
    const hasGk = topSeven.some((player) => player.position === "GK")
    if (hasGk) return topSeven
    const bestGk = sorted.find((player) => player.position === "GK")
    if (!bestGk) return topSeven
    return [...topSeven.slice(0, 6), bestGk]
  }, [rosterSummary])
  const historicByPosition = useMemo(() => {
    const grouped = historicSeven.reduce<Record<string, typeof historicSeven>>((acc, player) => {
      if (!acc[player.position]) acc[player.position] = []
      acc[player.position].push(player)
      return acc
    }, {})
    const lw = grouped.LW || []
    const rw = grouped.RW || []
    const st = grouped.ST || []
    if (st.length === 1 && ((lw.length === 1 && rw.length === 0) || (rw.length === 1 && lw.length === 0))) {
      if (lw.length === 1) {
        grouped.ST = [...st, lw[0]]
        grouped.LW = []
      } else if (rw.length === 1) {
        grouped.ST = [...st, rw[0]]
        grouped.RW = []
      }
    }
    if (lw.length > 1) {
      const sorted = [...lw].sort((a, b) => a.matchesPlayed - b.matchesPlayed)
      const moved = sorted.shift()
      grouped.LW = sorted
      if (moved) grouped.RW = [...rw, moved]
    } else if (rw.length > 1) {
      const sorted = [...rw].sort((a, b) => a.matchesPlayed - b.matchesPlayed)
      const moved = sorted.shift()
      grouped.RW = sorted
      if (moved) grouped.LW = [...lw, moved]
    }
    const lb = grouped.LB || []
    const rb = grouped.RB || []
    const cb = grouped.CB || []
    const dm = grouped.DM || []
    const cm = grouped.CM || []
    const am = grouped.AM || []
    if (dm.length > 1) {
      grouped.CM = [...cm, ...dm]
      grouped.DM = []
    }
    if (am.length > 1) {
      grouped.CM = [...(grouped.CM || []), ...am]
      grouped.AM = []
    }
    if (cb.length === 1 && lb.length > 1) {
      const sorted = [...lb].sort((a, b) => a.matchesPlayed - b.matchesPlayed)
      const moved = sorted.shift()
      grouped.LB = sorted
      if (moved) grouped.RB = [...rb, moved]
    } else if (cb.length === 1 && rb.length > 1) {
      const sorted = [...rb].sort((a, b) => a.matchesPlayed - b.matchesPlayed)
      const moved = sorted.shift()
      grouped.RB = sorted
      if (moved) grouped.LB = [...lb, moved]
    }
    return grouped
  }, [historicSeven])
  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("")
  const leagueMatchSeries = filteredSeriesLimited.filter(
    (item) => item.competitionType === "league"
  )
  const leaguePointsTotal = leagueMatchSeries.reduce(
    (sum, item) => sum + (Number(item.stats?.points) || 0),
    0
  )
  const leagueMatches = leagueMatchSeries.length
  const leaguePointsMax = leagueMatches * 3
  const leaguePointsRate = leagueMatches ? (leaguePointsTotal / leaguePointsMax) * 100 : 0
  const leagueWins = leagueMatchSeries.reduce(
    (sum, item) => sum + (Number(item.stats?.matchesWon) || 0),
    0
  )
  const leagueDraws = leagueMatchSeries.reduce(
    (sum, item) => sum + (Number(item.stats?.matchesDraw) || 0),
    0
  )
  const leagueLosses = leagueMatchSeries.reduce(
    (sum, item) => sum + (Number(item.stats?.matchesLost) || 0),
    0
  )
  const filteredGoalsByOpponent =
    activeTab?.id === "total"
      ? goalsByOpponent
      : goalsByOpponent.filter((item) => seriesIds.includes(item.teamCompetitionId))
  const filteredConcededByOpponent =
    activeTab?.id === "total"
      ? goalsConcededByOpponent
      : goalsConcededByOpponent.filter((item) => seriesIds.includes(item.teamCompetitionId))
  const filteredConcedingScorers =
    activeTab?.id === "total"
      ? concedingScorers
      : concedingScorers.filter((item) => seriesIds.includes(item.teamCompetitionId))
  const filteredMatchesByPlayer =
    activeTab?.id === "total"
      ? matchesByPlayer
      : matchesByPlayer.filter((item) => seriesIds.includes(item.teamCompetitionId))
  const filteredTopScorers =
    activeTab?.id === "total"
      ? topScorers
      : topScorers.filter((item) => seriesIds.includes(item.teamCompetitionId))

  const cleanSheetRate = (() => {
    if (!filteredSeriesLimited.length) return 0
    const matchesWithCs = filteredSeriesLimited.reduce((acc, item) => {
      const cs = Number(item.stats?.cs) || 0
      return cs > 0 ? acc + 1 : acc
    }, 0)
    return (matchesWithCs / filteredSeriesLimited.length) * 100
  })()
  const cleanSheetDegrees = Math.round(cleanSheetRate * 3.6)
  const scoringMatchRate =
    activeChart === "goalsScored"
      ? (() => {
          if (!filteredSeriesLimited.length) return 0
          const matchesWithGoals = filteredSeriesLimited.reduce((acc, item) => {
            const goals = Number(item.stats?.goalsScored) || 0
            return goals > 0 ? acc + 1 : acc
          }, 0)
          return (matchesWithGoals / filteredSeriesLimited.length) * 100
        })()
      : null
  const goalAccuracy =
    activeChart === "goalsScored"
      ? (() => {
          if (!filteredSeriesLimited.length) return 0
          const totals = filteredSeriesLimited.reduce(
            (acc, item) => {
              acc.goals += Number(item.stats?.goalsScored) || 0
              acc.on += Number(item.stats?.shotsOnGoal) || 0
              acc.off += Number(item.stats?.shotsOffGoal) || 0
              return acc
            },
            { goals: 0, on: 0, off: 0 }
          )
          const totalShots = totals.on + totals.off
          if (!totalShots) return 0
          return (totals.goals / totalShots) * 100
        })()
      : null
  const onTargetRate =
    activeChart === "shotsOnGoal"
      ? (() => {
          if (!filteredSeriesLimited.length) return 0
          const totals = filteredSeriesLimited.reduce(
            (acc, item) => {
              acc.on += Number(item.stats?.shotsOnGoal) || 0
              acc.off += Number(item.stats?.shotsOffGoal) || 0
              return acc
            },
            { on: 0, off: 0 }
          )
          const totalShots = totals.on + totals.off
          if (!totalShots) return 0
          return (totals.on / totalShots) * 100
        })()
      : null
  const passAccuracy =
    activeChart === "passes"
      ? (() => {
          if (!filteredSeriesLimited.length) return 0
          const totals = filteredSeriesLimited.reduce(
            (acc, item) => {
              acc.passes += Number(item.stats?.passes) || 0
              acc.kicks += Number(item.stats?.kicks) || 0
              return acc
            },
            { passes: 0, kicks: 0 }
          )
          if (!totals.kicks) return 0
          return (totals.passes / totals.kicks) * 100
        })()
      : null
  const saveRate =
    activeChart === "saves"
      ? (() => {
          if (!filteredSeriesLimited.length) return 0
          const totals = filteredSeriesLimited.reduce(
            (acc, item) => {
              acc.saves += Number(item.stats?.saves) || 0
              acc.conceded += Number(item.stats?.goalsConceded) || 0
              return acc
            },
            { saves: 0, conceded: 0 }
          )
          const totalShots = totals.saves + totals.conceded
          if (!totalShots) return 0
          return (totals.saves / totalShots) * 100
        })()
      : null
  const concededMatchRate =
    activeChart === "goalsConceded"
      ? (() => {
          if (!filteredSeriesLimited.length) return 0
          const matchesConceded = filteredSeriesLimited.reduce((acc, item) => {
            const goals = Number(item.stats?.goalsConceded) || 0
            return goals > 0 ? acc + 1 : acc
          }, 0)
          return (matchesConceded / filteredSeriesLimited.length) * 100
        })()
      : null

  const activeChartLabel = activeChart ? statLabels[String(activeChart)] || "Stat" : ""
  const chartData =
    activeChart &&
    filteredSeriesLimited
      .map((item) => ({
        date: item.date,
        value: Number(item.stats?.[activeChart]) || 0,
        matchLabel: item.matchLabel,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const shotsOffGoalChartData =
    activeChart === "shotsOnGoal"
      ? filteredSeriesLimited
          .map((item) => ({
            date: item.date,
            value: Number(item.stats?.shotsOffGoal) || 0,
            matchLabel: item.matchLabel,
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      : null
  const totalsForChart =
    activeChart &&
    filteredSeriesLimited.reduce(
      (acc, item) => acc + (Number(item.stats?.[activeChart]) || 0),
      0
    )
  const perMinuteStat =
    activeChart && filteredSeriesLimited.length
      ? (totalsForChart ?? 0) / (filteredSeriesLimited.length * 90)
      : 0
  const opponentGoals = filteredGoalsByOpponent.reduce<
    Record<string, { name: string; image: string; goals: number; matchIds: Set<string> }>
  >((acc, item) => {
    const key = item.opponentId || item.opponentName
    if (!acc[key]) {
      acc[key] = {
        name: item.opponentName,
        image: item.opponentImage,
        goals: 0,
        matchIds: new Set<string>(),
      }
    }
    acc[key].goals += Number(item.goalsScored) || 0
    if (item.matchId) acc[key].matchIds.add(item.matchId)
    return acc
  }, {})
  const opponentGoalsList = Object.values(opponentGoals)
    .map((item) => ({ ...item, matches: item.matchIds.size }))
    .sort((a, b) => b.goals - a.goals)
  const opponentsPerPage = 7
  const opponentGoalsTotalPages = Math.max(1, Math.ceil(opponentGoalsList.length / opponentsPerPage))
  const opponentGoalsPageClamped = Math.min(opponentGoalsPage, opponentGoalsTotalPages)
  const opponentGoalsStart = (opponentGoalsPageClamped - 1) * opponentsPerPage
  const opponentGoalsPageItems = opponentGoalsList.slice(
    opponentGoalsStart,
    opponentGoalsStart + opponentsPerPage
  )
  const scorersMap = filteredTopScorers.reduce<
    Record<string, { name: string; avatar: string; goals: number }>
  >((acc, item) => {
    const key = item.playerId || item.playerName
    if (!acc[key]) {
      acc[key] = {
        name: item.playerName,
        avatar: item.playerAvatar,
        goals: 0,
      }
    }
    acc[key].goals += Number(item.goals) || 0
    return acc
  }, {})
  const scorersList = Object.values(scorersMap)
    .filter((item) => item.goals > 0)
    .sort((a, b) => b.goals - a.goals)
  const scorersPerPage = 7
  const scorersTotalPages = Math.max(1, Math.ceil(scorersList.length / scorersPerPage))
  const scorersPageClamped = Math.min(scorersPage, scorersTotalPages)
  const scorersStart = (scorersPageClamped - 1) * scorersPerPage
  const scorersPageItems = scorersList.slice(scorersStart, scorersStart + scorersPerPage)
  const concededOpponents = filteredConcededByOpponent.reduce<
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
  const concededPerPage = 7
  const concededTotalPages = Math.max(1, Math.ceil(concededOpponentsList.length / concededPerPage))
  const concededPageClamped = Math.min(concededOpponentPage, concededTotalPages)
  const concededStart = (concededPageClamped - 1) * concededPerPage
  const concededPageItems = concededOpponentsList.slice(
    concededStart,
    concededStart + concededPerPage
  )
  const concededScorersMap = filteredConcedingScorers.reduce<
    Record<string, { name: string; avatar: string; goals: number }>
  >((acc, item) => {
    const key = item.playerId || item.playerName
    if (!acc[key]) {
      acc[key] = {
        name: item.playerName,
        avatar: item.playerAvatar,
        goals: 0,
      }
    }
    acc[key].goals += Number(item.goals) || 0
    return acc
  }, {})
  const concededScorersList = Object.values(concededScorersMap)
    .filter((item) => item.goals > 0)
    .sort((a, b) => b.goals - a.goals)
  const concededScorersPerPage = 7
  const concededScorersTotalPages = Math.max(
    1,
    Math.ceil(concededScorersList.length / concededScorersPerPage)
  )
  const concededScorersPageClamped = Math.min(concededScorersPage, concededScorersTotalPages)
  const concededScorersStart = (concededScorersPageClamped - 1) * concededScorersPerPage
  const concededScorersPageItems = concededScorersList.slice(
    concededScorersStart,
    concededScorersStart + concededScorersPerPage
  )
  const matchesByPlayerMap = filteredMatchesByPlayer.reduce<
    Record<string, { name: string; avatar: string; matches: number }>
  >((acc, item) => {
    const key = item.playerId || item.playerName
    if (!acc[key]) {
      acc[key] = {
        name: item.playerName,
        avatar: item.playerAvatar,
        matches: 0,
      }
    }
    acc[key].matches += Number(item.matchesPlayed) || 0
    return acc
  }, {})
  const matchesByPlayerList = Object.values(matchesByPlayerMap)
    .filter((item) => item.matches > 0)
    .sort((a, b) => b.matches - a.matches)
  const matchesByPlayerPerPage = 7
  const matchesByPlayerTotalPages = Math.max(
    1,
    Math.ceil(matchesByPlayerList.length / matchesByPlayerPerPage)
  )
  const matchesByPlayerPageClamped = Math.min(matchesPage, matchesByPlayerTotalPages)
  const matchesByPlayerStart = (matchesByPlayerPageClamped - 1) * matchesByPlayerPerPage
  const matchesByPlayerPageItems = matchesByPlayerList.slice(
    matchesByPlayerStart,
    matchesByPlayerStart + matchesByPlayerPerPage
  )

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveView("stats")}
          className={cn(
            "rounded-full border px-4 py-2 text-xs uppercase tracking-[0.2em] transition",
            activeView === "stats"
              ? "border-teal-400/80 bg-slate-900 shadow-[0_0_0_2px_rgba(20,184,166,0.15)]"
              : "border-slate-800 bg-slate-900/60 hover:border-slate-600"
          )}
        >
          Stats
        </button>
        <button
          type="button"
          onClick={() => setActiveView("squad")}
          className={cn(
            "rounded-full border px-4 py-2 text-xs uppercase tracking-[0.2em] transition",
            activeView === "squad"
              ? "border-teal-400/80 bg-slate-900 shadow-[0_0_0_2px_rgba(20,184,166,0.15)]"
              : "border-slate-800 bg-slate-900/60 hover:border-slate-600"
          )}
        >
          Squad
        </button>
      </div>

      <div>
        <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-slate-400">Seasons</p>
        <div className="flex flex-wrap items-center gap-2">
          {allTabs.map((tab) => {
            const isActive = tab.id === activeId
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveId(tab.id)}
                className={cn(
                  "rounded-full border px-4 py-2 text-xs uppercase tracking-[0.2em] transition",
                  isActive
                    ? "border-teal-400/80 bg-slate-900 shadow-[0_0_0_2px_rgba(20,184,166,0.15)]"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-600"
                )}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
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
                    ? "border-teal-400/80 bg-slate-900 shadow-[0_0_0_2px_rgba(20,184,166,0.15)]"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-600"
                )}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      ) : null}

      {activeView === "squad" ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Squad</p>
            <span className="text-xs text-slate-500">{rosterList.length} players</span>
          </div>
          <div className="mt-6 overflow-hidden rounded-xl border border-slate-800">
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] bg-slate-900/80 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-400">
              <button
                type="button"
                onClick={() => {
                  if (squadSortKey === "player") {
                    setSquadSortDir(squadSortDir === "asc" ? "desc" : "asc")
                  } else {
                    setSquadSortKey("player")
                    setSquadSortDir("asc")
                  }
                }}
                className="text-left hover:text-slate-200"
              >
                Player {squadSortKey === "player" ? (squadSortDir === "asc" ? "ASC" : "DESC") : ""}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (squadSortKey === "position") {
                    setSquadSortDir(squadSortDir === "asc" ? "desc" : "asc")
                  } else {
                    setSquadSortKey("position")
                    setSquadSortDir("asc")
                  }
                }}
                className="text-left hover:text-slate-200"
              >
                Position {squadSortKey === "position" ? (squadSortDir === "asc" ? "ASC" : "DESC") : ""}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (squadSortKey === "matches") {
                    setSquadSortDir(squadSortDir === "asc" ? "desc" : "asc")
                  } else {
                    setSquadSortKey("matches")
                    setSquadSortDir("asc")
                  }
                }}
                className="text-left hover:text-slate-200"
              >
                Matches {squadSortKey === "matches" ? (squadSortDir === "asc" ? "ASC" : "DESC") : ""}
              </button>
            </div>
            <div className="divide-y divide-slate-800">
              {rosterPageItems.map((player) => (
                <div
                  key={player.playerId}
                  className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] items-center px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {(() => {
                        const avatar = player.playerAvatar || ""
                        const avatarIsImage = isImageUrl(avatar)
                        return (
                          <div
                            className={cn(
                              "relative h-9 w-9 rounded-full flex items-center justify-center",
                              player.kitImage ? "border border-slate-800 shadow-md" : "border border-slate-800 bg-slate-900/60"
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
                            {avatar ? (
                              avatarIsImage ? (
                                <img
                                  src={avatar}
                                  alt={player.playerName}
                                  className="h-7 w-7 rounded-full object-contain"
                                />
                              ) : (
                                <span
                                  className="text-xs font-semibold"
                                  style={{ color: player.kitTextColor || "#ffffff" }}
                                >
                                  {avatar}
                                </span>
                              )
                            ) : (
                              <span className="text-[10px] text-slate-200">
                                {getInitials(player.playerName)}
                              </span>
                            )}
                          </div>
                        )
                      })()}
                      {player.country ? (
                        <FlagBadge
                          country={player.country}
                          className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full ring-2 ring-slate-900"
                        />
                      ) : null}
                    </div>
                    <div>
                      {player.playerId ? (
                        <Link
                          href={`/players/${player.playerId}`}
                          className="font-semibold text-slate-100 hover:text-teal-200"
                        >
                          {player.playerName}
                        </Link>
                      ) : (
                        <div className="font-semibold text-slate-100">{player.playerName}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-slate-300">{player.position || "-"}</div>
                  <div className="text-slate-200">{player.matchesPlayed}</div>
                </div>
              ))}
            </div>
          </div>
          {rosterTotalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <button
                type="button"
                onClick={() => setRosterPage((prev) => Math.max(1, prev - 1))}
                className={cn(
                  "rounded-full border px-3 py-1",
                  rosterPageClamped === 1
                    ? "pointer-events-none opacity-40"
                    : "border-slate-800 hover:border-teal-400/60"
                )}
              >
                Previous
              </button>
              <span>
                Page {rosterPageClamped} of {rosterTotalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setRosterPage((prev) => Math.min(rosterTotalPages, prev + 1))
                }
                className={cn(
                  "rounded-full border px-3 py-1",
                  rosterPageClamped === rosterTotalPages
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
      {activeView !== "stats" ? null : (
        <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Matches</p>
          <div className="flex items-center justify-center">
            <div
              className="relative h-36 w-36 rounded-full p-3"
              style={{
                background: `conic-gradient(#14b8a6 0deg, #14b8a6 ${winRingDegrees}deg, rgba(148,163,184,0.25) ${winRingDegrees}deg, rgba(148,163,184,0.25) 360deg)`,
              }}
            >
              <div className="absolute inset-3 rounded-full bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-semibold">{winRateLabel}</span>
                <span className="text-xs text-slate-400">Win rate</span>
                <span className="mt-1 text-xs text-slate-500">{stats.matchesPlayed} played</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
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

          <div className="pt-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">League points</p>
            <div className="mt-4 flex items-center justify-center">
              <div
                className="relative h-32 w-32 rounded-full p-3"
                style={{
                  background: `conic-gradient(#f59e0b 0deg, #f59e0b ${Math.round(
                    leaguePointsRate * 3.6
                  )}deg, rgba(148,163,184,0.25) ${Math.round(
                    leaguePointsRate * 3.6
                  )}deg, rgba(148,163,184,0.25) 360deg)`,
                }}
              >
                <div className="absolute inset-3 rounded-full bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-semibold">{leaguePointsTotal}/{leaguePointsMax}</span>
                  <span className="text-[10px] text-slate-400">Points</span>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
                <p className="text-slate-400 text-xs">Wins</p>
                <p className="text-base font-semibold">{leagueWins}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
                <p className="text-slate-400 text-xs">Draws</p>
                <p className="text-base font-semibold">{leagueDraws}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
                <p className="text-slate-400 text-xs">Losses</p>
                <p className="text-base font-semibold">{leagueLosses}</p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-400">
              <span>Historic 7</span>
              <span>Most matches</span>
            </div>
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="relative h-72 overflow-visible rounded-2xl border border-slate-800/80 bg-[radial-gradient(circle_at_center,rgba(148,163,184,0.18)_1px,transparent_1px)] bg-[length:12px_12px] px-4 py-3">
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-4 rounded-xl border border-fuchsia-400/60" />
                  <div className="absolute left-1/2 top-4 h-[calc(100%-2rem)] w-px -translate-x-1/2 bg-fuchsia-400/50" />
                  <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-fuchsia-400/60" />
                  <div className="absolute left-1/2 top-4 h-10 w-20 -translate-x-1/2 rounded-b-2xl border border-fuchsia-400/60 border-t-0" />
                  <div className="absolute left-1/2 bottom-4 h-10 w-20 -translate-x-1/2 rounded-t-2xl border border-fuchsia-400/60 border-b-0" />
                </div>
                <div className="relative grid h-full grid-cols-3 grid-rows-8 place-items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                {[
                  { key: "ST", row: 2, col: 2 },
                  { key: "LW", row: 3, col: 1 },
                  { key: "RW", row: 3, col: 3 },
                  { key: "AM", row: 4, col: 2 },
                  { key: "CM", row: 5, col: 2 },
                  { key: "DM", row: 6, col: 2 },
                  { key: "LB", row: 7, col: 1 },
                  { key: "RB", row: 7, col: 3 },
                  { key: "CB", row: 8, col: 2 },
                  { key: "GK", row: 9, col: 2 },
                ].map((slot) => {
                  const players = historicByPosition[slot.key] || []
                  const isWideRow =
                    slot.key === "CB" ||
                    slot.key === "CM" ||
                    slot.key === "ST"
                  const isDefenseRow = slot.key === "CB" || slot.key === "LB" || slot.key === "RB"
                  const liftClass =
                    slot.key === "GK"
                      ? "-translate-y-3"
                      : slot.key === "CB"
                        ? "-translate-y-5"
                        : slot.key === "CM"
                          ? "translate-y-1"
                          : ""
                  const stExtraLift = slot.key === "ST" && players.length === 1 ? "-translate-y-4" : ""
                  return (
                    <div
                      key={slot.key}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1",
                        liftClass,
                        stExtraLift,
                        (isWideRow || isDefenseRow) && "w-full"
                      )}
                      style={{
                        gridRow: slot.row,
                        gridColumn: isWideRow || isDefenseRow ? "1 / -1" : slot.col,
                      }}
                    >
                      <div
                        className={cn(
                          "flex flex-row flex-wrap items-center justify-center gap-3",
                          isDefenseRow
                            ? "w-full flex-nowrap justify-between px-10"
                            : isWideRow
                              ? "w-full flex-nowrap justify-evenly px-6"
                              : ""
                        )}
                      >
                        {players.map((player) => {
                          const avatar = player.playerAvatar || ""
                          const avatarIsImage = isImageUrl(avatar)
                          return (
                            <div
                              key={player.playerId}
                              className={cn(
                                "group relative flex h-7 w-7 items-center justify-center rounded-full text-[10px] text-slate-200",
                                player.kitImage
                                  ? "border border-slate-800 shadow-md"
                                  : "border border-slate-800 bg-slate-900/70"
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
                              {avatar ? (
                                avatarIsImage ? (
                                  <img
                                    src={avatar}
                                    alt={player.playerName}
                                    className="h-6 w-6 rounded-full object-contain"
                                  />
                                ) : (
                                  <span
                                    className="text-[9px] font-semibold"
                                    style={{ color: player.kitTextColor || "#ffffff" }}
                                  >
                                    {avatar}
                                  </span>
                                )
                              ) : null}
                              {player.country ? (
                                <FlagBadge
                                  country={player.country}
                                  className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border border-slate-900"
                                />
                              ) : null}
                              <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-slate-700 bg-slate-950/90 px-3 py-1 text-[10px] text-slate-200 shadow-lg group-hover:flex">
                                <div
                                  className={cn(
                                    "flex h-5 w-5 items-center justify-center rounded-full",
                                    player.kitImage
                                      ? "border border-slate-800 shadow-sm"
                                      : "bg-slate-800"
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
                                  {avatar ? (
                                    avatarIsImage ? (
                                      <img
                                        src={avatar}
                                        alt={player.playerName}
                                        className="h-4 w-4 rounded-full object-contain"
                                      />
                                    ) : (
                                      <span
                                        className="text-[9px] font-semibold"
                                        style={{ color: player.kitTextColor || "#ffffff" }}
                                      >
                                        {avatar}
                                      </span>
                                    )
                                  ) : null}
                                </div>
                                <span className="whitespace-nowrap">
                                  {player.playerName} - {slot.key}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                </div>
              </div>
              {!historicSeven.length ? (
                <div className="mt-2 text-center text-xs text-slate-500">No data yet.</div>
              ) : null}
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
                    {card.key === "possessionAvg"
                      ? stats.possessionAvg.toFixed(2)
                      : stats[card.key]}
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
          </div>

          {activeChart && chartData && !matchListFilter ? (
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-4">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-400">
                <span>{activeChartLabel}</span>
                <span>{filteredSeriesLimited.length} matches</span>
              </div>
              <div className="mt-3">
                <MiniLineChart
                  data={chartData}
                  label={activeChartLabel}
                  valueSuffix={activeChart === "possessionAvg" ? "%" : ""}
                />
              </div>
            </div>
          ) : null}
          {activeChart === "shotsOnGoal" && shotsOffGoalChartData ? (
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-4">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-400">
                <span>Shots off goal</span>
                <span>{filteredSeriesLimited.length} matches</span>
              </div>
              <div className="mt-3">
                <MiniLineChart data={shotsOffGoalChartData} label="Shots off goal" />
              </div>
            </div>
          ) : null}
          {activeChart ? (
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-28 w-fit flex-col justify-center rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 whitespace-nowrap">
                <div className="text-2xl font-semibold">
                  {activeChart === "possessionAvg"
                    ? stats.possessionAvg.toFixed(2)
                    : totalsForChart}
                </div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Total</div>
              </div>
              <div className="flex h-28 w-fit flex-col justify-center rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 whitespace-nowrap">
                <div className="text-2xl font-semibold">{perMinuteStat.toFixed(2)}</div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {activeChartLabel} / min
                </div>
              </div>
              {scoringMatchRate !== null ? (
                <div
                  className="relative h-28 w-28 rounded-full p-3"
                  style={{
                    background: `conic-gradient(#22d3ee 0deg, #22d3ee ${Math.round(
                      scoringMatchRate * 3.6
                    )}deg, rgba(148,163,184,0.25) ${Math.round(
                      scoringMatchRate * 3.6
                    )}deg, rgba(148,163,184,0.25) 360deg)`,
                  }}
                >
                  <div className="absolute inset-3 rounded-full bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                    <span className="text-lg font-semibold">{scoringMatchRate.toFixed(2)}%</span>
                    <span className="text-[10px] text-slate-400">Scoring rate</span>
                  </div>
                </div>
              ) : null}
              {goalAccuracy !== null ? (
                <div
                  className="relative h-28 w-28 rounded-full p-3"
                  style={{
                    background: `conic-gradient(#a855f7 0deg, #a855f7 ${Math.round(
                      goalAccuracy * 3.6
                    )}deg, rgba(148,163,184,0.25) ${Math.round(
                      goalAccuracy * 3.6
                    )}deg, rgba(148,163,184,0.25) 360deg)`,
                  }}
                >
                  <div className="absolute inset-3 rounded-full bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                    <span className="text-lg font-semibold">{goalAccuracy.toFixed(2)}%</span>
                    <span className="text-[10px] text-slate-400">Goal accuracy</span>
                  </div>
                </div>
              ) : null}
              {onTargetRate !== null ? (
                <div
                  className="relative h-28 w-28 rounded-full p-3"
                  style={{
                    background: `conic-gradient(#22c55e 0deg, #22c55e ${Math.round(
                      onTargetRate * 3.6
                    )}deg, rgba(148,163,184,0.25) ${Math.round(
                      onTargetRate * 3.6
                    )}deg, rgba(148,163,184,0.25) 360deg)`,
                  }}
                >
                  <div className="absolute inset-3 rounded-full bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                    <span className="text-lg font-semibold">{onTargetRate.toFixed(2)}%</span>
                    <span className="text-[10px] text-slate-400">On target</span>
                  </div>
                </div>
              ) : null}
              {passAccuracy !== null ? (
                <div
                  className="relative h-28 w-28 rounded-full p-3"
                  style={{
                    background: `conic-gradient(#22d3ee 0deg, #22d3ee ${Math.round(
                      passAccuracy * 3.6
                    )}deg, rgba(148,163,184,0.25) ${Math.round(
                      passAccuracy * 3.6
                    )}deg, rgba(148,163,184,0.25) 360deg)`,
                  }}
                >
                  <div className="absolute inset-3 rounded-full bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                    <span className="text-lg font-semibold">{passAccuracy.toFixed(2)}%</span>
                    <span className="text-[10px] text-slate-400">Pass accuracy</span>
                  </div>
                </div>
              ) : null}
              {saveRate !== null ? (
                <div
                  className="relative h-28 w-28 rounded-full p-3"
                  style={{
                    background: `conic-gradient(#0ea5e9 0deg, #0ea5e9 ${Math.round(
                      saveRate * 3.6
                    )}deg, rgba(148,163,184,0.25) ${Math.round(
                      saveRate * 3.6
                    )}deg, rgba(148,163,184,0.25) 360deg)`,
                  }}
                >
                  <div className="absolute inset-3 rounded-full bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                    <span className="text-lg font-semibold">{saveRate.toFixed(2)}%</span>
                    <span className="text-[10px] text-slate-400">Save rate</span>
                  </div>
                </div>
              ) : null}
              {concededMatchRate !== null ? (
                <div
                  className="relative h-28 w-28 rounded-full p-3"
                  style={{
                    background: `conic-gradient(#f97316 0deg, #f97316 ${Math.round(
                      concededMatchRate * 3.6
                    )}deg, rgba(148,163,184,0.25) ${Math.round(
                      concededMatchRate * 3.6
                    )}deg, rgba(148,163,184,0.25) 360deg)`,
                  }}
                >
                  <div className="absolute inset-3 rounded-full bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                    <span className="text-lg font-semibold">{concededMatchRate.toFixed(2)}%</span>
                    <span className="text-[10px] text-slate-400">Conceded rate</span>
                  </div>
                </div>
              ) : null}
              {activeChart === "cs" ? (
                <div
                  className="relative h-28 w-28 rounded-full p-3"
                  style={{
                    background: `conic-gradient(#38bdf8 0deg, #38bdf8 ${cleanSheetDegrees}deg, rgba(148,163,184,0.25) ${cleanSheetDegrees}deg, rgba(148,163,184,0.25) 360deg)`,
                  }}
                >
                  <div className="absolute inset-3 rounded-full bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                    <span className="text-lg font-semibold">{cleanSheetRate.toFixed(2)}%</span>
                    <span className="text-[10px] text-slate-400">CS rate</span>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          {activeChart === "goalsScored" && opponentGoalsList.length ? (
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  {goalsPanel === "opponents" ? "Goals by opponent" : "Top scorers"}
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
                    onClick={() => setGoalsPanel("scorers")}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em]",
                      goalsPanel === "scorers"
                        ? "border-teal-400/80 bg-slate-900 text-slate-100"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-600"
                    )}
                  >
                    Scorers
                  </button>
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  {goalsPanel === "opponents"
                    ? `${opponentGoalsList.reduce((sum, item) => sum + item.goals, 0)} goals`
                    : `${scorersList.reduce((sum, item) => sum + item.goals, 0)} goals`}
                </div>
              </div>
              {goalsPanel === "opponents" ? (
                <>
                  <div className="mt-4 grid gap-3">
                    {opponentGoalsPageItems.map((item) => (
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
                                  (item.goals / opponentGoalsList[0].goals) * 100
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
                  {opponentGoalsTotalPages > 1 ? (
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                      <button
                        type="button"
                        onClick={() => setOpponentGoalsPage((prev) => Math.max(1, prev - 1))}
                        className={cn(
                          "rounded-full border px-3 py-1",
                          opponentGoalsPageClamped === 1
                            ? "pointer-events-none opacity-40"
                            : "border-slate-800 hover:border-teal-400/60"
                        )}
                      >
                        Previous
                      </button>
                      <span>
                        Page {opponentGoalsPageClamped} of {opponentGoalsTotalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setOpponentGoalsPage((prev) =>
                            Math.min(opponentGoalsTotalPages, prev + 1)
                          )
                        }
                        className={cn(
                          "rounded-full border px-3 py-1",
                          opponentGoalsPageClamped === opponentGoalsTotalPages
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
                    {scorersPageItems.map((item) => (
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
                                  (item.goals / scorersList[0].goals) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="text-sm font-semibold">{item.goals}</div>
                      </div>
                    ))}
                  </div>
                  {scorersTotalPages > 1 ? (
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                      <button
                        type="button"
                        onClick={() => setScorersPage((prev) => Math.max(1, prev - 1))}
                        className={cn(
                          "rounded-full border px-3 py-1",
                          scorersPageClamped === 1
                            ? "pointer-events-none opacity-40"
                            : "border-slate-800 hover:border-teal-400/60"
                        )}
                      >
                        Previous
                      </button>
                      <span>
                        Page {scorersPageClamped} of {scorersTotalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setScorersPage((prev) => Math.min(scorersTotalPages, prev + 1))
                        }
                        className={cn(
                          "rounded-full border px-3 py-1",
                          scorersPageClamped === scorersTotalPages
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
          {activeChart === "goalsConceded" && concededOpponentsList.length ? (
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  {concededPanel === "opponents"
                    ? "Goals conceded by opponent"
                    : "Top scorers against"}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConcededPanel("opponents")}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em]",
                      concededPanel === "opponents"
                        ? "border-orange-400/80 bg-slate-900 text-slate-100"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-600"
                    )}
                  >
                    Opponents
                  </button>
                  <button
                    type="button"
                    onClick={() => setConcededPanel("scorers")}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em]",
                      concededPanel === "scorers"
                        ? "border-orange-400/80 bg-slate-900 text-slate-100"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-600"
                    )}
                  >
                    Scorers
                  </button>
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  {concededPanel === "opponents"
                    ? `${concededOpponentsList.reduce((sum, item) => sum + item.conceded, 0)} conceded`
                    : `${concededScorersList.reduce((sum, item) => sum + item.goals, 0)} goals`}
                </div>
              </div>
              {concededPanel === "opponents" ? (
                <>
                  <div className="mt-4 grid gap-3">
                    {concededPageItems.map((item) => (
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
                  {concededTotalPages > 1 ? (
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                      <button
                        type="button"
                        onClick={() => setConcededOpponentPage((prev) => Math.max(1, prev - 1))}
                        className={cn(
                          "rounded-full border px-3 py-1",
                          concededPageClamped === 1
                            ? "pointer-events-none opacity-40"
                            : "border-slate-800 hover:border-orange-400/60"
                        )}
                      >
                        Previous
                      </button>
                      <span>
                        Page {concededPageClamped} of {concededTotalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setConcededOpponentPage((prev) => Math.min(concededTotalPages, prev + 1))
                        }
                        className={cn(
                          "rounded-full border px-3 py-1",
                          concededPageClamped === concededTotalPages
                            ? "pointer-events-none opacity-40"
                            : "border-slate-800 hover:border-orange-400/60"
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
                    {concededScorersPageItems.map((item) => (
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
                              className="h-1.5 rounded-full bg-orange-500"
                              style={{
                                width: `${Math.max(
                                  6,
                                  (item.goals / concededScorersList[0].goals) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="text-sm font-semibold">{item.goals}</div>
                      </div>
                    ))}
                  </div>
                  {concededScorersTotalPages > 1 ? (
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                      <button
                        type="button"
                        onClick={() => setConcededScorersPage((prev) => Math.max(1, prev - 1))}
                        className={cn(
                          "rounded-full border px-3 py-1",
                          concededScorersPageClamped === 1
                            ? "pointer-events-none opacity-40"
                            : "border-slate-800 hover:border-orange-400/60"
                        )}
                      >
                        Previous
                      </button>
                      <span>
                        Page {concededScorersPageClamped} of {concededScorersTotalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setConcededScorersPage((prev) =>
                            Math.min(concededScorersTotalPages, prev + 1)
                          )
                        }
                        className={cn(
                          "rounded-full border px-3 py-1",
                          concededScorersPageClamped === concededScorersTotalPages
                            ? "pointer-events-none opacity-40"
                            : "border-slate-800 hover:border-orange-400/60"
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
          {activeChart === "matchesPlayed" && matchesByPlayerList.length ? (
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-4">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-400">
                <span>Top players by matches</span>
                <span>
                  {matchesByPlayerList.reduce((sum, item) => sum + item.matches, 0)} matches
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {matchesByPlayerPageItems.map((item) => (
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
                              (item.matches / matchesByPlayerList[0].matches) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{item.matches}</div>
                  </div>
                ))}
              </div>
              {matchesByPlayerTotalPages > 1 ? (
                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                  <button
                    type="button"
                    onClick={() => setMatchesPage((prev) => Math.max(1, prev - 1))}
                    className={cn(
                      "rounded-full border px-3 py-1",
                      matchesByPlayerPageClamped === 1
                        ? "pointer-events-none opacity-40"
                        : "border-slate-800 hover:border-teal-400/60"
                    )}
                  >
                    Previous
                  </button>
                  <span>
                    Page {matchesByPlayerPageClamped} of {matchesByPlayerTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setMatchesPage((prev) =>
                        Math.min(matchesByPlayerTotalPages, prev + 1)
                      )
                    }
                    className={cn(
                      "rounded-full border px-3 py-1",
                      matchesByPlayerPageClamped === matchesByPlayerTotalPages
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
      )}
    </section>
  )
}

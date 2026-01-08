"use client"

import { useEffect, useMemo, useState } from "react"
import {
  cn,
  formatMinutesSeconds,
  getFlagBackgroundStyle,
  isImageUrl,
  shouldOverlayFlag,
} from "@/lib/utils"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function getTwemojiUrl(emoji: string) {
  if (!emoji) return ""
  const codePoints = Array.from(emoji)
    .map((c) => c.codePointAt(0)?.toString(16))
    .join("-")
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

type Participant = {
  id: string
  name: string
  image: string
  country?: string
}

type StandingRow = {
  id: string
  name: string
  image: string
  matchesPlayed: number
  matchesWon: number
  matchesDraw: number
  matchesLost: number
  goalsScored: number
  goalsConceded: number
  points: number
}

type MatchRow = {
  id: string
  date?: string
  teamA: string
  teamB: string
  teamAImage: string
  teamBImage: string
  scoreA?: number
  scoreB?: number
}

type CompetitionStats = {
  matches: number
  teams: number
  goals: number
  goalsPerMatch: number
  cleanSheets: number
  deffwinMatches: number
}

type PlayerRankingRow = {
  id: string
  name: string
  country: string
  team: string
  avatar?: string
  kitImage?: string
  kitTextColor?: string
  matchesPlayed: number
  matchesWon: number
  matchesDraw: number
  matchesLost: number
  minutesPlayed: number
  goals: number
  assists: number
  preassists: number
  starter: number
  substitute: number
  kicks: number
  passes: number
  passesForward: number
  passesLateral: number
  passesBackward: number
  keypass: number
  autopass: number
  misspass: number
  shotsOnGoal: number
  shotsOffGoal: number
  shotsDefended: number
  saves: number
  recoveries: number
  clearances: number
  goalsConceded: number
  cs: number
  owngoals: number
  teamGoals: number
  braces: number
  hatTricks: number
  pokers: number
  avg: number
  TOTW: number
  MVP: number
  hasGK: boolean
}

type TeamRankingRow = {
  id: string
  name: string
  country: string
  matchesPlayed: number
  matchesWon: number
  matchesDraw: number
  matchesLost: number
  goalsScored: number
  goalsConceded: number
  points: number
  possessionAvg: number
  kicks: number
  passes: number
  shotsOnGoal: number
  shotsOffGoal: number
  saves: number
  cs: number
}

type CompetitionDetailTabsProps = {
  participants: Participant[]
  standings: StandingRow[]
  matches: MatchRow[]
  stats: CompetitionStats
  players: PlayerRankingRow[]
  teams: TeamRankingRow[]
}

type RankingRowBase = {
  id: string
  name: string
  country?: string
  team?: string
  value: number
  goals?: number
  assists?: number
  preassists?: number
  matchesWon?: number
  matchesDraw?: number
  matchesLost?: number
  player?: PlayerRankingRow
}

type PlayerMetricRow = RankingRowBase & {
  player: PlayerRankingRow
}

type PlayerMetric = {
  key: string
  label: string
  format: "number" | "percent" | "decimal" | "time"
  value: (player: PlayerRankingRow) => number
  minGames?: number
  minMinutes?: number
  minShots?: number
  minShotsAgainst?: number
  minPasses?: number
  minKicks?: number
  minStarts?: number
  allowZero?: boolean
  allowNegative?: boolean
  gkOnly?: boolean
  sortDirection?: "asc" | "desc"
  sortComparator?: (a: PlayerMetricRow, b: PlayerMetricRow) => number
}

type TeamMetric = {
  key: string
  label: string
  format: "number" | "percent"
  value: (team: TeamRankingRow) => number
}

type MetricGroup<TMetric> = {
  key: string
  label: string
  metrics: TMetric[]
}

type AnyMetric = PlayerMetric | TeamMetric
type AnyMetricGroup = MetricGroup<AnyMetric>

export default function CompetitionDetailTabs({
  participants,
  standings,
  matches,
  stats,
  players,
  teams,
}: CompetitionDetailTabsProps) {
  const tabs = ["Teams", "Standings", "Matches", "Stats"] as const
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Teams")
  const [matchesPage, setMatchesPage] = useState(1)

  const safeDivide = (numerator: number, denominator: number) =>
    denominator > 0 ? numerator / denominator : 0

  useEffect(() => {
    if (activeTab === "Matches") {
      setMatchesPage(1)
    }
  }, [activeTab])

  const matchesPerPage = 7
  const matchesTotalPages = Math.max(1, Math.ceil(matches.length / matchesPerPage))
  const matchesPageClamped = Math.min(matchesPage, matchesTotalPages)
  const matchesStart = (matchesPageClamped - 1) * matchesPerPage
  const matchesPageItems = matches.slice(matchesStart, matchesStart + matchesPerPage)

  useEffect(() => {
    if (matchesPage > matchesTotalPages) {
      setMatchesPage(matchesTotalPages)
    }
  }, [matchesPage, matchesTotalPages])

  const tableRows = useMemo(() => {
    return standings.map((row, index) => {
      const goalDiff = row.goalsScored - row.goalsConceded
      return { ...row, position: index + 1, goalDiff }
    })
  }, [standings])

  const metricGroups: MetricGroup<PlayerMetric>[] = [
    {
      key: "impact",
      label: "Impact",
      metrics: [
        { key: "games", label: "Games", format: "number", value: (p: PlayerRankingRow) => p.matchesPlayed },
        { key: "won", label: "Won", format: "number", value: (p: PlayerRankingRow) => p.matchesWon },
        { key: "draw", label: "Draw", format: "number", value: (p: PlayerRankingRow) => p.matchesDraw },
        { key: "lost", label: "Lost", format: "number", value: (p: PlayerRankingRow) => p.matchesLost },
        {
          key: "win_rate",
          label: "Win rate",
          format: "percent",
          value: (p: PlayerRankingRow) => safeDivide(p.matchesWon, p.matchesPlayed),
          minGames: 5,
          allowZero: true,
        },
        {
          key: "avg",
          label: "Avg",
          format: "decimal",
          value: (p: PlayerRankingRow) => p.avg,
          minGames: 5,
          allowZero: true,
        },
        {
          key: "gap",
          label: "G/A/P",
          format: "number",
          value: (p: PlayerRankingRow) => p.goals + p.assists + p.preassists,
          allowZero: true,
        },
        {
          key: "gi",
          label: "Team GI",
          format: "percent",
          value: (p: PlayerRankingRow) =>
            safeDivide(p.goals + p.assists + p.preassists, p.teamGoals),
          allowZero: true,
        },
        { key: "totw", label: "TOTW", format: "number", value: (p: PlayerRankingRow) => p.TOTW },
        { key: "mvp", label: "MVP", format: "number", value: (p: PlayerRankingRow) => p.MVP },
      ],
    },
    {
      key: "finishing",
      label: "Finishing",
      metrics: [
        { key: "goals", label: "Goals", format: "number", value: (p: PlayerRankingRow) => p.goals },
        { key: "braces", label: "Braces", format: "number", value: (p: PlayerRankingRow) => p.braces },
        {
          key: "hat_tricks",
          label: "Hat tricks",
          format: "number",
          value: (p: PlayerRankingRow) => p.hatTricks,
        },
        { key: "pokers", label: "Pokers", format: "number", value: (p: PlayerRankingRow) => p.pokers },
        {
          key: "shots_on",
          label: "Shots on Goal",
          format: "number",
          value: (p: PlayerRankingRow) => p.shotsOnGoal,
        },
        {
          key: "shots_off",
          label: "Shots off Goal",
          format: "number",
          value: (p: PlayerRankingRow) => p.shotsOffGoal,
        },
        {
          key: "shots_per_min",
          label: "Shots per min",
          format: "decimal",
          value: (p: PlayerRankingRow) =>
            safeDivide((p.shotsOnGoal + p.shotsOffGoal) * 60, p.minutesPlayed),
          minMinutes: 60,
        },
        {
          key: "on_target_pct",
          label: "% on target",
          format: "percent",
          value: (p: PlayerRankingRow) =>
            safeDivide(p.shotsOnGoal, p.shotsOnGoal + p.shotsOffGoal),
          minShots: 10,
        },
        {
          key: "goal_accuracy",
          label: "Goal accuracy",
          format: "percent",
          value: (p: PlayerRankingRow) =>
            safeDivide(p.goals, p.shotsOnGoal + p.shotsOffGoal),
          minShots: 10,
        },
        {
          key: "owngoals",
          label: "Owngoals",
          format: "number",
          value: (p: PlayerRankingRow) => p.owngoals,
          allowZero: true,
          sortDirection: "asc",
        },
      ],
    },
    {
      key: "passing",
      label: "Passing",
      metrics: [
        { key: "assists", label: "Assists", format: "number", value: (p: PlayerRankingRow) => p.assists },
        {
          key: "preassists",
          label: "Pre-Assists",
          format: "number",
          value: (p: PlayerRankingRow) => p.preassists,
        },
        { key: "passes", label: "Passes", format: "number", value: (p: PlayerRankingRow) => p.passes },
        {
          key: "passes_per_min",
          label: "Passes per min",
          format: "decimal",
          value: (p: PlayerRankingRow) => safeDivide(p.passes * 60, p.minutesPlayed),
          minMinutes: 60,
        },
        {
          key: "pass_accuracy",
          label: "Pass accuracy",
          format: "percent",
          value: (p: PlayerRankingRow) => safeDivide(p.passes, p.passes + p.misspass),
          minKicks: 20,
        },
        { key: "keypasses", label: "Keypasses", format: "number", value: (p: PlayerRankingRow) => p.keypass },
        {
          key: "keypass_pct",
          label: "% key passes",
          format: "percent",
          value: (p: PlayerRankingRow) => safeDivide(p.keypass, p.passes),
          minPasses: 30,
        },
        {
          key: "autopasses",
          label: "Autopasses",
          format: "number",
          value: (p: PlayerRankingRow) => p.autopass,
        },
        {
          key: "autopass_pct",
          label: "% autopass",
          format: "percent",
          value: (p: PlayerRankingRow) => safeDivide(p.autopass, p.kicks),
        },
      ],
    },
    {
      key: "defense",
      label: "Defense",
      metrics: [
        {
          key: "recoveries",
          label: "Recoveries",
          format: "number",
          value: (p: PlayerRankingRow) => p.recoveries,
        },
        {
          key: "recoveries_per_min",
          label: "Recoveries per min",
          format: "decimal",
          value: (p: PlayerRankingRow) => safeDivide(p.recoveries * 60, p.minutesPlayed),
          minMinutes: 60,
        },
        {
          key: "clearances",
          label: "Clearances",
          format: "number",
          value: (p: PlayerRankingRow) => p.clearances,
        },
        {
          key: "clearances_per_min",
          label: "Clearances per min",
          format: "decimal",
          value: (p: PlayerRankingRow) => safeDivide(p.clearances * 60, p.minutesPlayed),
          minMinutes: 60,
        },
        { key: "saves", label: "Saves", format: "number", value: (p: PlayerRankingRow) => p.saves },
        {
          key: "goals_conceded",
          label: "Goals conceded",
          format: "number",
          value: (p: PlayerRankingRow) => p.goalsConceded,
          minMinutes: 120,
          allowZero: true,
          sortDirection: "asc",
          sortComparator: (a, b) => {
            if (a.value !== b.value) return a.value - b.value
            if (a.player.minutesPlayed !== b.player.minutesPlayed) {
              return b.player.minutesPlayed - a.player.minutesPlayed
            }
            return b.player.matchesPlayed - a.player.matchesPlayed
          },
        },
        {
          key: "save_pct",
          label: "% shots saved",
          format: "percent",
          value: (p: PlayerRankingRow) => safeDivide(p.saves, p.shotsDefended),
          minShotsAgainst: 10,
        },
        {
          key: "cs",
          label: "Clean sheets",
          format: "number",
          value: (p: PlayerRankingRow) => p.cs,
          gkOnly: true,
        },
        {
          key: "cs_pct",
          label: "% games with CS",
          format: "percent",
          value: (p: PlayerRankingRow) => safeDivide(p.cs, p.matchesPlayed),
          gkOnly: true,
          minGames: 5,
          allowZero: true,
        },
      ],
    },
    {
      key: "progression",
      label: "Progression",
      metrics: [
        { key: "fwd", label: "Fwd", format: "number", value: (p: PlayerRankingRow) => p.passesForward },
        {
          key: "fwd_per_min",
          label: "Fwd per min",
          format: "decimal",
          value: (p: PlayerRankingRow) => safeDivide(p.passesForward * 60, p.minutesPlayed),
          minMinutes: 60,
        },
        { key: "lat", label: "Lat", format: "number", value: (p: PlayerRankingRow) => p.passesLateral },
        {
          key: "lat_per_min",
          label: "Lat per min",
          format: "decimal",
          value: (p: PlayerRankingRow) => safeDivide(p.passesLateral * 60, p.minutesPlayed),
          minMinutes: 60,
        },
        { key: "back", label: "Back", format: "number", value: (p: PlayerRankingRow) => p.passesBackward },
        {
          key: "back_per_min",
          label: "Back per min",
          format: "decimal",
          value: (p: PlayerRankingRow) => safeDivide(p.passesBackward * 60, p.minutesPlayed),
          minMinutes: 60,
        },
        {
          key: "fwd_back_balance",
          label: "Fwd-Back balance",
          format: "number",
          value: (p: PlayerRankingRow) => p.passesForward - p.passesBackward,
          minPasses: 30,
          allowNegative: true,
        },
        {
          key: "pct_forward",
          label: "% forward",
          format: "percent",
          value: (p: PlayerRankingRow) => safeDivide(p.passesForward, p.passes),
          minPasses: 30,
        },
        {
          key: "pct_lateral",
          label: "% lateral",
          format: "percent",
          value: (p: PlayerRankingRow) => safeDivide(p.passesLateral, p.passes),
          minPasses: 30,
        },
        {
          key: "pct_backward",
          label: "% backward",
          format: "percent",
          value: (p: PlayerRankingRow) => safeDivide(p.passesBackward, p.passes),
          minPasses: 30,
        },
      ],
    },
    {
      key: "physical",
      label: "Physical",
      metrics: [
        {
          key: "minutes",
          label: "Minutes",
          format: "time",
          value: (p: PlayerRankingRow) => p.minutesPlayed,
        },
        {
          key: "minutes_per_game",
          label: "Minutes per game",
          format: "time",
          value: (p: PlayerRankingRow) => safeDivide(p.minutesPlayed, p.matchesPlayed),
          minGames: 5,
        },
        { key: "starter", label: "Starter", format: "number", value: (p: PlayerRankingRow) => p.starter },
        {
          key: "substitute",
          label: "Substitute",
          format: "number",
          value: (p: PlayerRankingRow) => p.substitute,
        },
        {
          key: "starter_pct",
          label: "% as starter",
          format: "percent",
          value: (p: PlayerRankingRow) => safeDivide(p.starter, p.matchesPlayed),
          minStarts: 5,
        },
        {
          key: "substitute_pct",
          label: "% as substitute",
          format: "percent",
          value: (p: PlayerRankingRow) => safeDivide(p.substitute, p.matchesPlayed),
          minStarts: 5,
        },
        { key: "kicks", label: "Kicks", format: "number", value: (p: PlayerRankingRow) => p.kicks },
        {
          key: "kicks_per_min",
          label: "Kicks per min",
          format: "decimal",
          value: (p: PlayerRankingRow) => safeDivide(p.kicks * 60, p.minutesPlayed),
          minMinutes: 60,
        },
        {
          key: "misspasses",
          label: "Misspasses",
          format: "number",
          value: (p: PlayerRankingRow) => p.misspass,
        },
        {
          key: "misspasses_per_min",
          label: "Misspasses per min",
          format: "decimal",
          value: (p: PlayerRankingRow) => safeDivide(p.misspass * 60, p.minutesPlayed),
          minMinutes: 60,
        },
      ],
    },
  ]

  const teamMetricGroups: MetricGroup<TeamMetric>[] = [
    {
      key: "impact",
      label: "Impact",
      metrics: [
        { key: "games", label: "Games", format: "number", value: (t: TeamRankingRow) => t.matchesPlayed },
        { key: "won", label: "Won", format: "number", value: (t: TeamRankingRow) => t.matchesWon },
        { key: "draw", label: "Draw", format: "number", value: (t: TeamRankingRow) => t.matchesDraw },
        { key: "lost", label: "Lost", format: "number", value: (t: TeamRankingRow) => t.matchesLost },
        {
          key: "win_rate",
          label: "Win rate",
          format: "percent",
          value: (t: TeamRankingRow) => safeDivide(t.matchesWon, t.matchesPlayed),
        },
      ],
    },
    {
      key: "finishing",
      label: "Finishing",
      metrics: [
        { key: "goals_scored", label: "Goals scored", format: "number", value: (t: TeamRankingRow) => t.goalsScored },
        { key: "shots_on", label: "Shots on Goal", format: "number", value: (t: TeamRankingRow) => t.shotsOnGoal },
        { key: "shots_off", label: "Shots off Goal", format: "number", value: (t: TeamRankingRow) => t.shotsOffGoal },
        {
          key: "on_target_pct",
          label: "% on target",
          format: "percent",
          value: (t: TeamRankingRow) =>
            safeDivide(t.shotsOnGoal, t.shotsOnGoal + t.shotsOffGoal),
        },
      ],
    },
    {
      key: "passing",
      label: "Passing",
      metrics: [
        { key: "passes", label: "Passes", format: "number", value: (t: TeamRankingRow) => t.passes },
        { key: "kicks", label: "Kicks", format: "number", value: (t: TeamRankingRow) => t.kicks },
        {
          key: "possession",
          label: "Possession",
          format: "percent",
          value: (t: TeamRankingRow) => safeDivide(t.possessionAvg, 100),
        },
      ],
    },
    {
      key: "defense",
      label: "Defense",
      metrics: [
        { key: "goals_conceded", label: "Goals conceded", format: "number", value: (t: TeamRankingRow) => t.goalsConceded },
        { key: "saves", label: "Saves", format: "number", value: (t: TeamRankingRow) => t.saves },
        { key: "cs", label: "Clean sheets", format: "number", value: (t: TeamRankingRow) => t.cs },
      ],
    },
  ]

  const formatValue = (value: number, format: string) => {
    if (!Number.isFinite(value)) return "-"
    if (format === "time") return formatMinutesSeconds(value)
    if (format === "percent") return `${(value * 100).toFixed(1)}%`
    if (format === "decimal") return value.toFixed(2)
    return Math.round(value).toString()
  }

  const rankingsByMetric = useMemo(() => {
    const shouldIncludePlayer = (metric: PlayerMetric, player: PlayerRankingRow, value: number) => {
      if (!Number.isFinite(value)) return false
      if (metric.gkOnly && !player.hasGK) return false
      if (!metric.allowNegative) {
        if (metric.allowZero) {
          if (value < 0) return false
        } else if (value <= 0) {
          return false
        }
      }
      const minutes = (Number(player.minutesPlayed) || 0) / 60
      const shotsTotal = (Number(player.shotsOnGoal) || 0) + (Number(player.shotsOffGoal) || 0)
      const passes = Number(player.passes) || 0
      const kicks = Number(player.kicks) || 0
      const starts = (Number(player.starter) || 0) + (Number(player.substitute) || 0)
      const shotsAgainst = Number(player.shotsDefended) || Number(player.saves) + Number(player.goalsConceded)
      if (metric.minGames && player.matchesPlayed < metric.minGames) return false
      if (metric.minMinutes && minutes < metric.minMinutes) return false
      if (metric.minShots && shotsTotal < metric.minShots) return false
      if (metric.minShotsAgainst && shotsAgainst < metric.minShotsAgainst) return false
      if (metric.minPasses && passes < metric.minPasses) return false
      if (metric.minKicks && kicks < metric.minKicks) return false
      if (metric.minStarts && starts < metric.minStarts) return false
      return true
    }

    const buildTopRanking = (metric: PlayerMetric) => {
      const rows = players
        .map((player) => {
          const value = Number(metric.value(player))
          const base = {
            id: player.id,
            name: player.name,
            country: player.country,
            team: player.team,
            value,
            player,
          }
          if (metric.key === "gap") {
            return {
              ...base,
              goals: player.goals,
              assists: player.assists,
              preassists: player.preassists,
            }
          }
          return base
        })
        .filter((row) => shouldIncludePlayer(metric, row.player, row.value))
        .sort((a, b) => {
          if (typeof metric.sortComparator === "function") {
            return metric.sortComparator(a, b)
          }
          const direction = metric.sortDirection === "asc" ? 1 : -1
          return (a.value - b.value) * direction
        })
        .slice(0, 30)

      return rows
    }

    return metricGroups.reduce<Record<string, RankingRowBase[]>>((acc, group) => {
      group.metrics.forEach((metric) => {
        acc[metric.key] = buildTopRanking(metric)
      })
      return acc
    }, {})
  }, [players, metricGroups])

  const topGoalMatches = useMemo(() => {
    return matches
      .map((match) => {
        const scoreA = Number(match.scoreA)
        const scoreB = Number(match.scoreB)
        const total = (Number.isFinite(scoreA) ? scoreA : 0) + (Number.isFinite(scoreB) ? scoreB : 0)
        return {
          id: match.id,
          date: match.date,
          teamA: match.teamA,
          teamB: match.teamB,
          teamAImage: match.teamAImage,
          teamBImage: match.teamBImage,
          scoreA: Number.isFinite(scoreA) ? scoreA : null,
          scoreB: Number.isFinite(scoreB) ? scoreB : null,
          total,
        }
      })
      .filter((match) => match.scoreA !== null && match.scoreB !== null)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
  }, [matches])

  const teamRankingsByMetric = useMemo(() => {
    const buildTeamRanking = (metric: TeamMetric) => {
      const rows = teams
        .map((team) => ({
          id: team.id,
          name: team.name,
          country: team.country,
          value: metric.value(team),
          matchesWon: team.matchesWon,
          matchesDraw: team.matchesDraw,
          matchesLost: team.matchesLost,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 30)

      return rows
    }

    return teamMetricGroups.reduce<Record<string, RankingRowBase[]>>((acc, group) => {
      group.metrics.forEach((metric) => {
        acc[metric.key] = buildTeamRanking(metric)
      })
      return acc
    }, {})
  }, [teams, teamMetricGroups])

  const renderRankingTabs = (
    groups: AnyMetricGroup[],
    rankings: Record<string, RankingRowBase[]>,
    showGapDetails: boolean,
    showTeamRecord: boolean
  ) => (
    <Tabs defaultValue={groups[0]?.key} className="w-full">
      <TabsList className="grid grid-cols-3 gap-2 mb-4 bg-slate-950/60 md:grid-cols-6">
        {groups.map((group) => (
          <TabsTrigger
            key={group.key}
            value={group.key}
              className="data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-100"
            >
              {group.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {groups.map((group) => (
          <TabsContent key={group.key} value={group.key}>
            <Tabs defaultValue={group.metrics[0]?.key} className="w-full">
              <div className="mb-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <TabsList className="inline-flex w-max flex-nowrap gap-2 rounded-lg bg-slate-950/60 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  {group.metrics.map((metric) => (
                    <TabsTrigger
                      key={metric.key}
                      value={metric.key}
                      className="flex-none whitespace-nowrap data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-100"
                    >
                      {metric.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {group.metrics.map((metric) => (
                <TabsContent key={metric.key} value={metric.key}>
                  <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-950/70 via-slate-950/60 to-slate-900/60">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-[11px] uppercase tracking-[0.4em] text-slate-400">
                      <span>{group.label}</span>
                      <span>{metric.label}</span>
                    </div>
                    <div className="h-[372px] overflow-hidden">
                      <div className="h-full space-y-3 overflow-y-auto pr-2">
                        {(rankings[metric.key] || []).map((row, idx) => (
                          <div
                            key={row.id}
                            className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/70 p-3 transition-colors hover:bg-slate-900/90"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-950/60 text-[11px] font-semibold text-slate-200">
                                {idx + 1}
                              </div>
                              <div
                                className="relative h-8 w-8 rounded-full bg-teal-500/20 text-teal-200 flex items-center justify-center text-xs font-semibold tracking-wide"
                                style={
                                  row.player?.kitImage
                                    ? {
                                        backgroundImage: `url(${row.player.kitImage})`,
                                        backgroundSize: "cover",
                                        backgroundPosition: "center",
                                      }
                                    : undefined
                                }
                              >
                                {row.player?.avatar ? (
                                  isImageUrl(row.player.avatar) ? (
                                    <img
                                      src={row.player.avatar}
                                      alt={row.name}
                                      className="h-7 w-7 rounded-full object-contain"
                                    />
                                  ) : (
                                    <span
                                      className="text-[10px] font-semibold"
                                      style={{ color: row.player.kitTextColor || "#ffffff" }}
                                    >
                                      {row.player.avatar}
                                    </span>
                                  )
                                ) : null}
                                {row.country ? (
                                  <FlagBadge
                                    country={row.country}
                                    className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full"
                                  />
                                ) : null}
                              </div>
                              <div>
                                <p className="text-white font-medium">{row.name}</p>
                                {row.team ? (
                                  <p className="text-xs text-slate-400">{row.team}</p>
                                ) : null}
                              </div>
                            </div>
                            <div className="text-sm text-teal-300 font-semibold">
                              <div>{formatValue(row.value, metric.format)}</div>
                              {showTeamRecord && metric.key === "games" && (
                                <div className="text-[11px] text-slate-400">
                                  {row.matchesWon ?? 0}W/{row.matchesDraw ?? 0}D/
                                  {row.matchesLost ?? 0}L
                                </div>
                              )}
                              {showGapDetails && metric.key === "gap" && (
                                <div className="text-[11px] text-slate-400">
                                  {row.goals ?? 0}G/{row.assists ?? 0}SA/
                                  {row.preassists ?? 0}P
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {!rankings[metric.key]?.length && (
                          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-center text-slate-400">
                            No data
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>
        ))}
      </Tabs>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "rounded-full border px-4 py-2 text-xs uppercase tracking-[0.2em] transition",
                isActive
                  ? "border-teal-400/80 bg-slate-900 shadow-[0_0_0_2px_rgba(20,184,166,0.15)]"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-600"
              )}
            >
              {tab}
            </button>
          )
        })}
      </div>

      {activeTab === "Teams" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {participants.map((team) => (
            <Link
              key={team.id}
              href={`/teams/${team.id}`}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-5 text-center transition hover:-translate-y-0.5 hover:border-teal-400/50 hover:shadow-[0_12px_24px_rgba(15,23,42,0.45)]"
            >
              {team.image ? (
                <img
                  src={team.image}
                  alt={team.name}
                  className="mx-auto h-40 w-40 object-contain"
                />
              ) : (
                <div className="mx-auto h-40 w-40 rounded-full border border-slate-800 bg-slate-900/60" />
              )}
              <div className="mt-4 truncate text-base font-semibold text-slate-100">{team.name}</div>
            </Link>
          ))}
        </div>
      ) : null}

      {activeTab === "Standings" ? (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <div className="grid grid-cols-[24px_minmax(180px,1.8fr)_repeat(7,minmax(0,0.7fr))_minmax(0,0.8fr)] gap-2 bg-slate-900/80 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-400">
            <span>#</span>
            <span>Team</span>
            <span>PM</span>
            <span>V</span>
            <span>D</span>
            <span>L</span>
            <span>GF</span>
            <span>GA</span>
            <span>GD</span>
            <span>PT</span>
          </div>
          <div className="divide-y divide-slate-800">
            {tableRows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[24px_minmax(180px,1.8fr)_repeat(7,minmax(0,0.7fr))_minmax(0,0.8fr)] gap-2 px-4 py-3 text-sm"
              >
                <span className="text-slate-400">{row.position}</span>
                <div className="flex items-center gap-2 min-w-0">
                  {row.image ? (
                    <img
                      src={row.image}
                      alt={row.name}
                      className="h-5 w-5 rounded-full object-cover border border-slate-700"
                    />
                  ) : (
                    <div className="h-5 w-5 rounded-full border border-slate-800 bg-slate-900/60" />
                  )}
                  <span className="truncate whitespace-nowrap">{row.name}</span>
                </div>
                <span>{row.matchesPlayed}</span>
                <span>{row.matchesWon}</span>
                <span>{row.matchesDraw}</span>
                <span>{row.matchesLost}</span>
                <span>{row.goalsScored}</span>
                <span>{row.goalsConceded}</span>
                <span>{row.goalDiff}</span>
                <span className="font-semibold">{row.points}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "Matches" ? (
        <div className="space-y-3">
          {matchesPageItems.map((match) => (
            <Link
              key={match.id}
              href={`/matches/${match.id}`}
              className="block rounded-xl border border-slate-800 bg-slate-900/70 px-5 py-4 transition hover:-translate-y-0.5 hover:border-teal-400/50 hover:shadow-[0_12px_24px_rgba(15,23,42,0.45)]"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{match.date || "-"}</span>
                <span>Match</span>
              </div>
              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 text-sm">
                <div className="flex items-center gap-2">
                  {match.teamAImage ? (
                    <img
                      src={match.teamAImage}
                      alt={match.teamA}
                      className="h-10 w-10 object-contain"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full border border-slate-800 bg-slate-900/60" />
                  )}
                  <span className="truncate">{match.teamA}</span>
                </div>
                <div className="text-base font-semibold text-slate-100">
                  {match.scoreA ?? "-"} : {match.scoreB ?? "-"}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <span className="truncate">{match.teamB}</span>
                  {match.teamBImage ? (
                    <img
                      src={match.teamBImage}
                      alt={match.teamB}
                      className="h-10 w-10 object-contain"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full border border-slate-800 bg-slate-900/60" />
                  )}
                </div>
              </div>
            </Link>
          ))}
          {matchesTotalPages > 1 ? (
            <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
              <button
                type="button"
                onClick={() => setMatchesPage((prev) => Math.max(1, prev - 1))}
                disabled={matchesPageClamped === 1}
                className={cn(
                  "rounded-full border border-slate-800 px-3 py-1 uppercase tracking-[0.2em] transition",
                  matchesPageClamped === 1
                    ? "cursor-not-allowed text-slate-600"
                    : "text-slate-300 hover:border-teal-400/50 hover:text-teal-200"
                )}
              >
                Prev
              </button>
              <span>
                Page {matchesPageClamped} of {matchesTotalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setMatchesPage((prev) => Math.min(matchesTotalPages, prev + 1))
                }
                disabled={matchesPageClamped === matchesTotalPages}
                className={cn(
                  "rounded-full border border-slate-800 px-3 py-1 uppercase tracking-[0.2em] transition",
                  matchesPageClamped === matchesTotalPages
                    ? "cursor-not-allowed text-slate-600"
                    : "text-slate-300 hover:border-teal-400/50 hover:text-teal-200"
                )}
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "Stats" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-6">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Deffwin rate</p>
              <div className="mt-6 flex items-center justify-center">
                <div
                  className="relative h-36 w-36 rounded-full p-3"
                  style={{
                    background: `conic-gradient(#14b8a6 0deg, #14b8a6 ${Math.round(
                      safeDivide(stats.deffwinMatches, stats.matches) * 360
                    )}deg, rgba(148,163,184,0.25) ${Math.round(
                      safeDivide(stats.deffwinMatches, stats.matches) * 360
                    )}deg, rgba(148,163,184,0.25) 360deg)`,
                  }}
                >
                  <div className="absolute inset-3 rounded-full bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-semibold">
                      {Math.round(safeDivide(stats.deffwinMatches, stats.matches) * 100)}%
                    </span>
                    <span className="text-xs text-slate-400">Deffwin</span>
                    <span className="mt-1 text-xs text-slate-500">
                      {stats.deffwinMatches} / {stats.matches}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Goals</p>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400">Total</p>
                  <p className="mt-1 text-2xl font-semibold">{stats.goals}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Goals / match</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {stats.goalsPerMatch.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-5">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Top goals matches</p>
              <div className="mt-4 max-h-[220px] space-y-3 overflow-y-auto pr-2">
                {topGoalMatches.length ? (
                  topGoalMatches.map((match) => (
                    <div
                      key={match.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{match.date || "-"}</span>
                        <span>Match</span>
                      </div>
                      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 text-sm">
                        <div className="flex items-center justify-start">
                          {match.teamAImage ? (
                            <img
                              src={match.teamAImage}
                              alt={match.teamA}
                              className="h-10 w-10 object-contain"
                            />
                          ) : (
                            <div className="h-10 w-10 border border-slate-800 bg-slate-900/60" />
                          )}
                        </div>
                        <div className="text-base font-semibold text-slate-100">
                          {match.scoreA} : {match.scoreB}
                        </div>
                        <div className="flex items-center justify-end">
                          {match.teamBImage ? (
                            <img
                              src={match.teamBImage}
                              alt={match.teamB}
                              className="h-10 w-10 object-contain"
                            />
                          ) : (
                            <div className="h-10 w-10 border border-slate-800 bg-slate-900/60" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-4 text-center text-sm text-slate-400">
                    No matches available
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="flex items-center gap-3 text-lg font-semibold text-white">
              <span>Ranking</span>
            </div>
            <Tabs defaultValue="players" className="mt-4 w-full">
              <TabsList className="mb-4 grid grid-cols-2 gap-2 bg-slate-950/60">
                <TabsTrigger
                  value="players"
                  className="data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-100"
                >
                  Players
                </TabsTrigger>
                <TabsTrigger
                  value="teams"
                  className="data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-100"
                >
                  Teams
                </TabsTrigger>
              </TabsList>
              <TabsContent value="players">
                {renderRankingTabs(metricGroups, rankingsByMetric, true, false)}
              </TabsContent>
              <TabsContent value="teams">
                {renderRankingTabs(teamMetricGroups, teamRankingsByMetric, false, true)}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : null}
    </div>
  )
}

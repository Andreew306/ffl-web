import dbConnect from "@/lib/db/mongoose"
import EloPlayerModel from "@/lib/models/EloPlayer"
import { TrendingUp } from "lucide-react"
import { EloInsights } from "./EloInsights"
import { EloLeaderboard } from "./EloLeaderboard"
import { EloScopeFilter } from "./EloScopeFilter"

export const revalidate = 60

type EloPlayerRow = {
  playerId: string
  nickname?: string
  discordId?: string
  elo: number
  wins: number
  losses: number
  streaks: number
  eloHistory?: number[]
}

type EloSeasonRow = {
  seasonId: string
  name?: string
  status?: string
}

type EloPlayerSeasonRow = {
  playerId: string
  discordId?: string
  elo: number
  wins: number
  losses: number
  streaks: number
  eloHistory?: number[]
}

type EloPageProps = {
  searchParams?: Promise<{ scope?: string }>
}

type RankedPlayer = {
  playerId: string
  discordId?: string
  displayName: string
  elo: number
  wins: number
  losses: number
  streaks: number
  eloHistory: number[]
}

type EloMatchRow = {
  matchId?: string
  seasonId?: string | null
  status?: string
  winner?: string
  finishedAt?: Date | string
  team1?: string[]
  team2?: string[]
  captains?: {
    team1?: string
    team2?: string
  }
}

const toNumberHistory = (history?: number[]) =>
  Array.isArray(history)
    ? history.map((value) => Number(value)).filter((value) => Number.isFinite(value))
    : []

const playerMatches = (player: RankedPlayer) => player.wins + player.losses

const winRate = (player: RankedPlayer) => {
  const matches = playerMatches(player)
  return matches ? (player.wins / matches) * 100 : 0
}

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null

const playerInitialElo = (player: RankedPlayer) => {
  const history = player.eloHistory
  return history.length ? history[0] : player.elo
}

const playerPeakElo = (player: RankedPlayer) =>
  Math.max(player.elo, ...player.eloHistory)

const playerVolatility = (player: RankedPlayer) => {
  const values = player.eloHistory.length ? player.eloHistory : [player.elo]
  if (values.length < 2) return 0
  const diffs = values.slice(1).map((value, index) => Math.abs(value - values[index]))
  return Math.round(average(diffs) ?? 0)
}

const formatDateKey = (date: Date) => date.toISOString().slice(0, 10)

const formatDayLabel = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-")
  return `${day}/${month}/${year.slice(2)}`
}

const fillDailyActivity = (rows: Array<{ _id: string; matches: number }>) => {
  if (!rows.length) return []
  const counts = new Map(rows.map((row) => [row._id, row.matches]))
  const start = new Date(`${rows[0]._id}T00:00:00.000Z`)
  const end = new Date(`${rows[rows.length - 1]._id}T00:00:00.000Z`)
  const points: Array<{ date: string; label: string; matches: number }> = []
  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const key = formatDateKey(cursor)
    points.push({
      date: key,
      label: formatDayLabel(key),
      matches: counts.get(key) ?? 0,
    })
  }
  return points
}

export default async function EloPage({ searchParams }: EloPageProps) {
  const params = await searchParams
  const requestedScope = params?.scope ?? ""
  const mongoose = await dbConnect()
  if (!mongoose?.connection?.db) {
    throw new Error("Database connection not initialized")
  }
  const db = mongoose.connection.db

  const seasons = (await db
    .collection("eloseasons")
    .find({})
    .sort({ createdAt: -1, seasonId: -1 })
    .toArray()) as unknown as EloSeasonRow[]

  const seasonCounts = await db
    .collection("eloplayerseasons")
    .aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$seasonId", count: { $sum: 1 } } },
    ])
    .toArray()
  const playerCountBySeason = new Map(
    seasonCounts.map((row) => [row._id, row.count])
  )
  const activeSeason = seasons.find((season) => season.status === "active") ?? null
  const defaultScope =
    activeSeason?.seasonId && (playerCountBySeason.get(activeSeason.seasonId) ?? 0) > 0
      ? activeSeason.seasonId
      : "community"
  const selectedScope = requestedScope || defaultScope
  const selectedSeason = seasons.find((season) => season.seasonId === selectedScope) ?? null

  let ranked: RankedPlayer[] = []

  let usingSeason = false

  if (selectedSeason?.seasonId) {
    const seasonPlayers = (await db
      .collection("eloplayerseasons")
      .find({ seasonId: selectedSeason.seasonId })
      .sort({ elo: -1 })
      .toArray()) as unknown as EloPlayerSeasonRow[]

    if (seasonPlayers.length) {
      const discordIds = seasonPlayers
        .map((player) => player.discordId)
        .filter((id): id is string => Boolean(id))
      const playerDocs = discordIds.length
        ? await EloPlayerModel.find({ discordId: { $in: discordIds } }).lean<EloPlayerRow[]>()
        : []
      const playerByDiscord = new Map(
        playerDocs.map((player) => [player.discordId, player])
      )

      ranked = seasonPlayers.map((player) => {
        const info = player.discordId ? playerByDiscord.get(player.discordId) : undefined
        const displayName = info?.nickname?.trim()
          || info?.playerId
          || player.playerId
        return {
          playerId: player.playerId,
          discordId: player.discordId,
          displayName,
          elo: Number(player.elo) || 0,
          wins: Number(player.wins) || 0,
          losses: Number(player.losses) || 0,
          streaks: Number(player.streaks) || 0,
          eloHistory: toNumberHistory(player.eloHistory),
        }
      })
      usingSeason = true
    }
  }

  if (!usingSeason && selectedScope === "community") {
    const players = await EloPlayerModel.find({})
      .sort({ elo: -1 })
      .lean<EloPlayerRow[]>()

    ranked = players.map((player) => ({
      playerId: player.playerId,
      discordId: player.discordId,
      displayName: player.nickname?.trim() || player.playerId,
      elo: Number(player.elo) || 0,
      wins: Number(player.wins) || 0,
      losses: Number(player.losses) || 0,
      streaks: Number(player.streaks) || 0,
      eloHistory: toNumberHistory(player.eloHistory),
    }))
  }

  const seasonLabel = usingSeason
    ? selectedSeason?.name
      ? `Season: ${selectedSeason.name}`
      : `Season ID: ${selectedSeason?.seasonId}`
    : selectedSeason
      ? "This season does not have Elo data yet."
      : "Community - overall Elo."
  const filterOptions = [
    { value: "community", label: "Community" },
    ...seasons.map((season) => {
      const count = playerCountBySeason.get(season.seasonId) ?? 0
      return {
        value: season.seasonId,
        label: `${season.name || season.seasonId}${season.status === "active" ? " (active)" : ""}${count ? "" : " - no data"}`,
      }
    }),
  ]
  const selectedScopeLabel = filterOptions.find((option) => option.value === selectedScope)?.label.replace(" - no data", "") ?? "Community"

  const eloRanked = [...ranked].sort((a, b) => b.elo - a.elo)
  const matchesRanked = [...ranked].sort((a, b) => {
    const matchesA = a.wins + a.losses
    const matchesB = b.wins + b.losses
    if (matchesB !== matchesA) return matchesB - matchesA
    return b.elo - a.elo
  })
  const winRateRanked = [...ranked].sort((a, b) => {
    const matchesA = a.wins + a.losses
    const matchesB = b.wins + b.losses
    const rateA = matchesA ? a.wins / matchesA : 0
    const rateB = matchesB ? b.wins / matchesB : 0
    if (rateB !== rateA) return rateB - rateA
    return matchesB - matchesA
  })

  const matchQuery: Record<string, unknown> = { status: "finished" }
  if (selectedSeason?.seasonId) {
    matchQuery.seasonId = selectedSeason.seasonId
  }

  const dailyRows = await db
    .collection("elomatches")
    .aggregate<{ _id: string; matches: number }>([
      { $match: { ...matchQuery, finishedAt: { $type: "date" } } },
      {
        $group: {
          _id: {
            $dateToString: {
              date: "$finishedAt",
              format: "%Y-%m-%d",
              timezone: "Europe/Madrid",
            },
          },
          matches: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray()
  const dailyActivity = fillDailyActivity(dailyRows)

  const matches = (await db
    .collection("elomatches")
    .find(matchQuery, {
      projection: {
        matchId: 1,
        seasonId: 1,
        status: 1,
        winner: 1,
        finishedAt: 1,
        team1: 1,
        team2: 1,
        captains: 1,
      },
    })
    .sort({ finishedAt: 1 })
    .toArray()) as unknown as EloMatchRow[]

  const ratingByDiscord = new Map(
    ranked
      .filter((player) => player.discordId)
      .map((player) => [player.discordId as string, player.elo])
  )
  const nameByDiscord = new Map(
    ranked
      .filter((player) => player.discordId)
      .map((player) => [player.discordId as string, player.displayName])
  )

  const captainStats = new Map<
    string,
    { matches: number; wins: number; draws: number; balanceSum: number; balanceMatches: number }
  >()
  const balanceDiffs: number[] = []
  let upsetMatches = 0
  let decidedMatches = 0
  let drawMatches = 0
  let team1Wins = 0
  let team2Wins = 0

  for (const match of matches) {
    if (match.winner === "draw") drawMatches += 1
    if (match.winner === "team1") team1Wins += 1
    if (match.winner === "team2") team2Wins += 1
    if (match.winner === "team1" || match.winner === "team2") decidedMatches += 1

    const team1Ratings = (match.team1 ?? [])
      .map((discordId) => ratingByDiscord.get(discordId))
      .filter((rating): rating is number => typeof rating === "number")
    const team2Ratings = (match.team2 ?? [])
      .map((discordId) => ratingByDiscord.get(discordId))
      .filter((rating): rating is number => typeof rating === "number")
    const team1Average = average(team1Ratings)
    const team2Average = average(team2Ratings)
    const hasBalance = team1Average !== null && team2Average !== null
    const balanceDiff = hasBalance ? Math.abs(team1Average - team2Average) : null

    if (balanceDiff !== null) {
      balanceDiffs.push(balanceDiff)
      if (match.winner === "team1" && team1Average !== null && team2Average !== null && team1Average < team2Average) {
        upsetMatches += 1
      }
      if (match.winner === "team2" && team1Average !== null && team2Average !== null && team2Average < team1Average) {
        upsetMatches += 1
      }
    }

    const captains = [
      { side: "team1", discordId: match.captains?.team1 },
      { side: "team2", discordId: match.captains?.team2 },
    ]
    for (const captain of captains) {
      if (!captain.discordId) continue
      const current = captainStats.get(captain.discordId) ?? {
        matches: 0,
        wins: 0,
        draws: 0,
        balanceSum: 0,
        balanceMatches: 0,
      }
      current.matches += 1
      if (match.winner === captain.side) current.wins += 1
      if (match.winner === "draw") current.draws += 1
      if (balanceDiff !== null) {
        current.balanceSum += balanceDiff
        current.balanceMatches += 1
      }
      captainStats.set(captain.discordId, current)
    }
  }

  const totalMatches = matches.length
  const averageElo = average(ranked.map((player) => player.elo))
  const peakPlayer = [...ranked].sort((a, b) => playerPeakElo(b) - playerPeakElo(a))[0]
  const mostImprovedPlayer = [...ranked].sort(
    (a, b) => (b.elo - playerInitialElo(b)) - (a.elo - playerInitialElo(a))
  )[0]
  const mostActivePlayer = [...ranked].sort((a, b) => playerMatches(b) - playerMatches(a))[0]
  const bestWinRatePlayer = [...ranked]
    .filter((player) => playerMatches(player) >= 10)
    .sort((a, b) => winRate(b) - winRate(a))[0]
  const avgBalanceDiff = average(balanceDiffs)
  const drawRate = totalMatches ? (drawMatches / totalMatches) * 100 : null
  const upsetRate = decidedMatches ? (upsetMatches / decidedMatches) * 100 : null
  const team1WinRate = totalMatches ? (team1Wins / totalMatches) * 100 : null
  const team2WinRate = totalMatches ? (team2Wins / totalMatches) * 100 : null

  const summary = [
    {
      label: "Players",
      value: String(ranked.length),
      detail: "Players with Elo in this filter",
    },
    {
      label: "Matches",
      value: String(totalMatches),
      detail: "Finished Elo matches",
    },
    {
      label: "Average Elo",
      value: averageElo === null ? "-" : String(Math.round(averageElo)),
      detail: "Current selected leaderboard average",
    },
    {
      label: "Peak Elo",
      value: peakPlayer ? String(playerPeakElo(peakPlayer)) : "-",
      detail: peakPlayer ? peakPlayer.displayName : "No player data",
    },
    {
      label: "Most Improved",
      value: mostImprovedPlayer ? `+${mostImprovedPlayer.elo - playerInitialElo(mostImprovedPlayer)}` : "-",
      detail: mostImprovedPlayer ? mostImprovedPlayer.displayName : "No history data",
    },
    {
      label: "Most Active",
      value: mostActivePlayer ? String(playerMatches(mostActivePlayer)) : "-",
      detail: mostActivePlayer ? mostActivePlayer.displayName : "No match data",
    },
    {
      label: "Best Win Rate",
      value: bestWinRatePlayer ? `${winRate(bestWinRatePlayer).toFixed(1)}%` : "-",
      detail: bestWinRatePlayer ? `${bestWinRatePlayer.displayName} - min 10 matches` : "Needs 10 matches",
    },
    {
      label: "Avg Balance Gap",
      value: avgBalanceDiff === null ? "-" : `${Math.round(avgBalanceDiff)}`,
      detail: "Estimated team Elo difference",
    },
  ]

  const risers = [...ranked]
    .map((player) => ({
      playerId: player.playerId,
      name: player.displayName,
      value: player.elo - playerInitialElo(player),
      detail: `${playerInitialElo(player)} -> ${player.elo}`,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
  const fallers = [...ranked]
    .map((player) => ({
      playerId: player.playerId,
      name: player.displayName,
      value: player.elo - playerInitialElo(player),
      detail: `${playerInitialElo(player)} -> ${player.elo}`,
    }))
    .sort((a, b) => a.value - b.value)
    .slice(0, 5)
  const peaks = [...ranked]
    .map((player) => ({
      playerId: player.playerId,
      name: player.displayName,
      value: playerPeakElo(player),
      detail: `Current ${player.elo}`,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
  const volatile = [...ranked]
    .map((player) => ({
      playerId: player.playerId,
      name: player.displayName,
      value: playerVolatility(player),
      detail: `${player.eloHistory.length || 1} Elo points tracked`,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
  const captains = [...captainStats.entries()]
    .map(([discordId, stats]) => ({
      discordId,
      name: nameByDiscord.get(discordId) ?? discordId,
      matches: stats.matches,
      wins: stats.wins,
      draws: stats.draws,
      winRate: stats.matches ? (stats.wins / stats.matches) * 100 : 0,
      avgBalanceDiff: stats.balanceMatches ? stats.balanceSum / stats.balanceMatches : null,
    }))
    .sort((a, b) => {
      if (b.matches !== a.matches) return b.matches - a.matches
      return b.winRate - a.winRate
    })
    .slice(0, 6)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-6 pt-0 pb-12 space-y-10">
        <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-900/30 p-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-slate-900/60 px-4 py-2 text-xs uppercase tracking-[0.3em] text-teal-200">
            <TrendingUp className="h-4 w-4" />
            Elo Rankings
          </div>
          <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Current Season Elo</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">
            Top players by Elo for the selected season or the community leaderboard.
          </p>
          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="text-xs text-slate-400">
              {seasonLabel}
            </div>
            <EloScopeFilter selectedScope={selectedScope} options={filterOptions} />
          </div>
        </section>

        <EloInsights
          summary={summary}
          dailyActivity={dailyActivity}
          risers={risers}
          fallers={fallers}
          peaks={peaks}
          volatile={volatile}
          captains={captains}
          matchQuality={{
            avgBalanceDiff,
            balancedMatches: balanceDiffs.length,
            upsetRate,
            drawRate,
            team1WinRate,
            team2WinRate,
          }}
        />

        <EloLeaderboard
          eloRanked={eloRanked}
          matchesRanked={matchesRanked}
          winRateRanked={winRateRanked}
          scopeLabel={selectedScopeLabel}
        />
      </div>
    </div>
  )
}

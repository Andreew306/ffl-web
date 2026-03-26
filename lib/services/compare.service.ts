import mongoose from "mongoose"
import dbConnect from "@/lib/db/mongoose"
import CompetitionModel from "@/lib/models/Competition"
import TeamCompetitionModel from "@/lib/models/TeamCompetition"
import { getIdeal7Data, type Ideal7Player } from "@/lib/services/ideal7.service"

export type ComparePosition =
  | "all"
  | "GK"
  | "DEF"
  | "MID"
  | "WING"
  | "ST"

export type ComparePlayerSeason = {
  season: number
  matchesPlayed: number
  wins: number
  draws: number
  losses: number
  starter: number
  substitute: number
  minutesPlayed: number
  goals: number
  assists: number
  preassists: number
  shotsOnGoal: number
  kicks: number
  passes: number
  keypass: number
  autopass: number
  saves: number
  clearances: number
  recoveries: number
  goalsConceded: number
  missedPasses: number
  ownGoals: number
  avg: number
  mvp: number
  totw: number
  cs: number
}

export type ComparePlayerTotals = {
  matchesPlayed: number
  wins: number
  draws: number
  losses: number
  starter: number
  substitute: number
  minutesPlayed: number
  goals: number
  assists: number
  preassists: number
  shotsOnGoal: number
  kicks: number
  passes: number
  keypass: number
  autopass: number
  saves: number
  clearances: number
  recoveries: number
  goalsConceded: number
  missedPasses: number
  ownGoals: number
  avg: number
  mvp: number
  totw: number
  cs: number
  goalsPerMatch: number
  assistsPerMatch: number
  preassistsPerMatch: number
  goalsPerMinute: number
  assistsPerMinute: number
  shotsOnGoalPerMatch: number
  winRate: number
  starterRate: number
}

export type ComparePlayer = Ideal7Player & {
  totals: ComparePlayerTotals
  seasons: ComparePlayerSeason[]
}

export type ComparePageData = {
  players: Ideal7Player[]
  selectedPlayers: ComparePlayer[]
  seasons: number[]
  competitions: Array<{ id: string; label: string }>
  selectedCompetitionId: string | null
  selectedPosition: ComparePosition
}

type RawCompetition = {
  _id: mongoose.Types.ObjectId
  season?: string | number | null
  season_id?: string | number | null
  type?: string
  division?: number | null
  year?: number | null
  name?: string | null
  start_date?: string | Date | null
}

type CompetitionFilterMeta =
  | { kind: "season"; season: number }
  | { kind: "competition"; competitionId: string }

type RawTeamCompetition = {
  _id: mongoose.Types.ObjectId
  competition_id?: mongoose.Types.ObjectId
}

type RawPlayerCompetition = {
  player_id?: mongoose.Types.ObjectId
  team_competition_id?: mongoose.Types.ObjectId
  position?: string
  matches_played?: number
  matchesPlayed?: number
  goals?: number
  assists?: number
  preassists?: number
  avg?: number
  MVP?: number
  TOTW?: number
  cs?: number
}

function extractSeasonValue(rawSeason: string | number | null | undefined) {
  if (rawSeason === null || rawSeason === undefined) return -1
  const numeric = Number(rawSeason)
  if (Number.isFinite(numeric)) return numeric
  const match = String(rawSeason).match(/\d+/)
  return match ? Number.parseInt(match[0] || "-1", 10) : -1
}

function normalizeComparePosition(position?: string | null): ComparePosition | null {
  switch ((position || "").trim().toUpperCase()) {
    case "GK":
      return "GK"
    case "CB":
    case "LB":
    case "RB":
      return "DEF"
    case "DM":
    case "CM":
    case "AM":
      return "MID"
    case "LW":
    case "RW":
      return "WING"
    case "ST":
      return "ST"
    default:
      return null
  }
}

function buildCompetitionLabel(competition: RawCompetition) {
  const season = extractSeasonValue(competition.season ?? competition.season_id)
  const year = Number(competition.year ?? 0)
  const startDateYear =
    competition.start_date && !Number.isNaN(new Date(competition.start_date).getTime())
      ? new Date(competition.start_date).getUTCFullYear()
      : 0

  switch (competition.type) {
    case "league":
      return season > 0
        ? `Season ${season}${competition.division ? ` · Division ${competition.division}` : ""}`
        : pickFallbackCompetitionName(competition, "League")
    case "cup":
      return `Cup ${year || season || ""}`.trim()
    case "supercup":
      return `Supercup ${year || season || ""}`.trim()
    case "summer_cup":
      return `Summer Cup ${startDateYear || year || season || ""}`.trim()
    case "nations_cup":
      return `Nations Cup ${startDateYear || year || season || ""}`.trim()
    default:
      return pickFallbackCompetitionName(competition, "Competition")
  }
}

function buildGroupedCompetitionOptions(rawCompetitions: RawCompetition[]) {
  const seasonGroups = new Map<number, string>()

  for (const competition of rawCompetitions) {
    const type = competition.type ?? ""
    const season = extractSeasonValue(competition.season ?? competition.season_id)

    if (type === "league" || type === "cup" || type === "supercup") {
      if (season > 0 && !seasonGroups.has(season)) {
        seasonGroups.set(season, `Season ${season}`)
      }
    }
  }

  return [...seasonGroups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([season, label]) => ({ id: `season:${season}`, label }))
}

function pickFallbackCompetitionName(competition: RawCompetition, fallback: string) {
  const rawName = String(competition.name ?? "").trim()
  return rawName || fallback
}

function round(value: number, decimals = 2) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function secondsToMinutes(value: number) {
  return value > 0 ? value / 60 : 0
}

function buildEmptyTotals(): ComparePlayerTotals {
  return {
    matchesPlayed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    starter: 0,
    substitute: 0,
    minutesPlayed: 0,
    goals: 0,
    assists: 0,
    preassists: 0,
    shotsOnGoal: 0,
    kicks: 0,
    passes: 0,
    keypass: 0,
    autopass: 0,
    saves: 0,
    clearances: 0,
    recoveries: 0,
    goalsConceded: 0,
    missedPasses: 0,
    ownGoals: 0,
    avg: 0,
    mvp: 0,
    totw: 0,
    cs: 0,
    goalsPerMatch: 0,
    assistsPerMatch: 0,
    preassistsPerMatch: 0,
    goalsPerMinute: 0,
    assistsPerMinute: 0,
    shotsOnGoalPerMatch: 0,
    winRate: 0,
    starterRate: 0,
  }
}

export async function getComparePageData(input?: {
  playerIds?: string[]
  competitionId?: string | null
  position?: ComparePosition
}): Promise<ComparePageData> {
  await dbConnect()

  const [ideal7Data, rawCompetitions, rawTeamCompetitions] = await Promise.all([
    getIdeal7Data(),
    CompetitionModel.collection
      .find(
        { type: { $in: ["league", "cup", "supercup"] } },
        { projection: { _id: 1, season: 1, season_id: 1, type: 1, division: 1, year: 1, name: 1, start_date: 1 } }
      )
      .toArray() as Promise<RawCompetition[]>,
    TeamCompetitionModel.collection.find({}, { projection: { _id: 1, competition_id: 1 } }).toArray() as Promise<RawTeamCompetition[]>,
  ])

  const competitions = buildGroupedCompetitionOptions(rawCompetitions)

  const competitionMetaMap = new Map(
    rawCompetitions.map((competition) => [
      competition._id.toString(),
      {
        season: extractSeasonValue(competition.season ?? competition.season_id),
        type: competition.type ?? "",
      },
    ])
  )
  const competitionSeasonMap = new Map(
    [...competitionMetaMap.entries()].map(([competitionId, meta]) => [competitionId, meta.season])
  )
  const seasons = [...new Set([...competitionSeasonMap.values()].filter((season) => season > 0))].sort((a, b) => b - a)
  const teamCompetitionCompetitionMap = new Map(
    rawTeamCompetitions.map((teamCompetition) => [
      teamCompetition._id.toString(),
      teamCompetition.competition_id?.toString() ?? "",
    ])
  )

  const teamCompetitionSeasonMap = new Map(
    rawTeamCompetitions.map((teamCompetition) => [
      teamCompetition._id.toString(),
      teamCompetition.competition_id ? competitionSeasonMap.get(teamCompetition.competition_id.toString()) ?? -1 : -1,
    ])
  )

  const selectedIds = (input?.playerIds ?? [])
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 4)

  if (!selectedIds.length) {
    return {
      players: ideal7Data.players,
      selectedPlayers: [],
      seasons,
      competitions,
      selectedCompetitionId: input?.competitionId ?? null,
      selectedPosition: input?.position ?? "all",
    }
  }

  const selectedObjectIds = selectedIds.map((id) => new mongoose.Types.ObjectId(id))
  const rawPlayerCompetitions = (await TeamCompetitionModel.db
    .collection("playercompetitions")
    .find(
      { player_id: { $in: selectedObjectIds } },
      {
        projection: {
          player_id: 1,
          team_competition_id: 1,
          position: 1,
          matches_played: 1,
          matchesPlayed: 1,
          matches_won: 1,
          matches_draw: 1,
          matches_lost: 1,
          starter: 1,
          substitute: 1,
          minutes_played: 1,
          goals: 1,
          assists: 1,
          preassists: 1,
          shots_on_goal: 1,
          kicks: 1,
          passes: 1,
          keypass: 1,
          autopass: 1,
          saves: 1,
          clearances: 1,
          recoveries: 1,
          goals_conceded: 1,
          misspass: 1,
          owngoals: 1,
          avg: 1,
          MVP: 1,
          TOTW: 1,
          cs: 1,
        },
      }
    )
    .toArray()) as RawPlayerCompetition[]

  const playerMap = new Map(ideal7Data.players.map((player) => [player.id, player]))
  const competitionFilter = input?.competitionId ?? null
  const positionFilter = input?.position ?? "all"
  let competitionFilterMeta: CompetitionFilterMeta | null = null

  if (competitionFilter?.startsWith("season:")) {
    const season = Number.parseInt(competitionFilter.slice("season:".length), 10)
    if (Number.isFinite(season)) {
      competitionFilterMeta = { kind: "season", season }
    }
  }

  const selectedPlayers = selectedIds
    .map((playerId) => {
      const basePlayer = playerMap.get(playerId)
      if (!basePlayer) return null

      const buckets = new Map<
        number,
        {
          matchesPlayed: number
          wins: number
          draws: number
          losses: number
          starter: number
          substitute: number
          minutesPlayed: number
          goals: number
          assists: number
          preassists: number
          shotsOnGoal: number
          kicks: number
          passes: number
          keypass: number
          autopass: number
          saves: number
          clearances: number
          recoveries: number
          goalsConceded: number
          missedPasses: number
          ownGoals: number
          avgWeighted: number
          avgWeight: number
          mvp: number
          totw: number
          cs: number
        }
      >()

      const totals = buildEmptyTotals()
      let totalAvgWeighted = 0
      let totalAvgWeight = 0

      for (const row of rawPlayerCompetitions) {
        if (!row.player_id || row.player_id.toString() !== playerId) continue
        if (!row.team_competition_id) continue
        const normalizedPosition = normalizeComparePosition(row.position)
        if (positionFilter !== "all" && normalizedPosition !== positionFilter) continue

        const competitionId = teamCompetitionCompetitionMap.get(row.team_competition_id.toString()) ?? ""
        const competitionMeta = competitionMetaMap.get(competitionId) ?? { season: -1, type: "" }
        if (
          competitionFilterMeta?.kind === "season" &&
          !(
            competitionMeta.season === competitionFilterMeta.season &&
            ["league", "cup", "supercup"].includes(competitionMeta.type)
          )
        ) {
          continue
        }

        const season = teamCompetitionSeasonMap.get(row.team_competition_id.toString()) ?? -1
        if (season < 0) continue

        const matchesPlayed = Number(row.matches_played ?? row.matchesPlayed ?? 0)
        const wins = Number((row as RawPlayerCompetition & { matches_won?: number }).matches_won ?? 0)
        const draws = Number((row as RawPlayerCompetition & { matches_draw?: number }).matches_draw ?? 0)
        const losses = Number((row as RawPlayerCompetition & { matches_lost?: number }).matches_lost ?? 0)
        const starter = Number((row as RawPlayerCompetition & { starter?: number }).starter ?? 0)
        const substitute = Number((row as RawPlayerCompetition & { substitute?: number }).substitute ?? 0)
        const minutesPlayed = secondsToMinutes(
          Number((row as RawPlayerCompetition & { minutes_played?: number }).minutes_played ?? 0)
        )
        const goals = Number(row.goals ?? 0)
        const assists = Number(row.assists ?? 0)
        const preassists = Number(row.preassists ?? 0)
        const shotsOnGoal = Number((row as RawPlayerCompetition & { shots_on_goal?: number }).shots_on_goal ?? 0)
        const kicks = Number((row as RawPlayerCompetition & { kicks?: number }).kicks ?? 0)
        const passes = Number((row as RawPlayerCompetition & { passes?: number }).passes ?? 0)
        const keypass = Number((row as RawPlayerCompetition & { keypass?: number }).keypass ?? 0)
        const autopass = Number((row as RawPlayerCompetition & { autopass?: number }).autopass ?? 0)
        const saves = Number((row as RawPlayerCompetition & { saves?: number }).saves ?? 0)
        const clearances = Number((row as RawPlayerCompetition & { clearances?: number }).clearances ?? 0)
        const recoveries = Number((row as RawPlayerCompetition & { recoveries?: number }).recoveries ?? 0)
        const goalsConceded = Number((row as RawPlayerCompetition & { goals_conceded?: number }).goals_conceded ?? 0)
        const missedPasses = Number((row as RawPlayerCompetition & { misspass?: number }).misspass ?? 0)
        const ownGoals = Number((row as RawPlayerCompetition & { owngoals?: number }).owngoals ?? 0)
        const avg = Number(row.avg ?? 0)
        const mvp = Number(row.MVP ?? 0)
        const totw = Number(row.TOTW ?? 0)
        const cs = Number(row.cs ?? 0)

        const seasonBucket = buckets.get(season) ?? {
          matchesPlayed: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          starter: 0,
          substitute: 0,
          minutesPlayed: 0,
          goals: 0,
          assists: 0,
          preassists: 0,
          shotsOnGoal: 0,
          kicks: 0,
          passes: 0,
          keypass: 0,
          autopass: 0,
          saves: 0,
          clearances: 0,
          recoveries: 0,
          goalsConceded: 0,
          missedPasses: 0,
          ownGoals: 0,
          avgWeighted: 0,
          avgWeight: 0,
          mvp: 0,
          totw: 0,
          cs: 0,
        }

        seasonBucket.matchesPlayed += matchesPlayed
        seasonBucket.wins += wins
        seasonBucket.draws += draws
        seasonBucket.losses += losses
        seasonBucket.starter += starter
        seasonBucket.substitute += substitute
        seasonBucket.minutesPlayed += minutesPlayed
        seasonBucket.goals += goals
        seasonBucket.assists += assists
        seasonBucket.preassists += preassists
        seasonBucket.shotsOnGoal += shotsOnGoal
        seasonBucket.kicks += kicks
        seasonBucket.passes += passes
        seasonBucket.keypass += keypass
        seasonBucket.autopass += autopass
        seasonBucket.saves += saves
        seasonBucket.clearances += clearances
        seasonBucket.recoveries += recoveries
        seasonBucket.goalsConceded += goalsConceded
        seasonBucket.missedPasses += missedPasses
        seasonBucket.ownGoals += ownGoals
        seasonBucket.avgWeighted += avg * Math.max(matchesPlayed, 1)
        seasonBucket.avgWeight += Math.max(matchesPlayed, 1)
        seasonBucket.mvp += mvp
        seasonBucket.totw += totw
        seasonBucket.cs += cs
        buckets.set(season, seasonBucket)

        totals.matchesPlayed += matchesPlayed
        totals.wins += wins
        totals.draws += draws
        totals.losses += losses
        totals.starter += starter
        totals.substitute += substitute
        totals.minutesPlayed += minutesPlayed
        totals.goals += goals
        totals.assists += assists
        totals.preassists += preassists
        totals.shotsOnGoal += shotsOnGoal
        totals.kicks += kicks
        totals.passes += passes
        totals.keypass += keypass
        totals.autopass += autopass
        totals.saves += saves
        totals.clearances += clearances
        totals.recoveries += recoveries
        totals.goalsConceded += goalsConceded
        totals.missedPasses += missedPasses
        totals.ownGoals += ownGoals
        totals.mvp += mvp
        totals.totw += totw
        totals.cs += cs
        totalAvgWeighted += avg * Math.max(matchesPlayed, 1)
        totalAvgWeight += Math.max(matchesPlayed, 1)
      }

      totals.avg = totalAvgWeight > 0 ? round(totalAvgWeighted / totalAvgWeight, 2) : 0
      totals.goalsPerMatch = totals.matchesPlayed > 0 ? round(totals.goals / totals.matchesPlayed, 2) : 0
      totals.assistsPerMatch = totals.matchesPlayed > 0 ? round(totals.assists / totals.matchesPlayed, 2) : 0
      totals.preassistsPerMatch = totals.matchesPlayed > 0 ? round(totals.preassists / totals.matchesPlayed, 2) : 0
      totals.goalsPerMinute = totals.minutesPlayed > 0 ? round(totals.goals / totals.minutesPlayed, 4) : 0
      totals.assistsPerMinute = totals.minutesPlayed > 0 ? round(totals.assists / totals.minutesPlayed, 4) : 0
      totals.shotsOnGoalPerMatch = totals.matchesPlayed > 0 ? round(totals.shotsOnGoal / totals.matchesPlayed, 2) : 0
      totals.winRate = totals.matchesPlayed > 0 ? round((totals.wins / totals.matchesPlayed) * 100, 1) : 0
      totals.starterRate = totals.matchesPlayed > 0 ? round((totals.starter / totals.matchesPlayed) * 100, 1) : 0

      const seasonsData = [...buckets.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([season, bucket]) => ({
          season,
          matchesPlayed: bucket.matchesPlayed,
          wins: bucket.wins,
          draws: bucket.draws,
          losses: bucket.losses,
          starter: bucket.starter,
          substitute: bucket.substitute,
          minutesPlayed: bucket.minutesPlayed,
          goals: bucket.goals,
          assists: bucket.assists,
          preassists: bucket.preassists,
          shotsOnGoal: bucket.shotsOnGoal,
          kicks: bucket.kicks,
          passes: bucket.passes,
          keypass: bucket.keypass,
          autopass: bucket.autopass,
          saves: bucket.saves,
          clearances: bucket.clearances,
          recoveries: bucket.recoveries,
          goalsConceded: bucket.goalsConceded,
          missedPasses: bucket.missedPasses,
          ownGoals: bucket.ownGoals,
          avg: bucket.avgWeight > 0 ? round(bucket.avgWeighted / bucket.avgWeight, 2) : 0,
          mvp: bucket.mvp,
          totw: bucket.totw,
          cs: bucket.cs,
        }))

      return {
        ...basePlayer,
        totals,
        seasons: seasonsData,
      } satisfies ComparePlayer
    })
    .filter((player): player is ComparePlayer => player !== null)

    return {
      players: ideal7Data.players,
      selectedPlayers,
      seasons,
      competitions,
      selectedCompetitionId: competitionFilter,
      selectedPosition: positionFilter,
    }
}

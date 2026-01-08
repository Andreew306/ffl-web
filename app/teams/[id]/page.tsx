import dbConnect from "@/lib/db/mongoose"
import TeamModel from "@/lib/models/Team"
import TeamCompetitionModel from "@/lib/models/TeamCompetition"
import TeamMatchStatsModel from "@/lib/models/TeamMatchStats"
import PlayerMatchStatsModel from "@/lib/models/PlayerMatchStats"
import GoalModel from "@/lib/models/Goal"
import PlayerCompetitionModel from "@/lib/models/PlayerCompetition"
import "@/lib/models/Competition"
import "@/lib/models/Match"
import "@/lib/models/Team"
import "@/lib/models/TeamCompetition"
import "@/lib/models/Player"
import "@/lib/models/PlayerCompetition"
import "@/lib/models/Goal"
import { notFound } from "next/navigation"
import TeamStatsTabs from "./TeamStatsTabs"
import {
  getFlagBackgroundStyle,
  getKitTextColor,
  hashString,
  normalizeTeamImageUrl,
  shouldOverlayFlag,
} from "@/lib/utils"

type TeamRef = {
  _id?: { toString(): string }
  teamName?: string
  team_name?: string
  image?: string
}

type CompetitionRef = {
  _id?: { toString(): string }
  type?: string
  season_id?: string | number
  season?: string | number
  division?: number
  start_date?: Date | string
  name?: string
}

type TeamCompetitionRow = {
  _id?: { toString(): string }
  team_competition_id?: string | number
  competition_id?: CompetitionRef
  kits?: { image?: string; color?: string }[]
  matches_played?: number
  matchesPlayed?: number
  matches_won?: number
  matchesWon?: number
  matches_draw?: number
  matchesDraw?: number
  matches_lost?: number
  matchesLost?: number
  goals_scored?: number
  goalsScored?: number
  goals_conceded?: number
  goalsConceded?: number
  saves?: number
  cs?: number
  points?: number
  possession_avg?: number
  possessionAvg?: number
  kicks?: number
  passes?: number
  shots_on_goal?: number
  shotsOnGoal?: number
}

type MatchRef = {
  _id?: { toString(): string }
  date?: Date | string
  competition_id?: CompetitionRef
  team1_competition_id?: { _id?: { toString(): string }; team_id?: TeamRef }
  team2_competition_id?: { _id?: { toString(): string }; team_id?: TeamRef }
  score_team1?: number
  score_team2?: number
}

type TeamMatchStatRow = {
  [key: string]: unknown
  match_id?: MatchRef
  team_competition_id?: { toString(): string } | string
  goals_scored?: number
  goalsScored?: number
  goals_conceded?: number
  goalsConceded?: number
  saves?: number
  cs?: number
  points?: number
  possession?: number
  kicks?: number
  passes?: number
  shots_on_goal?: number
  shotsOnGoal?: number
  won?: number
  draw?: number
  lost?: number
}

type PlayerMatchStatRow = {
  [key: string]: unknown
  match_id?: MatchRef
  team_competition_id?: { toString(): string } | string
  player_competition_id?: {
    _id?: { toString(): string }
    player_id?: { _id?: { toString(): string }; player_name?: string; avatar?: string }
  } | string
  goals?: number
  assists?: number
  preassists?: number
  saves?: number
  cs?: number
}

type GoalRow = {
  match_id?: MatchRef
  team_competition_id?: { _id?: { toString(): string } } | string
  scorer_id?: { _id?: { toString(): string }; player_id?: { _id?: { toString(): string }; playerName?: string; player_name?: string; avatar?: string } }
  assist_id?: { player_id?: { _id?: { toString(): string }; playerName?: string; player_name?: string; avatar?: string } }
  preassist_id?: { player_id?: { _id?: { toString(): string }; playerName?: string; player_name?: string; avatar?: string } }
}

type PlayerCompetitionRow = {
  team_competition_id?: { toString(): string } | string
  player_id?: { _id?: { toString(): string }; player_name?: string; avatar?: string; country?: string }
  position?: string
  matchesPlayed?: number
  matches_played?: number
}

const toObjectIdString = (value: unknown) => {
  if (typeof value === "string") return value
  if (!value || typeof value !== "object") return ""
  const maybeWithId = value as { _id?: { toString?: () => string } }
  if (maybeWithId._id?.toString) return maybeWithId._id.toString()
  const maybeToString = value as { toString?: () => string }
  return maybeToString.toString ? maybeToString.toString() : ""
}

const pickDeterministicItem = <T,>(items: T[], seed: string) => {
  if (!items.length) return null
  const index = hashString(seed) % items.length
  return items[index] || null
}

function getTwemojiUrl(emoji: string) {
  const codePoints = Array.from(emoji).map((c) => c.codePointAt(0)?.toString(16)).join("-")
  return `https://twemoji.maxcdn.com/v/latest/72x72/${codePoints}.png`
}

function formatCompetitionLabel(competition: {
  type?: string
  season_id?: string | number
  season?: string | number
  division?: number
  start_date?: Date | string
}) {
  const seasonRaw = competition.season_id ?? competition.season
  const season = seasonRaw === undefined || seasonRaw === null ? "" : String(seasonRaw)
  const division = competition.division
  const year = competition.start_date ? new Date(competition.start_date).getFullYear() : undefined

  switch (competition.type) {
    case "league":
      if (season && division) return `Season ${season}, div ${division}`
      if (season) return `Season ${season}`
      break
    case "cup":
      if (season) return `Season ${season}, Cup`
      return "Cup"
    case "summer_cup":
      return year ? `Summer Cup ${year}` : "Summer Cup"
    case "supercup":
      if (season) return `Season ${season}, Supercup`
      return "Supercup"
    case "nations_cup":
      return year ? `Nations Cup ${year}` : "Nations Cup"
    default:
      break
  }

  return "Competition"
}

function formatMatchCompetitionLabel(competition: {
  type?: string
  season_id?: string | number
  season?: string | number
  division?: number
  start_date?: Date | string
  name?: string
}) {
  if (!competition) return ""
  const seasonRaw = competition.season_id ?? competition.season
  const season = seasonRaw === undefined || seasonRaw === null ? "" : String(seasonRaw)
  const division = competition.division
  const year = competition.start_date ? new Date(competition.start_date).getFullYear() : undefined

  switch (competition.type) {
    case "league":
      if (season && division) return `Season ${season} - Div ${division}`
      if (season) return `Season ${season}`
      break
    case "cup":
      if (season) return `Season ${season} - Cup`
      return "Cup"
    case "supercup":
      if (season) return `Season ${season} - Supercup`
      return "Supercup"
    case "summer_cup":
      return year ? `Summer Cup ${year}` : "Summer Cup"
    case "nations_cup":
      return year ? `Nations Cup ${year}` : "Nations Cup"
    default:
      break
  }

  return competition.name || "Competition"
}

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numericId = Number(id)
  await dbConnect()

  const team = ((Number.isFinite(numericId)
    ? await TeamModel.findOne({ team_id: numericId }).lean()
    : null) ||
    (await TeamModel.findById(id).lean())) as {
    _id?: unknown
    teamName?: string
    team_name?: string
    image?: string
    country?: string
  } | null

  if (!team) {
    return notFound()
  }
  const teamImage = normalizeTeamImageUrl(team.image)

  const teamCompetitions = await TeamCompetitionModel.find({ team_id: team._id })
    .populate("competition_id")
    .lean<TeamCompetitionRow[]>()

  const teamCompetitionKitOptions = new Map<string, { image: string; textColor: string }[]>()
  const allKitOptions: { image: string; textColor: string }[] = []
  teamCompetitions.forEach((row) => {
    const id = row._id?.toString()
    if (!id) return
    const kitOptions =
      row.kits
        ?.map((kit) => ({
          image: normalizeTeamImageUrl(kit?.image),
          textColor: getKitTextColor(kit?.color),
        }))
        .filter((kit) => Boolean(kit.image)) || []
    if (!kitOptions.length) return
    teamCompetitionKitOptions.set(id, kitOptions)
    allKitOptions.push(...kitOptions)
  })
  const teamCompetitionKits: Record<string, { image: string; textColor: string }> = {}
  teamCompetitions.forEach((row) => {
    const id = row._id?.toString()
    if (!id) return
    const kitOptions = teamCompetitionKitOptions.get(id) || []
    const picked = pickDeterministicItem(kitOptions.length ? kitOptions : allKitOptions, id)
    if (picked) teamCompetitionKits[id] = picked
  })

  const buildStatsFromRow = (row: TeamCompetitionRow) => ({
    matchesPlayed: row.matches_played ?? row.matchesPlayed ?? 0,
    matchesWon: row.matches_won ?? row.matchesWon ?? 0,
    matchesDraw: row.matches_draw ?? row.matchesDraw ?? 0,
    matchesLost: row.matches_lost ?? row.matchesLost ?? 0,
    goalsScored: row.goals_scored ?? row.goalsScored ?? 0,
    goalsConceded: row.goals_conceded ?? row.goalsConceded ?? 0,
    saves: row.saves ?? 0,
    cs: row.cs ?? 0,
    points: row.points ?? 0,
    possessionAvg: row.possession_avg ?? row.possessionAvg ?? 0,
    kicks: row.kicks ?? 0,
    passes: row.passes ?? 0,
    shotsOnGoal: row.shots_on_goal ?? row.shotsOnGoal ?? 0,
  })

  const aggregateStats = (rows: TeamCompetitionRow[]) => {
    const totals = rows.reduce(
      (acc: {
        matchesPlayed: number
        matchesWon: number
        matchesDraw: number
        matchesLost: number
        goalsScored: number
        goalsConceded: number
        saves: number
        cs: number
        points: number
        possessionTotal: number
        kicks: number
        passes: number
        shotsOnGoal: number
      }, row) => {
        const stats = buildStatsFromRow(row)
        acc.matchesPlayed += stats.matchesPlayed
        acc.matchesWon += stats.matchesWon
        acc.matchesDraw += stats.matchesDraw
        acc.matchesLost += stats.matchesLost
        acc.goalsScored += stats.goalsScored
        acc.goalsConceded += stats.goalsConceded
        acc.saves += stats.saves
        acc.cs += stats.cs
        acc.points += stats.points
        acc.possessionTotal += stats.possessionAvg * stats.matchesPlayed
        acc.kicks += stats.kicks
        acc.passes += stats.passes
        acc.shotsOnGoal += stats.shotsOnGoal
        return acc
      },
      {
        matchesPlayed: 0,
        matchesWon: 0,
        matchesDraw: 0,
        matchesLost: 0,
        goalsScored: 0,
        goalsConceded: 0,
        saves: 0,
        cs: 0,
        points: 0,
        possessionTotal: 0,
        kicks: 0,
        passes: 0,
        shotsOnGoal: 0,
      }
    )

    const possessionAvg = totals.matchesPlayed
      ? totals.possessionTotal / totals.matchesPlayed
      : 0
    return {
      matchesPlayed: totals.matchesPlayed,
      matchesWon: totals.matchesWon,
      matchesDraw: totals.matchesDraw,
      matchesLost: totals.matchesLost,
      goalsScored: totals.goalsScored,
      goalsConceded: totals.goalsConceded,
      saves: totals.saves,
      cs: totals.cs,
      points: totals.points,
      possessionAvg,
      kicks: totals.kicks,
      passes: totals.passes,
      shotsOnGoal: totals.shotsOnGoal,
    }
  }

  const totalStats = aggregateStats(teamCompetitions)
  const matchLimits = teamCompetitions.reduce<Record<string, number>>((acc, row) => {
    const id = row._id?.toString()
    if (!id) return acc
    acc[id] = row.matches_played ?? row.matchesPlayed ?? 0
    return acc
  }, {})

  const allowedMainTypes = new Set(["league", "summer_cup", "nations_cup"])
  const competitionTabs = teamCompetitions
    .filter((row) => {
      const type = row.competition_id?.type
      return type ? allowedMainTypes.has(type) : false
    })
    .sort((a, b) => {
      const aDate = a.competition_id?.start_date
      const bDate = b.competition_id?.start_date
      const aTime = aDate ? new Date(aDate).getTime() : 0
      const bTime = bDate ? new Date(bDate).getTime() : 0
      return bTime - aTime
    })
    .map((row) => {
      const competition = row.competition_id
      const tab: {
        id: string
        label: string
        stats: ReturnType<typeof buildStatsFromRow>
        seasonFilters?: {
          all: ReturnType<typeof buildStatsFromRow>
          league: ReturnType<typeof buildStatsFromRow>
          cup: ReturnType<typeof buildStatsFromRow>
          supercup: ReturnType<typeof buildStatsFromRow>
        }
        seasonFilterIds?: {
          all: string[]
          league: string[]
          cup: string[]
          supercup: string[]
        }
        teamCompetitionId?: string
      } = {
        id: row._id?.toString() || `${competition?._id?.toString() || row.team_competition_id}`,
        label: competition ? formatCompetitionLabel(competition) : "Competition",
        stats: buildStatsFromRow(row),
        teamCompetitionId: row._id?.toString() || "",
      }

      if (competition?.type === "league") {
        const seasonIdRaw = competition?.season_id ?? competition?.season
        const seasonId = seasonIdRaw === undefined || seasonIdRaw === null ? "" : String(seasonIdRaw)
        if (!seasonId) return tab
        const seasonRows = teamCompetitions.filter((item) => {
          const itemCompetition = item.competition_id
          const itemSeasonRaw = itemCompetition?.season_id ?? itemCompetition?.season
          const itemSeason =
            itemSeasonRaw === undefined || itemSeasonRaw === null ? "" : String(itemSeasonRaw)
          const competitionType = itemCompetition?.type
          return (
            itemSeason === seasonId &&
            competitionType !== undefined &&
            ["league", "cup", "supercup"].includes(competitionType)
          )
        })

        const leagueRows = seasonRows.filter(
          (item) => item.competition_id?.type === "league"
        )
        const cupRows = seasonRows.filter(
          (item) => item.competition_id?.type === "cup"
        )
        const supercupRows = seasonRows.filter(
          (item) => item.competition_id?.type === "supercup"
        )

        tab.seasonFilters = {
          all: aggregateStats(seasonRows),
          league: aggregateStats(leagueRows),
          cup: aggregateStats(cupRows),
          supercup: aggregateStats(supercupRows),
        }
        const toId = (item: TeamCompetitionRow) => item._id?.toString()
        tab.seasonFilterIds = {
          all: seasonRows.map(toId).filter((id): id is string => Boolean(id)),
          league: leagueRows.map(toId).filter((id): id is string => Boolean(id)),
          cup: cupRows.map(toId).filter((id): id is string => Boolean(id)),
          supercup: supercupRows.map(toId).filter((id): id is string => Boolean(id)),
        }
      }

      return tab
    })

  const teamCompetitionObjectIds = teamCompetitions.map((row) => row._id).filter(Boolean)

  const matchStatsRows = teamCompetitionObjectIds.length
    ? await TeamMatchStatsModel.find({ team_competition_id: { $in: teamCompetitionObjectIds } })
        .populate({
          path: "match_id",
          select: "date competition_id team1_competition_id team2_competition_id score_team1 score_team2",
          populate: [
            { path: "team1_competition_id", populate: { path: "team_id" } },
            { path: "team2_competition_id", populate: { path: "team_id" } },
            {
              path: "competition_id",
              select: "type season_id season division start_date name",
            },
          ],
        })
        .lean<TeamMatchStatRow[]>()
    : []
  const teamMatchIds = Array.from(
    new Set(
      matchStatsRows
        .map((row) => toObjectIdString(row.match_id))
        .filter((id): id is string => Boolean(id))
    )
  )
  const playerMatchStatsRows = teamCompetitionObjectIds.length
    ? await PlayerMatchStatsModel.find({ team_competition_id: { $in: teamCompetitionObjectIds } })
        .populate({
          path: "player_competition_id",
          populate: { path: "player_id" },
        })
        .lean<PlayerMatchStatRow[]>()
    : []

  const readMatchStat = (row: Record<string, unknown>, snakeKey: string, camelKey?: string) => {
    if (row?.[snakeKey] !== undefined) {
      const value = Number(row[snakeKey])
      return Number.isFinite(value) ? value : 0
    }
    if (camelKey && row?.[camelKey] !== undefined) {
      const value = Number(row[camelKey])
      return Number.isFinite(value) ? value : 0
    }
    return 0
  }

  const isNotNull = <T,>(value: T | null | undefined): value is T =>
    value !== null && value !== undefined

  const matchSeries = matchStatsRows
    .map((row) => {
      const match = row.match_id
      const matchDate = match?.date ? new Date(match.date).toISOString() : ""
      const competitionLabel = match?.competition_id
        ? formatMatchCompetitionLabel(match.competition_id)
        : ""
      const team1CompetitionId = match?.team1_competition_id?._id?.toString()
      const team2CompetitionId = match?.team2_competition_id?._id?.toString()
      const teamCompetitionId = row.team_competition_id?.toString() || ""
      const teamA =
        match?.team1_competition_id?.team_id?.teamName ||
        match?.team1_competition_id?.team_id?.team_name ||
        "Team A"
      const teamB =
        match?.team2_competition_id?.team_id?.teamName ||
        match?.team2_competition_id?.team_id?.team_name ||
        "Team B"
      const teamAImage = normalizeTeamImageUrl(match?.team1_competition_id?.team_id?.image)
      const teamBImage = normalizeTeamImageUrl(match?.team2_competition_id?.team_id?.image)
      const scoreA = Number(match?.score_team1 ?? 0)
      const scoreB = Number(match?.score_team2 ?? 0)
      const isTeam1 = team1CompetitionId && team1CompetitionId === teamCompetitionId
      const isTeam2 = team2CompetitionId && team2CompetitionId === teamCompetitionId
      const teamScore = isTeam1 ? scoreA : isTeam2 ? scoreB : 0
      const opponentScore = isTeam1 ? scoreB : isTeam2 ? scoreA : 0
      const outcome: "win" | "loss" | "draw" =
        teamScore > opponentScore ? "win" : teamScore < opponentScore ? "loss" : "draw"
      const matchLabel = `${teamA} - ${teamB}`
      if (!matchDate || !teamCompetitionId) return null
      return {
        matchId: match?._id?.toString() || "",
        teamCompetitionId,
        competitionType: match?.competition_id?.type || "",
        date: matchDate,
        matchLabel,
        competitionLabel,
        teamA,
        teamB,
        teamAImage,
        teamBImage,
        scoreA,
        scoreB,
        outcome,
        stats: {
          goalsScored: readMatchStat(row, "goals_scored", "goalsScored"),
          goalsConceded: readMatchStat(row, "goals_conceded", "goalsConceded"),
          saves: readMatchStat(row, "saves", "saves"),
          cs: readMatchStat(row, "cs", "cs"),
          points: readMatchStat(row, "points", "points"),
          possessionAvg: readMatchStat(row, "possession", "possession"),
          kicks: readMatchStat(row, "kicks", "kicks"),
          passes: readMatchStat(row, "passes", "passes"),
          shotsOnGoal: readMatchStat(row, "shots_on_goal", "shotsOnGoal"),
          matchesPlayed: 1,
          matchesWon: row.won ? 1 : 0,
          matchesDraw: row.draw ? 1 : 0,
          matchesLost: row.lost ? 1 : 0,
        },
      }
    })
    .filter(isNotNull)

  const goalsByOpponent = matchStatsRows
    .map((row) => {
      const match = row.match_id
      const teamCompetitionId = row.team_competition_id?.toString() || ""
      if (!match || !teamCompetitionId) return null
      const team1 = match.team1_competition_id
      const team2 = match.team2_competition_id
      if (!team1 || !team2) return null
      const opponentCompetition =
        team1._id?.toString() === teamCompetitionId
          ? team2
          : team2._id?.toString() === teamCompetitionId
            ? team1
            : null
      if (!opponentCompetition) return null
      const opponent = opponentCompetition.team_id
      return {
        teamCompetitionId,
        opponentId: opponent?._id?.toString() || "",
        opponentName: opponent?.teamName || opponent?.team_name || "Team",
        opponentImage: normalizeTeamImageUrl(opponent?.image),
        matchId: match._id?.toString() || "",
        goalsScored: readMatchStat(row, "goals_scored", "goalsScored"),
      }
    })
    .filter(isNotNull)
  const goalsConcededByOpponent = matchStatsRows
    .map((row) => {
      const match = row.match_id
      const teamCompetitionId = row.team_competition_id?.toString() || ""
      if (!match || !teamCompetitionId) return null
      const team1 = match.team1_competition_id
      const team2 = match.team2_competition_id
      if (!team1 || !team2) return null
      const opponentCompetition =
        team1._id?.toString() === teamCompetitionId
          ? team2
          : team2._id?.toString() === teamCompetitionId
            ? team1
            : null
      if (!opponentCompetition) return null
      const opponent = opponentCompetition.team_id
      return {
        teamCompetitionId,
        opponentId: opponent?._id?.toString() || "",
        opponentName: opponent?.teamName || opponent?.team_name || "Team",
        opponentImage: normalizeTeamImageUrl(opponent?.image),
        matchId: match._id?.toString() || "",
        goalsConceded: readMatchStat(row, "goals_conceded", "goalsConceded"),
      }
    })
    .filter(isNotNull)
  const topScorers = playerMatchStatsRows
    .map((row) => {
      const player =
        typeof row.player_competition_id === "string"
          ? undefined
          : row.player_competition_id?.player_id
      const playerCompetitionId =
        typeof row.player_competition_id === "string"
          ? ""
          : row.player_competition_id?._id?.toString() || ""
      const teamCompetitionId = row.team_competition_id?.toString() || ""
      if (!player || !playerCompetitionId || !teamCompetitionId) return null
      return {
        teamCompetitionId,
        playerId: player._id?.toString() || "",
        playerName: player.player_name || "Player",
        playerAvatar: player.avatar || "",
        goals: row.goals || 0,
      }
    })
    .filter(isNotNull)
  const teamCompetitionIds = teamCompetitionObjectIds
    .filter((id): id is { toString(): string } => Boolean(id))
    .map((id) => id.toString())
  const teamCompetitionIdSet = new Set(teamCompetitionIds)
  const concededScorerGoals = teamMatchIds.length
    ? await GoalModel.find({ match_id: { $in: teamMatchIds } })
        .populate({ path: "scorer_id", populate: { path: "player_id" } })
        .populate({
          path: "match_id",
          select: "team1_competition_id team2_competition_id",
        })
        .populate({
          path: "team_competition_id",
        })
        .lean<GoalRow[]>()
    : []
  const concedingScorers = concededScorerGoals
    .map((row) => {
      const scorer = row.scorer_id?.player_id
      const scorerCompetitionId = row.scorer_id?._id?.toString() || ""
      const match = row.match_id
      const scoringTeamCompetitionId = toObjectIdString(row.team_competition_id)
      if (!scorer || !scorerCompetitionId || !match || !scoringTeamCompetitionId) return null
      const team1 = toObjectIdString(match.team1_competition_id)
      const team2 = toObjectIdString(match.team2_competition_id)
      if (!team1 || !team2) return null
      const opponentTeamCompetitionId =
        scoringTeamCompetitionId === team1 ? team2 : scoringTeamCompetitionId === team2 ? team1 : ""
      if (!opponentTeamCompetitionId || !teamCompetitionIdSet.has(opponentTeamCompetitionId)) return null
      return {
        teamCompetitionId: opponentTeamCompetitionId,
        playerId: scorer._id?.toString() || "",
        playerName: scorer.player_name || "Player",
        playerAvatar: scorer.avatar || "",
        goals: 1,
      }
    })
    .filter(isNotNull)
  const matchesByPlayer = playerMatchStatsRows
    .map((row) => {
      const player =
        typeof row.player_competition_id === "string"
          ? undefined
          : row.player_competition_id?.player_id
      const teamCompetitionId = row.team_competition_id?.toString() || ""
      if (!player || !teamCompetitionId) return null
      return {
        teamCompetitionId,
        playerId: player._id?.toString() || "",
        playerName: player.player_name || "Player",
        playerAvatar: player.avatar || "",
        matchesPlayed: 1,
      }
    })
    .filter(isNotNull)
  const rosterRows = teamCompetitionObjectIds.length
    ? await PlayerCompetitionModel.find({ team_competition_id: { $in: teamCompetitionObjectIds } })
        .populate({ path: "player_id" })
        .lean<PlayerCompetitionRow[]>()
    : []
  const roster = rosterRows
    .map((row) => {
      const player = row.player_id
      const teamCompetitionId = row.team_competition_id?.toString() || ""
      if (!player || !teamCompetitionId) return null
      return {
        teamCompetitionId,
        playerId: player._id?.toString() || "",
        playerName: player.player_name || "Player",
        playerAvatar: player.avatar || "",
        country: player.country || "",
        position: row.position || "",
        matchesPlayed: row.matchesPlayed ?? row.matches_played ?? 0,
      }
    })
    .filter(isNotNull)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-6 pt-0 pb-10 space-y-10">
        <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-900/40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.18),_transparent_55%)]" />
          <div className="relative flex flex-col md:flex-row items-center md:items-end gap-6 p-8 md:p-10">
            <div className="shrink-0 relative">
              {teamImage ? (
                <img
                  src={teamImage}
                  alt={team.teamName || team.team_name || "Team"}
                  className="h-32 w-32 md:h-36 md:w-36 object-contain drop-shadow-[0_10px_25px_rgba(15,23,42,0.35)]"
                />
              ) : (
                <div className="h-32 w-32 md:h-36 md:w-36 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-sm text-gray-400">
                  No logo
                </div>
              )}
              {team.country ? (() => {
                const baseStyle = getFlagBackgroundStyle(team.country)
                const overlayUrl = shouldOverlayFlag(team.country)
                  ? getTwemojiUrl(team.country)
                  : ""
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
                    aria-label={team.country}
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full ring-2 ring-slate-900"
                    style={{
                      ...baseStyle,
                      backgroundImage,
                      backgroundPosition: overlayUrl ? `center, ${basePosition}` : basePosition,
                      backgroundSize: overlayUrl ? `cover, ${baseSize}` : baseSize,
                      backgroundRepeat: overlayUrl ? `no-repeat, ${baseRepeat}` : baseRepeat,
                    }}
                  />
                )
              })() : null}
            </div>
            <div className="flex-1 text-center md:text-left space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Team</p>
              <h1 className="text-3xl md:text-4xl font-semibold">
                {team.teamName || team.team_name || "Team"}
              </h1>
              <div className="inline-flex items-center rounded-full border border-slate-700/70 bg-slate-900/70 px-4 py-2 text-sm text-slate-200">
                <span>{team.country || "N/A"}</span>
              </div>
            </div>
          </div>
        </section>

        <TeamStatsTabs
          tabs={competitionTabs}
          totalStats={totalStats}
          matchSeries={matchSeries}
          matchLimits={matchLimits}
          goalsByOpponent={goalsByOpponent}
          goalsConcededByOpponent={goalsConcededByOpponent}
          topScorers={topScorers}
          concedingScorers={concedingScorers}
          matchesByPlayer={matchesByPlayer}
          roster={roster}
          teamCompetitionKits={teamCompetitionKits}
        />
      </div>
    </div>
  )
}

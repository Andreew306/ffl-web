import dbConnect from "@/lib/db/mongoose"
import PlayerModel from "@/lib/models/Player"
import PlayerCompetitionModel from "@/lib/models/PlayerCompetition"
import PlayerMatchStatsModel from "@/lib/models/PlayerMatchStats"
import GoalModel from "@/lib/models/Goal"
import "@/lib/models/TeamCompetition"
import "@/lib/models/Team"
import "@/lib/models/Competition"
import "@/lib/models/Match"
import { notFound } from "next/navigation"
import PlayerStatsTabs from "./PlayerStatsTabs"

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

type TeamCompetitionRef = {
  _id?: { toString(): string }
  team_id?: TeamRef
  competition_id?: CompetitionRef
}

type PlayerCompetitionRow = {
  _id?: { toString(): string }
  player_competition_id?: string | number
  matches_played?: number
  matches_won?: number
  matches_draw?: number
  matches_lost?: number
  minutes_played?: number
  starter?: number
  substitute?: number
  goals?: number
  assists?: number
  preassists?: number
  shots_on_goal?: number
  shotsOnGoal?: number
  shots_off_goal?: number
  shotsOffGoal?: number
  kicks?: number
  passes?: number
  keypass?: number
  autopass?: number
  misspass?: number
  saves?: number
  clearances?: number
  recoveries?: number
  goals_conceded?: number
  goals_connceded?: number
  cs?: number
  owngoals?: number
  avg?: number
  team_competition_id?: TeamCompetitionRef
}

type MatchRef = {
  _id?: { toString(): string }
  date?: Date | string
  competition_id?: CompetitionRef
  team1_competition_id?: TeamCompetitionRef
  team2_competition_id?: TeamCompetitionRef
  score_team1?: number
  score_team2?: number
}

type PlayerMatchStatRow = {
  [key: string]: unknown
  _id?: { toString(): string }
  match_id?: MatchRef | string
  team_competition_id?: TeamCompetitionRef | string
  player_competition_id?: { toString(): string } | string
  position?: string
  cs?: number
  goals?: number
  assists?: number
  preassists?: number
  starter?: number
  substitute?: number
  shots_on_goal?: number
  shotsOnGoal?: number
  shots_off_goal?: number
  shotsOffGoal?: number
  kicks?: number
  passes?: number
  passes_forward?: number
  passesForward?: number
  passes_lateral?: number
  passesLateral?: number
  passes_backward?: number
  passesBackward?: number
  keypass?: number
  autopass?: number
  misspass?: number
  saves?: number
  clearances?: number
  recoveries?: number
  goals_conceded?: number
  goalsConceded?: number
  owngoals?: number
  minutes_played?: number
  minutesPlayed?: number
  avg?: number
}

type GoalRow = {
  match_id?: MatchRef
  team_competition_id?: TeamCompetitionRef
  scorer_id?: { toString(): string; player_id?: { _id?: { toString(): string }; player_name?: string; avatar?: string } }
  assist_id?: { _id?: { toString(): string }; player_id?: { _id?: { toString(): string }; player_name?: string; avatar?: string } }
  preassist_id?: { _id?: { toString(): string }; player_id?: { _id?: { toString(): string }; player_name?: string; avatar?: string } }
}

type GKPartnerRow = PlayerMatchStatRow & {
  player_competition_id?: {
    _id?: { toString(): string }
    player_id?: { _id?: { toString(): string }; player_name?: string; avatar?: string }
  }
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
      if (season) return `Season ${season}, cup`
      return "cup"
    case "summer_cup":
      return year ? `Summer Cup ${year}` : "Summer Cup"
    case "supercup":
      if (season) return `Season ${season}, supercup`
      return "supercup"
    case "nations_cup":
      return year ? `Nations Cup ${year}` : "Nations Cup"
    default:
      break
  }

  return ""
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

  return competition.name || ""
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numericId = Number(id)
  await dbConnect()

  const player = ((Number.isFinite(numericId)
    ? await PlayerModel.findOne({ player_id: numericId }).lean()
    : null) ||
    (await PlayerModel.findById(id).lean())) as {
    _id?: unknown
    avatar?: string
    player_name?: string
    country?: string
  } | null

  if (!player) {
    return notFound()
  }

  const playerCompetitions = await PlayerCompetitionModel.find({ player_id: player._id })
    .populate({
      path: "team_competition_id",
      populate: [{ path: "team_id" }, { path: "competition_id" }],
    })
    .lean<PlayerCompetitionRow[]>()

  const buildStatsFromRow = (row: PlayerCompetitionRow) => ({
    matchesPlayed: row.matches_played || 0,
    matchesWon: row.matches_won || 0,
    matchesDraw: row.matches_draw || 0,
    matchesLost: row.matches_lost || 0,
    minutesPlayed: row.minutes_played || 0,
    starter: row.starter || 0,
    substitute: row.substitute || 0,
    goals: row.goals || 0,
    assists: row.assists || 0,
    preassists: row.preassists || 0,
    shotsOnGoal: row.shots_on_goal || row.shotsOnGoal || 0,
    shotsOffGoal: row.shots_off_goal || row.shotsOffGoal || 0,
    kicks: row.kicks || 0,
    passes: row.passes || 0,
    keypass: row.keypass || 0,
    autopass: row.autopass || 0,
    misspass: row.misspass || 0,
    saves: row.saves || 0,
    clearances: row.clearances || 0,
    recoveries: row.recoveries || 0,
    goalsConceded: row.goals_conceded || row.goals_connceded || 0,
    cs: row.cs || 0,
    owngoals: row.owngoals || 0,
    avg: row.avg || 0,
  })

  const readMatchStat = (row: PlayerMatchStatRow, snakeKey: string, camelKey?: string) => {
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

  const toObjectIdString = (value: unknown) => {
    if (typeof value === "string") return value
    if (!value || typeof value !== "object") return ""
    const maybeWithId = value as { _id?: { toString?: () => string } }
    if (maybeWithId._id?.toString) return maybeWithId._id.toString()
    const maybeToString = value as { toString?: () => string }
    return maybeToString.toString ? maybeToString.toString() : ""
  }

  const isNotNull = <T,>(value: T | null | undefined): value is T =>
    value !== null && value !== undefined

  const aggregateStats = (rows: PlayerCompetitionRow[]) => {
    const totals = {
      matchesPlayed: 0,
      matchesWon: 0,
      matchesDraw: 0,
      matchesLost: 0,
      minutesPlayed: 0,
      starter: 0,
      substitute: 0,
      goals: 0,
      assists: 0,
      preassists: 0,
      shotsOnGoal: 0,
      shotsOffGoal: 0,
      kicks: 0,
      passes: 0,
      keypass: 0,
      autopass: 0,
      misspass: 0,
      saves: 0,
      clearances: 0,
      recoveries: 0,
      goalsConceded: 0,
      cs: 0,
      owngoals: 0,
      avgWeighted: 0,
    }

    rows.forEach((row) => {
      const rowStats = buildStatsFromRow(row)
      totals.matchesPlayed += rowStats.matchesPlayed
      totals.matchesWon += rowStats.matchesWon
      totals.matchesDraw += rowStats.matchesDraw
      totals.matchesLost += rowStats.matchesLost
      totals.minutesPlayed += rowStats.minutesPlayed
      totals.starter += rowStats.starter
      totals.substitute += rowStats.substitute
      totals.goals += rowStats.goals
      totals.assists += rowStats.assists
      totals.preassists += rowStats.preassists
      totals.shotsOnGoal += rowStats.shotsOnGoal
      totals.shotsOffGoal += rowStats.shotsOffGoal
      totals.kicks += rowStats.kicks
      totals.passes += rowStats.passes
      totals.keypass += rowStats.keypass
      totals.autopass += rowStats.autopass
      totals.misspass += rowStats.misspass
      totals.saves += rowStats.saves
      totals.clearances += rowStats.clearances
      totals.recoveries += rowStats.recoveries
      totals.goalsConceded += rowStats.goalsConceded
      totals.cs += rowStats.cs
      totals.owngoals += rowStats.owngoals
      totals.avgWeighted += rowStats.avg * rowStats.matchesPlayed
    })

    const avg = totals.matchesPlayed ? totals.avgWeighted / totals.matchesPlayed : 0
    return {
      matchesPlayed: totals.matchesPlayed,
      matchesWon: totals.matchesWon,
      matchesDraw: totals.matchesDraw,
      matchesLost: totals.matchesLost,
      minutesPlayed: totals.minutesPlayed,
      starter: totals.starter,
      substitute: totals.substitute,
      goals: totals.goals,
      assists: totals.assists,
      preassists: totals.preassists,
      shotsOnGoal: totals.shotsOnGoal,
      shotsOffGoal: totals.shotsOffGoal,
      kicks: totals.kicks,
      passes: totals.passes,
      keypass: totals.keypass,
      autopass: totals.autopass,
      misspass: totals.misspass,
      saves: totals.saves,
      clearances: totals.clearances,
      recoveries: totals.recoveries,
      goalsConceded: totals.goalsConceded,
      cs: totals.cs,
      owngoals: totals.owngoals,
      avg,
    }
  }

  const totalStats = aggregateStats(playerCompetitions)
  const matchLimits = playerCompetitions.reduce<Record<string, number>>((acc, row) => {
    const id = row._id?.toString()
    if (!id) return acc
    acc[id] = row.matches_played || 0
    return acc
  }, {})

  const allowedMainTypes = new Set(["league", "summer_cup", "nations_cup"])
  const competitionTabs = playerCompetitions
    .filter((row) => {
      const type = row.team_competition_id?.competition_id?.type
      return type ? allowedMainTypes.has(type) : false
    })
    .sort((a, b) => {
      const aDate = a.team_competition_id?.competition_id?.start_date
      const bDate = b.team_competition_id?.competition_id?.start_date
      const aTime = aDate ? new Date(aDate).getTime() : 0
      const bTime = bDate ? new Date(bDate).getTime() : 0
      return bTime - aTime
    })
    .map((row) => {
      const team = row.team_competition_id?.team_id
      const competition = row.team_competition_id?.competition_id
      const labelBase = team?.teamName || team?.team_name || "Team"
      const competitionLabel = competition ? formatCompetitionLabel(competition) : ""
      const label = competitionLabel ? `${labelBase} - ${competitionLabel}` : labelBase
      const logo = team?.image || ""
      const stats = buildStatsFromRow(row)
      const tab: {
        id: string
        label: string
        logo?: string
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
        playerCompetitionId?: string
      } = {
        id: String(row._id || row.player_competition_id || label),
        label,
        logo,
        stats,
        playerCompetitionId: row._id?.toString() || "",
      }

      if (competition?.type === "league") {
        const seasonIdRaw = competition?.season_id ?? competition?.season
        const seasonId = seasonIdRaw === undefined || seasonIdRaw === null ? "" : String(seasonIdRaw)
        const teamId = team?._id?.toString()
        if (!seasonId || !teamId) return tab
        const seasonRows = playerCompetitions.filter((item) => {
          const itemTeam = item.team_competition_id?.team_id?._id?.toString()
          const itemCompetition = item.team_competition_id?.competition_id
          const itemSeasonRaw = itemCompetition?.season_id ?? itemCompetition?.season
          const itemSeason =
            itemSeasonRaw === undefined || itemSeasonRaw === null ? "" : String(itemSeasonRaw)
          const competitionType = itemCompetition?.type
          return (
            itemTeam &&
            itemTeam === teamId &&
            itemSeason === seasonId &&
            competitionType !== undefined &&
            ["league", "cup", "supercup"].includes(competitionType)
          )
        })

        const leagueRows = seasonRows.filter(
          (item) => item.team_competition_id?.competition_id?.type === "league"
        )
        const cupRows = seasonRows.filter(
          (item) => item.team_competition_id?.competition_id?.type === "cup"
        )
        const supercupRows = seasonRows.filter(
          (item) => item.team_competition_id?.competition_id?.type === "supercup"
        )

        tab.seasonFilters = {
          all: aggregateStats(seasonRows),
          league: aggregateStats(leagueRows),
          cup: aggregateStats(cupRows),
          supercup: aggregateStats(supercupRows),
        }
        const toId = (item: PlayerCompetitionRow) => item._id?.toString()
        tab.seasonFilterIds = {
          all: seasonRows.map(toId).filter((id): id is string => Boolean(id)),
          league: leagueRows.map(toId).filter((id): id is string => Boolean(id)),
          cup: cupRows.map(toId).filter((id): id is string => Boolean(id)),
          supercup: supercupRows.map(toId).filter((id): id is string => Boolean(id)),
        }
      }

      return tab
    })

  const playerCompetitionObjectIds = playerCompetitions.map((row) => row._id).filter(Boolean)
  const playerCompetitionTeamMap = playerCompetitions.reduce<
    Record<string, { teamCompetitionId: string }>
  >((acc, row) => {
    const playerCompetitionId = row._id?.toString()
    const teamCompetitionId = row.team_competition_id?._id?.toString()
    if (playerCompetitionId && teamCompetitionId) {
      acc[playerCompetitionId] = { teamCompetitionId }
    }
    return acc
  }, {})
  const matchStatsRows = playerCompetitionObjectIds.length
    ? await PlayerMatchStatsModel.find({ player_competition_id: { $in: playerCompetitionObjectIds } })
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
        .populate({
          path: "team_competition_id",
          populate: { path: "team_id" },
        })
        .lean<PlayerMatchStatRow[]>()
    : []
  const playerMatchKeyMap = matchStatsRows.reduce<Record<string, string>>((acc, row) => {
    const matchId = toObjectIdString(row.match_id)
    const teamCompetitionId = toObjectIdString(row.team_competition_id)
    const playerCompetitionId = row.player_competition_id?.toString()
    if (!matchId || !teamCompetitionId || !playerCompetitionId) return acc
    acc[`${matchId}-${teamCompetitionId}`] = playerCompetitionId
    return acc
  }, {})
  const playerCsByMatchTeam = matchStatsRows.reduce<Record<string, boolean>>((acc, row) => {
    const matchId = toObjectIdString(row.match_id)
    const teamCompetitionId = toObjectIdString(row.team_competition_id)
    if (!matchId || !teamCompetitionId) return acc
    const cs = row.cs || 0
    if (cs > 0) acc[`${matchId}-${teamCompetitionId}`] = true
    return acc
  }, {})
  const playerMatchIds = Array.from(
    new Set(
      matchStatsRows
        .map((row) => toObjectIdString(row.match_id))
        .filter((id): id is string => Boolean(id))
    )
  )
  const playerTeamCompetitionIds = Array.from(
    new Set(
      matchStatsRows
        .map((row) => toObjectIdString(row.team_competition_id))
        .filter((id): id is string => Boolean(id))
    )
  )

  const goalRows = playerCompetitionObjectIds.length
    ? await GoalModel.find({ scorer_id: { $in: playerCompetitionObjectIds } })
        .populate({
          path: "match_id",
          select: "team1_competition_id team2_competition_id",
          populate: [
            { path: "team1_competition_id", populate: { path: "team_id" } },
            { path: "team2_competition_id", populate: { path: "team_id" } },
          ],
        })
        .populate({
          path: "team_competition_id",
          populate: { path: "team_id" },
        })
        .lean<GoalRow[]>()
    : []

  const assistRows = playerCompetitionObjectIds.length
    ? await GoalModel.find({ assist_id: { $in: playerCompetitionObjectIds } })
        .populate({
          path: "assist_id",
          populate: { path: "player_id" },
        })
        .populate({
          path: "scorer_id",
          populate: { path: "player_id" },
        })
        .lean<GoalRow[]>()
    : []

  const preassistRows = playerCompetitionObjectIds.length
    ? await GoalModel.find({ preassist_id: { $in: playerCompetitionObjectIds } })
        .populate({
          path: "assist_id",
          populate: { path: "player_id" },
        })
        .populate({
          path: "preassist_id",
          populate: { path: "player_id" },
        })
        .lean<GoalRow[]>()
    : []

  const matchSeries = matchStatsRows
    .map((row) => {
      const match =
        typeof row.match_id === "string"
          ? null
          : row.match_id || null
      const matchDate = match?.date ? new Date(match.date).toISOString() : ""
      const competitionLabel = match?.competition_id
        ? formatMatchCompetitionLabel(match.competition_id)
        : ""
      const team1CompetitionId = toObjectIdString(match?.team1_competition_id)
      const team2CompetitionId = toObjectIdString(match?.team2_competition_id)
      const playerTeamCompetitionId = toObjectIdString(row.team_competition_id)
      const teamA =
        match?.team1_competition_id?.team_id?.teamName ||
        match?.team1_competition_id?.team_id?.team_name ||
        "Team A"
      const teamB =
        match?.team2_competition_id?.team_id?.teamName ||
        match?.team2_competition_id?.team_id?.team_name ||
        "Team B"
      const teamAImage = match?.team1_competition_id?.team_id?.image || ""
      const teamBImage = match?.team2_competition_id?.team_id?.image || ""
      const scoreA = Number(match?.score_team1 ?? 0)
      const scoreB = Number(match?.score_team2 ?? 0)
      const isTeam1 = team1CompetitionId && team1CompetitionId === playerTeamCompetitionId
      const isTeam2 = team2CompetitionId && team2CompetitionId === playerTeamCompetitionId
      const teamScore = isTeam1 ? scoreA : isTeam2 ? scoreB : 0
      const opponentScore = isTeam1 ? scoreB : isTeam2 ? scoreA : 0
      const outcome: "win" | "loss" | "draw" =
        teamScore > opponentScore ? "win" : teamScore < opponentScore ? "loss" : "draw"
      const matchLabel = `${teamA} - ${teamB}`
      const playerCompetitionId = row.player_competition_id?.toString() || ""
      if (!matchDate || !playerCompetitionId) return null
      return {
        matchId: toObjectIdString(match?._id),
        playerCompetitionId,
        competitionId: match?.competition_id?.toString() || "",
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
        position: row.position || "",
        stats: {
          goals: readMatchStat(row, "goals", "goals"),
          assists: readMatchStat(row, "assists", "assists"),
          preassists: readMatchStat(row, "preassists", "preassists"),
          starter: readMatchStat(row, "starter", "starter"),
          substitute: readMatchStat(row, "substitute", "substitute"),
          shotsOnGoal: readMatchStat(row, "shots_on_goal", "shotsOnGoal"),
          shotsOffGoal: readMatchStat(row, "shots_off_goal", "shotsOffGoal"),
          kicks: readMatchStat(row, "kicks", "kicks"),
          passes: readMatchStat(row, "passes", "passes"),
          passesForward: readMatchStat(row, "passes_forward", "passesForward"),
          passesLateral: readMatchStat(row, "passes_lateral", "passesLateral"),
          passesBackward: readMatchStat(row, "passes_backward", "passesBackward"),
          keypass: readMatchStat(row, "keypass", "keypass"),
          autopass: readMatchStat(row, "autopass", "autopass"),
          misspass: readMatchStat(row, "misspass", "misspass"),
          saves: readMatchStat(row, "saves", "saves"),
          clearances: readMatchStat(row, "clearances", "clearances"),
          recoveries: readMatchStat(row, "recoveries", "recoveries"),
          goalsConceded: readMatchStat(row, "goals_conceded", "goalsConceded") ||
            readMatchStat(row, "goals_connceded", "goalsConceded"),
          cs: readMatchStat(row, "cs", "cs"),
          owngoals: readMatchStat(row, "owngoals", "owngoals"),
          minutesPlayed: readMatchStat(row, "minutes_played", "minutesPlayed"),
          avg: readMatchStat(row, "avg", "avg"),
        },
      }
    })
    .filter(isNotNull)

  const goalsByOpponent = goalRows
    .map((row) => {
      const match = row.match_id
      const scorerTeam = row.team_competition_id
      if (!match || !scorerTeam) return null
      const team1 = match.team1_competition_id
      const team2 = match.team2_competition_id
      const scorerId = scorerTeam._id?.toString()
      const opponentTeam =
        scorerId && team1?._id?.toString() === scorerId ? team2 : team1
      if (!opponentTeam) return null
      const opponent = opponentTeam.team_id
      return {
        playerCompetitionId: row.scorer_id?.toString() || "",
        opponentId: opponent?._id?.toString() || "",
        opponentName: opponent?.teamName || opponent?.team_name || "Team",
        opponentImage: opponent?.image || "",
        matchId: match?._id?.toString() || "",
      }
    })
    .filter(isNotNull)

  const assistsByPlayer = assistRows
    .map((row) => {
      const assisted = row.scorer_id?.player_id
      const assistantId = row.assist_id?._id?.toString() || ""
      if (!assisted || !assistantId) return null
      return {
        playerCompetitionId: assistantId,
        assistedId: assisted._id?.toString() || "",
        assistedName: assisted.player_name || "Player",
        assistedAvatar: assisted.avatar || "",
      }
    })
    .filter(isNotNull)

  const preassistsByPlayer = preassistRows
    .map((row) => {
      const assisted = row.assist_id?.player_id
      const preassistId = row.preassist_id?._id?.toString() || ""
      if (!assisted || !preassistId) return null
      return {
        playerCompetitionId: preassistId,
        assistedId: assisted._id?.toString() || "",
        assistedName: assisted.player_name || "Player",
        assistedAvatar: assisted.avatar || "",
      }
    })
    .filter(isNotNull)

  const goalsByTeam = matchStatsRows
    .map((row) => {
      const team =
        typeof row.team_competition_id === "string"
          ? undefined
          : row.team_competition_id?.team_id
      const playerCompetitionId = row.player_competition_id?.toString() || ""
      const matchId = toObjectIdString(row.match_id)
      if (!team || !playerCompetitionId) return null
      return {
        playerCompetitionId,
        teamId: team?._id?.toString() || "",
        teamName: team?.teamName || team?.team_name || "Team",
        teamImage: team?.image || "",
        matchId,
        goals: readMatchStat(row, "goals", "goals"),
      }
    })
    .filter(isNotNull)

  const assistsByTeam = matchStatsRows
    .map((row) => {
      const team =
        typeof row.team_competition_id === "string"
          ? undefined
          : row.team_competition_id?.team_id
      const playerCompetitionId = row.player_competition_id?.toString() || ""
      const matchId = toObjectIdString(row.match_id)
      if (!team || !playerCompetitionId) return null
      return {
        playerCompetitionId,
        teamId: team?._id?.toString() || "",
        teamName: team?.teamName || team?.team_name || "Team",
        teamImage: team?.image || "",
        matchId,
        assists: readMatchStat(row, "assists", "assists"),
      }
    })
    .filter(isNotNull)

  const preassistsByTeam = matchStatsRows
    .map((row) => {
      const team =
        typeof row.team_competition_id === "string"
          ? undefined
          : row.team_competition_id?.team_id
      const playerCompetitionId = row.player_competition_id?.toString() || ""
      const matchId = toObjectIdString(row.match_id)
      if (!team || !playerCompetitionId) return null
      return {
        playerCompetitionId,
        teamId: team?._id?.toString() || "",
        teamName: team?.teamName || team?.team_name || "Team",
        teamImage: team?.image || "",
        matchId,
        preassists: readMatchStat(row, "preassists", "preassists"),
      }
    })
    .filter(isNotNull)

  const gkPartnerRows =
    playerMatchIds.length && playerTeamCompetitionIds.length
      ? await PlayerMatchStatsModel.find({
          match_id: { $in: playerMatchIds },
          team_competition_id: { $in: playerTeamCompetitionIds },
          position: "GK",
          player_competition_id: { $nin: playerCompetitionObjectIds },
        })
          .populate({
            path: "player_competition_id",
            populate: { path: "player_id" },
          })
          .lean<GKPartnerRow[]>()
      : []
  const gkPartners = gkPartnerRows
    .map((row: GKPartnerRow) => {
      const matchId = toObjectIdString(row.match_id)
      const teamCompetitionId = toObjectIdString(row.team_competition_id)
      if (!matchId || !teamCompetitionId) return null
      if (!playerCsByMatchTeam[`${matchId}-${teamCompetitionId}`]) return null
      if (!row.cs || row.cs <= 0) return null
      const playerCompetitionId = playerMatchKeyMap[`${matchId}-${teamCompetitionId}`]
      if (!playerCompetitionId) return null
      const keeperPlayer = row.player_competition_id?.player_id
      const keeperId = row.player_competition_id?._id?.toString() || ""
      return {
        playerCompetitionId,
        keeperPlayerId: keeperPlayer?._id?.toString() || "",
        keeperId,
        keeperName: keeperPlayer?.player_name || "Player",
        keeperAvatar: keeperPlayer?.avatar || "",
        matchId,
        cs: row.cs || 0,
      }
    })
    .filter(isNotNull)

  const kicksByOpponent = matchStatsRows
    .map((row) => {
      const match = row.match_id
      const playerCompetitionId = row.player_competition_id?.toString() || ""
      if (!match || !playerCompetitionId) return null
      const teamCompetitionId = playerCompetitionTeamMap[playerCompetitionId]?.teamCompetitionId
      if (!teamCompetitionId) return null
      const team1 = typeof match === "string" ? undefined : match.team1_competition_id
      const team2 = typeof match === "string" ? undefined : match.team2_competition_id
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
        playerCompetitionId,
        opponentId: opponent?._id?.toString() || "",
        opponentName: opponent?.teamName || opponent?.team_name || "Team",
        opponentImage: opponent?.image || "",
        matchId: toObjectIdString(typeof match === "string" ? match : match._id),
        kicks: readMatchStat(row, "kicks", "kicks"),
      }
    })
    .filter(isNotNull)
  const goalsConcededByOpponent = matchStatsRows
    .map((row) => {
      const match = row.match_id
      const playerCompetitionId = row.player_competition_id?.toString() || ""
      if (!match || !playerCompetitionId) return null
      const teamCompetitionId = toObjectIdString(row.team_competition_id)
      if (!teamCompetitionId) return null
      const team1 = typeof match === "string" ? undefined : match.team1_competition_id
      const team2 = typeof match === "string" ? undefined : match.team2_competition_id
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
        playerCompetitionId,
        opponentId: opponent?._id?.toString() || "",
        opponentName: opponent?.teamName || opponent?.team_name || "Team",
        opponentImage: opponent?.image || "",
        matchId: toObjectIdString(typeof match === "string" ? match : match._id),
        goalsConceded: readMatchStat(row, "goals_conceded", "goalsConceded") ||
          readMatchStat(row, "goals_connceded", "goalsConceded"),
      }
    })
    .filter(isNotNull)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-6 pt-0 pb-10 space-y-10">
        <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-900/40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.18),_transparent_55%)]" />
          <div className="relative flex flex-col md:flex-row items-center md:items-end gap-6 p-8 md:p-10">
            <div className="shrink-0">
              {player.avatar ? (
                <img
                  src={player.avatar}
                  alt={player.player_name}
                  className="h-32 w-32 md:h-36 md:w-36 object-cover rounded-full border-2 border-slate-700 shadow-lg shadow-teal-900/30"
                />
              ) : (
                <div className="h-32 w-32 md:h-36 md:w-36 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-sm text-gray-400">
                  No avatar
                </div>
              )}
            </div>
            <div className="flex-1 text-center md:text-left space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Player</p>
              <h1 className="text-3xl md:text-4xl font-semibold">{player.player_name}</h1>
              <div className="inline-flex items-center gap-3 rounded-full border border-slate-700/70 bg-slate-900/70 px-4 py-2 text-sm text-slate-200">
                {player.country ? (
                  <img
                    src={getTwemojiUrl(player.country)}
                    alt={player.country}
                    width={22}
                    height={22}
                    className="rounded-sm ring-1 ring-slate-700"
                  />
                ) : null}
                <span className="uppercase tracking-[0.2em] text-xs text-slate-400">Country</span>
                <span>{player.country || "N/A"}</span>
              </div>
            </div>
          </div>
        </section>

        <PlayerStatsTabs
          tabs={competitionTabs}
          totalStats={totalStats}
          matchSeries={matchSeries}
          matchLimits={matchLimits}
          goalsByOpponent={goalsByOpponent}
          assistsByPlayer={assistsByPlayer}
          preassistsByPlayer={preassistsByPlayer}
          goalsByTeam={goalsByTeam}
          assistsByTeam={assistsByTeam}
          preassistsByTeam={preassistsByTeam}
          kicksByOpponent={kicksByOpponent}
          goalsConcededByOpponent={goalsConcededByOpponent}
          gkPartners={gkPartners}
        />
      </div>
    </div>
  )
}

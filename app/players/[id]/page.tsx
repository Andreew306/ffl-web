import dbConnect from "@/lib/db/mongoose"
import PlayerModel from "@/lib/models/Player"
import PlayerCompetitionModel from "@/lib/models/PlayerCompetition"
import PlayerMatchStatsModel from "@/lib/models/PlayerMatchStats"
import TeamCompetitionModel from "@/lib/models/TeamCompetition"
import TeamModel from "@/lib/models/Team"
import CompetitionModel from "@/lib/models/Competition"
import MatchModel from "@/lib/models/Match"
import GoalModel from "@/lib/models/Goal"
import { notFound } from "next/navigation"
import PlayerStatsTabs from "./PlayerStatsTabs"
import {
  getFlagBackgroundStyle,
  getKitTextColor,
  hashString,
  isImageUrl,
  normalizeTeamImageUrl,
  shouldOverlayFlag,
} from "@/lib/utils"

type TeamCompetitionDoc = {
  _id?: { toString(): string }
  team_id?: unknown
  competition_id?: unknown
}

type KitDoc = { image?: string; color?: string }
type TeamCompetitionKitDoc = {
  _id?: { toString(): string }
  kits?: KitDoc[]
}

type TeamDoc = {
  _id?: { toString(): string } | string
  teamName?: string
  team_name?: string
  image?: string
}

type TeamRef = {
  _id?: { toString(): string } | string
  teamName?: string
  team_name?: string
  image?: string
}

type CompetitionRef = {
  _id?: { toString(): string } | string
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
  team_competition_id?: TeamCompetitionRef | string
}

type MatchRef = {
  _id?: { toString(): string }
  date?: Date | string
  competition_id?: CompetitionRef | string
  team1_competition_id?: TeamCompetitionRef | string
  team2_competition_id?: TeamCompetitionRef | string
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
  match_id?: unknown
  team_competition_id?: unknown
  scorer_id?: { toString?: () => string } | string
  assist_id?: { toString?: () => string } | string
  preassist_id?: { toString?: () => string } | string
}

type GKRow = {
  match_id?: unknown
  team_competition_id?: unknown
  player_competition_id?: { toString?: () => string } | string
  cs?: number
}

const CACHE_TTL_MS = 5 * 60 * 1000
let cachedTeamCompetitions: { data: TeamCompetitionDoc[]; loadedAt: number } | null = null

async function getCachedTeamCompetitions() {
  const now = Date.now()
  if (cachedTeamCompetitions && now - cachedTeamCompetitions.loadedAt < CACHE_TTL_MS) {
    return cachedTeamCompetitions.data
  }
  const data = await TeamCompetitionModel.find({})
    .select("team_id competition_id")
    .lean<TeamCompetitionDoc[]>()
  cachedTeamCompetitions = { data, loadedAt: now }
  return data
}

function getTwemojiUrl(emoji: string) {
  const codePoints = Array.from(emoji).map((c) => c.codePointAt(0)?.toString(16)).join("-")
  return `https://twemoji.maxcdn.com/v/latest/72x72/${codePoints}.png`
}

function pickDeterministicItem<T>(items: T[], seed: string) {
  if (!items.length) return null
  const index = hashString(seed) % items.length
  return items[index] || null
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
  const timingLabel = `player-profile:${id}`
  const logTiming = (label: string, start: number) => {
    const elapsed = Date.now() - start
    console.log(`[next] ${label} ${elapsed}ms`)
  }
  const totalStart = Date.now()
  await dbConnect()

  const playerStart = Date.now()
  const player = ((Number.isFinite(numericId)
    ? await PlayerModel.findOne({ player_id: numericId })
        .select("avatar player_name country")
        .lean()
    : null) ||
    (await PlayerModel.findById(id)
      .select("avatar player_name country")
      .lean())) as {
    _id?: unknown
    avatar?: string
    player_name?: string
    country?: string
  } | null
  logTiming(`${timingLabel}:player`, playerStart)

  if (!player) {
    logTiming(`${timingLabel}:total`, totalStart)
    return notFound()
  }

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

  const playerCompetitionsStart = Date.now()
  const playerCompetitions = await PlayerCompetitionModel.find({ player_id: player._id })
    .select(
      "matches_played matches_won matches_draw matches_lost minutes_played starter substitute goals assists preassists shots_on_goal shotsOnGoal shots_off_goal shotsOffGoal kicks passes keypass autopass misspass saves clearances recoveries goals_conceded goals_connceded cs owngoals avg team_competition_id"
    )
    .lean<PlayerCompetitionRow[]>()
  logTiming(`${timingLabel}:playerCompetitions`, playerCompetitionsStart)

  const playerTeamCompetitionIdsForKits = Array.from(
    new Set(
      playerCompetitions
        .map((row) => toObjectIdString(row.team_competition_id))
        .filter(Boolean)
    )
  )
  const teamCompetitionKits = playerTeamCompetitionIdsForKits.length
    ? await TeamCompetitionModel.find({ _id: { $in: playerTeamCompetitionIdsForKits } })
        .select("kits")
        .lean<TeamCompetitionKitDoc[]>()
    : []
  const kitOptions = teamCompetitionKits.flatMap(
    (row) =>
      row.kits
        ?.map((kit) => ({
          image: normalizeTeamImageUrl(kit?.image),
          textColor: getKitTextColor(kit?.color),
        }))
        .filter((kit) => Boolean(kit.image)) || []
  )
  const globalKitOptions = playerTeamCompetitionIdsForKits.length
    ? await TeamCompetitionModel.find({})
        .select("kits")
        .lean<TeamCompetitionKitDoc[]>()
        .then((rows) =>
          rows.flatMap(
            (row) =>
              row.kits
                ?.map((kit) => ({
                  image: normalizeTeamImageUrl(kit?.image),
                  textColor: getKitTextColor(kit?.color),
                }))
                .filter((kit) => Boolean(kit.image)) || []
          )
        )
    : []
  const kitChoice = pickDeterministicItem(
    kitOptions.length ? kitOptions : globalKitOptions,
    String(player._id || player.player_name || "")
  )
  const kitImage = kitChoice?.image || ""
  const kitTextColor = kitChoice?.textColor || ""
  const playerAvatar = player.avatar || ""
  const playerAvatarIsImage = isImageUrl(playerAvatar)

  const teamCompetitionsStart = Date.now()
  const teamCompetitions = await getCachedTeamCompetitions()
  logTiming(`${timingLabel}:teamCompetitions`, teamCompetitionsStart)
  const teamCompetitionToTeamId = new Map<string, string>()
  const teamCompetitionToCompetitionId = new Map<string, string>()
  teamCompetitions.forEach((row) => {
    const id = toObjectIdString(row._id)
    const teamId = toObjectIdString(row.team_id)
    const competitionId = toObjectIdString(row.competition_id)
    if (!id) return
    if (teamId) teamCompetitionToTeamId.set(id, teamId)
    if (competitionId) teamCompetitionToCompetitionId.set(id, competitionId)
  })

  const competitionIds = Array.from(new Set(Array.from(teamCompetitionToCompetitionId.values())))
  const playerTeamIds = new Set<string>()
  playerCompetitions.forEach((row) => {
    const teamCompetitionId = toObjectIdString(row.team_competition_id)
    if (!teamCompetitionId) return
    const teamId = teamCompetitionToTeamId.get(teamCompetitionId)
    if (teamId) playerTeamIds.add(teamId)
  })
  const teamsStart = Date.now()
  const teams = playerTeamIds.size
    ? await TeamModel.find({ _id: { $in: Array.from(playerTeamIds) } })
        .select("teamName team_name image")
        .lean<TeamDoc[]>()
    : []
  logTiming(`${timingLabel}:teams`, teamsStart)

  const competitionsStart = Date.now()
  const competitions = competitionIds.length
    ? await CompetitionModel.find({ _id: { $in: competitionIds } })
        .select("type season_id season division start_date name")
        .lean<CompetitionRef[]>()
    : []
  logTiming(`${timingLabel}:competitions`, competitionsStart)
  const teamById = new Map<string, TeamRef>()
  teams.forEach((row) => {
    const id = toObjectIdString(row._id)
    if (!id) return
    teamById.set(id, {
      _id: row._id,
      teamName: (row as { teamName?: string }).teamName,
      team_name: (row as { team_name?: string }).team_name,
      image: normalizeTeamImageUrl((row as { image?: string }).image),
    })
  })
  const competitionById = new Map<string, CompetitionRef>()
  competitions.forEach((row) => {
    const id = toObjectIdString(row._id)
    if (!id) return
    competitionById.set(id, {
      _id: row._id,
      type: (row as { type?: string }).type,
      season_id: (row as { season_id?: string | number }).season_id,
      season: (row as { season?: string | number }).season,
      division: (row as { division?: number }).division,
      start_date: (row as { start_date?: Date | string }).start_date,
      name: (row as { name?: string }).name,
    })
  })

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

  const tabsStart = Date.now()
  const getTeamCompetitionId = (row: PlayerCompetitionRow) =>
    toObjectIdString(row.team_competition_id)
  const getTeamForRow = (row: PlayerCompetitionRow) => {
    const teamCompetitionId = getTeamCompetitionId(row)
    if (!teamCompetitionId) return undefined
    const teamId = teamCompetitionToTeamId.get(teamCompetitionId)
    return teamId ? teamById.get(teamId) : undefined
  }
  const getCompetitionForRow = (row: PlayerCompetitionRow) => {
    const teamCompetitionId = getTeamCompetitionId(row)
    if (!teamCompetitionId) return undefined
    const competitionId = teamCompetitionToCompetitionId.get(teamCompetitionId)
    return competitionId ? competitionById.get(competitionId) : undefined
  }

  const allowedMainTypes = new Set(["league", "summer_cup", "nations_cup"])
  const competitionTabs = playerCompetitions
    .filter((row) => {
      const type = getCompetitionForRow(row)?.type
      return type ? allowedMainTypes.has(type) : false
    })
    .sort((a, b) => {
      const aDate = getCompetitionForRow(a)?.start_date
      const bDate = getCompetitionForRow(b)?.start_date
      const aTime = aDate ? new Date(aDate).getTime() : 0
      const bTime = bDate ? new Date(bDate).getTime() : 0
      return bTime - aTime
    })
    .map((row) => {
      const team = getTeamForRow(row)
      const competition = getCompetitionForRow(row)
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
          const itemTeam = getTeamForRow(item)?._id?.toString()
          const itemCompetition = getCompetitionForRow(item)
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
          (item) => getCompetitionForRow(item)?.type === "league"
        )
        const cupRows = seasonRows.filter(
          (item) => getCompetitionForRow(item)?.type === "cup"
        )
        const supercupRows = seasonRows.filter(
          (item) => getCompetitionForRow(item)?.type === "supercup"
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
  logTiming(`${timingLabel}:tabs`, tabsStart)

  const playerCompetitionObjectIds = playerCompetitions.map((row) => row._id).filter(Boolean)
  const matchStatsStart = Date.now()
  const matchStatsRows = playerCompetitionObjectIds.length
    ? await PlayerMatchStatsModel.find({ player_competition_id: { $in: playerCompetitionObjectIds } })
        .select(
          "match_id team_competition_id player_competition_id position cs goals assists preassists starter substitute shots_on_goal shotsOnGoal shots_off_goal shotsOffGoal kicks passes passes_forward passesForward passes_lateral passesLateral passes_backward passesBackward keypass autopass misspass saves clearances recoveries goals_conceded goals_connceded goalsConceded minutes_played minutesPlayed owngoals avg"
        )
        .lean<PlayerMatchStatRow[]>()
    : []
  logTiming(`${timingLabel}:matchStats`, matchStatsStart)
  const playerMatchIds = Array.from(
    new Set(
      matchStatsRows
        .map((row) => toObjectIdString(row.match_id))
        .filter((id): id is string => Boolean(id))
    )
  )
  const matchDocsStart = Date.now()
  const matchDocs = playerMatchIds.length
    ? await MatchModel.find({ _id: { $in: playerMatchIds } })
        .select("date competition_id team1_competition_id team2_competition_id score_team1 score_team2")
        .lean<MatchRef[]>()
    : []
  logTiming(`${timingLabel}:matchDocs`, matchDocsStart)
  const matchById = new Map<string, MatchRef>()
  matchDocs.forEach((row) => {
    const id = toObjectIdString(row._id)
    if (!id) return
    matchById.set(id, row)
  })

  const matchCompetitionIds = Array.from(
    new Set(
      matchDocs
        .map((row) => toObjectIdString(row.competition_id))
        .filter((id): id is string => Boolean(id))
    )
  )
  const missingCompetitionIds = matchCompetitionIds.filter((id) => !competitionById.has(id))
  if (missingCompetitionIds.length) {
    const missingCompetitionsStart = Date.now()
    const extraCompetitions = await CompetitionModel.find({ _id: { $in: missingCompetitionIds } })
      .select("type season_id season division start_date name")
      .lean<CompetitionRef[]>()
    extraCompetitions.forEach((row) => {
      const id = toObjectIdString(row._id)
      if (!id) return
      competitionById.set(id, {
        _id: row._id,
        type: (row as { type?: string }).type,
        season_id: (row as { season_id?: string | number }).season_id,
        season: (row as { season?: string | number }).season,
        division: (row as { division?: number }).division,
        start_date: (row as { start_date?: Date | string }).start_date,
        name: (row as { name?: string }).name,
      })
    })
    logTiming(`${timingLabel}:extraCompetitions`, missingCompetitionsStart)
  }

  const playerCompetitionTeamMap = playerCompetitions.reduce<
    Record<string, { teamCompetitionId: string }>
  >((acc, row) => {
    const playerCompetitionId = row._id?.toString()
    const teamCompetitionId = toObjectIdString(row.team_competition_id)
    if (playerCompetitionId && teamCompetitionId) {
      acc[playerCompetitionId] = { teamCompetitionId }
    }
    return acc
  }, {})
  const playerTeamCompetitionIds = Array.from(
    new Set(
      matchStatsRows
        .map((row) => toObjectIdString(row.team_competition_id))
        .filter((item): item is string => Boolean(item))
    )
  )
  const goalsStart = Date.now()
  const goalRows = playerCompetitionObjectIds.length && playerMatchIds.length
    ? await GoalModel.find({
        scorer_id: { $in: playerCompetitionObjectIds },
        match_id: { $in: playerMatchIds },
      })
        .select("match_id team_competition_id scorer_id assist_id preassist_id")
        .lean<GoalRow[]>()
    : []
  logTiming(`${timingLabel}:goals`, goalsStart)

  const assistsStart = Date.now()
  const assistRows = playerCompetitionObjectIds.length && playerMatchIds.length
    ? await GoalModel.find({
        assist_id: { $in: playerCompetitionObjectIds },
        match_id: { $in: playerMatchIds },
      })
        .select("scorer_id assist_id")
        .lean<GoalRow[]>()
    : []
  logTiming(`${timingLabel}:assists`, assistsStart)

  const preassistsStart = Date.now()
  const preassistRows = playerCompetitionObjectIds.length && playerMatchIds.length
    ? await GoalModel.find({
        preassist_id: { $in: playerCompetitionObjectIds },
        match_id: { $in: playerMatchIds },
      })
        .select("assist_id preassist_id")
        .lean<GoalRow[]>()
    : []
  logTiming(`${timingLabel}:preassists`, preassistsStart)

  const gkPartnersStart = Date.now()
  const gkPartnerRows =
    playerMatchIds.length && playerTeamCompetitionIds.length
      ? await PlayerMatchStatsModel.find({
          match_id: { $in: playerMatchIds },
          team_competition_id: { $in: playerTeamCompetitionIds },
          position: "GK",
          player_competition_id: { $nin: playerCompetitionObjectIds },
        })
          .select("match_id team_competition_id player_competition_id cs")
          .lean<GKRow[]>()
      : []
  logTiming(`${timingLabel}:gkPartners`, gkPartnersStart)

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

  const relatedPlayerCompetitionIds = new Set<string>()
  assistRows.forEach((row) => {
    const scorerId = toObjectIdString(row.scorer_id)
    if (scorerId) relatedPlayerCompetitionIds.add(scorerId)
  })
  preassistRows.forEach((row) => {
    const assistId = toObjectIdString(row.assist_id)
    if (assistId) relatedPlayerCompetitionIds.add(assistId)
  })
  gkPartnerRows.forEach((row) => {
    const keeperId = toObjectIdString(row.player_competition_id)
    if (keeperId) relatedPlayerCompetitionIds.add(keeperId)
  })

  const relatedCompetitionIds = Array.from(relatedPlayerCompetitionIds)
  const relatedPlayerCompetitionsStart = Date.now()
  const relatedPlayerCompetitions = relatedCompetitionIds.length
    ? await PlayerCompetitionModel.find({ _id: { $in: relatedCompetitionIds } })
        .select("player_id")
        .lean()
    : []
  logTiming(`${timingLabel}:relatedPlayerCompetitions`, relatedPlayerCompetitionsStart)
  const playerCompetitionToPlayerId = new Map<string, string>()
  relatedPlayerCompetitions.forEach((row) => {
    const rowId = toObjectIdString(row._id)
    const playerId = toObjectIdString(row.player_id)
    if (!rowId || !playerId) return
    playerCompetitionToPlayerId.set(rowId, playerId)
  })

  const relatedPlayerIds = Array.from(new Set(Array.from(playerCompetitionToPlayerId.values())))
  const relatedPlayersStart = Date.now()
  const relatedPlayers = relatedPlayerIds.length
    ? await PlayerModel.find({ _id: { $in: relatedPlayerIds } })
        .select("player_name avatar")
        .lean()
    : []
  logTiming(`${timingLabel}:relatedPlayers`, relatedPlayersStart)
  const playerById = new Map<string, { player_name?: string; avatar?: string }>()
  relatedPlayers.forEach((row) => {
    const rowId = toObjectIdString(row._id)
    if (!rowId) return
    playerById.set(rowId, {
      player_name: (row as { player_name?: string }).player_name,
      avatar: (row as { avatar?: string }).avatar,
    })
  })

  const opponentTeamIds = new Set<string>()
  matchDocs.forEach((row) => {
    const team1CompetitionId = toObjectIdString(row.team1_competition_id)
    const team2CompetitionId = toObjectIdString(row.team2_competition_id)
    if (team1CompetitionId) {
      const teamId = teamCompetitionToTeamId.get(team1CompetitionId)
      if (teamId) opponentTeamIds.add(teamId)
    }
    if (team2CompetitionId) {
      const teamId = teamCompetitionToTeamId.get(team2CompetitionId)
      if (teamId) opponentTeamIds.add(teamId)
    }
  })
  const missingTeamIds = Array.from(opponentTeamIds).filter((id) => !teamById.has(id))
  if (missingTeamIds.length) {
    const extraTeamsStart = Date.now()
    const extraTeams = await TeamModel.find({ _id: { $in: missingTeamIds } })
      .select("teamName team_name image")
      .lean<TeamDoc[]>()
    extraTeams.forEach((row) => {
      const rowId = toObjectIdString(row._id)
      if (!rowId) return
      teamById.set(rowId, {
        _id: row._id,
        teamName: (row as { teamName?: string }).teamName,
        team_name: (row as { team_name?: string }).team_name,
        image: normalizeTeamImageUrl((row as { image?: string }).image),
      })
    })
    logTiming(`${timingLabel}:teamsOpponents`, extraTeamsStart)
  }

  const seriesStart = Date.now()
  const matchSeries = matchStatsRows
    .map((row) => {
      const matchId = toObjectIdString(row.match_id)
      const match = matchId ? matchById.get(matchId) : undefined
      const matchDate = match?.date ? new Date(match.date).toISOString() : ""
      const competitionId = match ? toObjectIdString(match.competition_id) : ""
      const competition = competitionId ? competitionById.get(competitionId) : undefined
      const competitionLabel = competition ? formatMatchCompetitionLabel(competition) : ""
      const team1CompetitionId = match ? toObjectIdString(match.team1_competition_id) : ""
      const team2CompetitionId = match ? toObjectIdString(match.team2_competition_id) : ""
      const playerTeamCompetitionId = toObjectIdString(row.team_competition_id)
      const teamAId = team1CompetitionId ? teamCompetitionToTeamId.get(team1CompetitionId) : ""
      const teamBId = team2CompetitionId ? teamCompetitionToTeamId.get(team2CompetitionId) : ""
      const teamAInfo = teamAId ? teamById.get(teamAId) : undefined
      const teamBInfo = teamBId ? teamById.get(teamBId) : undefined
      const teamA = teamAInfo?.teamName || teamAInfo?.team_name || "Team A"
      const teamB = teamBInfo?.teamName || teamBInfo?.team_name || "Team B"
      const teamAImage = teamAInfo?.image || ""
      const teamBImage = teamBInfo?.image || ""
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
        matchId,
        playerCompetitionId,
        competitionId: competitionId || "",
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
  logTiming(`${timingLabel}:matchSeries`, seriesStart)

  const goalsByOpponent = goalRows
    .map((row) => {
      const matchId = toObjectIdString(row.match_id)
      const scorerTeamId = toObjectIdString(row.team_competition_id)
      const match = matchId ? matchById.get(matchId) : undefined
      if (!match || !scorerTeamId) return null
      const team1Id = toObjectIdString(match.team1_competition_id)
      const team2Id = toObjectIdString(match.team2_competition_id)
      if (!team1Id || !team2Id) return null
      const opponentCompetitionId =
        team1Id === scorerTeamId ? team2Id : team2Id === scorerTeamId ? team1Id : ""
      if (!opponentCompetitionId) return null
      const opponentTeamId = teamCompetitionToTeamId.get(opponentCompetitionId)
      const opponent = opponentTeamId ? teamById.get(opponentTeamId) : undefined
      return {
        playerCompetitionId: toObjectIdString(row.scorer_id) || "",
        opponentId: opponentTeamId || "",
        opponentName: opponent?.teamName || opponent?.team_name || "Team",
        opponentImage: opponent?.image || "",
        matchId,
      }
    })
    .filter(isNotNull)

  const assistsByPlayer = assistRows
    .map((row) => {
      const assistantId = toObjectIdString(row.assist_id) || ""
      const scorerCompetitionId = toObjectIdString(row.scorer_id)
      const assistedId = scorerCompetitionId
        ? playerCompetitionToPlayerId.get(scorerCompetitionId)
        : ""
      if (!assistantId || !assistedId) return null
      const assisted = assistedId ? playerById.get(assistedId) : undefined
      return {
        playerCompetitionId: assistantId,
        assistedId,
        assistedName: assisted?.player_name || "Player",
        assistedAvatar: assisted?.avatar || "",
      }
    })
    .filter(isNotNull)

  const preassistsByPlayer = preassistRows
    .map((row) => {
      const preassistId = toObjectIdString(row.preassist_id) || ""
      const assistCompetitionId = toObjectIdString(row.assist_id)
      const assistedId = assistCompetitionId
        ? playerCompetitionToPlayerId.get(assistCompetitionId)
        : ""
      if (!assistedId || !preassistId) return null
      const assisted = assistedId ? playerById.get(assistedId) : undefined
      return {
        playerCompetitionId: preassistId,
        assistedId,
        assistedName: assisted?.player_name || "Player",
        assistedAvatar: assisted?.avatar || "",
      }
    })
    .filter(isNotNull)

  const goalsByTeam = matchStatsRows
    .map((row) => {
      const teamCompetitionId = toObjectIdString(row.team_competition_id)
      const teamId = teamCompetitionId ? teamCompetitionToTeamId.get(teamCompetitionId) : undefined
      if (!teamId) return null
      const team = teamById.get(teamId)
      const playerCompetitionId = row.player_competition_id?.toString() || ""
      const matchId = toObjectIdString(row.match_id)
      if (!team || !playerCompetitionId) return null
      return {
        playerCompetitionId,
        teamId,
        teamName: team?.teamName || team?.team_name || "Team",
        teamImage: team?.image || "",
        matchId,
        goals: readMatchStat(row, "goals", "goals"),
      }
    })
    .filter(isNotNull)

  const assistsByTeam = matchStatsRows
    .map((row) => {
      const teamCompetitionId = toObjectIdString(row.team_competition_id)
      const teamId = teamCompetitionId ? teamCompetitionToTeamId.get(teamCompetitionId) : undefined
      if (!teamId) return null
      const team = teamById.get(teamId)
      const playerCompetitionId = row.player_competition_id?.toString() || ""
      const matchId = toObjectIdString(row.match_id)
      if (!team || !playerCompetitionId) return null
      return {
        playerCompetitionId,
        teamId,
        teamName: team?.teamName || team?.team_name || "Team",
        teamImage: team?.image || "",
        matchId,
        assists: readMatchStat(row, "assists", "assists"),
      }
    })
    .filter(isNotNull)

  const preassistsByTeam = matchStatsRows
    .map((row) => {
      const teamCompetitionId = toObjectIdString(row.team_competition_id)
      const teamId = teamCompetitionId ? teamCompetitionToTeamId.get(teamCompetitionId) : undefined
      if (!teamId) return null
      const team = teamById.get(teamId)
      const playerCompetitionId = row.player_competition_id?.toString() || ""
      const matchId = toObjectIdString(row.match_id)
      if (!team || !playerCompetitionId) return null
      return {
        playerCompetitionId,
        teamId,
        teamName: team?.teamName || team?.team_name || "Team",
        teamImage: team?.image || "",
        matchId,
        preassists: readMatchStat(row, "preassists", "preassists"),
      }
    })
    .filter(isNotNull)

  const kicksByOpponent = matchStatsRows
    .map((row) => {
      const playerCompetitionId = row.player_competition_id?.toString() || ""
      const matchId = toObjectIdString(row.match_id)
      const match = matchId ? matchById.get(matchId) : undefined
      if (!match || !playerCompetitionId) return null
      const teamCompetitionId = playerCompetitionTeamMap[playerCompetitionId]?.teamCompetitionId
      if (!teamCompetitionId) return null
      const team1Id = toObjectIdString(match.team1_competition_id)
      const team2Id = toObjectIdString(match.team2_competition_id)
      if (!team1Id || !team2Id) return null
      const opponentCompetitionId =
        team1Id === teamCompetitionId ? team2Id : team2Id === teamCompetitionId ? team1Id : ""
      if (!opponentCompetitionId) return null
      const opponentTeamId = teamCompetitionToTeamId.get(opponentCompetitionId)
      const opponent = opponentTeamId ? teamById.get(opponentTeamId) : undefined
      return {
        playerCompetitionId,
        opponentId: opponentTeamId || "",
        opponentName: opponent?.teamName || opponent?.team_name || "Team",
        opponentImage: opponent?.image || "",
        matchId,
        kicks: readMatchStat(row, "kicks", "kicks"),
      }
    })
    .filter(isNotNull)

  const goalsConcededByOpponent = matchStatsRows
    .map((row) => {
      const playerCompetitionId = row.player_competition_id?.toString() || ""
      const matchId = toObjectIdString(row.match_id)
      const match = matchId ? matchById.get(matchId) : undefined
      if (!match || !playerCompetitionId) return null
      const teamCompetitionId = toObjectIdString(row.team_competition_id)
      if (!teamCompetitionId) return null
      const team1Id = toObjectIdString(match.team1_competition_id)
      const team2Id = toObjectIdString(match.team2_competition_id)
      if (!team1Id || !team2Id) return null
      const opponentCompetitionId =
        team1Id === teamCompetitionId ? team2Id : team2Id === teamCompetitionId ? team1Id : ""
      if (!opponentCompetitionId) return null
      const opponentTeamId = teamCompetitionToTeamId.get(opponentCompetitionId)
      const opponent = opponentTeamId ? teamById.get(opponentTeamId) : undefined
      return {
        playerCompetitionId,
        opponentId: opponentTeamId || "",
        opponentName: opponent?.teamName || opponent?.team_name || "Team",
        opponentImage: opponent?.image || "",
        matchId,
        goalsConceded: readMatchStat(row, "goals_conceded", "goalsConceded") ||
          readMatchStat(row, "goals_connceded", "goalsConceded"),
      }
    })
    .filter(isNotNull)

  const gkPartners = gkPartnerRows
    .map((row) => {
      const matchId = toObjectIdString(row.match_id)
      const teamCompetitionId = toObjectIdString(row.team_competition_id)
      if (!matchId || !teamCompetitionId) return null
      if (!playerCsByMatchTeam[`${matchId}-${teamCompetitionId}`]) return null
      if (!row.cs || row.cs <= 0) return null
      const playerCompetitionId = playerMatchKeyMap[`${matchId}-${teamCompetitionId}`]
      if (!playerCompetitionId) return null
      const keeperCompetitionId = toObjectIdString(row.player_competition_id)
      const keeperPlayerId = keeperCompetitionId
        ? playerCompetitionToPlayerId.get(keeperCompetitionId)
        : ""
      if (!keeperCompetitionId || !keeperPlayerId) return null
      const keeperPlayer = playerById.get(keeperPlayerId)
      return {
        playerCompetitionId,
        keeperPlayerId,
        keeperId: keeperCompetitionId,
        keeperName: keeperPlayer?.player_name || "Player",
        keeperAvatar: keeperPlayer?.avatar || "",
        matchId,
        cs: row.cs || 0,
      }
    })
    .filter(isNotNull)



  logTiming(`${timingLabel}:total`, totalStart)
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-6 pt-0 pb-10 space-y-10">
        <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-900/40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.18),_transparent_55%)]" />
          <div className="relative flex flex-col md:flex-row items-center md:items-end gap-6 p-8 md:p-10">
            <div className="shrink-0">
              {kitImage ? (
                <div className="relative h-32 w-32 md:h-36 md:w-36 rounded-full overflow-hidden border-2 border-slate-700 shadow-lg shadow-teal-900/30">
                  <img
                    src={kitImage}
                    alt={player.player_name}
                    className="h-full w-full object-cover"
                  />
                  {playerAvatar ? (
                    playerAvatarIsImage ? (
                      <img
                        src={playerAvatar}
                        alt={player.player_name}
                        className="absolute left-1/2 top-1/2 h-64 w-64 md:h-80 md:w-80 -translate-x-1/2 -translate-y-1/2 rounded-full object-contain bg-transparent"
                      />
                    ) : (
                      <div
                        className="absolute left-1/2 top-1/2 h-96 w-96 md:h-[28rem] md:w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent flex items-center justify-center text-7xl font-semibold"
                        style={{ color: kitTextColor || "#ffffff" }}
                      >
                        {playerAvatar}
                      </div>
                    )
                  ) : null}
                </div>
              ) : playerAvatarIsImage ? (
                <img
                  src={playerAvatar}
                  alt={player.player_name}
                  className="h-32 w-32 md:h-36 md:w-36 object-cover rounded-full border-2 border-slate-700 shadow-lg shadow-teal-900/30"
                />
              ) : playerAvatar ? (
                <div
                  className="h-32 w-32 md:h-36 md:w-36 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-5xl font-semibold"
                  style={{ color: kitTextColor || "#ffffff" }}
                >
                  {playerAvatar}
                </div>
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
                {player.country ? (() => {
                  const baseStyle = getFlagBackgroundStyle(player.country)
                  const overlayUrl = shouldOverlayFlag(player.country)
                    ? getTwemojiUrl(player.country)
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
                      aria-label={player.country}
                      className="h-[22px] w-[22px] rounded-full ring-1 ring-slate-700"
                      style={{
                        ...baseStyle,
                        backgroundImage,
                        backgroundPosition: overlayUrl
                          ? `center, ${basePosition}`
                          : basePosition,
                        backgroundSize: overlayUrl
                          ? `cover, ${baseSize}`
                          : baseSize,
                        backgroundRepeat: overlayUrl
                          ? `no-repeat, ${baseRepeat}`
                          : baseRepeat,
                      }}
                    />
                  )
                })() : null}
                <span className="uppercase tracking-[0.2em] text-xs text-slate-400">Country</span>
                <span>{player.country || "N/A"}</span>
              </div>
            </div>
          </div>
        </section>

        <PlayerStatsTabs
          playerId={id}
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

import { NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongoose"
import PlayerModel from "@/lib/models/Player"
import PlayerCompetitionModel from "@/lib/models/PlayerCompetition"
import PlayerMatchStatsModel from "@/lib/models/PlayerMatchStats"
import GoalModel from "@/lib/models/Goal"
import TeamCompetitionModel from "@/lib/models/TeamCompetition"
import TeamModel from "@/lib/models/Team"
import MatchModel from "@/lib/models/Match"
import { normalizeTeamImageUrl } from "@/lib/utils"

type TeamDoc = {
  _id?: unknown
  teamName?: string
  team_name?: string
  image?: string
}

type TeamCompetitionDoc = {
  _id?: { toString(): string }
  team_id?: unknown
}

type MatchDoc = {
  _id?: { toString(): string }
  team1_competition_id?: unknown
  team2_competition_id?: unknown
}

type PlayerCompetitionRow = {
  _id?: { toString(): string }
  team_competition_id?: unknown
}

type PlayerMatchStatRow = {
  match_id?: unknown
  team_competition_id?: unknown
  player_competition_id?: { toString(): string } | string
  goals?: number
  assists?: number
  preassists?: number
  kicks?: number
  goals_conceded?: number
  goals_connceded?: number
  cs?: number
}

type GoalRow = {
  match_id?: unknown
  team_competition_id?: unknown
  scorer_id?: { toString(): string } | string
  assist_id?: { toString(): string } | string
  preassist_id?: { toString(): string } | string
}

type GKRow = {
  match_id?: unknown
  team_competition_id?: unknown
  player_competition_id?: { toString(): string } | string
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
    .select("team_id")
    .lean<TeamCompetitionDoc[]>()
  cachedTeamCompetitions = { data, loadedAt: now }
  return data
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const timingLabel = `player-graphs:${id}`
  const logTiming = (label: string, start: number) => {
    const elapsed = Date.now() - start
    console.log(`[next] ${label} ${elapsed}ms`)
  }
  const totalStart = Date.now()
  const numericId = Number(id)
  await dbConnect()

  const playerStart = Date.now()
  const player = ((Number.isFinite(numericId)
    ? await PlayerModel.findOne({ player_id: numericId }).select("_id").lean()
    : null) ||
    (await PlayerModel.findById(id).select("_id").lean())) as { _id?: unknown } | null
  logTiming(`${timingLabel}:player`, playerStart)

  if (!player?._id) {
    logTiming(`${timingLabel}:total`, totalStart)
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  const playerCompetitionsStart = Date.now()
  const playerCompetitions = await PlayerCompetitionModel.find({ player_id: player._id })
    .select("_id team_competition_id")
    .lean<PlayerCompetitionRow[]>()
  logTiming(`${timingLabel}:playerCompetitions`, playerCompetitionsStart)

  const playerCompetitionObjectIds = playerCompetitions.map((row) => row._id).filter(Boolean)
  if (!playerCompetitionObjectIds.length) {
    logTiming(`${timingLabel}:total`, totalStart)
    return NextResponse.json({
      goalsByOpponent: [],
      assistsByPlayer: [],
      preassistsByPlayer: [],
      goalsByTeam: [],
      assistsByTeam: [],
      preassistsByTeam: [],
      kicksByOpponent: [],
      goalsConcededByOpponent: [],
      gkPartners: [],
    })
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

  const matchStatsStart = Date.now()
  const matchStatsRows = await PlayerMatchStatsModel.find({
    player_competition_id: { $in: playerCompetitionObjectIds },
  })
    .select(
      "match_id team_competition_id player_competition_id goals assists preassists kicks goals_conceded goals_connceded cs"
    )
    .lean<PlayerMatchStatRow[]>()
  logTiming(`${timingLabel}:matchStats`, matchStatsStart)

  const playerMatchIds = Array.from(
    new Set(
      matchStatsRows
        .map((row) => toObjectIdString(row.match_id))
        .filter((item): item is string => Boolean(item))
    )
  )
  const playerTeamCompetitionIds = Array.from(
    new Set(
      matchStatsRows
        .map((row) => toObjectIdString(row.team_competition_id))
        .filter((item): item is string => Boolean(item))
    )
  )

  const matchDocsStart = Date.now()
  const matchDocs = playerMatchIds.length
    ? await MatchModel.find({ _id: { $in: playerMatchIds } })
        .select("team1_competition_id team2_competition_id")
        .lean<MatchDoc[]>()
    : []
  logTiming(`${timingLabel}:matchDocs`, matchDocsStart)
  const matchById = new Map<string, MatchDoc>()
  matchDocs.forEach((row) => {
    const matchId = toObjectIdString(row._id)
    if (!matchId) return
    matchById.set(matchId, row)
  })

  const teamCompetitionsStart = Date.now()
  const teamCompetitions = await getCachedTeamCompetitions()
  logTiming(`${timingLabel}:teamCompetitions`, teamCompetitionsStart)
  const teamCompetitionToTeamId = new Map<string, string>()
  teamCompetitions.forEach((row) => {
    const id = toObjectIdString(row._id)
    const teamId = toObjectIdString(row.team_id)
    if (!id || !teamId) return
    teamCompetitionToTeamId.set(id, teamId)
  })

  const teamCompetitionIds = new Set<string>()
  playerTeamCompetitionIds.forEach((id) => {
    if (id) teamCompetitionIds.add(id)
  })
  matchDocs.forEach((row) => {
    const team1CompetitionId = toObjectIdString(row.team1_competition_id)
    const team2CompetitionId = toObjectIdString(row.team2_competition_id)
    if (team1CompetitionId) teamCompetitionIds.add(team1CompetitionId)
    if (team2CompetitionId) teamCompetitionIds.add(team2CompetitionId)
  })
  const teamIds = Array.from(
    new Set(
      Array.from(teamCompetitionIds)
        .map((competitionId) => teamCompetitionToTeamId.get(competitionId))
        .filter((id): id is string => Boolean(id))
    )
  )
  const teamsStart = Date.now()
  const teams = teamIds.length
    ? await TeamModel.find({ _id: { $in: teamIds } })
        .select("teamName team_name image")
        .lean<TeamDoc[]>()
    : []
  logTiming(`${timingLabel}:teams`, teamsStart)
  const teamById = new Map<string, TeamDoc>()
  teams.forEach((row) => {
    const id = toObjectIdString(row._id)
    if (!id) return
    teamById.set(id, {
      ...row,
      image: normalizeTeamImageUrl(row.image),
    })
  })

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
      const teamId = teamCompetitionId ? teamCompetitionToTeamId.get(teamCompetitionId) : ""
      const team = teamId ? teamById.get(teamId) : undefined
      const playerCompetitionId = row.player_competition_id?.toString() || ""
      const matchId = toObjectIdString(row.match_id)
      if (!team || !playerCompetitionId) return null
      return {
        playerCompetitionId,
        teamId,
        teamName: team?.teamName || team?.team_name || "Team",
        teamImage: team?.image || "",
        matchId,
        goals: Number(row.goals) || 0,
      }
    })
    .filter(isNotNull)

  const assistsByTeam = matchStatsRows
    .map((row) => {
      const teamCompetitionId = toObjectIdString(row.team_competition_id)
      const teamId = teamCompetitionId ? teamCompetitionToTeamId.get(teamCompetitionId) : ""
      const team = teamId ? teamById.get(teamId) : undefined
      const playerCompetitionId = row.player_competition_id?.toString() || ""
      const matchId = toObjectIdString(row.match_id)
      if (!team || !playerCompetitionId) return null
      return {
        playerCompetitionId,
        teamId,
        teamName: team?.teamName || team?.team_name || "Team",
        teamImage: team?.image || "",
        matchId,
        assists: Number(row.assists) || 0,
      }
    })
    .filter(isNotNull)

  const preassistsByTeam = matchStatsRows
    .map((row) => {
      const teamCompetitionId = toObjectIdString(row.team_competition_id)
      const teamId = teamCompetitionId ? teamCompetitionToTeamId.get(teamCompetitionId) : ""
      const team = teamId ? teamById.get(teamId) : undefined
      const playerCompetitionId = row.player_competition_id?.toString() || ""
      const matchId = toObjectIdString(row.match_id)
      if (!team || !playerCompetitionId) return null
      return {
        playerCompetitionId,
        teamId,
        teamName: team?.teamName || team?.team_name || "Team",
        teamImage: team?.image || "",
        matchId,
        preassists: Number(row.preassists) || 0,
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
        kicks: Number(row.kicks) || 0,
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
        goalsConceded: Number(row.goals_conceded || row.goals_connceded) || 0,
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
  return NextResponse.json({
    goalsByOpponent,
    assistsByPlayer,
    preassistsByPlayer,
    goalsByTeam,
    assistsByTeam,
    preassistsByTeam,
    kicksByOpponent,
    goalsConcededByOpponent,
    gkPartners,
  })
}

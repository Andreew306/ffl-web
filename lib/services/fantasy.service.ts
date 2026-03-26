import { randomBytes } from "crypto"
import mongoose from "mongoose"
import dbConnect from "@/lib/db/mongoose"
import UserModel from "@/lib/models/User"
import PlayerModel from "@/lib/models/Player"
import CompetitionModel from "@/lib/models/Competition"
import TeamModel from "@/lib/models/Team"
import TeamCompetitionModel from "@/lib/models/TeamCompetition"
import PlayerCompetitionModel from "@/lib/models/PlayerCompetition"
import PlayerMatchStatsModel from "@/lib/models/PlayerMatchStats"
import SeasonModel from "@/lib/models/Seasons"
import FantasySeasonModel from "@/lib/models/FantasySeason"
import FantasyLeagueModel from "@/lib/models/FantasyLeague"
import FantasyLeagueMemberModel from "@/lib/models/FantasyLeagueMember"
import FantasyRosterModel from "@/lib/models/FantasyRoster"
import FantasyRosterSlotModel from "@/lib/models/FantasyRosterSlot"
import FantasyMarketDayModel from "@/lib/models/FantasyMarketDay"
import FantasyBidModel from "@/lib/models/FantasyBid"
import FantasyClauseExecutionModel from "@/lib/models/FantasyClauseExecution"
import FantasyClauseChangeModel from "@/lib/models/FantasyClauseChange"
import FantasyPlayerPriceModel from "@/lib/models/FantasyPlayerPrice"
import FantasyPlayerPriceHistoryModel from "@/lib/models/FantasyPlayerPriceHistory"
import MatchModel from "@/lib/models/Match"
import FantasyWeekLineupModel from "@/lib/models/FantasyWeekLineup"
import FantasyOpenWeekLineupModel from "@/lib/models/FantasyOpenWeekLineup"
import FantasyWeekScoreModel from "@/lib/models/FantasyWeekScore"
import FantasyWeekRewardModel from "@/lib/models/FantasyWeekReward"
import FantasyProcessedStatModel from "@/lib/models/FantasyProcessedStat"
import { getKitTextColor, normalizeTeamImageUrl } from "@/lib/utils"

type DashboardLeague = {
  id: string
  fantasySeasonId: string
  leagueType: "market" | "open"
  name: string
  inviteCode: string
  status: "draft" | "active" | "finished"
  role: "owner" | "member"
  teamName: string
  memberCount: number
  budgetRemaining: number
  squadSize: number
  roster: Array<{
    id: string
    playerObjectId: string
    playerId: number
    playerName: string
    country: string
    avatar: string | undefined
    slot: "GK" | "DEF" | "MID" | "ATT" | "FLEX" | "BENCH"
    slotIndex?: number
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
  }>
}

export type FantasyRosterPlayerView = DashboardLeague["roster"][number] & {
  weekPoints: number
}

export type FantasyDashboardData = {
  season: {
    id: string
    name: string
    currentGameweek: number
  } | null
  leagues: DashboardLeague[]
}

export type FantasyMarketEntry = {
  playerObjectId: string
  playerId: number
  playerName: string
  country: string
  avatar?: string
  teamName?: string
  teamImage?: string
  kitImage?: string
  kitTextColor?: string
  basePrice: number
  priceChangePercent?: number
  priceChangeDirection?: "up" | "down" | "flat"
  minBid: number
  highestBid: number | null
  sellerTeamName: string | null
  userBid: number | null
}

export type FantasyCompetitionOption = {
  id: string
  competitionId: string
  name: string
  season: number
  division: number | null
}

export type FantasyLeagueDetail = DashboardLeague & {
  season: {
    id: string
    name: string
    currentGameweek: number
  } | null
  home: {
    defaultWeek: number
    weeks: Array<{
      week: number
      label: string
      matches: Array<{
        id: string
        matchId: number
        date: string
        team1Name: string
        team1Image?: string
        team2Name: string
        team2Image?: string
        scoreTeam1: number
        scoreTeam2: number
      }>
    }>
    activity: Array<{
      id: string
      type: "purchase" | "sale" | "auto_sale" | "clause_up"
      title: string
      subtitle: string
      amount: number
      date: string
    }>
  }
  market: {
    id: string
    status: "open" | "closed" | "settled"
    marketDate: string
    listings: FantasyMarketEntry[]
  } | null
  teamView: {
    mode: "market" | "open"
    currentWeek: number
    weeks: Array<{
      week: number
      formation: string
      locked: boolean
      roster: FantasyRosterPlayerView[]
    }>
    availablePlayers: Array<{
      id: string
      playerObjectId: string
      playerId: number
      playerName: string
      country: string
      avatar?: string
      teamName?: string
      teamImage?: string
      kitImage?: string
      kitTextColor?: string
      position?: string | null
    }>
  }
  standings: Array<{
    userId: string
    discordId: string | null
    teamName: string
    playerName: string | null
    discordAvatar: string | null
    role: "owner" | "member"
    points: number
  }>
}

type FantasyLeagueType = "market" | "open"
const TRANSFER_MARKET_STARTING_COINS = 10000

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

function buildInviteCode() {
  return randomBytes(3).toString("hex").toUpperCase()
}

function buildTeamName(base?: string) {
  const normalized = base?.trim()
  return normalized ? normalized : "Fantasy Squad"
}

async function getUserByDiscordId(discordId: string) {
  const user = await UserModel.findOne({ discordId }).select("_id").lean<{ _id: mongoose.Types.ObjectId } | null>()

  if (!user?._id) {
    throw new Error("No se ha encontrado el usuario autenticado.")
  }

  return user
}

async function createUniqueLeagueSlug(baseName: string, seasonId: mongoose.Types.ObjectId) {
  const baseSlug = slugify(baseName) || "fantasy-league"
  let candidate = baseSlug
  let suffix = 2

  while (
    await FantasyLeagueModel.exists({
      fantasySeasonId: seasonId,
      slug: candidate,
    })
  ) {
    candidate = `${baseSlug}-${suffix}`
    suffix += 1
  }

  return candidate
}

async function createUniqueInviteCode() {
  let code = buildInviteCode()

  while (await FantasyLeagueModel.exists({ inviteCode: code })) {
    code = buildInviteCode()
  }

  return code
}

async function ensurePlayerPrices(
  fantasySeasonId: mongoose.Types.ObjectId,
  competitionObjectId: mongoose.Types.ObjectId,
  players: Array<{ _id: mongoose.Types.ObjectId; player_id: number }>
) {
  await ensureFantasyPriceIndexes()

  if (!players.length) {
    return
  }

  const rawCompetition = await CompetitionModel.collection.findOne(
    { _id: competitionObjectId },
    { projection: { _id: 1, season: 1, season_id: 1, type: 1 } }
  ) as { _id: mongoose.Types.ObjectId; season?: number; season_id?: string } | null

  const directSeasonValue =
    rawCompetition?.season !== null && rawCompetition?.season !== undefined
      ? Number(rawCompetition.season)
      : null

  const fallbackSeasonValue =
    directSeasonValue ??
    (await resolveSeasonNumbers([rawCompetition?.season_id ?? null])).get(String(rawCompetition?.season_id ?? "")) ??
    extractSeasonValue(rawCompetition?.season_id)

  const rawLeagueCompetitions = fallbackSeasonValue > 1
    ? await CompetitionModel.collection
        .find(
          {
            type: "league",
            season: { $lt: fallbackSeasonValue },
          },
          { projection: { _id: 1, season: 1 } }
        )
        .toArray() as Array<{ _id: mongoose.Types.ObjectId; season?: number }>
    : []

  const competitionIdsBySeason = new Map<number, mongoose.Types.ObjectId[]>()
  for (const competition of rawLeagueCompetitions) {
    const season = Number(competition.season ?? 0)
    if (!competitionIdsBySeason.has(season)) {
      competitionIdsBySeason.set(season, [])
    }
    competitionIdsBySeason.get(season)?.push(competition._id)
  }

  const allCompetitionIds = [...competitionIdsBySeason.values()].flat()
  const relevantTeamCompetitions = allCompetitionIds.length
    ? await TeamCompetitionModel.find({ competition_id: { $in: allCompetitionIds } })
        .select("_id competition_id")
        .lean<Array<{ _id: mongoose.Types.ObjectId; competition_id: mongoose.Types.ObjectId }>>()
    : []

  const seasonByTeamCompetitionId = new Map(
    relevantTeamCompetitions.map((item) => {
      const season = rawLeagueCompetitions.find(
        (competition) => competition._id.toString() === item.competition_id.toString()
      )?.season ?? fallbackSeasonValue
      return [item._id.toString(), Number(season)]
    })
  )

  const playerCompetitionRows = relevantTeamCompetitions.length
    ? await PlayerCompetitionModel.find({
        player_id: { $in: players.map((player) => player._id) },
        team_competition_id: { $in: relevantTeamCompetitions.map((item) => item._id) },
      })
        .select("player_id team_competition_id avg")
        .lean<Array<{
          player_id: mongoose.Types.ObjectId
          team_competition_id: mongoose.Types.ObjectId
          avg?: number
        }>>()
    : []

  const seasonAvgByPlayer = new Map<string, Map<number, number[]>>()
  for (const row of playerCompetitionRows) {
    const season = seasonByTeamCompetitionId.get(row.team_competition_id.toString())
    const avg = Number(row.avg ?? 0)
    if (!season || avg <= 0) continue
    const playerKey = row.player_id.toString()
    if (!seasonAvgByPlayer.has(playerKey)) {
      seasonAvgByPlayer.set(playerKey, new Map())
    }
    const playerSeasons = seasonAvgByPlayer.get(playerKey)!
    if (!playerSeasons.has(season)) {
      playerSeasons.set(season, [])
    }
    playerSeasons.get(season)!.push(avg)
  }

  const computedPriceByPlayerId = new Map<string, number>()
  for (const player of players) {
    const seasons = seasonAvgByPlayer.get(player._id.toString())
    const seasonAverages = seasons
      ? [...seasons.entries()]
          .sort((a, b) => b[0] - a[0])
          .slice(0, 2)
          .map(([, values]) => values.reduce((sum, value) => sum + value, 0) / values.length)
      : []

    const baseAvg = seasonAverages.length
      ? seasonAverages.reduce((sum, value) => sum + value, 0) / seasonAverages.length
      : 6

    computedPriceByPlayerId.set(player._id.toString(), Math.max(4000, Math.round(baseAvg * 1000)))
  }

  const existingPrices = await FantasyPlayerPriceModel.find({
    fantasySeasonId,
    competitionObjectId,
    playerObjectId: { $in: players.map((player) => player._id) },
  })
    .select("playerObjectId price previousPrice")
    .lean<Array<{ playerObjectId: mongoose.Types.ObjectId; price: number; previousPrice?: number }>>()

  const existingById = new Map(existingPrices.map((price) => [price.playerObjectId.toString(), price]))
  const updates = players.map((player) => {
    const computedPrice = computedPriceByPlayerId.get(player._id.toString()) ?? 6000
    const existing = existingById.get(player._id.toString())
    const isLegacy = existing ? Number(existing.price ?? 0) <= 100 : false

    if (!existing || isLegacy) {
      return { player, computedPrice }
    }

    return null
  }).filter(Boolean)

  for (const entry of updates) {
    if (!entry) continue
    await FantasyPlayerPriceModel.updateOne(
      {
        fantasySeasonId,
        competitionObjectId,
        playerObjectId: entry.player._id,
      },
      {
        $set: {
          player_id: entry.player.player_id,
          price: entry.computedPrice,
          previousPrice: entry.computedPrice,
          changePercent: 0,
          changeDirection: "flat",
        },
        $setOnInsert: {
          fantasySeasonId,
          competitionObjectId,
          lastUpdatedGameweek: 0,
        },
      },
      { upsert: true }
    )
  }
}

function shuffleArray<T>(items: T[]) {
  const copy = [...items]

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }

  return copy
}

function extractSeasonValue(rawSeason: string | number | null | undefined) {
  if (!rawSeason) {
    return -1
  }

  const match = String(rawSeason).match(/\d+/)
  return match ? Number.parseInt(match[0], 10) : -1
}

function toMadridDateLabel(value: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

function toMadridDateKey(value: Date | string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value))

  const year = parts.find((part) => part.type === "year")?.value ?? "0000"
  const month = parts.find((part) => part.type === "month")?.value ?? "00"
  const day = parts.find((part) => part.type === "day")?.value ?? "00"

  return `${year}-${month}-${day}`
}

function extractMatchdayFromComments(comments?: string | null) {
  const match = comments?.match(/MD\s*0*(\d+)/i)
  return match ? Number.parseInt(match[1], 10) : null
}

function mapPositionToGroup(position?: string | null): FantasyScoringPositionGroup {
  const normalized = String(position ?? "").toUpperCase()
  if (normalized === "GK") return "GK"
  if (["CB", "LB", "RB"].includes(normalized)) return "DEF"
  if (["DM", "CM", "AM"].includes(normalized)) return "MID"
  return "ATT"
}

function inferFormationFromSlots(
  starters: Array<{ slot: "GK" | "DEF" | "MID" | "ATT" | "FLEX" | "BENCH" }>
) {
  const counts = starters.reduce(
    (acc, item) => {
      if (item.slot === "DEF") acc.def += 1
      if (item.slot === "MID") acc.mid += 1
      if (item.slot === "ATT") acc.att += 1
      return acc
    },
    { def: 0, mid: 0, att: 0 }
  )

  return `1-${counts.def}-${counts.mid}-${counts.att}`
}

function getFantasyWeekStart(date: Date) {
  const local = new Date(date)
  local.setHours(0, 0, 0, 0)
  const day = local.getDay()
  const diffToWednesday = (day + 4) % 7
  local.setDate(local.getDate() - diffToWednesday)
  return local
}

function getCurrentFantasyWeekNumber(startDate: Date, now = new Date()) {
  const startWeek = getFantasyWeekStart(startDate)
  const currentWeek = getFantasyWeekStart(now)
  const diffMs = currentWeek.getTime() - startWeek.getTime()
  if (diffMs <= 0) return 1
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1
}

const WEEKLY_RECHARGE_COINS = 1000
const WEEK_POINTS_BONUS_STEP = 10
const WEEK_POINTS_BONUS_COINS = 250
const WEEK_GOAL_BONUS_COINS = 500
const WEEK_RANK_BONUS: Record<number, number> = {
  1: 2500,
  2: 1500,
  3: 1000,
  4: 500,
  5: 400,
  6: 300,
  7: 200,
}

function scorePlayerMatchStats(stat: {
  position?: string | null
  goals?: number
  assists?: number
  preassists?: number
  cs?: number
  goalsConceded?: number
  saves?: number
  clearances?: number
  recoveries?: number
  shotsOnGoal?: number
  won?: number
  draw?: number
  lost?: number
}) {
  const group = mapPositionToGroup(stat.position)
  const goals = Number(stat.goals ?? 0)
  const assists = Number(stat.assists ?? 0)
  const preassists = Number(stat.preassists ?? 0)
  const cs = Number(stat.cs ?? 0)
  const goalsConceded = Number(stat.goalsConceded ?? 0)
  const saves = Number(stat.saves ?? 0)
  const clearances = Number(stat.clearances ?? 0)
  const recoveries = Number(stat.recoveries ?? 0)
  const shotsOnGoal = Number(stat.shotsOnGoal ?? 0)
  const won = Number(stat.won ?? 0)
  const draw = Number(stat.draw ?? 0)
  const lost = Number(stat.lost ?? 0)

  let points = 0

  if (group === "GK") {
    points += goals * 6
    points += assists * 4
    points += preassists * 3
    points += cs * 4
    points -= Math.floor(goalsConceded / 2)
    points += Math.floor(saves / 3)
    points += Math.floor(clearances / 3)
    points += Math.floor(recoveries / 5)
    points += Math.floor(shotsOnGoal / 2) * 2
  } else if (group === "DEF") {
    points += goals * 5
    points += assists * 4
    points += preassists * 3
    points += cs * 4
    points -= Math.floor(goalsConceded / 2)
    points += Math.floor(saves / 3)
    points += Math.floor(clearances / 3)
    points += Math.floor(recoveries / 5)
    points += Math.floor(shotsOnGoal / 2) * 2
  } else if (group === "MID") {
    points += goals * 4
    points += assists * 3
    points += preassists * 2
    points += cs * 2
    points += Math.floor(shotsOnGoal / 2)
  } else {
    points += goals * 4
    points += assists * 3
    points += preassists * 2
    points += cs
    points += Math.floor(shotsOnGoal / 2)
  }

  if (won > 0) points += 2
  else if (lost > 0) points -= 2
  else if (draw > 0) points += 0

  return points
}

async function resolveSeasonNumbers(seasonIds: Array<string | number | null | undefined>) {
  const normalizedSeasonIds = [...new Set(
    seasonIds
      .filter((seasonId): seasonId is string | number => seasonId !== null && seasonId !== undefined)
      .map((seasonId) => String(seasonId))
  )]

  if (!normalizedSeasonIds.length) {
    return new Map<string, number>()
  }

  const seasons = await SeasonModel.find({
    season_id: { $in: normalizedSeasonIds },
  })
    .select("season_id season_number")
    .lean<Array<{ season_id: string; season_number: number }>>()

  return new Map(
    seasons.map((season) => [String(season.season_id), season.season_number])
  )
}

export async function getLatestLeagueCompetitionOptions(): Promise<FantasyCompetitionOption[]> {
  await dbConnect()

  const competitions = await CompetitionModel.find({ type: "league" })
    .select("_id competition_id name season season_id division")
    .lean<Array<{
      _id: mongoose.Types.ObjectId
      competition_id: string
      name: string
      season?: number | string | null
      season_id?: string | null
      division?: number | null
    }>>()

  if (!competitions.length) {
    return []
  }

  const seasonNumberBySeasonId = await resolveSeasonNumbers(
    competitions
      .filter((competition) => competition.season === null || competition.season === undefined)
      .map((competition) => competition.season_id)
  )

  const highestSeason = competitions.reduce((maxSeason, competition) => {
    const seasonValue = competition.season !== null && competition.season !== undefined
      ? Number(competition.season)
      : seasonNumberBySeasonId.get(String(competition.season_id ?? "")) ?? extractSeasonValue(competition.season_id)
    return Math.max(maxSeason, seasonValue)
  }, -1)

  return competitions
    .filter((competition) => {
      const seasonValue = competition.season !== null && competition.season !== undefined
        ? Number(competition.season)
        : seasonNumberBySeasonId.get(String(competition.season_id ?? "")) ?? extractSeasonValue(competition.season_id)
      return seasonValue === highestSeason
    })
    .sort((a, b) => {
      const divisionA = a.division ?? Number.MAX_SAFE_INTEGER
      const divisionB = b.division ?? Number.MAX_SAFE_INTEGER
      return divisionA - divisionB
    })
    .map((competition) => ({
      id: competition._id.toString(),
      competitionId: competition.competition_id,
      name: competition.name,
      season: competition.season !== null && competition.season !== undefined
        ? Number(competition.season)
        : seasonNumberBySeasonId.get(String(competition.season_id ?? "")) ?? highestSeason,
      division: competition.division ?? null,
    }))
}

async function getCompetitionPlayersByGroup(
  competitionObjectId: mongoose.Types.ObjectId,
  excludedPlayerIds: mongoose.Types.ObjectId[]
) {
  const teamCompetitions = await TeamCompetitionModel.find({ competition_id: competitionObjectId })
    .select("_id")
    .lean<Array<{ _id: mongoose.Types.ObjectId }>>()

  if (!teamCompetitions.length) {
    return []
  }

  const groupedPlayerCompetitions = await PlayerCompetitionModel.aggregate<{
    _id: mongoose.Types.ObjectId
    positions: Array<"GK" | "CB" | "LB" | "RB" | "DM" | "CM" | "AM" | "LW" | "RW" | "ST">
  }>([
    {
      $match: {
        team_competition_id: { $in: teamCompetitions.map((item) => item._id) },
        player_id: { $nin: excludedPlayerIds },
        $and: [
          {
            $or: [
              { matches_played: { $gt: 0 } },
              { matchesPlayed: { $gt: 0 } },
            ],
          },
          {
            $or: [
              { is_active: true },
              { isActive: true },
              { is_active: { $exists: false } },
              { isActive: { $exists: false } },
            ],
          },
        ],
      },
    },
    {
      $group: {
        _id: "$player_id",
        positions: { $addToSet: "$position" },
      },
    },
  ])

  const playerDocs = await PlayerModel.find({
    _id: { $in: groupedPlayerCompetitions.map((item) => item._id) },
  })
    .select("_id player_id")
    .lean<Array<{ _id: mongoose.Types.ObjectId; player_id: number }>>()

  const basePlayers = playerDocs.map((player) => ({
    _id: player._id,
    player_id: player.player_id,
    positions: groupedPlayerCompetitions.find((item) => item._id.toString() === player._id.toString())?.positions ?? [],
  }))

  return {
    gk: basePlayers.filter((player) => player.positions.includes("GK")),
    def: basePlayers.filter((player) => player.positions.some((position: string) => ["CB", "LB", "RB"].includes(position))),
    mid: basePlayers.filter((player) => player.positions.some((position: string) => ["CM", "DM", "AM"].includes(position))),
    att: basePlayers.filter((player) => player.positions.some((position: string) => ["LW", "RW", "ST"].includes(position))),
  }
}

type FantasyHomeActivityItem = FantasyLeagueDetail["home"]["activity"][number]
type FantasyScoringPositionGroup = "GK" | "DEF" | "MID" | "ATT"

let fantasyPriceIndexesEnsured = false
let fantasyProcessedIndexesEnsured = false

async function ensureFantasyPriceIndexes() {
  if (fantasyPriceIndexesEnsured) {
    return
  }

  const collection = FantasyPlayerPriceModel.collection
  const indexes = await collection.indexes()
  const legacyIndex = indexes.find((index) => index.name === "fantasySeasonId_1_playerObjectId_1")

  if (legacyIndex) {
    await collection.dropIndex("fantasySeasonId_1_playerObjectId_1")
  }

  await collection.createIndex(
    { fantasySeasonId: 1, competitionObjectId: 1, playerObjectId: 1 },
    { unique: true, name: "fantasySeasonId_1_competitionObjectId_1_playerObjectId_1" }
  )

  fantasyPriceIndexesEnsured = true
}

async function ensureFantasyProcessedIndexes() {
  if (fantasyProcessedIndexesEnsured) {
    return
  }

  const collection = FantasyProcessedStatModel.collection
  const indexes = await collection.indexes()
  const legacyIndex = indexes.find((index) => index.name === "leagueId_1_playerMatchStatsId_1")

  if (legacyIndex) {
    await collection.dropIndex("leagueId_1_playerMatchStatsId_1")
  }

  await collection.createIndex(
    { leagueId: 1, userId: 1, playerMatchStatsId: 1 },
    { unique: true, name: "leagueId_1_userId_1_playerMatchStatsId_1" }
  )

  fantasyProcessedIndexesEnsured = true
}

function getOpenFormationSlots(formation: string): Array<"GK" | "DEF" | "MID" | "ATT"> {
  const [gkRaw, defRaw, midRaw, attRaw] = formation.split("-").map((value) => Number.parseInt(value, 10))
  const gk = Number.isFinite(gkRaw) ? gkRaw : 1
  const def = Number.isFinite(defRaw) ? defRaw : 2
  const mid = Number.isFinite(midRaw) ? midRaw : 1
  const att = Number.isFinite(attRaw) ? attRaw : 3

  return [
    ...Array.from({ length: gk }, () => "GK" as const),
    ...Array.from({ length: def }, () => "DEF" as const),
    ...Array.from({ length: mid }, () => "MID" as const),
    ...Array.from({ length: att }, () => "ATT" as const),
  ]
}

function buildEmptyOpenSlots(formation: string) {
  return getOpenFormationSlots(formation).map((_, slotIndex) => ({
    slotIndex,
    playerObjectId: null,
    player_id: null,
  }))
}

async function getCompetitionCandidatePlayers(
  competitionObjectId: mongoose.Types.ObjectId,
  excludedPlayerIds: mongoose.Types.ObjectId[]
) {
  const teamCompetitions = await TeamCompetitionModel.find({ competition_id: competitionObjectId })
    .select("_id kits team_id")
    .lean<Array<{
      _id: mongoose.Types.ObjectId
      team_id?: mongoose.Types.ObjectId
      kits?: Array<{ image?: string; color?: string }>
    }>>()

  if (!teamCompetitions.length) {
    return []
  }

  const groupedPlayerCompetitions = await PlayerCompetitionModel.aggregate<{
    _id: mongoose.Types.ObjectId
    teamCompetitionId: mongoose.Types.ObjectId
    position: string | null
    matchesPlayed: number
  }>([
    {
      $match: {
        team_competition_id: { $in: teamCompetitions.map((item) => item._id) },
        player_id: { $nin: excludedPlayerIds },
        $or: [
          { matches_played: { $gt: 0 } },
          { matchesPlayed: { $gt: 0 } },
        ],
      },
    },
    {
      $addFields: {
        normalizedMatchesPlayed: {
          $ifNull: ["$matches_played", "$matchesPlayed"],
        },
      },
    },
    { $sort: { normalizedMatchesPlayed: -1 } },
    {
      $group: {
        _id: "$player_id",
        teamCompetitionId: { $first: "$team_competition_id" },
        position: { $first: "$position" },
        matchesPlayed: { $first: "$normalizedMatchesPlayed" },
      },
    },
  ])

  const playerDocs = await PlayerModel.find({
    _id: { $in: groupedPlayerCompetitions.map((item) => item._id) },
  })
    .select("_id player_id player_name country avatar")
    .lean<Array<{
      _id: mongoose.Types.ObjectId
      player_id: number
      player_name: string
      country: string
      avatar?: string
    }>>()

  const teamIds = teamCompetitions
    .map((item) => item.team_id)
    .filter((value): value is mongoose.Types.ObjectId => Boolean(value))

  const rawTeams = teamIds.length
    ? await TeamModel.collection
        .find({ _id: { $in: teamIds } }, { projection: { _id: 1, team_name: 1, teamName: 1, image: 1 } })
        .toArray() as Array<{ _id: mongoose.Types.ObjectId; team_name?: string; teamName?: string; image?: string }>
      : []

  const teamMetaById = new Map(
    rawTeams.map((team) => [
      team._id.toString(),
      {
        teamName: team.team_name ?? team.teamName ?? "",
        teamImage: normalizeTeamImageUrl(team.image),
      },
    ])
  )
  const teamCompetitionById = new Map(
    teamCompetitions.map((item) => {
      const kit = item.kits?.find((entry) => normalizeTeamImageUrl(entry?.image))
      return [
        item._id.toString(),
        {
          teamName: item.team_id ? teamMetaById.get(item.team_id.toString())?.teamName ?? "" : "",
          teamImage: item.team_id ? teamMetaById.get(item.team_id.toString())?.teamImage ?? "" : "",
          kitImage: normalizeTeamImageUrl(kit?.image),
          kitTextColor: getKitTextColor(kit?.color),
        },
      ]
    })
  )

  return playerDocs.map((player) => {
    const competitionRow = groupedPlayerCompetitions.find((item) => item._id.toString() === player._id.toString())
    const visuals = competitionRow ? teamCompetitionById.get(competitionRow.teamCompetitionId.toString()) : null

    return {
      _id: player._id,
      player_id: player.player_id,
      player_name: player.player_name,
      country: player.country,
      avatar: player.avatar ?? undefined,
      position: competitionRow?.position ?? null,
      teamName: visuals?.teamName ?? "",
      teamImage: visuals?.teamImage ?? "",
      kitImage: visuals?.kitImage ?? "",
      kitTextColor: visuals?.kitTextColor ?? "",
    }
  })
}

function getMarketDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)

  const year = Number(parts.find((part) => part.type === "year")?.value ?? "0")
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "1")
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "1")

  return new Date(Date.UTC(year, month - 1, day))
}

async function settleExpiredFantasyMarketDays(
  league: {
    _id: mongoose.Types.ObjectId
    fantasySeasonId: mongoose.Types.ObjectId
    competitionObjectId?: mongoose.Types.ObjectId | null
  },
  currentMarketDate: Date
) {
  const expiredMarketDays = await FantasyMarketDayModel.find({
    leagueId: league._id,
    marketDate: { $lt: currentMarketDate },
    status: { $ne: "settled" },
  })
    .sort({ marketDate: 1 })
    .lean<Array<{
      _id: mongoose.Types.ObjectId
      marketDate: Date
      status: "open" | "closed" | "settled"
      listings: Array<{
        playerObjectId: mongoose.Types.ObjectId
        player_id: number
        basePrice: number
        minBid: number
        sellerUserId?: mongoose.Types.ObjectId | null
        soldToUserId?: mongoose.Types.ObjectId | null
        winningBidAmount?: number | null
      }>
    }>>()

  if (!expiredMarketDays.length) {
    return
  }

  const rosters = await FantasyRosterModel.find({ leagueId: league._id })
    .select("_id userId budgetRemaining")
    .lean<Array<{
      _id: mongoose.Types.ObjectId
      userId: mongoose.Types.ObjectId
      budgetRemaining: number
    }>>()

  const rosterByUserId = new Map(
    rosters.map((roster) => [
      roster.userId.toString(),
      {
        rosterId: roster._id,
        budgetRemaining: roster.budgetRemaining,
      },
    ])
  )

  for (const marketDay of expiredMarketDays) {
    const bids = await FantasyBidModel.find({ marketDayId: marketDay._id })
      .sort({ amount: -1, createdAt: 1 })
      .select("userId playerObjectId player_id amount createdAt")
      .lean<Array<{
        userId: mongoose.Types.ObjectId
        playerObjectId: mongoose.Types.ObjectId
        player_id: number
        amount: number
        createdAt: Date
      }>>()

    const winningBidsByPlayerId = new Map<
      string,
      {
        userId: mongoose.Types.ObjectId
        playerObjectId: mongoose.Types.ObjectId
        player_id: number
        amount: number
        createdAt: Date
      }
    >()

    for (const bid of bids) {
      const playerKey = bid.playerObjectId.toString()
      if (!winningBidsByPlayerId.has(playerKey)) {
        winningBidsByPlayerId.set(playerKey, bid)
      }
    }

    const winningBids = [...winningBidsByPlayerId.values()].sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount
      return a.createdAt.getTime() - b.createdAt.getTime()
    })

    const settledListings = marketDay.listings.map((listing) => ({
      ...listing,
      sellerUserId: listing.sellerUserId ?? null,
      soldToUserId: null as mongoose.Types.ObjectId | null,
      winningBidAmount: null as number | null,
    }))

    for (const winningBid of winningBids) {
      const roster = rosterByUserId.get(winningBid.userId.toString())
      if (!roster || roster.budgetRemaining < winningBid.amount) {
        continue
      }

      const alreadyOwned = await FantasyRosterSlotModel.exists({
        leagueId: league._id,
        playerObjectId: winningBid.playerObjectId,
      })

      if (alreadyOwned) {
        continue
      }

      const currentPriceDoc = await FantasyPlayerPriceModel.findOne({
        fantasySeasonId: league.fantasySeasonId,
        competitionObjectId: league.competitionObjectId,
        playerObjectId: winningBid.playerObjectId,
      })
        .select("price")
        .lean<{ price?: number } | null>()

      const currentValue = currentPriceDoc?.price ?? 10

      const sourceListing = settledListings.find(
        (listing) => listing.playerObjectId.toString() === winningBid.playerObjectId.toString()
      )

      try {
        await FantasyRosterSlotModel.create({
          leagueId: league._id,
          userId: winningBid.userId,
          rosterId: roster.rosterId,
          playerObjectId: winningBid.playerObjectId,
          player_id: winningBid.player_id,
          slot: "BENCH",
          purchasePrice: winningBid.amount,
          currentValue,
          releaseClause: Math.max(currentValue, winningBid.amount) * 2,
          acquiredBy: "market",
          isOnMarket: false,
        })
      } catch {
        continue
      }

      roster.budgetRemaining -= winningBid.amount

      await FantasyRosterModel.findByIdAndUpdate(roster.rosterId, {
        $inc: { budgetRemaining: -winningBid.amount },
      })

      if (sourceListing?.sellerUserId) {
        const sellerRoster = rosterByUserId.get(sourceListing.sellerUserId.toString())

        if (sellerRoster) {
          sellerRoster.budgetRemaining += winningBid.amount
          await FantasyRosterModel.findByIdAndUpdate(sellerRoster.rosterId, {
            $inc: { budgetRemaining: winningBid.amount },
          })
        }

        await FantasyRosterSlotModel.deleteOne({
          leagueId: league._id,
          userId: sourceListing.sellerUserId,
          playerObjectId: winningBid.playerObjectId,
        })
      }

      const listingIndex = settledListings.findIndex(
        (listing) => listing.playerObjectId.toString() === winningBid.playerObjectId.toString()
      )

      if (listingIndex >= 0) {
        settledListings[listingIndex] = {
          ...settledListings[listingIndex],
          soldToUserId: winningBid.userId,
          winningBidAmount: winningBid.amount,
        }
      }
    }

    for (const listing of settledListings) {
      if (listing.sellerUserId && !listing.soldToUserId) {
        const sellerRoster = rosterByUserId.get(listing.sellerUserId.toString())
        const payout = Math.max(1, Math.round(listing.basePrice * (0.95 + Math.random() * 0.1)))

        if (sellerRoster) {
          sellerRoster.budgetRemaining += payout
          await FantasyRosterModel.findByIdAndUpdate(sellerRoster.rosterId, {
            $inc: { budgetRemaining: payout },
          })
        }

        await FantasyRosterSlotModel.deleteOne({
          leagueId: league._id,
          userId: listing.sellerUserId,
          playerObjectId: listing.playerObjectId,
        })

        const listingIndex = settledListings.findIndex(
          (item) => item.playerObjectId.toString() === listing.playerObjectId.toString()
        )

        if (listingIndex >= 0) {
          settledListings[listingIndex] = {
            ...settledListings[listingIndex],
            winningBidAmount: payout,
          }
        }
      }
    }

    await FantasyMarketDayModel.findByIdAndUpdate(marketDay._id, {
      $set: {
        status: "settled",
        listings: settledListings,
      },
    })
  }
}

async function updateCompetitionPlayerPricesOnMarketReset(
  league: {
    _id: mongoose.Types.ObjectId
    fantasySeasonId: mongoose.Types.ObjectId
    competitionObjectId?: mongoose.Types.ObjectId | null
  },
  currentMarketDate: Date
) {
  if (!league.competitionObjectId) {
    return
  }

  const competition = await CompetitionModel.findById(league.competitionObjectId)
    .select("start_date startDate")
    .lean<{ start_date?: Date; startDate?: Date } | null>()

  const competitionStartDate = competition?.start_date ?? competition?.startDate ?? currentMarketDate
  const currentWeek = getCurrentFantasyWeekNumber(new Date(competitionStartDate), currentMarketDate)

  const prices = await FantasyPlayerPriceModel.find({
    fantasySeasonId: league.fantasySeasonId,
    competitionObjectId: league.competitionObjectId,
  })
    .select("playerObjectId player_id price lastUpdatedGameweek")
    .lean<Array<{
      playerObjectId: mongoose.Types.ObjectId
      player_id: number
      price: number
      lastUpdatedGameweek?: number
    }>>()

  const stalePrices = prices.filter((price) => Number(price.lastUpdatedGameweek ?? 0) < currentWeek)

  if (!stalePrices.length) {
    return
  }

  const competitionMatches = await MatchModel.find({ competition_id: league.competitionObjectId })
    .select("_id comments")
    .lean<Array<{ _id: mongoose.Types.ObjectId; comments?: string | null }>>()

  const currentWeekMatchIds = competitionMatches
    .filter((match) => {
      const matchday = extractMatchdayFromComments(match.comments)
      return matchday ? Math.ceil(matchday / 2) === currentWeek : false
    })
    .map((match) => match._id)

  if (!currentWeekMatchIds.length) {
    await FantasyPlayerPriceModel.updateMany(
      {
        fantasySeasonId: league.fantasySeasonId,
        competitionObjectId: league.competitionObjectId,
        playerObjectId: { $in: stalePrices.map((price) => price.playerObjectId) },
      },
      {
        $set: {
          lastUpdatedGameweek: currentWeek,
          changePercent: 0,
          changeDirection: "flat",
        },
      }
    )
    return
  }

  const currentWeekStats = await PlayerMatchStatsModel.find({
    match_id: { $in: currentWeekMatchIds },
  })
    .select("player_competition_id position goals assists preassists cs goals_conceded saves clearances recoveries shots_on_goal won draw lost")
    .lean<Array<{
      player_competition_id: mongoose.Types.ObjectId
      position?: string | null
      goals?: number
      assists?: number
      preassists?: number
      cs?: number
      goals_conceded?: number
      saves?: number
      clearances?: number
      recoveries?: number
      shots_on_goal?: number
      won?: number
      draw?: number
      lost?: number
    }>>()

  const playerCompetitionIds = [...new Set(currentWeekStats.map((stat) => stat.player_competition_id.toString()))]
  const playerCompetitions = playerCompetitionIds.length
    ? await PlayerCompetitionModel.find({ _id: { $in: playerCompetitionIds.map((id) => new mongoose.Types.ObjectId(id)) } })
        .select("_id player_id")
        .lean<Array<{ _id: mongoose.Types.ObjectId; player_id: mongoose.Types.ObjectId }>>()
    : []

  const playerObjectIdByCompetitionId = new Map(
    playerCompetitions.map((entry) => [entry._id.toString(), entry.player_id.toString()])
  )

  const scoreByPlayerId = new Map<string, number>()
  for (const stat of currentWeekStats) {
    const playerObjectId = playerObjectIdByCompetitionId.get(stat.player_competition_id.toString())
    if (!playerObjectId) continue
    const statPoints = scorePlayerMatchStats({
      position: stat.position,
      goals: stat.goals,
      assists: stat.assists,
      preassists: stat.preassists,
      cs: stat.cs,
      goalsConceded: stat.goals_conceded,
      saves: stat.saves,
      clearances: stat.clearances,
      recoveries: stat.recoveries,
      shotsOnGoal: stat.shots_on_goal,
      won: stat.won,
      draw: stat.draw,
      lost: stat.lost,
    })
    scoreByPlayerId.set(playerObjectId, (scoreByPlayerId.get(playerObjectId) ?? 0) + statPoints)
  }

  const historyRows: Array<{
    fantasySeasonId: mongoose.Types.ObjectId
    competitionObjectId: mongoose.Types.ObjectId
    playerObjectId: mongoose.Types.ObjectId
    player_id: number
    gameweek: number
    oldPrice: number
    newPrice: number
    delta: number
    reason: string
  }> = []

  for (const price of stalePrices) {
    const points = scoreByPlayerId.get(price.playerObjectId.toString()) ?? 0
    let changePercent = 0

    if (points >= 14) changePercent = 10
    else if (points >= 10) changePercent = 7
    else if (points >= 6) changePercent = 4
    else if (points <= -6) changePercent = -10
    else if (points <= -3) changePercent = -6
    else if (points <= 0 && currentWeekMatchIds.length > 0) changePercent = -3

    const multiplier = 1 + changePercent / 100
    const newPrice = Math.max(4000, Math.round(price.price * multiplier))
    const delta = newPrice - price.price
    const changeDirection = delta > 0 ? "up" : delta < 0 ? "down" : "flat"

    await FantasyPlayerPriceModel.updateOne(
      {
        fantasySeasonId: league.fantasySeasonId,
        competitionObjectId: league.competitionObjectId,
        playerObjectId: price.playerObjectId,
      },
      {
        $set: {
          previousPrice: price.price,
          price: newPrice,
          changePercent: Math.abs(changePercent),
          changeDirection,
          lastUpdatedGameweek: currentWeek,
        },
      }
    )

    if (delta !== 0) {
      historyRows.push({
        fantasySeasonId: league.fantasySeasonId,
        competitionObjectId: league.competitionObjectId,
        playerObjectId: price.playerObjectId,
        player_id: price.player_id,
        gameweek: currentWeek,
        oldPrice: price.price,
        newPrice,
        delta,
        reason: `Week ${currentWeek} market reset`,
      })
    }
  }

  if (historyRows.length) {
    await FantasyPlayerPriceHistoryModel.insertMany(historyRows)
  }

  const updatedPrices = await FantasyPlayerPriceModel.find({
    fantasySeasonId: league.fantasySeasonId,
    competitionObjectId: league.competitionObjectId,
    playerObjectId: { $in: stalePrices.map((price) => price.playerObjectId) },
  })
    .select("playerObjectId price")
    .lean<Array<{ playerObjectId: mongoose.Types.ObjectId; price: number }>>()

  const updatedPriceByPlayerId = new Map(
    updatedPrices.map((price) => [price.playerObjectId.toString(), price.price])
  )

  for (const price of stalePrices) {
    const nextPrice = updatedPriceByPlayerId.get(price.playerObjectId.toString())
    if (!nextPrice) continue
    await FantasyRosterSlotModel.updateMany(
      { leagueId: league._id, playerObjectId: price.playerObjectId },
      { $set: { currentValue: nextPrice } }
    )
  }
}

async function ensureFantasyMarketDay(leagueId: mongoose.Types.ObjectId) {
  const league = await FantasyLeagueModel.findById(leagueId)
    .select("competitionObjectId fantasySeasonId")
    .lean<{
      _id: mongoose.Types.ObjectId
      competitionObjectId?: mongoose.Types.ObjectId | null
      fantasySeasonId: mongoose.Types.ObjectId
    } | null>()

  if (!league) {
    throw new Error("La liga fantasy no existe.")
  }

  const marketDate = getMarketDateKey()
  await settleExpiredFantasyMarketDays(league, marketDate)
  await updateCompetitionPlayerPricesOnMarketReset(league, marketDate)
  let marketDay = await FantasyMarketDayModel.findOne({
    leagueId,
    marketDate,
  })
    .lean<{
      _id: mongoose.Types.ObjectId
      leagueId: mongoose.Types.ObjectId
      marketDate: Date
      status: "open" | "closed" | "settled"
      listings: Array<{
        playerObjectId: mongoose.Types.ObjectId
        player_id: number
        basePrice: number
        minBid: number
        sellerUserId?: mongoose.Types.ObjectId | null
        soldToUserId?: mongoose.Types.ObjectId | null
        winningBidAmount?: number | null
      }>
    } | null>()

  if (marketDay) {
    return marketDay
  }

  if (!league.competitionObjectId) {
    return null
  }

  const ownedPlayerIds = await FantasyRosterSlotModel.find({ leagueId })
    .select("playerObjectId")
    .lean<Array<{ playerObjectId: mongoose.Types.ObjectId }>>()

  const candidates = await getCompetitionCandidatePlayers(
    league.competitionObjectId,
    ownedPlayerIds.map((slot) => slot.playerObjectId)
  )

  const selected = shuffleArray(candidates).slice(0, 12)

  await ensurePlayerPrices(
    league.fantasySeasonId,
    league.competitionObjectId,
    selected.map((player) => ({ _id: player._id, player_id: player.player_id }))
  )

  const prices = await FantasyPlayerPriceModel.find({
    fantasySeasonId: league.fantasySeasonId,
    competitionObjectId: league.competitionObjectId,
    playerObjectId: { $in: selected.map((player) => player._id) },
  })
    .select("playerObjectId price changePercent changeDirection")
    .lean<Array<{
      playerObjectId: mongoose.Types.ObjectId
      price: number
      changePercent?: number
      changeDirection?: "up" | "down" | "flat"
    }>>()

  const priceByPlayerId = new Map(prices.map((price) => [price.playerObjectId.toString(), price]))

  const created = await FantasyMarketDayModel.create({
    leagueId,
    marketDate,
    status: "open",
    listings: selected.map((player) => {
      const priceDoc = priceByPlayerId.get(player._id.toString())
      const basePrice = priceDoc?.price ?? 10

      return {
        playerObjectId: player._id,
        player_id: player.player_id,
        basePrice,
        minBid: basePrice,
        sellerUserId: null,
      }
    }),
  })

  marketDay = {
    _id: created._id,
    leagueId: created.leagueId,
    marketDate: created.marketDate,
    status: created.status,
    listings: created.listings.map((listing: {
      playerObjectId: mongoose.Types.ObjectId
      player_id: number
      basePrice: number
      minBid: number
      sellerUserId?: mongoose.Types.ObjectId | null
      soldToUserId?: mongoose.Types.ObjectId | null
      winningBidAmount?: number | null
    }) => ({
      playerObjectId: listing.playerObjectId,
      player_id: listing.player_id,
      basePrice: listing.basePrice,
      minBid: listing.minBid,
      sellerUserId: listing.sellerUserId ?? null,
      soldToUserId: listing.soldToUserId ?? null,
      winningBidAmount: listing.winningBidAmount ?? null,
    })),
  }

  return marketDay
}

async function ensureFantasyWeekLineups(
  leagueId: mongoose.Types.ObjectId,
  week: number
) {
  const existingLineups = await FantasyWeekLineupModel.find({ leagueId, week })
    .select("userId")
    .lean<Array<{ userId: mongoose.Types.ObjectId }>>()

  const existingUserIds = new Set(existingLineups.map((entry) => entry.userId.toString()))
  const members = await FantasyLeagueMemberModel.find({ leagueId })
    .select("userId")
    .lean<Array<{ userId: mongoose.Types.ObjectId }>>()

  const missingUserIds = members
    .map((member) => member.userId)
    .filter((userId) => !existingUserIds.has(userId.toString()))

  if (!missingUserIds.length) {
    return
  }

  const slots = await FantasyRosterSlotModel.find({ leagueId, userId: { $in: missingUserIds } })
    .select("userId playerObjectId player_id slot")
    .lean<Array<{
      userId: mongoose.Types.ObjectId
      playerObjectId: mongoose.Types.ObjectId
      player_id: number
      slot: "GK" | "DEF" | "MID" | "ATT" | "FLEX" | "BENCH"
    }>>()

  const slotsByUserId = new Map<string, typeof slots>()
  for (const slot of slots) {
    const key = slot.userId.toString()
    const current = slotsByUserId.get(key) ?? []
    current.push(slot)
    slotsByUserId.set(key, current)
  }

  const lineupDocs = missingUserIds.map((userId) => {
    const userSlots = slotsByUserId.get(userId.toString()) ?? []
    const starters = userSlots
      .filter((slot) => slot.slot !== "BENCH")
      .map((slot) => ({
        playerObjectId: slot.playerObjectId,
        player_id: slot.player_id,
        slot: slot.slot,
      }))

    const bench = userSlots
      .filter((slot) => slot.slot === "BENCH")
      .map((slot) => ({
        playerObjectId: slot.playerObjectId,
        player_id: slot.player_id,
        slot: slot.slot,
      }))

    return {
      leagueId,
      userId,
      week,
      formation: inferFormationFromSlots(starters),
      starters,
      bench,
      lockedAt: new Date(),
    }
  })

  if (lineupDocs.length) {
    await FantasyWeekLineupModel.insertMany(lineupDocs, { ordered: false }).catch(() => undefined)
  }
}

async function ensureFantasyOpenWeekLineups(
  leagueId: mongoose.Types.ObjectId,
  week: number
) {
  const existingLineups = await FantasyOpenWeekLineupModel.find({ leagueId, week })
    .select("userId")
    .lean<Array<{ userId: mongoose.Types.ObjectId }>>()

  const existingUserIds = new Set(existingLineups.map((entry) => entry.userId.toString()))
  const members = await FantasyLeagueMemberModel.find({ leagueId })
    .select("userId")
    .lean<Array<{ userId: mongoose.Types.ObjectId }>>()

  const missingUserIds = members
    .map((member) => member.userId)
    .filter((userId) => !existingUserIds.has(userId.toString()))

  if (!missingUserIds.length) {
    return
  }

  const previousWeekLineups = week > 1
    ? await FantasyOpenWeekLineupModel.find({ leagueId, week: week - 1, userId: { $in: missingUserIds } })
        .select("userId formation slots")
        .lean<Array<{
          userId: mongoose.Types.ObjectId
          formation: string
          slots: Array<{ slotIndex: number; playerObjectId?: mongoose.Types.ObjectId | null; player_id?: number | null }>
        }>>()
    : []

  const previousLineupByUserId = new Map(
    previousWeekLineups.map((lineup) => [lineup.userId.toString(), lineup])
  )

  const lineupDocs = missingUserIds.map((userId) => {
    const previousLineup = previousLineupByUserId.get(userId.toString())
    const formation = previousLineup?.formation ?? "1-2-1-3"
    const slots = previousLineup?.slots?.length
      ? previousLineup.slots.map((slot) => ({
          slotIndex: slot.slotIndex,
          playerObjectId: slot.playerObjectId ?? null,
          player_id: slot.player_id ?? null,
        }))
      : buildEmptyOpenSlots(formation)

    return {
      leagueId,
      userId,
      week,
      formation,
      slots,
      lockedAt: new Date(),
    }
  })

  if (lineupDocs.length) {
    await FantasyOpenWeekLineupModel.insertMany(lineupDocs, { ordered: false }).catch(() => undefined)
  }
}

async function syncFantasyLeagueStats(leagueId: mongoose.Types.ObjectId) {
  await ensureFantasyProcessedIndexes()

  const league = await FantasyLeagueModel.findById(leagueId)
    .select("competitionObjectId leagueType")
    .lean<{ competitionObjectId?: mongoose.Types.ObjectId | null; leagueType?: FantasyLeagueType | null } | null>()

  if (!league?.competitionObjectId) {
    return
  }

  const competition = await CompetitionModel.findById(league.competitionObjectId)
    .select("start_date startDate")
    .lean<{ start_date?: Date; startDate?: Date } | null>()

  const competitionStartDate = competition?.start_date ?? competition?.startDate ?? new Date()
  const currentWeek = getCurrentFantasyWeekNumber(new Date(competitionStartDate))
  if (league.leagueType === "open") {
    await ensureFantasyOpenWeekLineups(leagueId, currentWeek)
  } else {
    await ensureFantasyWeekLineups(leagueId, currentWeek)
  }

  const matches = await MatchModel.find({ competition_id: league.competitionObjectId })
    .select("_id comments")
    .lean<Array<{ _id: mongoose.Types.ObjectId; comments?: string | null }>>()

  const weekByMatchId = new Map<string, number>()
  for (const match of matches) {
    const matchday = extractMatchdayFromComments(match.comments)
    if (!matchday) continue
    weekByMatchId.set(match._id.toString(), Math.ceil(matchday / 2))
  }

  if (!weekByMatchId.size) {
    return
  }

  const rawStats = await PlayerMatchStatsModel.collection
    .find(
      { match_id: { $in: [...weekByMatchId.keys()].map((id) => new mongoose.Types.ObjectId(id)) } },
      {
        projection: {
          _id: 1,
          match_id: 1,
          player_competition_id: 1,
          position: 1,
          goals: 1,
          assists: 1,
          preassists: 1,
          shots_on_goal: 1,
          shotsOnGoal: 1,
          goals_conceded: 1,
          goalsConceded: 1,
          saves: 1,
          clearances: 1,
          recoveries: 1,
          cs: 1,
          won: 1,
          draw: 1,
          lost: 1,
        },
      }
    )
    .toArray() as Array<{
      _id: mongoose.Types.ObjectId
      match_id: mongoose.Types.ObjectId
      player_competition_id?: mongoose.Types.ObjectId
      position?: string
      goals?: number
      assists?: number
      preassists?: number
      shots_on_goal?: number
      shotsOnGoal?: number
      goals_conceded?: number
      goalsConceded?: number
      saves?: number
      clearances?: number
      recoveries?: number
      cs?: number
      won?: number
      draw?: number
      lost?: number
    }>

  const pendingStats = rawStats
  if (!pendingStats.length) {
    return
  }

  const weeksToEnsure = [...new Set(
    pendingStats
      .map((stat) => weekByMatchId.get(stat.match_id.toString()) ?? null)
      .filter((week): week is number => Boolean(week))
  )]

  if (league.leagueType === "open") {
    for (const week of weeksToEnsure) {
      await ensureFantasyOpenWeekLineups(leagueId, week)
    }
  } else {
    for (const week of weeksToEnsure) {
      await ensureFantasyWeekLineups(leagueId, week)
    }
  }

  const starterOwnersByWeek = new Map<
    number,
    Map<string, Array<{ userId: mongoose.Types.ObjectId; slot: "GK" | "DEF" | "MID" | "ATT" | "FLEX" | "BENCH"; playerId: number }>>
  >()

  if (league.leagueType === "open") {
    const openLineups = await FantasyOpenWeekLineupModel.find({ leagueId, week: { $in: weeksToEnsure } })
      .select("userId week formation slots")
      .lean<Array<{
        userId: mongoose.Types.ObjectId
        week: number
        formation: string
        slots: Array<{ slotIndex: number; playerObjectId?: mongoose.Types.ObjectId | null; player_id?: number | null }>
      }>>()

    for (const lineup of openLineups) {
      const current = starterOwnersByWeek.get(lineup.week) ?? new Map()
      const formationSlots = getOpenFormationSlots(lineup.formation)
      for (const slotEntry of lineup.slots) {
        if (!slotEntry.playerObjectId || !slotEntry.player_id) continue
        const slot = formationSlots[slotEntry.slotIndex] ?? "ATT"
        const owners = current.get(slotEntry.playerObjectId.toString()) ?? []
        owners.push({
          userId: lineup.userId,
          slot,
          playerId: slotEntry.player_id,
        })
        current.set(slotEntry.playerObjectId.toString(), owners)
      }
      starterOwnersByWeek.set(lineup.week, current)
    }
  } else {
    const lineups = await FantasyWeekLineupModel.find({ leagueId, week: { $in: weeksToEnsure } })
      .select("userId week starters")
      .lean<Array<{
        userId: mongoose.Types.ObjectId
        week: number
        starters: Array<{
          playerObjectId: mongoose.Types.ObjectId
          player_id: number
          slot: "GK" | "DEF" | "MID" | "ATT" | "FLEX" | "BENCH"
        }>
      }>>()

    for (const lineup of lineups) {
      const current = starterOwnersByWeek.get(lineup.week) ?? new Map()
      for (const starter of lineup.starters) {
        current.set(starter.playerObjectId.toString(), [
          {
            userId: lineup.userId,
            slot: starter.slot,
            playerId: starter.player_id,
          },
        ])
      }
      starterOwnersByWeek.set(lineup.week, current)
    }
  }

  const playerCompetitionIds = pendingStats
    .map((stat) => stat.player_competition_id)
    .filter((value): value is mongoose.Types.ObjectId => Boolean(value))

  const playerCompetitions = await PlayerCompetitionModel.collection
    .find(
      { _id: { $in: playerCompetitionIds } },
      { projection: { _id: 1, player_id: 1 } }
    )
    .toArray() as Array<{ _id: mongoose.Types.ObjectId; player_id?: mongoose.Types.ObjectId }>

  const playerObjectIdByCompetitionId = new Map(
    playerCompetitions
      .filter((entry) => entry.player_id)
      .map((entry) => [entry._id.toString(), entry.player_id as mongoose.Types.ObjectId])
  )

  const processedEntries = await FantasyProcessedStatModel.find({ leagueId })
    .select("userId playerMatchStatsId")
    .lean<Array<{ userId?: mongoose.Types.ObjectId | null; playerMatchStatsId: mongoose.Types.ObjectId }>>()

  const processedKeys = new Set(
    processedEntries
      .filter((entry) => entry.userId)
      .map((entry) => `${entry.userId?.toString()}:${entry.playerMatchStatsId.toString()}`)
  )

  for (const stat of pendingStats) {
    const week = weekByMatchId.get(stat.match_id.toString())
    const playerCompetitionId = stat.player_competition_id?.toString()
    if (!week || !playerCompetitionId) {
      continue
    }

    const playerObjectId = playerObjectIdByCompetitionId.get(playerCompetitionId)
    if (!playerObjectId) {
      continue
    }

    const starterOwners = starterOwnersByWeek.get(week)?.get(playerObjectId.toString()) ?? []
    if (!starterOwners.length) {
      continue
    }

    for (const starterOwner of starterOwners) {
      const processedKey = `${starterOwner.userId.toString()}:${stat._id.toString()}`
      if (processedKeys.has(processedKey)) {
        continue
      }

      const points = scorePlayerMatchStats({
        position: stat.position,
        goals: stat.goals,
        assists: stat.assists,
        preassists: stat.preassists,
        cs: stat.cs,
        goalsConceded: stat.goals_conceded ?? stat.goalsConceded,
        saves: stat.saves,
        clearances: stat.clearances,
        recoveries: stat.recoveries,
        shotsOnGoal: stat.shots_on_goal ?? stat.shotsOnGoal,
        won: stat.won,
        draw: stat.draw,
        lost: stat.lost,
      })

      await FantasyProcessedStatModel.create({
        leagueId,
        week,
        playerMatchStatsId: stat._id,
        playerObjectId,
        player_id: starterOwner.playerId,
        userId: starterOwner.userId,
        points,
      }).catch(() => undefined)
      processedKeys.add(processedKey)

      await FantasyWeekScoreModel.findOneAndUpdate(
        { leagueId, userId: starterOwner.userId, week },
        {
          $inc: { points },
          $push: {
            entries: {
              playerMatchStatsId: stat._id,
              matchId: stat.match_id,
              playerObjectId,
              player_id: starterOwner.playerId,
              slot: starterOwner.slot,
              position: stat.position ?? "ATT",
              points,
            },
          },
        },
        { upsert: true }
      )
    }
  }

  if (league.leagueType === "market") {
    await grantFantasyWeekRewards(leagueId, currentWeek)
  }
}

async function grantFantasyWeekRewards(leagueId: mongoose.Types.ObjectId, currentWeek: number) {
  const weeksToReward = [...Array.from({ length: Math.max(currentWeek - 1, 0) }, (_, index) => index + 1)]
  if (!weeksToReward.length) {
    return
  }

  const existingRewards = await FantasyWeekRewardModel.find({
    leagueId,
    week: { $in: weeksToReward },
  })
    .select("userId week")
    .lean<Array<{ userId: mongoose.Types.ObjectId; week: number }>>()

  const rewardedKeys = new Set(existingRewards.map((reward) => `${reward.week}:${reward.userId.toString()}`))

  const weekScores = await FantasyWeekScoreModel.find({
    leagueId,
    week: { $in: weeksToReward },
  })
    .select("userId week points entries")
    .lean<
      Array<{
        userId: mongoose.Types.ObjectId
        week: number
        points: number
        entries: Array<{ playerMatchStatsId: mongoose.Types.ObjectId }>
      }>
    >()

  if (!weekScores.length) {
    return
  }

  const statsByWeek = new Map<number, typeof weekScores>()
  for (const score of weekScores) {
    const current = statsByWeek.get(score.week) ?? []
    current.push(score)
    statsByWeek.set(score.week, current)
  }

  const allPlayerMatchStatsIds = [...new Set(
    weekScores.flatMap((score) => score.entries.map((entry) => entry.playerMatchStatsId.toString()))
  )].map((id) => new mongoose.Types.ObjectId(id))

  const playerMatchStats = allPlayerMatchStatsIds.length
    ? await PlayerMatchStatsModel.collection
        .find(
          { _id: { $in: allPlayerMatchStatsIds } },
          { projection: { _id: 1, goals: 1 } }
        )
        .toArray() as Array<{ _id: mongoose.Types.ObjectId; goals?: number }>
    : []

  const goalsByStatId = new Map(playerMatchStats.map((stat) => [stat._id.toString(), Number(stat.goals ?? 0)]))

  for (const week of weeksToReward) {
    const scores = (statsByWeek.get(week) ?? [])
      .sort((a, b) => Number(b.points ?? 0) - Number(a.points ?? 0))

    if (!scores.length) {
      continue
    }

    for (let index = 0; index < scores.length; index += 1) {
      const score = scores[index]
      const rewardKey = `${week}:${score.userId.toString()}`
      if (rewardedKeys.has(rewardKey)) {
        continue
      }

      const rankPosition = index + 1
      const weeklyBonus = WEEKLY_RECHARGE_COINS
      const pointsBonus = Math.floor(Number(score.points ?? 0) / WEEK_POINTS_BONUS_STEP) * WEEK_POINTS_BONUS_COINS
      const goalsBonus =
        score.entries.reduce((sum, entry) => sum + (goalsByStatId.get(entry.playerMatchStatsId.toString()) ?? 0), 0) *
        WEEK_GOAL_BONUS_COINS
      const rankBonus = WEEK_RANK_BONUS[rankPosition] ?? 0
      const totalBonus = weeklyBonus + pointsBonus + goalsBonus + rankBonus

      await FantasyWeekRewardModel.create({
        leagueId,
        userId: score.userId,
        week,
        weeklyBonus,
        pointsBonus,
        goalsBonus,
        rankBonus,
        totalBonus,
        rankPosition,
      }).catch(() => undefined)

      if (totalBonus > 0) {
        await FantasyRosterModel.updateOne(
          { leagueId, userId: score.userId },
          { $inc: { budgetRemaining: totalBonus } }
        )
      }

      rewardedKeys.add(rewardKey)
    }
  }
}

async function assignRandomRoster(
  league: {
    _id: mongoose.Types.ObjectId
    fantasySeasonId: mongoose.Types.ObjectId
    budget: number
    squadSize: number
    competitionObjectId?: mongoose.Types.ObjectId | null
  },
  rosterId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId
) {
  const existingSlotCount = await FantasyRosterSlotModel.countDocuments({ rosterId })

  if (existingSlotCount > 0) {
    return
  }

  const ownedPlayerIds = await FantasyRosterSlotModel.find({ leagueId: league._id })
    .select("playerObjectId")
    .lean<Array<{ playerObjectId: mongoose.Types.ObjectId }>>()

  const excludedIds = ownedPlayerIds.map((slot) => slot.playerObjectId)

  let availablePlayers: Array<{
    _id: mongoose.Types.ObjectId
    player_id: number
    slot: "GK" | "DEF" | "MID" | "ATT" | "FLEX" | "BENCH"
  }> = []

  if (league.competitionObjectId) {
    const groupedPlayers = await getCompetitionPlayersByGroup(league.competitionObjectId, excludedIds)
    const selectedPlayerIds = new Set<string>()

    const pickPlayers = (
      players: Array<{ _id: mongoose.Types.ObjectId; player_id: number }>,
      amount: number,
      slot: "GK" | "DEF" | "MID" | "ATT"
    ) => {
      const candidates = shuffleArray(
        players.filter((player) => !selectedPlayerIds.has(player._id.toString()))
      ).slice(0, amount)

      if (candidates.length < amount) {
        throw new Error("No hay suficientes jugadores disponibles en esa competition para completar la formacion inicial.")
      }

      for (const candidate of candidates) {
        selectedPlayerIds.add(candidate._id.toString())
        availablePlayers.push({ ...candidate, slot })
      }
    }

    pickPlayers(groupedPlayers.gk, 1, "GK")
    pickPlayers(groupedPlayers.def, 2, "DEF")
    pickPlayers(groupedPlayers.mid, 1, "MID")
    pickPlayers(groupedPlayers.att, 3, "ATT")
  } else {
    const fallbackPlayers = await PlayerModel.aggregate<{ _id: mongoose.Types.ObjectId; player_id: number }>([
      ...(excludedIds.length ? [{ $match: { _id: { $nin: excludedIds } } }] : []),
      { $sample: { size: league.squadSize } },
      { $project: { _id: 1, player_id: 1 } },
    ])

    availablePlayers = fallbackPlayers.map((player, index) => ({
      ...player,
      slot: index < 5 ? "FLEX" : "BENCH",
    }))
  }

  if (availablePlayers.length < league.squadSize) {
    throw new Error("No hay jugadores libres suficientes para generar la plantilla inicial.")
  }

  let prices: Array<{ playerObjectId: mongoose.Types.ObjectId; player_id: number; price: number }> = []

  if (league.competitionObjectId) {
    await ensurePlayerPrices(
      league.fantasySeasonId,
      league.competitionObjectId,
      availablePlayers.map((player) => ({
        _id: player._id,
        player_id: player.player_id,
      }))
    )

    prices = await FantasyPlayerPriceModel.find({
      fantasySeasonId: league.fantasySeasonId,
      competitionObjectId: league.competitionObjectId,
      playerObjectId: { $in: availablePlayers.map((player) => player._id) },
    })
      .select("playerObjectId player_id price")
      .lean<Array<{ playerObjectId: mongoose.Types.ObjectId; player_id: number; price: number }>>()
  }

  const priceByPlayerId = new Map(prices.map((price) => [price.playerObjectId.toString(), price]))
  await FantasyRosterSlotModel.insertMany(
    availablePlayers.map((player, index) => {
      const price = priceByPlayerId.get(player._id.toString())
      const currentValue = price?.price ?? 10

      return {
        leagueId: league._id,
        userId,
        rosterId,
        playerObjectId: player._id,
        player_id: player.player_id,
        slot: player.slot,
        purchasePrice: currentValue,
        currentValue,
        releaseClause: currentValue * 2,
        acquiredBy: "random",
      }
    })
  )

  const captain = availablePlayers[0]
  const viceCaptain = availablePlayers[1]

  await FantasyRosterModel.findByIdAndUpdate(rosterId, {
    $set: {
      budgetRemaining: league.budget,
      captainPlayerId: captain?._id ?? null,
      captainPlayerNumberId: captain?.player_id ?? null,
      viceCaptainPlayerId: viceCaptain?._id ?? null,
      viceCaptainPlayerNumberId: viceCaptain?.player_id ?? null,
    },
  })
}

export async function ensureActiveFantasySeason() {
  await dbConnect()

  const activeSeason = await FantasySeasonModel.findOne({ status: "active" })
    .select("_id name currentGameweek")
    .lean<{ _id: mongoose.Types.ObjectId; name: string; currentGameweek: number } | null>()

  if (activeSeason) {
    return activeSeason
  }

  const now = new Date()
  const season = await FantasySeasonModel.create({
    name: "FFL Fantasy Beta",
    slug: "ffl-fantasy-beta",
    status: "active",
    startDate: now,
    endDate: new Date(now.getFullYear(), 11, 31),
    currentGameweek: 1,
    sourceCompetitionIds: [],
  })

  return {
    _id: season._id,
    name: season.name,
    currentGameweek: season.currentGameweek,
  }
}

export async function createFantasyLeagueForUser(
  discordId: string,
  leagueName: string,
  competitionObjectId: string,
  leagueType: FantasyLeagueType,
  teamName?: string
) {
  await dbConnect()

  const trimmedLeagueName = leagueName.trim()

  if (!trimmedLeagueName) {
    throw new Error("El nombre de la liga fantasy es obligatorio.")
  }

  const user = await getUserByDiscordId(discordId)
  const season = await ensureActiveFantasySeason()
  const competition = await CompetitionModel.findById(competitionObjectId)
    .select("_id competition_id name season season_id start_date startDate")
    .lean<{
      _id: mongoose.Types.ObjectId
      competition_id: string
      name: string
      season?: number | string | null
      season_id?: string | null
      start_date?: Date
      startDate?: Date
    } | null>()

  if (!competition) {
    throw new Error("Debes seleccionar una competition valida.")
  }

  const competitionSeason = competition.season !== null && competition.season !== undefined
    ? Number(competition.season)
    : (
      await resolveSeasonNumbers([competition.season_id])
    ).get(String(competition.season_id ?? "")) ?? extractSeasonValue(competition.season_id)

  const inviteCode = await createUniqueInviteCode()
  const slug = await createUniqueLeagueSlug(trimmedLeagueName, season._id)

  const league = await FantasyLeagueModel.create({
    fantasySeasonId: season._id,
    ownerUserId: user._id,
    leagueType,
    competitionObjectId: competition._id,
    competitionCode: competition.competition_id,
    competitionName: competition.name,
    competitionSeason,
    name: trimmedLeagueName,
    slug,
    inviteCode,
    budget: leagueType === "market" ? TRANSFER_MARKET_STARTING_COINS : 0,
  })

  await FantasyLeagueMemberModel.create({
    leagueId: league._id,
    userId: user._id,
    role: "owner",
    teamName: buildTeamName(teamName || `${trimmedLeagueName} XI`),
  })

  const roster = await FantasyRosterModel.create({
    leagueId: league._id,
    userId: user._id,
    budgetRemaining: leagueType === "market" ? league.budget : 0,
  })

  if (leagueType === "market") {
    await assignRandomRoster(
      {
        _id: league._id,
        fantasySeasonId: league.fantasySeasonId,
        budget: league.budget,
        squadSize: league.squadSize,
        competitionObjectId: league.competitionObjectId,
      },
      roster._id,
      user._id
    )
  } else {
    const competitionStartDate = competition.start_date ?? competition.startDate ?? new Date()
    await ensureFantasyOpenWeekLineups(league._id, getCurrentFantasyWeekNumber(new Date(competitionStartDate)))
  }

  return { inviteCode: league.inviteCode }
}

export async function joinFantasyLeagueByInviteCode(discordId: string, inviteCode: string, teamName?: string) {
  await dbConnect()

  const normalizedCode = inviteCode.trim().toUpperCase()

  if (!normalizedCode) {
    throw new Error("El invite code es obligatorio.")
  }

  const user = await getUserByDiscordId(discordId)
  const league = await FantasyLeagueModel.findOne({ inviteCode: normalizedCode })
    .select("_id fantasySeasonId budget squadSize maxMembers competitionObjectId leagueType")
    .lean<{
      _id: mongoose.Types.ObjectId
      fantasySeasonId: mongoose.Types.ObjectId
      budget: number
      squadSize: number
      maxMembers: number
      competitionObjectId?: mongoose.Types.ObjectId | null
      leagueType?: FantasyLeagueType
    } | null>()

  if (!league) {
    throw new Error("No existe ninguna liga con ese invite code.")
  }

  const existingMember = await FantasyLeagueMemberModel.findOne({
    leagueId: league._id,
    userId: user._id,
  })
    .select("_id")
    .lean<{ _id: mongoose.Types.ObjectId } | null>()

  if (!existingMember) {
    const memberCount = await FantasyLeagueMemberModel.countDocuments({ leagueId: league._id })

    if (memberCount >= league.maxMembers) {
      throw new Error("La liga fantasy ya ha alcanzado el maximo de participantes.")
    }

    await FantasyLeagueMemberModel.create({
      leagueId: league._id,
      userId: user._id,
      role: "member",
      teamName: buildTeamName(teamName),
    })
  }

  let roster = await FantasyRosterModel.findOne({
    leagueId: league._id,
    userId: user._id,
  })
    .select("_id")
    .lean<{ _id: mongoose.Types.ObjectId } | null>()

  if (!roster) {
    const createdRoster = await FantasyRosterModel.create({
      leagueId: league._id,
      userId: user._id,
      budgetRemaining: league.leagueType === "market" ? league.budget : 0,
    })

    roster = { _id: createdRoster._id }
  }

  if (league.leagueType === "market") {
    await assignRandomRoster(league, roster._id, user._id)
  } else if (league.competitionObjectId) {
    const competition = await CompetitionModel.findById(league.competitionObjectId)
      .select("start_date startDate")
      .lean<{ start_date?: Date; startDate?: Date } | null>()
    const competitionStartDate = competition?.start_date ?? competition?.startDate ?? new Date()
    await ensureFantasyOpenWeekLineups(league._id, getCurrentFantasyWeekNumber(new Date(competitionStartDate)))
  }
}

export async function getFantasyDashboardData(discordId: string): Promise<FantasyDashboardData> {
  await dbConnect()

  const user = await getUserByDiscordId(discordId)
  const season = await ensureActiveFantasySeason()
  const memberships = await FantasyLeagueMemberModel.find({ userId: user._id })
    .select("leagueId role teamName")
    .lean<Array<{ leagueId: mongoose.Types.ObjectId; role: "owner" | "member"; teamName: string }>>()

  if (!memberships.length) {
    return {
      season: {
        id: season._id.toString(),
        name: season.name,
        currentGameweek: season.currentGameweek,
      },
      leagues: [],
    }
  }

  const leagueIds = memberships.map((membership) => membership.leagueId)
  const [leagues, rosters, rosterSlots, players, memberCounts] = await Promise.all([
    FantasyLeagueModel.find({ _id: { $in: leagueIds } })
      .select("fantasySeasonId name inviteCode status squadSize leagueType")
      .lean<Array<{
        _id: mongoose.Types.ObjectId
        fantasySeasonId: mongoose.Types.ObjectId
        name: string
        inviteCode: string
        status: "draft" | "active" | "finished"
        squadSize: number
        leagueType?: FantasyLeagueType
      }>>(),
    FantasyRosterModel.find({ leagueId: { $in: leagueIds }, userId: user._id })
      .select("leagueId budgetRemaining")
      .lean<Array<{ _id: mongoose.Types.ObjectId; leagueId: mongoose.Types.ObjectId; budgetRemaining: number }>>(),
    FantasyRosterSlotModel.find({ leagueId: { $in: leagueIds }, userId: user._id })
      .select("leagueId rosterId playerObjectId player_id slot currentValue releaseClause acquiredBy isOnMarket")
      .lean<Array<{
        _id: mongoose.Types.ObjectId
        leagueId: mongoose.Types.ObjectId
        rosterId: mongoose.Types.ObjectId
        playerObjectId: mongoose.Types.ObjectId
        player_id: number
        slot: "GK" | "DEF" | "MID" | "ATT" | "FLEX" | "BENCH"
        currentValue: number
        releaseClause: number
        acquiredBy: "random" | "market" | "clausulazo"
        isOnMarket?: boolean
      }>>(),
    PlayerModel.find({})
      .select("_id player_id player_name country avatar")
      .lean<Array<{
        _id: mongoose.Types.ObjectId
        player_id: number
        player_name: string
        country: string
        avatar?: string
      }>>(),
    FantasyLeagueMemberModel.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
      { $match: { leagueId: { $in: leagueIds } } },
      { $group: { _id: "$leagueId", total: { $sum: 1 } } },
    ]),
  ])

  const membershipByLeagueId = new Map(memberships.map((membership) => [membership.leagueId.toString(), membership]))
  const rosterByLeagueId = new Map(rosters.map((roster) => [roster.leagueId.toString(), roster]))
  const playerByObjectId = new Map(players.map((player) => [player._id.toString(), player]))
  const memberCountByLeagueId = new Map(memberCounts.map((item) => [item._id.toString(), item.total]))

  const leaguesData: DashboardLeague[] = []

  for (const league of leagues) {
      const membership = membershipByLeagueId.get(league._id.toString())
      const roster = rosterByLeagueId.get(league._id.toString())
      const slots = rosterSlots
        .filter((slot) => slot.leagueId.toString() === league._id.toString())
        .map((slot) => {
          const player = playerByObjectId.get(slot.playerObjectId.toString())

          if (!player) {
            return null
          }

          return {
            id: slot._id.toString(),
            playerObjectId: slot.playerObjectId.toString(),
            playerId: player.player_id,
            playerName: player.player_name,
            country: player.country,
            avatar: player.avatar ?? undefined,
            slot: slot.slot,
            currentValue: slot.currentValue,
            releaseClause: slot.releaseClause,
            acquiredBy: slot.acquiredBy,
            isOnMarket: slot.isOnMarket ?? false,
          }
        })
        .filter((slot): slot is NonNullable<typeof slot> => Boolean(slot))
        .sort((a, b) => a.playerName.localeCompare(b.playerName, "es", { sensitivity: "base" }))

      if (!membership || !roster) {
        continue
      }

      leaguesData.push({
        id: league._id.toString(),
        fantasySeasonId: league.fantasySeasonId.toString(),
        leagueType: league.leagueType ?? "market",
        name: league.name,
        inviteCode: league.inviteCode,
        status: league.status,
        role: membership.role,
        teamName: membership.teamName,
        memberCount: memberCountByLeagueId.get(league._id.toString()) ?? 0,
        budgetRemaining: roster.budgetRemaining,
        squadSize: league.squadSize,
        roster: slots,
      })
  }

  leaguesData.sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }))

  return {
    season: {
      id: season._id.toString(),
      name: season.name,
      currentGameweek: season.currentGameweek,
    },
    leagues: leaguesData,
  }
}

export async function deleteFantasyLeagueForUser(discordId: string, leagueId: string) {
  await dbConnect()

  const user = await getUserByDiscordId(discordId)
  const leagueObjectId = new mongoose.Types.ObjectId(leagueId)
  const league = await FantasyLeagueModel.findById(leagueObjectId)
    .select("_id ownerUserId fantasySeasonId")
    .lean<{ _id: mongoose.Types.ObjectId; ownerUserId: mongoose.Types.ObjectId; fantasySeasonId: mongoose.Types.ObjectId } | null>()

  if (!league) {
    throw new Error("La liga fantasy ya no existe.")
  }

  if (league.ownerUserId.toString() !== user._id.toString()) {
    throw new Error("Solo el owner puede borrar esta liga fantasy.")
  }

  await Promise.all([
    FantasyBidModel.deleteMany({ leagueId: leagueObjectId }),
    FantasyMarketDayModel.deleteMany({ leagueId: leagueObjectId }),
    FantasyClauseExecutionModel.deleteMany({ leagueId: leagueObjectId }),
    FantasyClauseChangeModel.deleteMany({ leagueId: leagueObjectId }),
    FantasyWeekLineupModel.deleteMany({ leagueId: leagueObjectId }),
    FantasyWeekScoreModel.deleteMany({ leagueId: leagueObjectId }),
    FantasyWeekRewardModel.deleteMany({ leagueId: leagueObjectId }),
    FantasyProcessedStatModel.deleteMany({ leagueId: leagueObjectId }),
    FantasyRosterSlotModel.deleteMany({ leagueId: leagueObjectId }),
    FantasyRosterModel.deleteMany({ leagueId: leagueObjectId }),
    FantasyLeagueMemberModel.deleteMany({ leagueId: leagueObjectId }),
    FantasyLeagueModel.deleteOne({ _id: leagueObjectId }),
  ])
}

export async function placeFantasyBidForUser(
  discordId: string,
  leagueId: string,
  playerObjectId: string,
  amount: number
) {
  await dbConnect()

  const user = await getUserByDiscordId(discordId)
  const leagueObjectId = new mongoose.Types.ObjectId(leagueId)
  const playerObjectObjectId = new mongoose.Types.ObjectId(playerObjectId)
  const membership = await FantasyLeagueMemberModel.findOne({ leagueId: leagueObjectId, userId: user._id })
    .select("_id teamName")
    .lean<{ _id: mongoose.Types.ObjectId; teamName: string } | null>()

  if (!membership) {
    throw new Error("No perteneces a esta liga fantasy.")
  }

  const roster = await FantasyRosterModel.findOne({
    leagueId: leagueObjectId,
    userId: user._id,
  })
    .select("budgetRemaining")
    .lean<{ budgetRemaining: number } | null>()

  if (!roster) {
    throw new Error("No tienes roster en esta liga fantasy.")
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("La puja debe ser valida.")
  }

  if (roster.budgetRemaining < amount) {
    throw new Error("You do not have enough budget for this bid.")
  }

  const marketDay = await ensureFantasyMarketDay(leagueObjectId)

  if (!marketDay) {
    throw new Error("No hay mercado disponible para esta liga.")
  }

  const listing = marketDay.listings.find((item) => item.playerObjectId.toString() === playerObjectObjectId.toString())

  if (!listing) {
    throw new Error("Ese jugador no esta disponible en el mercado de hoy.")
  }

  if (listing.sellerUserId?.toString() === user._id.toString()) {
    throw new Error("You cannot bid on your own player.")
  }

  const highestBid = await FantasyBidModel.find({
    marketDayId: marketDay._id,
    playerObjectId: playerObjectObjectId,
  })
    .sort({ amount: -1, createdAt: 1 })
    .select("amount")
    .lean<Array<{ amount: number }>>()

  const currentHighestBid = highestBid[0]?.amount ?? null
  const minimumRequiredBid = Math.max(listing.minBid, (currentHighestBid ?? 0) + (currentHighestBid ? 1 : 0))

  if (amount < minimumRequiredBid) {
    throw new Error(`The minimum bid for this player is ${minimumRequiredBid}.`)
  }

  await FantasyBidModel.findOneAndUpdate(
    {
      marketDayId: marketDay._id,
      userId: user._id,
      playerObjectId: playerObjectObjectId,
    },
    {
      $set: {
        leagueId: leagueObjectId,
        marketDayId: marketDay._id,
        userId: user._id,
        playerObjectId: playerObjectObjectId,
        player_id: listing.player_id,
        amount,
      },
    },
    { upsert: true }
  )
}

export async function listFantasyPlayerForSale(
  discordId: string,
  leagueId: string,
  playerObjectId: string
) {
  await dbConnect()

  const user = await getUserByDiscordId(discordId)
  const leagueObjectId = new mongoose.Types.ObjectId(leagueId)
  const playerObjectObjectId = new mongoose.Types.ObjectId(playerObjectId)
  const membership = await FantasyLeagueMemberModel.findOne({ leagueId: leagueObjectId, userId: user._id })
    .select("teamName")
    .lean<{ teamName: string } | null>()

  if (!membership) {
    throw new Error("You do not belong to this fantasy league.")
  }

  const rosterSlot = await FantasyRosterSlotModel.findOne({
    leagueId: leagueObjectId,
    userId: user._id,
    playerObjectId: playerObjectObjectId,
  })
    .select("_id player_id currentValue isOnMarket")
    .lean<{
      _id: mongoose.Types.ObjectId
      player_id: number
      currentValue: number
      isOnMarket?: boolean
    } | null>()

  if (!rosterSlot) {
    throw new Error("You do not own this player.")
  }

  if (rosterSlot.isOnMarket) {
    throw new Error("This player is already on the market.")
  }

  const marketDay = await ensureFantasyMarketDay(leagueObjectId)

  if (!marketDay) {
    throw new Error("No market is available for this league.")
  }

  if (marketDay.status !== "open") {
    throw new Error("The market is closed right now.")
  }

  const alreadyListed = marketDay.listings.some(
    (listing) => listing.playerObjectId.toString() === playerObjectObjectId.toString()
  )

  if (alreadyListed) {
    throw new Error("This player is already listed today.")
  }

  await FantasyMarketDayModel.updateOne(
    { _id: marketDay._id },
    {
      $push: {
        listings: {
          playerObjectId: playerObjectObjectId,
          player_id: rosterSlot.player_id,
          basePrice: rosterSlot.currentValue,
          minBid: rosterSlot.currentValue,
          sellerUserId: user._id,
        },
      },
    }
  )

  await FantasyRosterSlotModel.updateOne(
    { _id: rosterSlot._id },
    { $set: { isOnMarket: true } }
  )
}

export async function cancelFantasyPlayerSale(
  discordId: string,
  leagueId: string,
  playerObjectId: string
) {
  await dbConnect()

  const user = await getUserByDiscordId(discordId)
  const leagueObjectId = new mongoose.Types.ObjectId(leagueId)
  const playerObjectObjectId = new mongoose.Types.ObjectId(playerObjectId)
  const marketDay = await ensureFantasyMarketDay(leagueObjectId)

  if (!marketDay) {
    throw new Error("No market is available for this league.")
  }

  const listing = marketDay.listings.find(
    (item) =>
      item.playerObjectId.toString() === playerObjectObjectId.toString() &&
      item.sellerUserId?.toString() === user._id.toString()
  )

  if (!listing) {
    throw new Error("This player is not listed by you.")
  }

  const hasBids = await FantasyBidModel.exists({
    marketDayId: marketDay._id,
    playerObjectId: playerObjectObjectId,
  })

  if (hasBids) {
    throw new Error("You cannot remove a player from the market after receiving bids.")
  }

  await FantasyMarketDayModel.updateOne(
    { _id: marketDay._id },
    {
      $pull: {
        listings: {
          playerObjectId: playerObjectObjectId,
          sellerUserId: user._id,
        },
      },
    }
  )

  await FantasyRosterSlotModel.updateOne(
    {
      leagueId: leagueObjectId,
      userId: user._id,
      playerObjectId: playerObjectObjectId,
    },
    { $set: { isOnMarket: false } }
  )
}

export async function raiseFantasyPlayerClause(
  discordId: string,
  leagueId: string,
  playerObjectId: string,
  newClause: number
) {
  await dbConnect()

  const user = await getUserByDiscordId(discordId)
  const leagueObjectId = new mongoose.Types.ObjectId(leagueId)
  const playerObjectObjectId = new mongoose.Types.ObjectId(playerObjectId)

  const roster = await FantasyRosterModel.findOne({
    leagueId: leagueObjectId,
    userId: user._id,
  })
    .select("_id budgetRemaining")
    .lean<{ _id: mongoose.Types.ObjectId; budgetRemaining: number } | null>()

  if (!roster) {
    throw new Error("You do not have a roster in this league.")
  }

  const slot = await FantasyRosterSlotModel.findOne({
    leagueId: leagueObjectId,
    userId: user._id,
    playerObjectId: playerObjectObjectId,
  })
    .select("_id releaseClause")
    .lean<{ _id: mongoose.Types.ObjectId; releaseClause: number } | null>()

  if (!slot) {
    throw new Error("You do not own this player.")
  }

  if (!Number.isFinite(newClause) || newClause <= slot.releaseClause) {
    throw new Error("The new clause must be higher than the current clause.")
  }

  const cost = newClause - slot.releaseClause

  if (roster.budgetRemaining < cost) {
    throw new Error("You do not have enough budget to raise this clause.")
  }

  await FantasyRosterSlotModel.updateOne(
    { _id: slot._id },
    { $set: { releaseClause: newClause } }
  )

  await FantasyRosterModel.updateOne(
    { _id: roster._id },
    { $inc: { budgetRemaining: -cost } }
  )

  await FantasyClauseChangeModel.create({
    leagueId: leagueObjectId,
    userId: user._id,
    playerObjectId: playerObjectObjectId,
    player_id: 0,
    oldClause: slot.releaseClause,
    newClause,
    cost,
  })
}

export async function moveFantasyRosterPlayer(
  discordId: string,
  leagueId: string,
  week: number,
  playerObjectId: string,
  target: "START" | "BENCH"
) {
  await dbConnect()

  const user = await getUserByDiscordId(discordId)
  const leagueObjectId = new mongoose.Types.ObjectId(leagueId)
  const playerObjectObjectId = new mongoose.Types.ObjectId(playerObjectId)

  const league = await FantasyLeagueModel.findById(leagueObjectId)
    .select("competitionObjectId")
    .lean<{ competitionObjectId?: mongoose.Types.ObjectId | null } | null>()

  if (!league?.competitionObjectId) {
    throw new Error("This fantasy league is not linked to a competition.")
  }

  const competition = await CompetitionModel.findById(league.competitionObjectId)
    .select("start_date startDate")
    .lean<{ start_date?: Date; startDate?: Date } | null>()

  const competitionStartDate = competition?.start_date ?? competition?.startDate ?? new Date()
  const currentWeek = getCurrentFantasyWeekNumber(new Date(competitionStartDate))

  if (week !== currentWeek) {
    throw new Error("Past weeks are locked.")
  }

  await ensureFantasyWeekLineups(leagueObjectId, week)

  const lineup = await FantasyWeekLineupModel.findOne({ leagueId: leagueObjectId, userId: user._id, week })
  if (!lineup) {
    throw new Error("No lineup found for this week.")
  }

  type LineupEntry = {
    playerObjectId: mongoose.Types.ObjectId
    player_id: number
    slot: "GK" | "DEF" | "MID" | "ATT" | "FLEX" | "BENCH"
  }

  const starters = lineup.starters as LineupEntry[]
  const bench = lineup.bench as LineupEntry[]

  const starterIndex = starters.findIndex((entry: LineupEntry) => entry.playerObjectId.toString() === playerObjectObjectId.toString())
  const benchIndex = bench.findIndex((entry: LineupEntry) => entry.playerObjectId.toString() === playerObjectObjectId.toString())

  if (target === "BENCH") {
    if (starterIndex === -1) {
      throw new Error("This player is already on the bench.")
    }

    const starter = starters[starterIndex]
    const replacementIndex = bench.findIndex((entry: LineupEntry) => entry.slot === starter.slot)
    if (replacementIndex === -1) {
      throw new Error("No bench player is available in this group.")
    }

    const replacement = bench[replacementIndex]
    starters[starterIndex] = replacement
    bench[replacementIndex] = { ...starter, slot: "BENCH" }
  } else {
    if (benchIndex === -1) {
      throw new Error("This player is already in the starting team.")
    }

    const benchPlayer = bench[benchIndex]
    const starterReplacementIndex = starters.findIndex((entry: LineupEntry) => entry.slot === benchPlayer.slot)
    if (starterReplacementIndex === -1) {
      throw new Error("No starter can be replaced in this group.")
    }

    const starter = starters[starterReplacementIndex]
    starters[starterReplacementIndex] = { ...benchPlayer, slot: starter.slot }
    bench[benchIndex] = { ...starter, slot: "BENCH" }
  }

  lineup.starters = starters
  lineup.bench = bench
  lineup.formation = inferFormationFromSlots(starters)
  await lineup.save()

  const newStarterIds = new Set(starters.map((entry: LineupEntry) => entry.playerObjectId.toString()))
  const newBenchIds = new Set(bench.map((entry: LineupEntry) => entry.playerObjectId.toString()))

  await FantasyRosterSlotModel.updateMany(
    { leagueId: leagueObjectId, userId: user._id, playerObjectId: { $in: [...newStarterIds].map((id) => new mongoose.Types.ObjectId(id)) } },
    [
      {
        $set: {
          slot: {
            $cond: [
              { $in: ["$playerObjectId", starters.filter((entry: LineupEntry) => entry.slot === "GK").map((entry: LineupEntry) => entry.playerObjectId)] },
              "GK",
              {
                $cond: [
                  { $in: ["$playerObjectId", starters.filter((entry: LineupEntry) => entry.slot === "DEF").map((entry: LineupEntry) => entry.playerObjectId)] },
                  "DEF",
                  {
                    $cond: [
                      { $in: ["$playerObjectId", starters.filter((entry: LineupEntry) => entry.slot === "MID").map((entry: LineupEntry) => entry.playerObjectId)] },
                      "MID",
                      "ATT",
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    ]
  )

  await FantasyRosterSlotModel.updateMany(
    { leagueId: leagueObjectId, userId: user._id, playerObjectId: { $in: [...newBenchIds].map((id) => new mongoose.Types.ObjectId(id)) } },
    { $set: { slot: "BENCH" } }
  )
}

export async function setFantasyOpenLineupFormation(
  discordId: string,
  leagueId: string,
  week: number,
  formation: string
) {
  await dbConnect()

  const user = await getUserByDiscordId(discordId)
  const leagueObjectId = new mongoose.Types.ObjectId(leagueId)
  const league = await FantasyLeagueModel.findById(leagueObjectId)
    .select("competitionObjectId leagueType")
    .lean<{ competitionObjectId?: mongoose.Types.ObjectId | null; leagueType?: FantasyLeagueType | null } | null>()

  if (!league?.competitionObjectId || league.leagueType !== "open") {
    throw new Error("This fantasy league does not use the open lineup mode.")
  }

  const competition = await CompetitionModel.findById(league.competitionObjectId)
    .select("start_date startDate")
    .lean<{ start_date?: Date; startDate?: Date } | null>()
  const competitionStartDate = competition?.start_date ?? competition?.startDate ?? new Date()
  const currentWeek = getCurrentFantasyWeekNumber(new Date(competitionStartDate))

  if (week !== currentWeek) {
    throw new Error("Past weeks are locked.")
  }

  await ensureFantasyOpenWeekLineups(leagueObjectId, week)

  const lineup = await FantasyOpenWeekLineupModel.findOne({ leagueId: leagueObjectId, userId: user._id, week })
  if (!lineup) {
    throw new Error("No lineup found for this week.")
  }

  const existingPlayers = (lineup.slots ?? [])
    .sort((a: { slotIndex: number }, b: { slotIndex: number }) => a.slotIndex - b.slotIndex)
    .map((slot: { playerObjectId?: mongoose.Types.ObjectId | null; player_id?: number | null }) => ({
      playerObjectId: slot.playerObjectId ?? null,
      player_id: slot.player_id ?? null,
    }))
    .filter((slot: { playerObjectId: mongoose.Types.ObjectId | null; player_id: number | null }) => slot.playerObjectId && slot.player_id)
    .slice(0, getOpenFormationSlots(formation).length)

  lineup.formation = formation
  lineup.slots = buildEmptyOpenSlots(formation).map((slot, index) => ({
    ...slot,
    playerObjectId: existingPlayers[index]?.playerObjectId ?? null,
    player_id: existingPlayers[index]?.player_id ?? null,
  }))
  await lineup.save()
}

export async function setFantasyOpenLineupPlayer(
  discordId: string,
  leagueId: string,
  week: number,
  slotIndex: number,
  playerObjectId: string | null
) {
  await dbConnect()

  const user = await getUserByDiscordId(discordId)
  const leagueObjectId = new mongoose.Types.ObjectId(leagueId)
  const league = await FantasyLeagueModel.findById(leagueObjectId)
    .select("competitionObjectId leagueType")
    .lean<{ competitionObjectId?: mongoose.Types.ObjectId | null; leagueType?: FantasyLeagueType | null } | null>()

  if (!league?.competitionObjectId || league.leagueType !== "open") {
    throw new Error("This fantasy league does not use the open lineup mode.")
  }

  const competition = await CompetitionModel.findById(league.competitionObjectId)
    .select("start_date startDate")
    .lean<{ start_date?: Date; startDate?: Date } | null>()
  const competitionStartDate = competition?.start_date ?? competition?.startDate ?? new Date()
  const currentWeek = getCurrentFantasyWeekNumber(new Date(competitionStartDate))

  if (week !== currentWeek) {
    throw new Error("Past weeks are locked.")
  }

  await ensureFantasyOpenWeekLineups(leagueObjectId, week)

  const lineup = await FantasyOpenWeekLineupModel.findOne({ leagueId: leagueObjectId, userId: user._id, week })
  if (!lineup) {
    throw new Error("No lineup found for this week.")
  }

  const formationSlots = getOpenFormationSlots(lineup.formation)
  const allowedGroup = formationSlots[slotIndex]

  if (!allowedGroup) {
    throw new Error("This lineup slot is not valid.")
  }

  const nextSlots = (lineup.slots ?? []).map((slot: { slotIndex: number; playerObjectId?: mongoose.Types.ObjectId | null; player_id?: number | null }) => ({
    slotIndex: slot.slotIndex,
    playerObjectId: slot.playerObjectId ?? null,
    player_id: slot.player_id ?? null,
  }))

  if (!nextSlots.some((slot: { slotIndex: number }) => slot.slotIndex === slotIndex)) {
    nextSlots.push({ slotIndex, playerObjectId: null, player_id: null })
  }

  if (!playerObjectId) {
    lineup.slots = nextSlots.map((slot: { slotIndex: number; playerObjectId: mongoose.Types.ObjectId | null; player_id: number | null }) =>
      slot.slotIndex === slotIndex ? { ...slot, playerObjectId: null, player_id: null } : slot
    )
    await lineup.save()
    return
  }

  const candidatePlayers = await getCompetitionCandidatePlayers(league.competitionObjectId, [])
  const candidate = candidatePlayers.find((player) => player._id.toString() === playerObjectId)

  if (!candidate) {
    throw new Error("This player is not available in this competition.")
  }

  const candidatePosition = String(candidate.position ?? "").toUpperCase()
  const validForSlot =
    (allowedGroup === "GK" && candidatePosition === "GK") ||
    (allowedGroup === "DEF" && ["CB", "LB", "RB"].includes(candidatePosition)) ||
    (allowedGroup === "MID" && ["DM", "CM", "AM"].includes(candidatePosition)) ||
    (allowedGroup === "ATT" && ["LW", "RW", "ST"].includes(candidatePosition))

  if (!validForSlot) {
    throw new Error("This player is not valid for the selected slot.")
  }

  if (nextSlots.some((slot: { slotIndex: number; playerObjectId: mongoose.Types.ObjectId | null }) => slot.slotIndex !== slotIndex && slot.playerObjectId?.toString() === playerObjectId)) {
    throw new Error("This player is already in your weekly 7.")
  }

  lineup.slots = nextSlots
    .map((slot: { slotIndex: number; playerObjectId: mongoose.Types.ObjectId | null; player_id: number | null }) =>
      slot.slotIndex === slotIndex
        ? {
            slotIndex,
            playerObjectId: candidate._id,
            player_id: candidate.player_id,
          }
        : slot
    )
    .sort((a: { slotIndex: number }, b: { slotIndex: number }) => a.slotIndex - b.slotIndex)

  await lineup.save()
}

export async function getFantasyLeagueDetail(
  discordId: string,
  leagueId: string
): Promise<FantasyLeagueDetail | null> {
  await dbConnect()
  const currentUser = await getUserByDiscordId(discordId)
  const dashboard = await getFantasyDashboardData(discordId)
  const league = dashboard.leagues.find((item) => item.id === leagueId)

  if (!league) {
    return null
  }

  await syncFantasyLeagueStats(new mongoose.Types.ObjectId(leagueId))

  const members = await FantasyLeagueMemberModel.find({
    leagueId: new mongoose.Types.ObjectId(leagueId),
  })
    .select("userId teamName role joinedAt")
    .sort({ joinedAt: 1 })
    .lean<Array<{
      userId: mongoose.Types.ObjectId
      teamName: string
      role: "owner" | "member"
    }>>()

  const leagueUserIds = members.map((member) => member.userId)
  const users = await UserModel.find({ _id: { $in: leagueUserIds } })
    .select("_id discordId playerId discordAvatar")
    .lean<Array<{
      _id: mongoose.Types.ObjectId
      discordId?: string | null
      playerId?: mongoose.Types.ObjectId | null
      discordAvatar?: string | null
    }>>()

  const playerIds = users
    .map((user) => user.playerId)
    .filter((playerId): playerId is mongoose.Types.ObjectId => Boolean(playerId))

  const linkedPlayers = await PlayerModel.find({ _id: { $in: playerIds } })
    .select("_id player_name")
    .lean<Array<{ _id: mongoose.Types.ObjectId; player_name: string }>>()

  const userById = new Map(users.map((user) => [user._id.toString(), user]))
  const playerNameById = new Map(linkedPlayers.map((player) => [player._id.toString(), player.player_name]))
  const totalScores = await FantasyWeekScoreModel.find({ leagueId: new mongoose.Types.ObjectId(leagueId) })
    .select("userId points")
    .lean<Array<{ userId: mongoose.Types.ObjectId; points: number }>>()
  const totalPointsByUserId = totalScores.reduce((acc, entry) => {
    const key = entry.userId.toString()
    acc.set(key, (acc.get(key) ?? 0) + Number(entry.points ?? 0))
    return acc
  }, new Map<string, number>())
  const leagueDoc = await FantasyLeagueModel.findById(leagueId)
    .select("competitionObjectId leagueType")
    .lean<{ competitionObjectId?: mongoose.Types.ObjectId | null; leagueType?: FantasyLeagueType | null } | null>()

  const membershipByUserId = new Map(members.map((member) => [member.userId.toString(), member.teamName]))

  let enrichedRoster = league.roster

  if (leagueDoc?.competitionObjectId && league.roster.length) {
    const rosterPrices = await FantasyPlayerPriceModel.find({
      fantasySeasonId: league.fantasySeasonId,
      competitionObjectId: leagueDoc.competitionObjectId,
      playerObjectId: { $in: league.roster.map((item) => new mongoose.Types.ObjectId(item.playerObjectId)) },
    })
      .select("playerObjectId price changePercent changeDirection")
      .lean<Array<{
        playerObjectId: mongoose.Types.ObjectId
        price: number
        changePercent?: number
        changeDirection?: "up" | "down" | "flat"
      }>>()

    const rosterPriceByPlayerId = new Map(
      rosterPrices.map((price) => [price.playerObjectId.toString(), price])
    )

    const rosterPlayerIds = league.roster.map((item) => new mongoose.Types.ObjectId(item.playerObjectId))
    const teamCompetitions = await TeamCompetitionModel.find({ competition_id: leagueDoc.competitionObjectId })
      .select("_id kits team_id")
      .lean<Array<{
        _id: mongoose.Types.ObjectId
        team_id?: mongoose.Types.ObjectId
        kits?: Array<{ image?: string; color?: string }>
      }>>()

    const teamCompetitionIds = teamCompetitions.map((item) => item._id)
    const playerCompetitions = teamCompetitionIds.length
      ? await PlayerCompetitionModel.find({
          player_id: { $in: rosterPlayerIds },
          team_competition_id: { $in: teamCompetitionIds },
        })
          .select("player_id team_competition_id position matches_played matchesPlayed")
          .lean<Array<{
            player_id?: mongoose.Types.ObjectId
            team_competition_id?: mongoose.Types.ObjectId
            position?: string
            matches_played?: number
            matchesPlayed?: number
          }>>()
      : []

    const bestCompetitionByPlayer = new Map<
      string,
      {
        teamCompetitionId: string
        position: string | null
        matchesPlayed: number
      }
    >()

    for (const row of playerCompetitions) {
      const playerObjectId = row.player_id?.toString()
      const teamCompetitionId = row.team_competition_id?.toString()
      if (!playerObjectId || !teamCompetitionId) continue

      const matchesPlayed = Number(row.matches_played ?? row.matchesPlayed ?? 0)
      const current = bestCompetitionByPlayer.get(playerObjectId)

      if (!current || matchesPlayed > current.matchesPlayed) {
        bestCompetitionByPlayer.set(playerObjectId, {
          teamCompetitionId,
          position: row.position ?? null,
          matchesPlayed,
        })
      }
    }

    const teamIds = teamCompetitions
      .map((item) => item.team_id)
      .filter((value): value is mongoose.Types.ObjectId => Boolean(value))

    const rawTeams = teamIds.length
      ? await TeamModel.collection
          .find({ _id: { $in: teamIds } }, { projection: { _id: 1, team_name: 1, teamName: 1, image: 1 } })
          .toArray() as Array<{ _id: mongoose.Types.ObjectId; team_name?: string; teamName?: string; image?: string }>
      : []

    const teamMetaById = new Map(
      rawTeams.map((team) => [
        team._id.toString(),
        {
          teamName: team.team_name ?? team.teamName ?? "",
          teamImage: normalizeTeamImageUrl(team.image),
        },
      ])
    )
    const kitByTeamCompetitionId = new Map(
      teamCompetitions.map((item) => {
        const kit = item.kits?.find((entry) => normalizeTeamImageUrl(entry?.image))
        return [
          item._id.toString(),
          {
            teamName: item.team_id ? teamMetaById.get(item.team_id.toString())?.teamName ?? "" : "",
            teamImage: item.team_id ? teamMetaById.get(item.team_id.toString())?.teamImage ?? "" : "",
            kitImage: normalizeTeamImageUrl(kit?.image),
            kitTextColor: getKitTextColor(kit?.color),
          },
        ]
      })
    )

    enrichedRoster = league.roster.map((item) => {
      const bestCompetition = bestCompetitionByPlayer.get(item.playerObjectId)
      const visual = bestCompetition ? kitByTeamCompetitionId.get(bestCompetition.teamCompetitionId) : null

      return {
        ...item,
        currentValue: rosterPriceByPlayerId.get(item.playerObjectId)?.price ?? item.currentValue,
        priceChangePercent: rosterPriceByPlayerId.get(item.playerObjectId)?.changePercent ?? 0,
        priceChangeDirection: rosterPriceByPlayerId.get(item.playerObjectId)?.changeDirection ?? "flat",
        position: bestCompetition?.position ?? null,
        teamName: visual?.teamName ?? "",
        teamImage: visual?.teamImage ?? "",
        kitImage: visual?.kitImage ?? "",
        kitTextColor: visual?.kitTextColor ?? "",
      }
    })
  }

  const marketDay = leagueDoc?.leagueType === "open"
    ? null
    : await ensureFantasyMarketDay(new mongoose.Types.ObjectId(leagueId))
  let market: FantasyLeagueDetail["market"] = null

  if (marketDay) {
    const listingPlayerIds = marketDay.listings.map((listing) => listing.playerObjectId)
    const listingPlayers = await PlayerModel.find({ _id: { $in: listingPlayerIds } })
      .select("_id player_id player_name country avatar")
      .lean<Array<{
        _id: mongoose.Types.ObjectId
        player_id: number
        player_name: string
        country: string
        avatar?: string
      }>>()

    const allMarketBids = await FantasyBidModel.find({ marketDayId: marketDay._id })
      .select("userId playerObjectId amount")
      .sort({ amount: -1, createdAt: 1 })
      .lean<Array<{
        userId: mongoose.Types.ObjectId
        playerObjectId: mongoose.Types.ObjectId
        amount: number
      }>>()

    const listingPlayerById = new Map(listingPlayers.map((player) => [player._id.toString(), player]))
    const marketPrices = leagueDoc?.competitionObjectId
      ? await FantasyPlayerPriceModel.find({
          fantasySeasonId: league.fantasySeasonId,
          competitionObjectId: leagueDoc.competitionObjectId,
          playerObjectId: { $in: listingPlayerIds },
        })
          .select("playerObjectId price changePercent changeDirection")
          .lean<Array<{
            playerObjectId: mongoose.Types.ObjectId
            price: number
            changePercent?: number
            changeDirection?: "up" | "down" | "flat"
          }>>()
      : []
    const marketPriceByPlayerId = new Map(
      marketPrices.map((price) => [price.playerObjectId.toString(), price])
    )
    const highestBidByPlayerId = new Map<string, { amount: number; teamName: string | null }>()
    const userBidByPlayerId = new Map<string, number>()

    for (const bid of allMarketBids) {
      const playerId = bid.playerObjectId.toString()
      if (!highestBidByPlayerId.has(playerId)) {
        highestBidByPlayerId.set(playerId, {
          amount: bid.amount,
          teamName: membershipByUserId.get(bid.userId.toString()) ?? null,
        })
      }

      if (bid.userId.toString() === currentUser._id.toString()) {
        const current = userBidByPlayerId.get(playerId) ?? 0
        if (bid.amount > current) {
          userBidByPlayerId.set(playerId, bid.amount)
        }
      }
    }

    const competitionVisuals = leagueDoc?.competitionObjectId
      ? await getCompetitionCandidatePlayers(leagueDoc.competitionObjectId, [])
      : []
    const visualsByPlayerId = new Map(
      competitionVisuals.map((player) => [
        player._id.toString(),
        {
          teamName: player.teamName,
          teamImage: player.teamImage,
          kitImage: player.kitImage,
          kitTextColor: player.kitTextColor,
        },
      ])
    )

    const sellingPlayerIds = new Set(
      marketDay.listings
        .filter((listing) => listing.sellerUserId?.toString() === currentUser._id.toString())
        .map((listing) => listing.playerObjectId.toString())
    )

    enrichedRoster = enrichedRoster.map((item) => ({
      ...item,
      isOnMarket: item.isOnMarket || sellingPlayerIds.has(item.playerObjectId),
    }))

    market = {
      id: marketDay._id.toString(),
      status: marketDay.status,
      marketDate: marketDay.marketDate.toISOString(),
      listings: marketDay.listings
        .map((listing): FantasyMarketEntry | null => {
          const player = listingPlayerById.get(listing.playerObjectId.toString())
          if (!player) return null

          const highestBid = highestBidByPlayerId.get(listing.playerObjectId.toString())
          const visuals = visualsByPlayerId.get(listing.playerObjectId.toString())

          return {
            playerObjectId: listing.playerObjectId.toString(),
            playerId: player.player_id,
            playerName: player.player_name,
            country: player.country,
            avatar: player.avatar ?? undefined,
            teamName: visuals?.teamName ?? "",
            teamImage: visuals?.teamImage ?? "",
            kitImage: visuals?.kitImage ?? "",
            kitTextColor: visuals?.kitTextColor ?? "",
            basePrice: marketPriceByPlayerId.get(listing.playerObjectId.toString())?.price ?? listing.basePrice,
            priceChangePercent: marketPriceByPlayerId.get(listing.playerObjectId.toString())?.changePercent ?? 0,
            priceChangeDirection: marketPriceByPlayerId.get(listing.playerObjectId.toString())?.changeDirection ?? "flat",
            minBid: listing.minBid,
            highestBid: highestBid?.amount ?? null,
            sellerTeamName: "sellerUserId" in listing && listing.sellerUserId
              ? membershipByUserId.get(String(listing.sellerUserId)) ?? null
              : null,
            userBid: userBidByPlayerId.get(listing.playerObjectId.toString()) ?? null,
          }
        })
        .filter((listing): listing is FantasyMarketEntry => listing !== null),
    }
  }

  let weeks: FantasyLeagueDetail["home"]["weeks"] = []
  let defaultWeek = dashboard.season?.currentGameweek ?? 1
  let activity: FantasyLeagueDetail["home"]["activity"] = []
  let teamCurrentWeek = 1
  let teamWeeks: FantasyLeagueDetail["teamView"]["weeks"] = []
  let availablePlayers: FantasyLeagueDetail["teamView"]["availablePlayers"] = []

  if (leagueDoc?.competitionObjectId) {
    const competition = await CompetitionModel.findById(leagueDoc.competitionObjectId)
      .select("start_date startDate")
      .lean<{ start_date?: Date; startDate?: Date } | null>()
    const competitionStartDate = competition?.start_date ?? competition?.startDate ?? new Date()
    teamCurrentWeek = getCurrentFantasyWeekNumber(new Date(competitionStartDate))

    const competitionTeamCompetitions = await TeamCompetitionModel.find({ competition_id: leagueDoc.competitionObjectId })
      .select("_id team_id")
      .lean<Array<{ _id: mongoose.Types.ObjectId; team_id?: mongoose.Types.ObjectId }>>()

    const teamIds = competitionTeamCompetitions
      .map((item) => item.team_id)
      .filter((value): value is mongoose.Types.ObjectId => Boolean(value))

    const rawCompetitionTeams = teamIds.length
      ? await TeamModel.collection
          .find({ _id: { $in: teamIds } }, { projection: { _id: 1, team_name: 1, teamName: 1, image: 1 } })
          .toArray() as Array<{ _id: mongoose.Types.ObjectId; team_name?: string; teamName?: string; image?: string }>
      : []

    const competitionTeamById = new Map(
      rawCompetitionTeams.map((team) => [
        team._id.toString(),
        {
          teamName: team.team_name ?? team.teamName ?? "Unknown team",
          teamImage: normalizeTeamImageUrl(team.image),
        },
      ])
    )

    const competitionTeamCompetitionById = new Map(
      competitionTeamCompetitions.map((entry) => [
        entry._id.toString(),
        entry.team_id ? competitionTeamById.get(entry.team_id.toString()) : null,
      ])
    )

    const matches = await MatchModel.find({ competition_id: leagueDoc.competitionObjectId })
      .select("match_id date comments team1_competition_id team2_competition_id score_team1 score_team2")
      .sort({ date: 1, match_id: 1 })
      .lean<Array<{
        _id: mongoose.Types.ObjectId
        match_id: number
        date: Date
        comments?: string
        team1_competition_id?: mongoose.Types.ObjectId
        team2_competition_id?: mongoose.Types.ObjectId
        score_team1?: number
        score_team2?: number
      }>>()

    const weekMap = new Map<number, FantasyLeagueDetail["home"]["weeks"][number]>()
    const fallbackWeekByDateKey = new Map<string, number>()
    let fallbackWeekCounter = 1

    for (const match of matches) {
      const matchday = extractMatchdayFromComments(match.comments)
      const dateKey = toMadridDateKey(match.date)
      const weekNumber =
        matchday && matchday > 0
          ? Math.ceil(matchday / 2)
          : (fallbackWeekByDateKey.get(dateKey) ??
            (() => {
              const nextWeek = fallbackWeekCounter
              fallbackWeekByDateKey.set(dateKey, nextWeek)
              fallbackWeekCounter += 1
              return nextWeek
            })())

      if (!weekMap.has(weekNumber)) {
        weekMap.set(weekNumber, {
          week: weekNumber,
          label: `Week ${weekNumber}`,
          matches: [],
        })
      }

      const team1 = match.team1_competition_id
        ? competitionTeamCompetitionById.get(match.team1_competition_id.toString())
        : null
      const team2 = match.team2_competition_id
        ? competitionTeamCompetitionById.get(match.team2_competition_id.toString())
        : null

      weekMap.get(weekNumber)?.matches.push({
        id: match._id.toString(),
        matchId: match.match_id,
        date: new Date(match.date).toISOString(),
        team1Name: team1?.teamName ?? "TBD",
        team1Image: team1?.teamImage ?? "",
        team2Name: team2?.teamName ?? "TBD",
        team2Image: team2?.teamImage ?? "",
        scoreTeam1: Number(match.score_team1 ?? 0),
        scoreTeam2: Number(match.score_team2 ?? 0),
      })
    }

    weeks = [...weekMap.values()].sort((a, b) => a.week - b.week)
    if (weeks.length) {
      defaultWeek = weeks.some((entry) => entry.week === defaultWeek) ? defaultWeek : weeks[weeks.length - 1].week
    }

    const playerMap = await PlayerModel.find({})
      .select("_id player_name")
      .lean<Array<{ _id: mongoose.Types.ObjectId; player_name: string }>>()
    const playerNameByObjectId = new Map(playerMap.map((player) => [player._id.toString(), player.player_name]))

    if (leagueDoc?.leagueType !== "open") {
    const settledMarketDays = await FantasyMarketDayModel.find({
      leagueId: new mongoose.Types.ObjectId(leagueId),
      status: "settled",
    })
      .select("marketDate listings")
      .sort({ marketDate: -1 })
      .lean<Array<{
        marketDate: Date
        listings: Array<{
          playerObjectId: mongoose.Types.ObjectId
          sellerUserId?: mongoose.Types.ObjectId | null
          soldToUserId?: mongoose.Types.ObjectId | null
          winningBidAmount?: number | null
          basePrice: number
        }>
      }>>()

    const marketActivity: FantasyHomeActivityItem[] = settledMarketDays.flatMap((marketDay) =>
      marketDay.listings.flatMap<FantasyHomeActivityItem>((listing, index) => {
        const playerName = playerNameByObjectId.get(listing.playerObjectId.toString()) ?? "Unknown player"
        if (listing.soldToUserId && listing.winningBidAmount) {
          const buyer = membershipByUserId.get(listing.soldToUserId.toString()) ?? "Unknown team"
          if (listing.sellerUserId) {
            const seller = membershipByUserId.get(listing.sellerUserId.toString()) ?? "Unknown team"
            return [
              {
                id: `sale-${marketDay.marketDate.toISOString()}-${index}`,
                type: "sale" as const,
                title: `${seller} sold ${playerName}`,
                subtitle: `Bought by ${buyer}`,
                amount: listing.winningBidAmount,
                date: marketDay.marketDate.toISOString(),
              },
            ]
          }

          return [
            {
              id: `purchase-${marketDay.marketDate.toISOString()}-${index}`,
              type: "purchase" as const,
              title: `${buyer} bought ${playerName}`,
              subtitle: "Signed from the league market",
              amount: listing.winningBidAmount,
              date: marketDay.marketDate.toISOString(),
            },
          ]
        }

        if (listing.sellerUserId && !listing.soldToUserId) {
          const seller = membershipByUserId.get(listing.sellerUserId.toString()) ?? "Unknown team"
          return [
            {
              id: `autosale-${marketDay.marketDate.toISOString()}-${index}`,
              type: "auto_sale" as const,
              title: `${seller} sold ${playerName}`,
              subtitle: "Bought back by the league",
              amount: listing.basePrice,
              date: marketDay.marketDate.toISOString(),
            },
          ]
        }

        return []
      })
    )

    const clauseChanges = await FantasyClauseChangeModel.find({
      leagueId: new mongoose.Types.ObjectId(leagueId),
    })
      .select("userId playerObjectId newClause createdAt")
      .sort({ createdAt: -1 })
      .lean<Array<{
        userId: mongoose.Types.ObjectId
        playerObjectId: mongoose.Types.ObjectId
        newClause: number
        createdAt: Date
      }>>()

    const clauseActivity: FantasyHomeActivityItem[] = clauseChanges.map((change, index) => ({
      id: `clause-${change.createdAt.toISOString()}-${index}`,
      type: "clause_up" as const,
      title: `${membershipByUserId.get(change.userId.toString()) ?? "Unknown team"} raised clause`,
      subtitle: `${playerNameByObjectId.get(change.playerObjectId.toString()) ?? "Unknown player"} · Clause ${change.newClause}`,
      amount: change.newClause,
      date: change.createdAt.toISOString(),
    }))

    const clauseExecutions = await FantasyClauseExecutionModel.find({
      leagueId: new mongoose.Types.ObjectId(leagueId),
    })
      .select("buyerUserId sellerUserId playerObjectId clausePrice executedAt")
      .sort({ executedAt: -1 })
      .lean<Array<{
        buyerUserId: mongoose.Types.ObjectId
        sellerUserId: mongoose.Types.ObjectId
        playerObjectId: mongoose.Types.ObjectId
        clausePrice: number
        executedAt: Date
      }>>()

    const clauseExecutionActivity: FantasyHomeActivityItem[] = clauseExecutions.map((execution, index) => ({
      id: `clause-exec-${execution.executedAt.toISOString()}-${index}`,
      type: "purchase",
      title: `${membershipByUserId.get(execution.buyerUserId.toString()) ?? "Unknown team"} triggered a clause`,
      subtitle: `${playerNameByObjectId.get(execution.playerObjectId.toString()) ?? "Unknown player"} · From ${membershipByUserId.get(execution.sellerUserId.toString()) ?? "Unknown team"}`,
      amount: execution.clausePrice,
      date: execution.executedAt.toISOString(),
    }))

    activity = [...marketActivity, ...clauseActivity, ...clauseExecutionActivity]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20)
    }

    if (leagueDoc?.leagueType === "open") {
      for (let week = 1; week <= teamCurrentWeek; week += 1) {
        await ensureFantasyOpenWeekLineups(new mongoose.Types.ObjectId(leagueId), week)
      }

      const competitionVisuals = await getCompetitionCandidatePlayers(leagueDoc.competitionObjectId, [])
      availablePlayers = competitionVisuals.map((player) => ({
        id: player._id.toString(),
        playerObjectId: player._id.toString(),
        playerId: player.player_id,
        playerName: player.player_name,
        country: player.country,
        avatar: player.avatar ?? undefined,
        teamName: player.teamName,
        teamImage: player.teamImage,
        kitImage: player.kitImage,
        kitTextColor: player.kitTextColor,
        position: player.position ?? null,
      }))

      const weekScores = await FantasyWeekScoreModel.find({
        leagueId: new mongoose.Types.ObjectId(leagueId),
        userId: currentUser._id,
      })
        .select("week entries")
        .lean<Array<{
          week: number
          entries: Array<{ playerObjectId: mongoose.Types.ObjectId; points: number }>
        }>>()

      const pointsByWeekAndPlayer = new Map<string, number>()
      for (const weekScore of weekScores) {
        for (const entry of weekScore.entries) {
          const key = `${weekScore.week}:${entry.playerObjectId.toString()}`
          pointsByWeekAndPlayer.set(key, (pointsByWeekAndPlayer.get(key) ?? 0) + Number(entry.points ?? 0))
        }
      }

      const playerById = new Map(availablePlayers.map((player) => [player.playerObjectId, player]))
      const openLineups = await FantasyOpenWeekLineupModel.find({
        leagueId: new mongoose.Types.ObjectId(leagueId),
        userId: currentUser._id,
      })
        .select("week formation slots")
        .sort({ week: 1 })
        .lean<Array<{
          week: number
          formation: string
          slots: Array<{ slotIndex: number; playerObjectId?: mongoose.Types.ObjectId | null; player_id?: number | null }>
        }>>()

      teamWeeks = openLineups.map((lineup) => {
        const formationSlots = getOpenFormationSlots(lineup.formation)
        const roster: FantasyRosterPlayerView[] = []

        for (const slot of lineup.slots) {
          if (!slot.playerObjectId) continue
          const playerObjectId = slot.playerObjectId.toString()
          const basePlayer = playerById.get(playerObjectId)
          if (!basePlayer) continue

          roster.push({
            ...basePlayer,
            avatar: basePlayer.avatar ?? undefined,
            slot: (formationSlots[slot.slotIndex] ?? "ATT") as FantasyRosterPlayerView["slot"],
            slotIndex: slot.slotIndex,
            currentValue: 0,
            releaseClause: 0,
            acquiredBy: "random" as const,
            isOnMarket: false,
            weekPoints: pointsByWeekAndPlayer.get(`${lineup.week}:${playerObjectId}`) ?? 0,
          })
        }

        return {
          week: lineup.week,
          formation: lineup.formation,
          locked: lineup.week < teamCurrentWeek,
          roster,
        }
      })
    } else {
    const currentLeagueLineups = await FantasyWeekLineupModel.find({
      leagueId: new mongoose.Types.ObjectId(leagueId),
      userId: currentUser._id,
    })
      .select("week formation starters bench")
      .sort({ week: 1 })
      .lean<Array<{
        week: number
        formation: string
        starters: Array<{ playerObjectId: mongoose.Types.ObjectId; player_id: number; slot: "GK" | "DEF" | "MID" | "ATT" | "FLEX" | "BENCH" }>
        bench: Array<{ playerObjectId: mongoose.Types.ObjectId; player_id: number; slot: "GK" | "DEF" | "MID" | "ATT" | "FLEX" | "BENCH" }>
      }>>()

    if (!currentLeagueLineups.some((entry) => entry.week === teamCurrentWeek)) {
      await ensureFantasyWeekLineups(new mongoose.Types.ObjectId(leagueId), teamCurrentWeek)
    }

    const refreshedLineups = await FantasyWeekLineupModel.find({
      leagueId: new mongoose.Types.ObjectId(leagueId),
      userId: currentUser._id,
    })
      .select("week formation starters bench")
      .sort({ week: 1 })
      .lean<Array<{
        week: number
        formation: string
        starters: Array<{ playerObjectId: mongoose.Types.ObjectId; player_id: number; slot: "GK" | "DEF" | "MID" | "ATT" | "FLEX" | "BENCH" }>
        bench: Array<{ playerObjectId: mongoose.Types.ObjectId; player_id: number; slot: "GK" | "DEF" | "MID" | "ATT" | "FLEX" | "BENCH" }>
      }>>()

    const weekScores = await FantasyWeekScoreModel.find({
      leagueId: new mongoose.Types.ObjectId(leagueId),
      userId: currentUser._id,
    })
      .select("week entries")
      .lean<Array<{
        week: number
        entries: Array<{ playerObjectId: mongoose.Types.ObjectId; points: number }>
      }>>()

    const pointsByWeekAndPlayer = new Map<string, number>()
    for (const weekScore of weekScores) {
      for (const entry of weekScore.entries) {
        const key = `${weekScore.week}:${entry.playerObjectId.toString()}`
        pointsByWeekAndPlayer.set(key, (pointsByWeekAndPlayer.get(key) ?? 0) + Number(entry.points ?? 0))
      }
    }

    const enrichedRosterByPlayer = new Map(enrichedRoster.map((player) => [player.playerObjectId, player]))
    const lineupPlayerObjectIds = [...new Set(
      refreshedLineups.flatMap((lineup) => [...lineup.starters, ...lineup.bench].map((entry) => entry.playerObjectId.toString()))
    )]
    const missingLineupPlayerIds = lineupPlayerObjectIds.filter((id) => !enrichedRosterByPlayer.has(id))

    if (missingLineupPlayerIds.length) {
      const extraPlayers = await PlayerModel.find({ _id: { $in: missingLineupPlayerIds.map((id) => new mongoose.Types.ObjectId(id)) } })
        .select("_id player_id player_name country avatar")
        .lean<Array<{ _id: mongoose.Types.ObjectId; player_id: number; player_name: string; country: string; avatar?: string }>>()

      const competitionVisuals = await getCompetitionCandidatePlayers(leagueDoc.competitionObjectId, [])
      const visualByPlayerId = new Map(
        competitionVisuals.map((player) => [
          player._id.toString(),
          {
            position: player.position ?? null,
            teamName: player.teamName,
            teamImage: player.teamImage,
            kitImage: player.kitImage,
            kitTextColor: player.kitTextColor,
          },
        ])
      )

      for (const player of extraPlayers) {
        const visuals = visualByPlayerId.get(player._id.toString())
        enrichedRosterByPlayer.set(player._id.toString(), {
          id: player._id.toString(),
          playerObjectId: player._id.toString(),
          playerId: player.player_id,
          playerName: player.player_name,
          country: player.country,
          avatar: player.avatar ?? undefined,
          slot: "BENCH",
          position: visuals?.position ?? null,
          teamName: visuals?.teamName ?? "",
          teamImage: visuals?.teamImage ?? "",
          kitImage: visuals?.kitImage ?? "",
          kitTextColor: visuals?.kitTextColor ?? "",
          currentValue: 0,
          releaseClause: 0,
          acquiredBy: "random",
          isOnMarket: false,
        })
      }
    }

    teamWeeks = refreshedLineups.map((lineup) => {
      const rosterView = [...lineup.starters, ...lineup.bench]
        .map((entry) => {
          const basePlayer = enrichedRosterByPlayer.get(entry.playerObjectId.toString())
          if (!basePlayer) return null
          return {
            ...basePlayer,
            slot: entry.slot,
            weekPoints: pointsByWeekAndPlayer.get(`${lineup.week}:${entry.playerObjectId.toString()}`) ?? 0,
          }
        })
        .filter((value): value is FantasyRosterPlayerView => Boolean(value))

      return {
        week: lineup.week,
        formation: lineup.formation,
        locked: lineup.week < teamCurrentWeek,
        roster: rosterView,
      }
    })
    }
  }

  return {
    ...league,
    roster: enrichedRoster,
    season: dashboard.season,
    home: {
      defaultWeek,
      weeks,
      activity,
    },
    market,
    teamView: {
      mode: league.leagueType,
      currentWeek: teamCurrentWeek,
      weeks: teamWeeks,
      availablePlayers,
    },
    standings: members
      .map((member) => ({
        userId: member.userId.toString(),
        discordId: userById.get(member.userId.toString())?.discordId ?? null,
        teamName: member.teamName,
        playerName: userById.get(member.userId.toString())?.playerId
          ? playerNameById.get(userById.get(member.userId.toString())?.playerId?.toString() ?? "") ?? null
          : null,
        discordAvatar: userById.get(member.userId.toString())?.discordAvatar ?? null,
        role: member.role,
        points: totalPointsByUserId.get(member.userId.toString()) ?? 0,
      }))
      .sort((a, b) => b.points - a.points || a.teamName.localeCompare(b.teamName)),
  }
}

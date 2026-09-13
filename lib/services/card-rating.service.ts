import mongoose from "mongoose"
import dbConnect from "@/lib/db/mongoose"
import PlayerModel from "@/lib/models/Player"
import type { CardRating } from "@/lib/models/CardRequest"

const cardEngine = require("./ffl-card-engine.js")

export type GeneratedCardData = {
  player: {
    objectId: string
    playerId: number
    name: string
    country: string
    avatar?: string
  }
  team: {
    name?: string
    image?: string
  }
  position: string
  rating: CardRating
  summary: {
    matches: number
    weightedMatches: number
    minutes: number
    avg: number
    reliabilityApplied: boolean
  }
}

const MIN_RELIABLE_MATCHES = 18
type ValidatedRating = { position: string; ovr: number; sho: number; pas: number; def: number; dri: number }

const VALIDATED_GLOBAL_RATINGS_BY_PLAYER_ID: Record<number, ValidatedRating> = {
  40000082: { position: "CB", ovr: 81, sho: 60, pas: 83, def: 82, dri: 81 },
}

const VALIDATED_GLOBAL_RATINGS: Record<string, ValidatedRating> = {
  "wnocy": { position: "LW", ovr: 89, sho: 96, pas: 87, def: 82, dri: 92 },
  "nislija": { position: "CB", ovr: 89, sho: 65, pas: 86, def: 98, dri: 85 },
  "jasko": { position: "LW", ovr: 89, sho: 86, pas: 88, def: 86, dri: 86 },
  "madrichaa": { position: "LW", ovr: 89, sho: 93, pas: 89, def: 77, dri: 93 },
  "feffinho": { position: "RW", ovr: 88, sho: 97, pas: 82, def: 77, dri: 80 },
  "modric": { position: "CM", ovr: 88, sho: 80, pas: 89, def: 88, dri: 92 },
  "xaro": { position: "CB", ovr: 88, sho: 67, pas: 91, def: 94, dri: 92 },
  "poppa": { position: "CM", ovr: 88, sho: 85, pas: 85, def: 83, dri: 88 },
  "nors": { position: "CB", ovr: 88, sho: 63, pas: 87, def: 91, dri: 82 },
  "sung": { position: "ST", ovr: 88, sho: 89, pas: 87, def: 76, dri: 86 },
  "olumcul.": { position: "ST", ovr: 88, sho: 93, pas: 89, def: 72, dri: 88 },
  "hulk": { position: "CB", ovr: 88, sho: 72, pas: 92, def: 81, dri: 87 },
  "sequence": { position: "CM", ovr: 88, sho: 95, pas: 88, def: 82, dri: 89 },
  "ryuji": { position: "LW", ovr: 88, sho: 86, pas: 91, def: 76, dri: 90 },
  "^amp^": { position: "ST", ovr: 87, sho: 92, pas: 90, def: 82, dri: 93 },
  "felsepat": { position: "ST", ovr: 87, sho: 89, pas: 82, def: 76, dri: 85 },
  "ewinor": { position: "ST", ovr: 87, sho: 88, pas: 89, def: 76, dri: 91 },
  "vm.": { position: "CB", ovr: 87, sho: 59, pas: 90, def: 95, dri: 85 },
  "emman64": { position: "GK", ovr: 86, sho: 50, pas: 87, def: 95, dri: 86 },
  "tsukuyomi.": { position: "CB", ovr: 86, sho: 66, pas: 87, def: 83, dri: 85 },
  "x y.o talent": { position: "GK", ovr: 86, sho: 48, pas: 84, def: 94, dri: 83 },
  "niserio jr": { position: "LW", ovr: 86, sho: 84, pas: 86, def: 74, dri: 90 },
  "veil": { position: "RW", ovr: 86, sho: 92, pas: 87, def: 76, dri: 92 },
  "trunks": { position: "CM", ovr: 86, sho: 81, pas: 88, def: 76, dri: 89 },
  "pinotek": { position: "ST", ovr: 86, sho: 95, pas: 86, def: 70, dri: 91 },
  "kaiser": { position: "RW", ovr: 86, sho: 86, pas: 87, def: 77, dri: 91 },
  "xevher": { position: "CB", ovr: 86, sho: 66, pas: 85, def: 84, dri: 81 },
  "verone": { position: "CB", ovr: 86, sho: 68, pas: 90, def: 88, dri: 86 },
  "miao": { position: "CB", ovr: 86, sho: 63, pas: 87, def: 90, dri: 89 },
  "bachira": { position: "ST", ovr: 86, sho: 93, pas: 94, def: 70, dri: 92 },
  "dmoszek": { position: "RW", ovr: 86, sho: 95, pas: 93, def: 73, dri: 90 },
  "kyo": { position: "LW", ovr: 86, sho: 92, pas: 94, def: 72, dri: 94 },
  "saikyo": { position: "RW", ovr: 86, sho: 90, pas: 94, def: 76, dri: 94 },
  "casanova": { position: "CB", ovr: 85, sho: 59, pas: 83, def: 89, dri: 84 },
  "lyreco": { position: "LW", ovr: 85, sho: 91, pas: 83, def: 71, dri: 86 },
  "lisko": { position: "CB", ovr: 85, sho: 64, pas: 86, def: 85, dri: 84 },
  "erdi": { position: "CM", ovr: 85, sho: 74, pas: 84, def: 73, dri: 82 },
  "nj4": { position: "CB", ovr: 85, sho: 62, pas: 85, def: 89, dri: 82 },
  "suzuyaaa": { position: "LW", ovr: 85, sho: 83, pas: 87, def: 72, dri: 89 },
  "odrc": { position: "CM", ovr: 85, sho: 87, pas: 92, def: 82, dri: 93 },
  "kroos": { position: "CM", ovr: 85, sho: 81, pas: 89, def: 83, dri: 90 },
  "rusito": { position: "CM", ovr: 85, sho: 80, pas: 88, def: 77, dri: 90 },
  "danir0": { position: "ST", ovr: 85, sho: 85, pas: 87, def: 74, dri: 92 },
  "r34": { position: "CB", ovr: 84, sho: 65, pas: 87, def: 77, dri: 85 },
  "replik": { position: "CB", ovr: 84, sho: 63, pas: 84, def: 81, dri: 83 },
  "andries": { position: "ST", ovr: 84, sho: 94, pas: 80, def: 72, dri: 87 },
  "jexal": { position: "CB", ovr: 84, sho: 66, pas: 87, def: 82, dri: 84 },
  "yewest": { position: "CM", ovr: 84, sho: 77, pas: 85, def: 75, dri: 83 },
  "rel": { position: "CB", ovr: 84, sho: 69, pas: 89, def: 85, dri: 89 },
  "w": { position: "LW", ovr: 84, sho: 90, pas: 83, def: 70, dri: 82 },
  "elban anote": { position: "CB", ovr: 81, sho: 60, pas: 83, def: 82, dri: 81 },
}

function num(value: unknown) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function str(value: unknown) {
  return typeof value === "string" ? value : ""
}

function ratingKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function dateMs(value: unknown) {
  if (value instanceof Date) return value.getTime()
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value).getTime()
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

async function latestTeamForPlayer(db: mongoose.mongo.Db, playerObjectId: mongoose.Types.ObjectId) {
  const playerCompetitions = await db
    .collection("playercompetitions")
    .find({ player_id: playerObjectId })
    .project({ team_competition_id: 1 })
    .toArray()

  const teamCompetitionIds = playerCompetitions
    .map((row) => row.team_competition_id)
    .filter((value): value is mongoose.Types.ObjectId => value instanceof mongoose.Types.ObjectId)

  if (!teamCompetitionIds.length) return null

  const teamCompetitions = await db
    .collection("teamcompetitions")
    .find({ _id: { $in: teamCompetitionIds } })
    .project({ _id: 1, team_id: 1, competition_id: 1, team_competition_id: 1 })
    .toArray()

  const competitionIds = teamCompetitions
    .map((row) => row.competition_id)
    .filter((value): value is mongoose.Types.ObjectId => value instanceof mongoose.Types.ObjectId)

  const competitions = competitionIds.length
    ? await db
        .collection("competitions")
        .find({ _id: { $in: competitionIds } })
        .project({ _id: 1, competition_id: 1, season: 1, start_date: 1, end_date: 1 })
        .toArray()
    : []

  const competitionById = new Map(competitions.map((competition) => [String(competition._id), competition]))

  const latestTeamCompetition = teamCompetitions.sort((a, b) => {
    const competitionA = competitionById.get(String(a.competition_id))
    const competitionB = competitionById.get(String(b.competition_id))
    const competitionIdDiff = num(competitionB?.competition_id) - num(competitionA?.competition_id)
    if (competitionIdDiff) return competitionIdDiff
    const seasonDiff = num(competitionB?.season) - num(competitionA?.season)
    if (seasonDiff) return seasonDiff
    const dateA = Math.max(dateMs(competitionA?.start_date), dateMs(competitionA?.end_date))
    const dateB = Math.max(dateMs(competitionB?.start_date), dateMs(competitionB?.end_date))
    if (dateA !== dateB) return dateB - dateA
    return num(b.team_competition_id) - num(a.team_competition_id)
  })[0]

  return latestTeamCompetition?.team_id
    ? db.collection("teams").findOne({ _id: latestTeamCompetition.team_id })
    : null
}

export async function generateCardRatingForPlayer(playerObjectId: string): Promise<GeneratedCardData> {
  await dbConnect()

  const player = (await PlayerModel.findById(playerObjectId)
    .select("_id player_id player_name country avatar")
    .lean()) as
    | {
        _id: mongoose.Types.ObjectId
        player_id?: number
        player_name?: string
        country?: string
        avatar?: string
      }
    | null

  if (!player) {
    throw new Error("Player not found.")
  }

  const db = mongoose.connection.db

  if (!db) {
    throw new Error("MongoDB connection is not ready.")
  }

  const numericPlayerId = Number(player.player_id)
  const validatedRating =
    VALIDATED_GLOBAL_RATINGS_BY_PLAYER_ID[numericPlayerId] ??
    VALIDATED_GLOBAL_RATINGS[ratingKey(str(player.player_name))]
  if (validatedRating) {
    const playerCompetitions = await db
      .collection("playercompetitions")
      .find({ player_id: player._id })
      .project({ team_competition_id: 1, matches_played: 1, minutes_played: 1, avg: 1 })
      .toArray()

    let matches = 0
    let minutes = 0
    let avgWeighted = 0
    let avgWeight = 0

    for (const row of playerCompetitions) {
      const rowMatches = num(row.matches_played)
      matches += rowMatches
      minutes += num(row.minutes_played)
      avgWeighted += num(row.avg) * rowMatches
      avgWeight += rowMatches
    }

    const team = await latestTeamForPlayer(db, player._id)

    return {
      player: {
        objectId: player._id.toString(),
        playerId: Number(player.player_id),
        name: str(player.player_name),
        country: str(player.country),
        avatar: str(player.avatar),
      },
      team: {
        name: str(team?.team_name),
        image: str(team?.image),
      },
      position: validatedRating.position,
      rating: {
        ovr: validatedRating.ovr,
        sho: validatedRating.sho,
        pas: validatedRating.pas,
        def: validatedRating.def,
        dri: validatedRating.dri,
      },
      summary: {
        matches,
        weightedMatches: matches,
        minutes,
        avg: Number((avgWeight > 0 ? avgWeighted / avgWeight : 0).toFixed(2)),
        reliabilityApplied: matches < MIN_RELIABLE_MATCHES,
      },
    }
  }

  const engineCard = await cardEngine.getGlobalCardByPlayerObjectId(playerObjectId)

  const teamCompetition = engineCard.teamId
    ? await db
        .collection("teamcompetitions")
        .findOne({ _id: new mongoose.Types.ObjectId(String(engineCard.teamId)) })
    : null
  const team = teamCompetition?.team_id
    ? await db.collection("teams").findOne({ _id: teamCompetition.team_id })
    : null

  const matches = num(engineCard.stats?.matches || engineCard.stats?.matches_played)
  const minutes = num(engineCard.stats?.minutes || engineCard.stats?.minutes_played)
  const avg = num(engineCard.stats?.avg)
  const rating = {
    ovr: num(engineCard.attributes?.ovr),
    sho: num(engineCard.attributes?.sho),
    pas: num(engineCard.attributes?.pas),
    def: num(engineCard.attributes?.def),
    dri: num(engineCard.attributes?.dri),
  }

  return {
    player: {
      objectId: player._id.toString(),
      playerId: Number(player.player_id),
      name: str(engineCard.name) || str(player.player_name),
      country: str(engineCard.country) || str(player.country),
      avatar: str(engineCard.avatar) || str(player.avatar),
    },
    team: {
      name: str(team?.team_name),
      image: str(team?.image),
    },
    position: str(engineCard.position) || "CM",
    rating,
    summary: {
      matches,
      weightedMatches: matches,
      minutes,
      avg: Number(avg.toFixed(2)),
      reliabilityApplied: matches < MIN_RELIABLE_MATCHES,
    },
  }
}

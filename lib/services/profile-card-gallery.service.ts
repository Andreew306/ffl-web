import mongoose from "mongoose"
import dbConnect from "@/lib/db/mongoose"
import CardRequestModel, { type CardRating } from "@/lib/models/CardRequest"
import PlayerModel from "@/lib/models/Player"

export type ProfileCardGalleryItem = {
  id: string
  status: "open" | "pending_approval" | "approved" | "rejected" | "failed"
  playerName: string
  playerId: number | null
  country?: string
  position?: string
  teamId?: string
  approvedImageUrl: string | null
  botRating: CardRating
  finalRating: CardRating | null
  reviewRound: number
  closesAt: string
  createdAt: string
  updatedAt: string
}

export async function getProfileCardGallery(discordId: string, playerObjectId?: string | null) {
  await dbConnect()

  const filters: Array<Record<string, unknown>> = [{ requestedByDiscordId: discordId }]
  if (playerObjectId && mongoose.Types.ObjectId.isValid(playerObjectId)) {
    filters.push({ playerId: new mongoose.Types.ObjectId(playerObjectId) })
  }

  const requests = await CardRequestModel.find({
    $or: filters,
    status: "approved",
    approvedImageUrl: { $type: "string", $ne: "" },
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean<Array<{
      _id: mongoose.Types.ObjectId
      playerId: mongoose.Types.ObjectId
      status: ProfileCardGalleryItem["status"]
      approvedImageUrl?: string | null
      botRating: CardRating
      finalRating?: CardRating | null
      reviewRound?: number
      closesAt: Date
      createdAt?: Date
      updatedAt?: Date
    }>>()

  const playerIds = [...new Set(requests.map((request) => request.playerId.toString()))]
  const players = await PlayerModel.find({ _id: { $in: playerIds.map((id) => new mongoose.Types.ObjectId(id)) } })
    .select("_id player_id player_name")
    .lean<Array<{ _id: mongoose.Types.ObjectId; player_id?: number; player_name?: string }>>()
  const playersById = new Map(players.map((player) => [player._id.toString(), player]))

  return requests.map((request): ProfileCardGalleryItem => {
    const player = playersById.get(request.playerId.toString())
    return {
      id: request._id.toString(),
      status: request.status,
      playerName: player?.player_name || "Unknown player",
      playerId: typeof player?.player_id === "number" ? player.player_id : null,
      approvedImageUrl: request.approvedImageUrl || null,
      botRating: request.botRating,
      finalRating: request.finalRating || null,
      reviewRound: request.reviewRound || 1,
      closesAt: request.closesAt.toISOString(),
      createdAt: (request.createdAt || request.closesAt).toISOString(),
      updatedAt: (request.updatedAt || request.closesAt).toISOString(),
    }
  })
}

export async function getPlayerCardGallery(playerObjectId: string) {
  if (!mongoose.Types.ObjectId.isValid(playerObjectId)) return []

  await dbConnect()
  const playerId = new mongoose.Types.ObjectId(playerObjectId)
  const requests = await CardRequestModel.find({
    playerId,
    status: "approved",
    approvedImageUrl: { $type: "string", $ne: "" },
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean<Array<{
      _id: mongoose.Types.ObjectId
      status: ProfileCardGalleryItem["status"]
      approvedImageUrl?: string | null
      botRating: CardRating
      finalRating?: CardRating | null
      reviewRound?: number
      closesAt: Date
      createdAt?: Date
      updatedAt?: Date
    }>>()

  const player = await PlayerModel.findById(playerId)
    .select("player_id player_name")
    .lean<{ player_id?: number; player_name?: string } | null>()

  return requests.map((request): ProfileCardGalleryItem => ({
    id: request._id.toString(),
    status: request.status,
    playerName: player?.player_name || "Unknown player",
    playerId: typeof player?.player_id === "number" ? player.player_id : null,
    approvedImageUrl: request.approvedImageUrl || null,
    botRating: request.botRating,
    finalRating: request.finalRating || null,
    reviewRound: request.reviewRound || 1,
    closesAt: request.closesAt.toISOString(),
    createdAt: (request.createdAt || request.closesAt).toISOString(),
    updatedAt: (request.updatedAt || request.closesAt).toISOString(),
  }))
}

export async function getAllApprovedBaseCards() {
  await dbConnect()

  const requests = await CardRequestModel.find({
    status: "approved",
    approvedImageUrl: { $type: "string", $ne: "" },
  })
    .sort({ createdAt: -1 })
    .limit(500)
    .lean<Array<{
      _id: mongoose.Types.ObjectId
      playerId: mongoose.Types.ObjectId
      status: ProfileCardGalleryItem["status"]
      approvedImageUrl?: string | null
      botRating: CardRating
      finalRating?: CardRating | null
      reviewRound?: number
      closesAt: Date
      createdAt?: Date
      updatedAt?: Date
    }>>()

  const latestByPlayer = new Map<string, (typeof requests)[number]>()
  for (const request of requests) {
    const key = request.playerId.toString()
    if (!latestByPlayer.has(key)) latestByPlayer.set(key, request)
  }

  const latestRequests = [...latestByPlayer.values()]
  const playerIds = latestRequests.map((request) => request.playerId)
  const players = await PlayerModel.find({ _id: { $in: playerIds } })
    .select("_id player_id player_name country")
    .lean<Array<{ _id: mongoose.Types.ObjectId; player_id?: number; player_name?: string; country?: string }>>()
  const playersById = new Map(players.map((player) => [player._id.toString(), player]))

  const db = mongoose.connection.db
  const playerCompetitions = db
    ? await db.collection("playercompetitions")
        .find({ player_id: { $in: playerIds } })
        .project({ player_id: 1, team_competition_id: 1, player_competition_id: 1, position: 1 })
        .sort({ player_competition_id: -1 })
        .toArray()
    : []
  const latestCompetitionByPlayer = new Map<string, (typeof playerCompetitions)[number]>()
  for (const row of playerCompetitions) {
    const key = String(row.player_id)
    if (!latestCompetitionByPlayer.has(key)) latestCompetitionByPlayer.set(key, row)
  }
  const teamCompetitionIds = [...latestCompetitionByPlayer.values()]
    .map((row) => row.team_competition_id)
    .filter((id): id is mongoose.Types.ObjectId => id instanceof mongoose.Types.ObjectId)
  const teamCompetitions = db && teamCompetitionIds.length
    ? await db.collection("teamcompetitions")
        .find({ _id: { $in: teamCompetitionIds } })
        .project({ _id: 1, team_id: 1 })
        .toArray()
    : []
  const teamByCompetition = new Map(teamCompetitions.map((row) => [String(row._id), String(row.team_id)]))

  return latestRequests
    .map((request): ProfileCardGalleryItem => {
      const player = playersById.get(request.playerId.toString())
      const latestCompetition = latestCompetitionByPlayer.get(request.playerId.toString())
      return {
        id: request._id.toString(),
        status: request.status,
        playerName: player?.player_name || "Unknown player",
        playerId: typeof player?.player_id === "number" ? player.player_id : null,
        country: player?.country || "",
        position: String(latestCompetition?.position || "").toUpperCase(),
        teamId: teamByCompetition.get(String(latestCompetition?.team_competition_id)) || "",
        approvedImageUrl: request.approvedImageUrl || null,
        botRating: request.botRating,
        finalRating: request.finalRating || null,
        reviewRound: request.reviewRound || 1,
        closesAt: request.closesAt.toISOString(),
        createdAt: (request.createdAt || request.closesAt).toISOString(),
        updatedAt: (request.updatedAt || request.closesAt).toISOString(),
      }
    })
    .sort((a, b) => (b.finalRating?.ovr || b.botRating.ovr) - (a.finalRating?.ovr || a.botRating.ovr))
}

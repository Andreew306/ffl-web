import mongoose from "mongoose"
import dbConnect from "@/lib/db/mongoose"
import CardRequestModel, { type CardRating } from "@/lib/models/CardRequest"
import PlayerModel from "@/lib/models/Player"

export type ProfileCardGalleryItem = {
  id: string
  status: "open" | "pending_approval" | "approved" | "rejected" | "failed"
  playerName: string
  playerId: number | null
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

  const requests = await CardRequestModel.find({ $or: filters })
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

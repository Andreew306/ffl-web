import mongoose from "mongoose"
import dbConnect from "@/lib/db/mongoose"
import CardRequestModel from "@/lib/models/CardRequest"
import PlayerModel from "@/lib/models/Player"
import { createDiscordCardReviewThread } from "@/lib/services/discord-card.service"
import { renderPlayerCardPng } from "@/lib/services/card-image.service"
import { generateCardRatingForPlayer } from "@/lib/services/card-rating.service"

async function resolvePlayerId(playerIdentifier: string) {
  if (mongoose.Types.ObjectId.isValid(playerIdentifier)) {
    const playerId = new mongoose.Types.ObjectId(playerIdentifier)
    const player = await PlayerModel.findById(playerId).select("_id").lean<{ _id: mongoose.Types.ObjectId } | null>()
    if (player) return playerId
  }

  const numericPlayerId = Number(playerIdentifier)
  if (Number.isInteger(numericPlayerId)) {
    const player = await PlayerModel.findOne({ player_id: numericPlayerId })
      .select("_id")
      .lean<{ _id: mongoose.Types.ObjectId } | null>()
    if (player?._id) return player._id
  }

  throw new Error("Invalid player id.")
}

export async function requestCardForPlayer(discordId: string, playerIdentifier: string) {
  await dbConnect()

  const playerId = await resolvePlayerId(playerIdentifier)
  await PlayerModel.updateOne({ _id: playerId }, { $set: { discord_id: discordId } })

  const existingOpenRequest = await CardRequestModel.findOne({
    playerId,
    requestedByDiscordId: discordId,
    status: "open",
    closesAt: { $gt: new Date() },
    discordThreadId: { $ne: null },
  }).lean<{ _id: mongoose.Types.ObjectId; discordThreadId?: string | null } | null>()

  if (existingOpenRequest?.discordThreadId) {
    return {
      reused: true,
      requestId: existingOpenRequest._id.toString(),
      discordThreadId: existingOpenRequest.discordThreadId,
    }
  }

  const card = await generateCardRatingForPlayer(playerId.toString())
  const closesAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const request = await CardRequestModel.create({
    playerId,
    requestedByDiscordId: discordId,
    status: "open",
    botRating: card.rating,
    closesAt,
  })

  try {
    const image = await renderPlayerCardPng(card)
    const discordThread = await createDiscordCardReviewThread(card, image)

    request.discordThreadId = discordThread.id ?? null
    request.discordStarterMessageId = discordThread.message?.id ?? null
    await request.save()

    return {
      reused: false,
      requestId: request._id.toString(),
      discordThreadId: request.discordThreadId,
    }
  } catch (error) {
    request.status = "failed"
    request.error = error instanceof Error ? error.message : "Unknown card request error."
    await request.save()
    throw error
  }
}

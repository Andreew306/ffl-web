import mongoose from "mongoose"
import dbConnect from "@/lib/db/mongoose"
import CardRequestModel from "@/lib/models/CardRequest"
import PlayerModel from "@/lib/models/Player"
import { createDiscordCardReviewThread } from "@/lib/services/discord-card.service"
import { renderPlayerCardPng } from "@/lib/services/card-image.service"
import { generateCardRatingForPlayer } from "@/lib/services/card-rating.service"

export async function requestCardForPlayer(discordId: string, playerObjectId: string) {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(playerObjectId)) {
    throw new Error("Invalid player id.")
  }

  const playerId = new mongoose.Types.ObjectId(playerObjectId)
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

  const card = await generateCardRatingForPlayer(playerObjectId)
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

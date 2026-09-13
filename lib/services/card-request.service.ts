import mongoose from "mongoose"
import dbConnect from "@/lib/db/mongoose"
import CardRequestModel from "@/lib/models/CardRequest"
import CardVoteModel from "@/lib/models/CardVote"
import CardApprovalVoteModel from "@/lib/models/CardApprovalVote"
import PlayerModel from "@/lib/models/Player"
import { createDiscordCardReviewThread } from "@/lib/services/discord-card.service"
import { renderPlayerCardPng } from "@/lib/services/card-image.service"
import { generateCardRatingForPlayer } from "@/lib/services/card-rating.service"

type BlockingCardRequestStatus = "open" | "pending_approval" | "approved"
type CardRequestLockDoc = {
  _id: string
  playerId: mongoose.Types.ObjectId
  requestedByDiscordId: string
  createdAt: Date
  updatedAt: Date
}

const ACTIVE_CARD_REQUEST_STATUSES = ["open", "pending_approval", "approved"] satisfies BlockingCardRequestStatus[]
const LOCK_STALE_MS = 2 * 60 * 1000

function cardRequestLockId(playerId: mongoose.Types.ObjectId) {
  return `card-request:${playerId.toString()}`
}

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

  const existingRequestFilter = {
    playerId,
    status: { $in: ACTIVE_CARD_REQUEST_STATUSES },
  }

  const existingRequest = await CardRequestModel.findOne(existingRequestFilter)
    .sort({ createdAt: -1 })
    .lean<{
      _id: mongoose.Types.ObjectId
      discordThreadId?: string | null
      status: BlockingCardRequestStatus
      approvedImageUrl?: string | null
    } | null>()

  if (existingRequest) {
    return {
      reused: true,
      status: existingRequest.status,
      requestId: existingRequest._id.toString(),
      discordThreadId: existingRequest.discordThreadId ?? null,
      approvedImageUrl: existingRequest.approvedImageUrl ?? null,
    }
  }

  const db = mongoose.connection.db
  if (!db) {
    throw new Error("MongoDB connection is not ready.")
  }

  const locks = db.collection<CardRequestLockDoc>("cardrequestlocks")
  const lockId = cardRequestLockId(playerId)
  let replacedStaleLock = false
  try {
    await locks.insertOne({
      _id: lockId,
      playerId,
      requestedByDiscordId: discordId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === 11000) {
      const request = await CardRequestModel.findOne(existingRequestFilter)
        .sort({ createdAt: -1 })
        .lean<{
          _id: mongoose.Types.ObjectId
          discordThreadId?: string | null
          status: BlockingCardRequestStatus
          approvedImageUrl?: string | null
        } | null>()

      if (request) {
        return {
          reused: true,
          status: request.status,
          requestId: request._id.toString(),
          discordThreadId: request.discordThreadId ?? null,
          approvedImageUrl: request.approvedImageUrl ?? null,
        }
      }

      const lock = await locks.findOne({ _id: lockId })
      if (lock && Date.now() - lock.createdAt.getTime() < LOCK_STALE_MS) {
        return {
          reused: true,
          status: "open" as const,
          requestId: lockId,
          discordThreadId: null,
          approvedImageUrl: null,
        }
      }

      await locks.deleteOne({ _id: lockId })
      await locks.insertOne({
        _id: lockId,
        playerId,
        requestedByDiscordId: discordId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      replacedStaleLock = true
    }

    if (!replacedStaleLock) {
      throw error
    }
  }

  try {
    const card = await generateCardRatingForPlayer(playerId.toString())
    const closesAt = new Date(Date.now() + 12 * 60 * 60 * 1000)
    const request = await CardRequestModel.create({
      playerId,
      requestedByDiscordId: discordId,
      status: "open",
      botRating: card.rating,
      reviewRound: 1,
      closesAt,
    })

    await Promise.all([
      CardVoteModel.deleteMany({ cardRequestId: request._id }),
      CardApprovalVoteModel.deleteMany({ cardRequestId: request._id }),
    ])

    const image = await renderPlayerCardPng(card)
    const discordThread = await createDiscordCardReviewThread(card, image)

    request.discordThreadId = discordThread.id ?? null
    request.discordStarterMessageId = discordThread.message?.id ?? null
    await request.save()

    return {
      reused: false,
      status: "open" as const,
      requestId: request._id.toString(),
      discordThreadId: request.discordThreadId,
      approvedImageUrl: null,
    }
  } catch (error) {
    await CardRequestModel.findOneAndUpdate(
      { playerId, requestedByDiscordId: discordId, status: "open", discordThreadId: null },
      {
        $set: {
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown card request error.",
        },
      },
      { sort: { createdAt: -1 } },
    )
    await locks.deleteOne({ _id: lockId })
    throw error
  }
}

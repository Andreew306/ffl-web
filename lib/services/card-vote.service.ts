import mongoose from "mongoose"
import dbConnect from "@/lib/db/mongoose"
import CardApprovalVoteModel from "@/lib/models/CardApprovalVote"
import CardRequestModel, { type CardRating } from "@/lib/models/CardRequest"
import CardVoteModel from "@/lib/models/CardVote"
import PlayerModel from "@/lib/models/Player"
import { renderPlayerCardPng } from "@/lib/services/card-image.service"
import { generateCardRatingForPlayer, type GeneratedCardData } from "@/lib/services/card-rating.service"
import {
  sendDiscordCardReviewReopenedMessage,
  sendDiscordCardReviewReply,
  sendDiscordFixedCardApprovalMessage,
} from "@/lib/services/discord-card.service"

const RATING_FIELDS = ["ovr", "sho", "pas", "def", "dri"] as const
const STAFF_FIX_TARGET = 10
const APPROVAL_TARGET = 6
const REVIEW_MS = 12 * 60 * 60 * 1000

type RatingField = (typeof RATING_FIELDS)[number]
type CardRequestStatus = "open" | "pending_approval" | "approved" | "rejected" | "failed"

export type DiscordCardVoteInput = {
  threadId: string
  staffDiscordId: string
  content: string
  messageId?: string | null
}

export type DiscordCardVoteResult = {
  ok: boolean
  status: "created" | "updated" | "ignored" | "not_found" | "closed" | "finalized"
  responseContent: string
  rating?: Partial<CardRating>
  voteCount?: number
}

export type CardApprovalInput = {
  requestId: string
  staffDiscordId: string
  decision: "accept" | "reject"
}

function parseRatingValue(value: string) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 99) return null
  return parsed
}

export function parseCardVoteContent(content: string): Partial<CardRating> {
  const rating: Partial<CardRating> = {}

  for (const line of content.split(/\r?\n/)) {
    const match = line.trim().match(/^(OVR|SHO|PAS|DEF|DRI)\s*[:=\-]?\s*(\d{1,2})\b/i)
    if (!match) continue

    const field = match[1].toLowerCase() as RatingField
    const value = parseRatingValue(match[2])
    if (value == null) continue
    rating[field] = value
  }

  return rating
}

function hasAnyRating(rating: Partial<CardRating>) {
  return RATING_FIELDS.some((field) => rating[field] != null)
}

function formatRating(rating: Partial<CardRating>) {
  return RATING_FIELDS
    .filter((field) => rating[field] != null)
    .map((field) => `${field.toUpperCase()} ${rating[field]}`)
    .join(" | ")
}

function averageField(botValue: number, votes: Array<Partial<CardRating>>, field: RatingField) {
  const values = [botValue, ...votes.map((vote) => vote[field]).filter((value): value is number => typeof value === "number")]
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function averageRating(botRating: CardRating, votes: Array<Partial<CardRating>>): CardRating {
  return {
    ovr: averageField(botRating.ovr, votes, "ovr"),
    sho: averageField(botRating.sho, votes, "sho"),
    pas: averageField(botRating.pas, votes, "pas"),
    def: averageField(botRating.def, votes, "def"),
    dri: averageField(botRating.dri, votes, "dri"),
  }
}

function withRating(card: GeneratedCardData, rating: CardRating): GeneratedCardData {
  return {
    ...card,
    rating,
  }
}

function buildCardFileName(card: GeneratedCardData) {
  const safeName = card.player.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60)
    .toLowerCase() || "player"
  return `${card.player.playerId}-${safeName}-base-card.png`
}

async function uploadCardToImgBb(card: GeneratedCardData, image: Buffer) {
  const key = process.env.IMGBB_API_KEY
  if (!key) return null

  const formData = new FormData()
  formData.append("image", image.toString("base64"))
  formData.append("name", buildCardFileName(card).replace(/\.png$/i, ""))

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(key)}`, {
    method: "POST",
    body: formData,
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(`ImgBB upload failed (${response.status}): ${JSON.stringify(body)}`)
  }
  return body?.data?.url as string | null
}

async function finalizeRequest(requestId: mongoose.Types.ObjectId, reason: "votes" | "time") {
  const request = await CardRequestModel.findById(requestId)
  if (!request || request.status !== "open") return null

  const votes = await CardVoteModel.find({ cardRequestId: request._id }).select("rating").lean<Array<{ rating: Partial<CardRating> }>>()
  const finalRating = averageRating(request.botRating, votes.map((vote) => vote.rating))

  const card = withRating(await generateCardRatingForPlayer(request.playerId.toString()), finalRating)
  const image = await renderPlayerCardPng(card)

  request.status = "pending_approval"
  request.finalRating = finalRating
  const approvalMessage = request.discordThreadId
    ? await sendDiscordFixedCardApprovalMessage(request.discordThreadId, card, image, request._id.toString())
    : null
  request.approvalMessageId = approvalMessage?.id ?? null
  await request.save()

  return {
    finalRating,
    voteCount: votes.length,
    responseContent: [
      `Card review closed by ${reason === "votes" ? "10 staff fixes" : "time limit"}.`,
      `Final average including bot: **OVR ${finalRating.ovr}** | SHO ${finalRating.sho} | PAS ${finalRating.pas} | DEF ${finalRating.def} | DRI ${finalRating.dri}`,
      "Sent fixed card for approval.",
    ].join("\n"),
  }
}

export async function closeDueCardRequests() {
  await dbConnect()

  const dueRequests = await CardRequestModel.find({
    status: "open",
    closesAt: { $lte: new Date() },
    discordThreadId: { $ne: null },
  }).select("_id discordThreadId")

  const results = []
  for (const request of dueRequests) {
    const result = await finalizeRequest(request._id, "time")
    if (result && request.discordThreadId) {
      await sendDiscordCardReviewReply(request.discordThreadId, result.responseContent).catch(() => {})
      results.push({ requestId: request._id.toString(), ok: true })
    }
  }

  return results
}

export async function registerDiscordCardVote(input: DiscordCardVoteInput): Promise<DiscordCardVoteResult> {
  await dbConnect()

  const threadId = input.threadId.trim()
  const staffDiscordId = input.staffDiscordId.trim()
  const rating = parseCardVoteContent(input.content)

  if (!threadId || !staffDiscordId || !hasAnyRating(rating)) {
    return {
      ok: false,
      status: "ignored",
      responseContent:
        "I could not read a card vote. Use one value per line, for example: `OVR 90`, `SHO 90`, `PAS 90`, `DEF 90`, `DRI 90`.",
    }
  }

  const request = await CardRequestModel.findOne({ discordThreadId: threadId })
    .select("_id playerId status closesAt botRating")
    .lean<{
      _id: mongoose.Types.ObjectId
      playerId: mongoose.Types.ObjectId
      status: CardRequestStatus
      closesAt: Date
      botRating: CardRating
    } | null>()

  if (!request) {
    return {
      ok: false,
      status: "not_found",
      responseContent: "I could not find an open card request linked to this thread.",
    }
  }

  if (request.status !== "open") {
    return {
      ok: false,
      status: "closed",
      responseContent: "This card review is already closed.",
    }
  }

  if (request.closesAt.getTime() <= Date.now()) {
    const finalized = await finalizeRequest(request._id, "time")
    return {
      ok: true,
      status: "finalized",
      responseContent: finalized?.responseContent || "This card review is already closed.",
    }
  }

  const existingVote = await CardVoteModel.findOne({
    cardRequestId: request._id,
    staffDiscordId,
  })
    .select("_id")
    .lean<{ _id: mongoose.Types.ObjectId } | null>()

  await CardVoteModel.updateOne(
    { cardRequestId: request._id, staffDiscordId },
    {
      $set: {
        rating,
        comment: input.messageId ? `Discord message ${input.messageId}` : null,
      },
    },
    { upsert: true },
  )

  const [votes, player] = await Promise.all([
    CardVoteModel.find({ cardRequestId: request._id }).select("rating").lean<Array<{ rating: Partial<CardRating> }>>(),
    PlayerModel.findById(request.playerId).select("player_name").lean<{ player_name?: string } | null>(),
  ])

  const voteRatings = votes.map((vote) => vote.rating)
  const projectedFinal = averageRating(request.botRating, voteRatings)
  const status = existingVote ? "updated" : "created"

  if (votes.length >= STAFF_FIX_TARGET) {
    const finalized = await finalizeRequest(request._id, "votes")
    return {
      ok: true,
      status: "finalized",
      rating,
      voteCount: votes.length,
      responseContent: [
        `${status === "updated" ? "Updated" : "Registered"} vote for **${player?.player_name || "this card"}**.`,
        `Votes received: **${votes.length}/${STAFF_FIX_TARGET}**`,
        finalized?.responseContent || "Card review closed and fixed card sent for approval.",
      ].join("\n"),
    }
  }

  return {
    ok: true,
    status,
    rating,
    voteCount: votes.length,
    responseContent: [
      `${status === "updated" ? "Updated" : "Registered"} vote for **${player?.player_name || "this card"}**.`,
      `Your vote: ${formatRating(rating)}`,
      `Votes received: **${votes.length}/${STAFF_FIX_TARGET}**`,
      `Current projected average including the bot: **OVR ${projectedFinal.ovr}** | SHO ${projectedFinal.sho} | PAS ${projectedFinal.pas} | DEF ${projectedFinal.def} | DRI ${projectedFinal.dri}`,
    ].join("\n"),
  }
}

export async function registerCardApprovalVote(input: CardApprovalInput) {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(input.requestId)) {
    return { ok: false, status: "not_found", responseContent: "Invalid card request." }
  }

  const request = await CardRequestModel.findById(input.requestId)
  if (!request || !request.discordThreadId) {
    return { ok: false, status: "not_found", responseContent: "Card request not found." }
  }
  if (request.status !== "pending_approval" || !request.finalRating) {
    return { ok: false, status: "closed", responseContent: "This card approval is not open." }
  }

  await CardApprovalVoteModel.updateOne(
    { cardRequestId: request._id, staffDiscordId: input.staffDiscordId },
    { $set: { decision: input.decision } },
    { upsert: true },
  )

  const votes = await CardApprovalVoteModel.find({ cardRequestId: request._id }).select("decision").lean<Array<{ decision: "accept" | "reject" }>>()
  const accepts = votes.filter((vote) => vote.decision === "accept").length
  const rejects = votes.filter((vote) => vote.decision === "reject").length

  if (accepts >= APPROVAL_TARGET) {
    const card = withRating(await generateCardRatingForPlayer(request.playerId.toString()), request.finalRating)
    const image = await renderPlayerCardPng(card)
    const imageUrl = await uploadCardToImgBb(card, image)
    request.status = "approved"
    request.approvedImageUrl = imageUrl
    await request.save()
    return {
      ok: true,
      status: "approved",
      responseContent: imageUrl
        ? `Card approved by ${accepts} staff voters and uploaded to ImgBB: ${imageUrl}`
        : `Card approved by ${accepts} staff voters. ImgBB upload skipped because IMGBB_API_KEY is not configured.`,
    }
  }

  if (rejects >= APPROVAL_TARGET) {
    const originalCard = await generateCardRatingForPlayer(request.playerId.toString())
    const originalImage = await renderPlayerCardPng(originalCard)

    await Promise.all([
      CardVoteModel.deleteMany({ cardRequestId: request._id }),
      CardApprovalVoteModel.deleteMany({ cardRequestId: request._id }),
    ])
    request.status = "open"
    request.finalRating = null
    request.approvalMessageId = null
    request.reviewRound = (request.reviewRound || 1) + 1
    request.closesAt = new Date(Date.now() + REVIEW_MS)
    await request.save()

    await sendDiscordCardReviewReopenedMessage(request.discordThreadId, originalCard, originalImage)
    await sendDiscordCardReviewReply(request.discordThreadId, `Card rejected by ${rejects} staff voters. Reopened a new 12-hour fix period using the original bot card.`)

    return {
      ok: true,
      status: "reopened",
      responseContent: `Reject registered. Reopened fix period. Accept ${accepts}/${APPROVAL_TARGET} | Reject ${rejects}/${APPROVAL_TARGET}`,
    }
  }

  return {
    ok: true,
    status: "recorded",
    responseContent: `${input.decision === "accept" ? "Accept" : "Reject"} registered. Accept ${accepts}/${APPROVAL_TARGET} | Reject ${rejects}/${APPROVAL_TARGET}`,
  }
}

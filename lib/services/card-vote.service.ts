import mongoose from "mongoose"
import dbConnect from "@/lib/db/mongoose"
import CardRequestModel, { type CardRating } from "@/lib/models/CardRequest"
import CardVoteModel from "@/lib/models/CardVote"
import PlayerModel from "@/lib/models/Player"

const RATING_FIELDS = ["ovr", "sho", "pas", "def", "dri"] as const

type RatingField = (typeof RATING_FIELDS)[number]

export type DiscordCardVoteInput = {
  threadId: string
  staffDiscordId: string
  content: string
  messageId?: string | null
}

export type DiscordCardVoteResult = {
  ok: boolean
  status: "created" | "updated" | "ignored" | "not_found" | "closed"
  responseContent: string
  rating?: Partial<CardRating>
  voteCount?: number
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
      status: "open" | "closed" | "failed"
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

  if (request.status !== "open" || request.closesAt.getTime() <= Date.now()) {
    return {
      ok: false,
      status: "closed",
      responseContent: "This card review is already closed.",
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

  return {
    ok: true,
    status,
    rating,
    voteCount: votes.length,
    responseContent: [
      `${status === "updated" ? "Updated" : "Registered"} vote for **${player?.player_name || "this card"}**.`,
      `Your vote: ${formatRating(rating)}`,
      `Votes received: **${votes.length}**`,
      `Current projected average including the bot: **OVR ${projectedFinal.ovr}** | SHO ${projectedFinal.sho} | PAS ${projectedFinal.pas} | DEF ${projectedFinal.def} | DRI ${projectedFinal.dri}`,
    ].join("\n"),
  }
}

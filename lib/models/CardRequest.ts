import mongoose, { Schema, Document, models } from "mongoose"

export type CardRating = {
  ovr: number
  sho: number
  pas: number
  def: number
  dri: number
}

export interface ICardRequest extends Document {
  playerId: mongoose.Types.ObjectId
  requestedByDiscordId: string
  discordThreadId?: string | null
  discordStarterMessageId?: string | null
  status: "open" | "closed" | "failed"
  botRating: CardRating
  finalRating?: CardRating | null
  closesAt: Date
  error?: string | null
}

const cardRatingSchema = new Schema<CardRating>(
  {
    ovr: { type: Number, required: true },
    sho: { type: Number, required: true },
    pas: { type: Number, required: true },
    def: { type: Number, required: true },
    dri: { type: Number, required: true },
  },
  { _id: false }
)

const cardRequestSchema = new Schema<ICardRequest>(
  {
    playerId: { type: Schema.Types.ObjectId, ref: "Player", required: true, index: true },
    requestedByDiscordId: { type: String, required: true, index: true },
    discordThreadId: { type: String, default: null, index: true },
    discordStarterMessageId: { type: String, default: null },
    status: { type: String, enum: ["open", "closed", "failed"], default: "open", index: true },
    botRating: { type: cardRatingSchema, required: true },
    finalRating: { type: cardRatingSchema, default: null },
    closesAt: { type: Date, required: true, index: true },
    error: { type: String, default: null },
  },
  { timestamps: true }
)

const CardRequestModel =
  models.CardRequest || mongoose.model<ICardRequest>("CardRequest", cardRequestSchema)

export default CardRequestModel

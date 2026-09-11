import mongoose, { Schema, Document, models } from "mongoose"
import type { CardRating } from "@/lib/models/CardRequest"

export interface ICardVote extends Document {
  cardRequestId: mongoose.Types.ObjectId
  staffDiscordId: string
  rating: Partial<CardRating>
  comment?: string | null
}

const partialRatingSchema = new Schema<Partial<CardRating>>(
  {
    ovr: { type: Number, min: 1, max: 99 },
    sho: { type: Number, min: 1, max: 99 },
    pas: { type: Number, min: 1, max: 99 },
    def: { type: Number, min: 1, max: 99 },
    dri: { type: Number, min: 1, max: 99 },
  },
  { _id: false }
)

const cardVoteSchema = new Schema<ICardVote>(
  {
    cardRequestId: { type: Schema.Types.ObjectId, ref: "CardRequest", required: true, index: true },
    staffDiscordId: { type: String, required: true, index: true },
    rating: { type: partialRatingSchema, required: true },
    comment: { type: String, default: null },
  },
  { timestamps: true }
)

cardVoteSchema.index({ cardRequestId: 1, staffDiscordId: 1 }, { unique: true })

const CardVoteModel = models.CardVote || mongoose.model<ICardVote>("CardVote", cardVoteSchema)

export default CardVoteModel

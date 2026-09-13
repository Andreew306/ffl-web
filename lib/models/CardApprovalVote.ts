import mongoose, { Schema, Document, models } from "mongoose"

export interface ICardApprovalVote extends Document {
  cardRequestId: mongoose.Types.ObjectId
  staffDiscordId: string
  decision: "accept" | "reject"
}

const cardApprovalVoteSchema = new Schema<ICardApprovalVote>(
  {
    cardRequestId: { type: Schema.Types.ObjectId, ref: "CardRequest", required: true, index: true },
    staffDiscordId: { type: String, required: true, index: true },
    decision: { type: String, enum: ["accept", "reject"], required: true, index: true },
  },
  { timestamps: true },
)

cardApprovalVoteSchema.index({ cardRequestId: 1, staffDiscordId: 1 }, { unique: true })

const CardApprovalVoteModel =
  models.CardApprovalVote || mongoose.model<ICardApprovalVote>("CardApprovalVote", cardApprovalVoteSchema)

export default CardApprovalVoteModel

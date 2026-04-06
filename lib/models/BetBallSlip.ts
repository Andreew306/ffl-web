import mongoose, { Schema, models, type InferSchemaType } from "mongoose"

const betBallSlipSelectionSchema = new Schema(
  {
    marketId: { type: String, required: true },
    token: { type: String, required: true },
    label: { type: String, required: true },
    description: { type: String, required: true },
    odds: { type: Number, required: true },
    category: { type: String, required: true },
  },
  { _id: false }
)

const betBallSlipSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    discordId: { type: String, required: true, index: true },
    matchId: { type: Schema.Types.ObjectId, ref: "Match", required: true, index: true },
    matchLabel: { type: String, required: true },
    competitionLabel: { type: String, required: true },
    kickoffAt: { type: Date, default: null },
    selections: { type: [betBallSlipSelectionSchema], default: [] },
    selectionCount: { type: Number, required: true },
    stake: { type: Number, required: true },
    combinedOdds: { type: Number, required: true },
    potentialReturn: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "won", "lost", "void"],
      default: "pending",
      index: true,
    },
    settledAt: { type: Date, default: null },
    payout: { type: Number, default: 0 },
  },
  { timestamps: true }
)

betBallSlipSchema.index({ userId: 1, createdAt: -1 })

export type BetBallSlipDocument = InferSchemaType<typeof betBallSlipSchema>

const BetBallSlipModel =
  models.BetBallSlip || mongoose.model("BetBallSlip", betBallSlipSchema)

export default BetBallSlipModel

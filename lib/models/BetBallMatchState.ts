import mongoose, { Schema, models, type InferSchemaType } from "mongoose"

const betBallMatchStateSchema = new Schema(
  {
    matchId: { type: Schema.Types.ObjectId, ref: "Match", required: true, unique: true, index: true },
    bettingClosedAt: { type: Date, default: null, index: true },
    lastReviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

export type BetBallMatchStateDocument = InferSchemaType<typeof betBallMatchStateSchema>

const BetBallMatchStateModel =
  models.BetBallMatchState || mongoose.model("BetBallMatchState", betBallMatchStateSchema)

export default BetBallMatchStateModel

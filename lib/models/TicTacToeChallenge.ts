import mongoose, { Schema, Document, models } from "mongoose"

export type TicTacToeChallengeStatus = "pending" | "accepted" | "declined" | "cancelled" | "expired"

export interface ITicTacToeChallenge extends Document {
  fromUserId: mongoose.Types.ObjectId
  toUserId: mongoose.Types.ObjectId
  status: TicTacToeChallengeStatus
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

const ticTacToeChallengeSchema = new Schema<ITicTacToeChallenge>(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    toUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "cancelled", "expired"],
      default: "pending",
      index: true,
    },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
)

ticTacToeChallengeSchema.index({ fromUserId: 1, toUserId: 1, status: 1 })
ticTacToeChallengeSchema.index({ expiresAt: 1 })

const TicTacToeChallengeModel =
  models.TicTacToeChallenge || mongoose.model<ITicTacToeChallenge>("TicTacToeChallenge", ticTacToeChallengeSchema)

export default TicTacToeChallengeModel

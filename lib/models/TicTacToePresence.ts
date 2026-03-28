import mongoose, { Schema, Document, models } from "mongoose"

export interface ITicTacToePresence extends Document {
  userId: mongoose.Types.ObjectId
  discordId: string
  lastSeenAt: Date
  createdAt: Date
  updatedAt: Date
}

const ticTacToePresenceSchema = new Schema<ITicTacToePresence>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    discordId: { type: String, required: true, index: true },
    lastSeenAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
)

ticTacToePresenceSchema.index({ lastSeenAt: -1 })

const TicTacToePresenceModel =
  models.TicTacToePresence || mongoose.model<ITicTacToePresence>("TicTacToePresence", ticTacToePresenceSchema)

export default TicTacToePresenceModel

import mongoose, { Schema, models } from "mongoose"

export interface IFantasyPlayerPriceHistory extends mongoose.Document {
  fantasySeasonId: mongoose.Types.ObjectId
  competitionObjectId: mongoose.Types.ObjectId
  playerObjectId: mongoose.Types.ObjectId
  player_id: number
  gameweek: number
  oldPrice: number
  newPrice: number
  delta: number
  reason?: string
}

const fantasyPlayerPriceHistorySchema = new Schema<IFantasyPlayerPriceHistory>(
  {
    fantasySeasonId: { type: Schema.Types.ObjectId, ref: "FantasySeason", required: true, index: true },
    competitionObjectId: { type: Schema.Types.ObjectId, ref: "Competition", required: true, index: true },
    playerObjectId: { type: Schema.Types.ObjectId, ref: "Player", required: true, index: true },
    player_id: { type: Number, required: true, index: true },
    gameweek: { type: Number, required: true, index: true },
    oldPrice: { type: Number, required: true },
    newPrice: { type: Number, required: true },
    delta: { type: Number, required: true },
    reason: { type: String, default: "" },
  },
  { timestamps: true }
)

const existingFantasyPlayerPriceHistoryModel = models.FantasyPlayerPriceHistory as mongoose.Model<IFantasyPlayerPriceHistory> | undefined

if (existingFantasyPlayerPriceHistoryModel && !existingFantasyPlayerPriceHistoryModel.schema.path("competitionObjectId")) {
  delete mongoose.models.FantasyPlayerPriceHistory
}

const FantasyPlayerPriceHistoryModel =
  (mongoose.models.FantasyPlayerPriceHistory as mongoose.Model<IFantasyPlayerPriceHistory> | undefined) ||
  mongoose.model<IFantasyPlayerPriceHistory>("FantasyPlayerPriceHistory", fantasyPlayerPriceHistorySchema)

export default FantasyPlayerPriceHistoryModel

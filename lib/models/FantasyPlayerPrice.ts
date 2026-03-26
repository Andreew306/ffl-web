import mongoose, { Schema, models } from "mongoose"

export interface IFantasyPlayerPrice extends mongoose.Document {
  fantasySeasonId: mongoose.Types.ObjectId
  competitionObjectId: mongoose.Types.ObjectId
  playerObjectId: mongoose.Types.ObjectId
  player_id: number
  price: number
  previousPrice: number
  changePercent: number
  changeDirection: "up" | "down" | "flat"
  lastUpdatedGameweek: number
}

const fantasyPlayerPriceSchema = new Schema<IFantasyPlayerPrice>(
  {
    fantasySeasonId: { type: Schema.Types.ObjectId, ref: "FantasySeason", required: true, index: true },
    competitionObjectId: { type: Schema.Types.ObjectId, ref: "Competition", required: true, index: true },
    playerObjectId: { type: Schema.Types.ObjectId, ref: "Player", required: true, index: true },
    player_id: { type: Number, required: true, index: true },
    price: { type: Number, required: true, default: 10 },
    previousPrice: { type: Number, required: true, default: 10 },
    changePercent: { type: Number, required: true, default: 0 },
    changeDirection: { type: String, enum: ["up", "down", "flat"], default: "flat" },
    lastUpdatedGameweek: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
)

fantasyPlayerPriceSchema.index({ fantasySeasonId: 1, competitionObjectId: 1, playerObjectId: 1 }, { unique: true })

const existingFantasyPlayerPriceModel = models.FantasyPlayerPrice as mongoose.Model<IFantasyPlayerPrice> | undefined

if (existingFantasyPlayerPriceModel && !existingFantasyPlayerPriceModel.schema.path("competitionObjectId")) {
  delete mongoose.models.FantasyPlayerPrice
}

const FantasyPlayerPriceModel =
  (mongoose.models.FantasyPlayerPrice as mongoose.Model<IFantasyPlayerPrice> | undefined) ||
  mongoose.model<IFantasyPlayerPrice>("FantasyPlayerPrice", fantasyPlayerPriceSchema)

export default FantasyPlayerPriceModel

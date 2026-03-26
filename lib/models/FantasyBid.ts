import mongoose, { Schema, models } from "mongoose"

export interface IFantasyBid extends mongoose.Document {
  leagueId: mongoose.Types.ObjectId
  marketDayId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  playerObjectId: mongoose.Types.ObjectId
  player_id: number
  amount: number
}

const fantasyBidSchema = new Schema<IFantasyBid>(
  {
    leagueId: { type: Schema.Types.ObjectId, ref: "FantasyLeague", required: true, index: true },
    marketDayId: { type: Schema.Types.ObjectId, ref: "FantasyMarketDay", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    playerObjectId: { type: Schema.Types.ObjectId, ref: "Player", required: true, index: true },
    player_id: { type: Number, required: true, index: true },
    amount: { type: Number, required: true },
  },
  { timestamps: true }
)

fantasyBidSchema.index({ marketDayId: 1, userId: 1, playerObjectId: 1 }, { unique: true })

const FantasyBidModel = models.FantasyBid || mongoose.model<IFantasyBid>("FantasyBid", fantasyBidSchema)

export default FantasyBidModel

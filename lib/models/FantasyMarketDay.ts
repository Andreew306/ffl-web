import mongoose, { Schema, models } from "mongoose"

export interface IFantasyMarketListing {
  playerObjectId: mongoose.Types.ObjectId
  player_id: number
  basePrice: number
  minBid: number
  sellerUserId?: mongoose.Types.ObjectId | null
  soldToUserId?: mongoose.Types.ObjectId | null
  winningBidAmount?: number | null
}

export interface IFantasyMarketDay extends mongoose.Document {
  leagueId: mongoose.Types.ObjectId
  marketDate: Date
  status: "open" | "closed" | "settled"
  listings: IFantasyMarketListing[]
}

const listingSchema = new Schema<IFantasyMarketListing>(
  {
    playerObjectId: { type: Schema.Types.ObjectId, ref: "Player", required: true },
    player_id: { type: Number, required: true },
    basePrice: { type: Number, required: true },
    minBid: { type: Number, required: true },
    sellerUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    soldToUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    winningBidAmount: { type: Number, default: null },
  },
  { _id: false }
)

const fantasyMarketDaySchema = new Schema<IFantasyMarketDay>(
  {
    leagueId: { type: Schema.Types.ObjectId, ref: "FantasyLeague", required: true, index: true },
    marketDate: { type: Date, required: true, index: true },
    status: { type: String, enum: ["open", "closed", "settled"], default: "open" },
    listings: { type: [listingSchema], default: [] },
  },
  { timestamps: true }
)

fantasyMarketDaySchema.index({ leagueId: 1, marketDate: 1 }, { unique: true })

const FantasyMarketDayModel =
  models.FantasyMarketDay || mongoose.model<IFantasyMarketDay>("FantasyMarketDay", fantasyMarketDaySchema)

export default FantasyMarketDayModel

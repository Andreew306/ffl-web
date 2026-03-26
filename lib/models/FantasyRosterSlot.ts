import mongoose, { Schema, models } from "mongoose"

export interface IFantasyRosterSlot extends mongoose.Document {
  leagueId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  rosterId: mongoose.Types.ObjectId
  playerObjectId: mongoose.Types.ObjectId
  player_id: number
  slot: "GK" | "DEF" | "MID" | "ATT" | "FLEX" | "BENCH"
  purchasePrice: number
  currentValue: number
  releaseClause: number
  acquiredBy: "random" | "market" | "clausulazo"
  acquiredAt: Date
  isOnMarket?: boolean
}

const fantasyRosterSlotSchema = new Schema<IFantasyRosterSlot>(
  {
    leagueId: { type: Schema.Types.ObjectId, ref: "FantasyLeague", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rosterId: { type: Schema.Types.ObjectId, ref: "FantasyRoster", required: true, index: true },
    playerObjectId: { type: Schema.Types.ObjectId, ref: "Player", required: true, index: true },
    player_id: { type: Number, required: true, index: true },
    slot: { type: String, enum: ["GK", "DEF", "MID", "ATT", "FLEX", "BENCH"], default: "FLEX" },
    purchasePrice: { type: Number, required: true },
    currentValue: { type: Number, required: true },
    releaseClause: { type: Number, required: true },
    acquiredBy: { type: String, enum: ["random", "market", "clausulazo"], default: "random" },
    acquiredAt: { type: Date, default: Date.now },
    isOnMarket: { type: Boolean, default: false },
  },
  { timestamps: true }
)

fantasyRosterSlotSchema.index({ leagueId: 1, playerObjectId: 1 }, { unique: true })
fantasyRosterSlotSchema.index({ rosterId: 1, playerObjectId: 1 }, { unique: true })

const FantasyRosterSlotModel =
  models.FantasyRosterSlot || mongoose.model<IFantasyRosterSlot>("FantasyRosterSlot", fantasyRosterSlotSchema)

export default FantasyRosterSlotModel

import mongoose, { Schema, models } from "mongoose"

export interface IFantasyRoster extends mongoose.Document {
  leagueId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  budgetRemaining: number
  captainPlayerId?: mongoose.Types.ObjectId | null
  captainPlayerNumberId?: number | null
  viceCaptainPlayerId?: mongoose.Types.ObjectId | null
  viceCaptainPlayerNumberId?: number | null
}

const fantasyRosterSchema = new Schema<IFantasyRoster>(
  {
    leagueId: { type: Schema.Types.ObjectId, ref: "FantasyLeague", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    budgetRemaining: { type: Number, default: 0 },
    captainPlayerId: { type: Schema.Types.ObjectId, ref: "Player", default: null },
    captainPlayerNumberId: { type: Number, default: null },
    viceCaptainPlayerId: { type: Schema.Types.ObjectId, ref: "Player", default: null },
    viceCaptainPlayerNumberId: { type: Number, default: null },
  },
  { timestamps: true }
)

fantasyRosterSchema.index({ leagueId: 1, userId: 1 }, { unique: true })

const FantasyRosterModel =
  models.FantasyRoster || mongoose.model<IFantasyRoster>("FantasyRoster", fantasyRosterSchema)

export default FantasyRosterModel

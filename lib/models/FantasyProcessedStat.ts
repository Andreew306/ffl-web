import mongoose, { Schema, models } from "mongoose"

export interface IFantasyProcessedStat extends mongoose.Document {
  leagueId: mongoose.Types.ObjectId
  week: number
  playerMatchStatsId: mongoose.Types.ObjectId
  playerObjectId: mongoose.Types.ObjectId
  player_id: number
  userId?: mongoose.Types.ObjectId | null
  points: number
  processedAt: Date
}

const fantasyProcessedStatSchema = new Schema<IFantasyProcessedStat>(
  {
    leagueId: { type: Schema.Types.ObjectId, ref: "FantasyLeague", required: true, index: true },
    week: { type: Number, required: true, index: true },
    playerMatchStatsId: { type: Schema.Types.ObjectId, ref: "PlayerMatchStats", required: true, index: true },
    playerObjectId: { type: Schema.Types.ObjectId, ref: "Player", required: true, index: true },
    player_id: { type: Number, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    points: { type: Number, default: 0 },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

fantasyProcessedStatSchema.index({ leagueId: 1, userId: 1, playerMatchStatsId: 1 }, { unique: true })

const FantasyProcessedStatModel =
  models.FantasyProcessedStat || mongoose.model<IFantasyProcessedStat>("FantasyProcessedStat", fantasyProcessedStatSchema)

export default FantasyProcessedStatModel

import mongoose, { Schema, models } from "mongoose"

export interface IFantasyClauseExecution extends mongoose.Document {
  leagueId: mongoose.Types.ObjectId
  buyerUserId: mongoose.Types.ObjectId
  sellerUserId: mongoose.Types.ObjectId
  playerObjectId: mongoose.Types.ObjectId
  player_id: number
  clausePrice: number
  executedAt: Date
}

const fantasyClauseExecutionSchema = new Schema<IFantasyClauseExecution>(
  {
    leagueId: { type: Schema.Types.ObjectId, ref: "FantasyLeague", required: true, index: true },
    buyerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sellerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    playerObjectId: { type: Schema.Types.ObjectId, ref: "Player", required: true, index: true },
    player_id: { type: Number, required: true, index: true },
    clausePrice: { type: Number, required: true },
    executedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

const FantasyClauseExecutionModel =
  models.FantasyClauseExecution || mongoose.model<IFantasyClauseExecution>("FantasyClauseExecution", fantasyClauseExecutionSchema)

export default FantasyClauseExecutionModel

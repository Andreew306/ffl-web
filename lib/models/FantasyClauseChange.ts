import mongoose, { Schema, models } from "mongoose"

export interface IFantasyClauseChange extends mongoose.Document {
  leagueId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  playerObjectId: mongoose.Types.ObjectId
  player_id: number
  oldClause: number
  newClause: number
  cost: number
}

const fantasyClauseChangeSchema = new Schema<IFantasyClauseChange>(
  {
    leagueId: { type: Schema.Types.ObjectId, ref: "FantasyLeague", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    playerObjectId: { type: Schema.Types.ObjectId, ref: "Player", required: true, index: true },
    player_id: { type: Number, required: true, index: true },
    oldClause: { type: Number, required: true },
    newClause: { type: Number, required: true },
    cost: { type: Number, required: true },
  },
  { timestamps: true }
)

const FantasyClauseChangeModel =
  models.FantasyClauseChange || mongoose.model<IFantasyClauseChange>("FantasyClauseChange", fantasyClauseChangeSchema)

export default FantasyClauseChangeModel

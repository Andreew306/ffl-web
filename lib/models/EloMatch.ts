import mongoose, { Schema, Document, models } from "mongoose"

export interface IEloMatch extends Document {
  matchId?: string
  guildId?: string
  status?: string
  seasonId?: string | null
  finishedAt?: Date
}

const eloMatchSchema = new Schema<IEloMatch>(
  {
    matchId: { type: String },
    guildId: { type: String },
    status: { type: String },
    seasonId: { type: String, default: null },
    finishedAt: { type: Date },
  },
  { collection: "elomatches", timestamps: true }
)

const EloMatchModel =
  models.EloMatch || mongoose.model<IEloMatch>("EloMatch", eloMatchSchema)

export default EloMatchModel

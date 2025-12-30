import mongoose, { Schema, Document, models } from "mongoose"

export interface IEloPlayer extends Document {
  playerId: string
  nickname?: string
  discordId?: string
  elo: number
  wins: number
  losses: number
  streaks: number
  eloHistory?: Array<Record<string, unknown>>
}

const eloPlayerSchema = new Schema<IEloPlayer>(
  {
    playerId: { type: String, required: true },
    nickname: { type: String },
    discordId: { type: String },
    elo: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    streaks: { type: Number, default: 0 },
    eloHistory: { type: [Schema.Types.Mixed], default: [] },
  },
  { collection: "eloplayers", timestamps: true }
)

const EloPlayerModel =
  models.EloPlayer || mongoose.model<IEloPlayer>("EloPlayer", eloPlayerSchema)

export default EloPlayerModel

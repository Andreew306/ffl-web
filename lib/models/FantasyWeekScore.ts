import mongoose, { Schema, models } from "mongoose"

type FantasyWeekScoreEntry = {
  playerMatchStatsId: mongoose.Types.ObjectId
  matchId: mongoose.Types.ObjectId
  playerObjectId: mongoose.Types.ObjectId
  player_id: number
  slot: "GK" | "DEF" | "MID" | "ATT" | "FLEX" | "BENCH"
  position: string
  points: number
}

export interface IFantasyWeekScore extends mongoose.Document {
  leagueId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  week: number
  points: number
  entries: FantasyWeekScoreEntry[]
}

const fantasyWeekScoreEntrySchema = new Schema<FantasyWeekScoreEntry>(
  {
    playerMatchStatsId: { type: Schema.Types.ObjectId, ref: "PlayerMatchStats", required: true },
    matchId: { type: Schema.Types.ObjectId, ref: "Match", required: true },
    playerObjectId: { type: Schema.Types.ObjectId, ref: "Player", required: true },
    player_id: { type: Number, required: true },
    slot: { type: String, enum: ["GK", "DEF", "MID", "ATT", "FLEX", "BENCH"], required: true },
    position: { type: String, required: true },
    points: { type: Number, required: true },
  },
  { _id: false }
)

const fantasyWeekScoreSchema = new Schema<IFantasyWeekScore>(
  {
    leagueId: { type: Schema.Types.ObjectId, ref: "FantasyLeague", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    week: { type: Number, required: true, index: true },
    points: { type: Number, default: 0 },
    entries: { type: [fantasyWeekScoreEntrySchema], default: [] },
  },
  { timestamps: true }
)

fantasyWeekScoreSchema.index({ leagueId: 1, userId: 1, week: 1 }, { unique: true })

const FantasyWeekScoreModel =
  models.FantasyWeekScore || mongoose.model<IFantasyWeekScore>("FantasyWeekScore", fantasyWeekScoreSchema)

export default FantasyWeekScoreModel

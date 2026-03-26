import mongoose, { Schema, models } from "mongoose"

type LineupPlayer = {
  playerObjectId: mongoose.Types.ObjectId
  player_id: number
  slot: "GK" | "DEF" | "MID" | "ATT" | "FLEX" | "BENCH"
}

export interface IFantasyWeekLineup extends mongoose.Document {
  leagueId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  week: number
  formation: string
  starters: LineupPlayer[]
  bench: LineupPlayer[]
  lockedAt: Date
}

const lineupPlayerSchema = new Schema<LineupPlayer>(
  {
    playerObjectId: { type: Schema.Types.ObjectId, ref: "Player", required: true },
    player_id: { type: Number, required: true },
    slot: { type: String, enum: ["GK", "DEF", "MID", "ATT", "FLEX", "BENCH"], required: true },
  },
  { _id: false }
)

const fantasyWeekLineupSchema = new Schema<IFantasyWeekLineup>(
  {
    leagueId: { type: Schema.Types.ObjectId, ref: "FantasyLeague", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    week: { type: Number, required: true, index: true },
    formation: { type: String, default: "1-2-1-3" },
    starters: { type: [lineupPlayerSchema], default: [] },
    bench: { type: [lineupPlayerSchema], default: [] },
    lockedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

fantasyWeekLineupSchema.index({ leagueId: 1, userId: 1, week: 1 }, { unique: true })

const FantasyWeekLineupModel =
  models.FantasyWeekLineup || mongoose.model<IFantasyWeekLineup>("FantasyWeekLineup", fantasyWeekLineupSchema)

export default FantasyWeekLineupModel

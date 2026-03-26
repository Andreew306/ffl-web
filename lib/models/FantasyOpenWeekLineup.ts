import mongoose, { Schema, models } from "mongoose"

type OpenLineupSlot = {
  slotIndex: number
  playerObjectId?: mongoose.Types.ObjectId | null
  player_id?: number | null
}

export interface IFantasyOpenWeekLineup extends mongoose.Document {
  leagueId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  week: number
  formation: string
  slots: OpenLineupSlot[]
  lockedAt: Date
}

const openLineupSlotSchema = new Schema<OpenLineupSlot>(
  {
    slotIndex: { type: Number, required: true },
    playerObjectId: { type: Schema.Types.ObjectId, ref: "Player", default: null },
    player_id: { type: Number, default: null },
  },
  { _id: false }
)

const fantasyOpenWeekLineupSchema = new Schema<IFantasyOpenWeekLineup>(
  {
    leagueId: { type: Schema.Types.ObjectId, ref: "FantasyLeague", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    week: { type: Number, required: true, index: true },
    formation: { type: String, default: "1-2-1-3" },
    slots: { type: [openLineupSlotSchema], default: [] },
    lockedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

fantasyOpenWeekLineupSchema.index({ leagueId: 1, userId: 1, week: 1 }, { unique: true })

const FantasyOpenWeekLineupModel =
  models.FantasyOpenWeekLineup ||
  mongoose.model<IFantasyOpenWeekLineup>("FantasyOpenWeekLineup", fantasyOpenWeekLineupSchema)

export default FantasyOpenWeekLineupModel

import mongoose, { Schema, models } from "mongoose"

export interface IFantasySeason extends mongoose.Document {
  name: string
  slug: string
  status: "upcoming" | "active" | "finished"
  startDate: Date
  endDate: Date
  currentGameweek: number
  sourceCompetitionIds: mongoose.Types.ObjectId[]
}

const fantasySeasonSchema = new Schema<IFantasySeason>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, trim: true },
    status: { type: String, enum: ["upcoming", "active", "finished"], default: "active", index: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    currentGameweek: { type: Number, default: 1 },
    sourceCompetitionIds: { type: [Schema.Types.ObjectId], ref: "Competition", default: [] },
  },
  { timestamps: true }
)

const FantasySeasonModel =
  models.FantasySeason || mongoose.model<IFantasySeason>("FantasySeason", fantasySeasonSchema)

export default FantasySeasonModel

import mongoose, { Schema, models } from "mongoose"

export interface IFantasyLeagueMember extends mongoose.Document {
  leagueId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  role: "owner" | "member"
  teamName: string
  joinedAt: Date
}

const fantasyLeagueMemberSchema = new Schema<IFantasyLeagueMember>(
  {
    leagueId: { type: Schema.Types.ObjectId, ref: "FantasyLeague", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["owner", "member"], default: "member" },
    teamName: { type: String, required: true, trim: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

fantasyLeagueMemberSchema.index({ leagueId: 1, userId: 1 }, { unique: true })

const FantasyLeagueMemberModel =
  models.FantasyLeagueMember || mongoose.model<IFantasyLeagueMember>("FantasyLeagueMember", fantasyLeagueMemberSchema)

export default FantasyLeagueMemberModel

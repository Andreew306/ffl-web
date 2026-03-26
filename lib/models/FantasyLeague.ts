import mongoose, { Schema, models } from "mongoose"

export interface IFantasyLeague extends mongoose.Document {
  fantasySeasonId: mongoose.Types.ObjectId
  ownerUserId: mongoose.Types.ObjectId
  leagueType: "market" | "open"
  competitionObjectId?: mongoose.Types.ObjectId | null
  competitionCode?: string | null
  competitionName?: string | null
  competitionSeason?: number | null
  name: string
  slug: string
  inviteCode: string
  visibility: "private" | "public"
  status: "draft" | "active" | "finished"
  maxMembers: number
  budget: number
  squadSize: number
  transfersPerGameweek: number
  isClosedPool: boolean
  formationRules: {
    gk: number
    def: number
    mid: number
    att: number
    flex: number
  }
}

const fantasyLeagueSchema = new Schema<IFantasyLeague>(
  {
    fantasySeasonId: { type: Schema.Types.ObjectId, ref: "FantasySeason", required: true, index: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    leagueType: { type: String, enum: ["market", "open"], default: "market", index: true },
    competitionObjectId: { type: Schema.Types.ObjectId, ref: "Competition", default: null, index: true },
    competitionCode: { type: String, default: null, trim: true },
    competitionName: { type: String, default: null, trim: true },
    competitionSeason: { type: Number, default: null, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, index: true },
    inviteCode: { type: String, required: true, unique: true, index: true, uppercase: true, trim: true },
    visibility: { type: String, enum: ["private", "public"], default: "private" },
    status: { type: String, enum: ["draft", "active", "finished"], default: "active", index: true },
    maxMembers: { type: Number, default: 12 },
    budget: { type: Number, default: 10000 },
    squadSize: { type: Number, default: 7 },
    transfersPerGameweek: { type: Number, default: 2 },
    isClosedPool: { type: Boolean, default: true },
    formationRules: {
      gk: { type: Number, default: 1 },
      def: { type: Number, default: 2 },
      mid: { type: Number, default: 1 },
      att: { type: Number, default: 3 },
      flex: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
)

fantasyLeagueSchema.index({ fantasySeasonId: 1, slug: 1 }, { unique: true })

const existingFantasyLeagueModel = models.FantasyLeague as mongoose.Model<IFantasyLeague> | undefined
if (existingFantasyLeagueModel && !existingFantasyLeagueModel.schema.path("leagueType")) {
  delete models.FantasyLeague
}

const FantasyLeagueModel =
  models.FantasyLeague || mongoose.model<IFantasyLeague>("FantasyLeague", fantasyLeagueSchema)

export default FantasyLeagueModel

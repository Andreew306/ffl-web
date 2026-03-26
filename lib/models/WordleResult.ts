import mongoose, { Document, Schema, models } from "mongoose"

export interface IWordleResult extends Document {
  dateKey: string
  version: number
  userId: mongoose.Types.ObjectId
  discordId: string
  discordName?: string | null
  discordAvatar?: string | null
  attempts: number
  solved: boolean
  hintTeamImage?: string | null
  hintTeamName?: string | null
  hintExactLetter?: string | null
  hintExactIndex?: number | null
  hintPresentLetter?: string | null
  hintCountry?: string | null
  hintPosition?: string | null
  rewardGrantedAt?: Date | null
  rewardAmount?: number | null
  completedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

const wordleResultSchema = new Schema<IWordleResult>(
  {
    dateKey: { type: String, required: true, index: true },
    version: { type: Number, required: true, default: 1 },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    discordId: { type: String, required: true },
    discordName: { type: String, default: null },
    discordAvatar: { type: String, default: null },
    attempts: { type: Number, required: true },
    solved: { type: Boolean, required: true, default: false },
    hintTeamImage: { type: String, default: null },
    hintTeamName: { type: String, default: null },
    hintExactLetter: { type: String, default: null },
    hintExactIndex: { type: Number, default: null },
    hintPresentLetter: { type: String, default: null },
    hintCountry: { type: String, default: null },
    hintPosition: { type: String, default: null },
    rewardGrantedAt: { type: Date, default: null },
    rewardAmount: { type: Number, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

wordleResultSchema.index({ dateKey: 1, version: 1, userId: 1 }, { unique: true })
wordleResultSchema.index({ dateKey: 1, version: 1, solved: 1, attempts: 1 })

const WordleResultModel =
  models.WordleResult || mongoose.model<IWordleResult>("WordleResult", wordleResultSchema)

export default WordleResultModel

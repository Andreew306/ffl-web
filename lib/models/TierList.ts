import mongoose, { Document, Schema, models } from "mongoose"

export interface ITierListTier {
  id: string
  label: string
  color: string
  itemIds: string[]
}

export interface ITierList extends Document {
  ownerUserId: mongoose.Types.ObjectId
  ownerDiscordId: string
  title: string
  itemType: "players" | "teams"
  mode: "template" | "submission"
  templateId?: mongoose.Types.ObjectId | null
  tiers: ITierListTier[]
  allowedItemIds: string[]
  published: boolean
  authorName?: string | null
  authorAvatar?: string | null
  upvoteDiscordIds: string[]
  downvoteDiscordIds: string[]
  createdAt: Date
  updatedAt: Date
}

const tierSchema = new Schema<ITierListTier>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    color: { type: String, required: true },
    itemIds: { type: [String], default: [] },
  },
  { _id: false }
)

const tierListSchema = new Schema<ITierList>(
  {
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ownerDiscordId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    itemType: { type: String, enum: ["players", "teams"], required: true, index: true },
    mode: { type: String, enum: ["template", "submission"], required: true, index: true },
    templateId: { type: Schema.Types.ObjectId, ref: "TierList", default: null, index: true },
    tiers: { type: [tierSchema], default: [] },
    allowedItemIds: { type: [String], default: [] },
    published: { type: Boolean, default: false, index: true },
    authorName: { type: String, default: null },
    authorAvatar: { type: String, default: null },
    upvoteDiscordIds: { type: [String], default: [] },
    downvoteDiscordIds: { type: [String], default: [] },
  },
  { timestamps: true }
)

tierListSchema.index({ mode: 1, published: 1, updatedAt: -1 })

const existingModel = models.TierList as mongoose.Model<ITierList> | undefined

const TierListModel = existingModel || mongoose.model<ITierList>("TierList", tierListSchema)

export default TierListModel

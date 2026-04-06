import mongoose, { Document, Schema, models } from "mongoose"

export interface IProfileRolePoints extends Document {
  roleId: string
  roleName: string
  points: number
  updatedByDiscordId?: string | null
}

const profileRolePointsSchema = new Schema<IProfileRolePoints>(
  {
    roleId: { type: String, required: true, unique: true, index: true },
    roleName: { type: String, required: true },
    points: { type: Number, required: true, default: 0 },
    updatedByDiscordId: { type: String, default: null },
  },
  { timestamps: true }
)

const ProfileRolePointsModel =
  models.ProfileRolePoints || mongoose.model<IProfileRolePoints>("ProfileRolePoints", profileRolePointsSchema)

export default ProfileRolePointsModel

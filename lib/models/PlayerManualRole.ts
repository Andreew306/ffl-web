import mongoose, { Schema, Document, models } from "mongoose"
import type { IUserRole } from "@/lib/models/User"

export interface IPlayerManualRole extends Document {
  playerId: mongoose.Types.ObjectId
  roles: IUserRole[]
}

const userRoleSchema = new Schema<IUserRole>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false }
)

const playerManualRoleSchema = new Schema<IPlayerManualRole>(
  {
    playerId: { type: Schema.Types.ObjectId, ref: "Player", required: true, unique: true, index: true },
    roles: { type: [userRoleSchema], default: [] },
  },
  { timestamps: true }
)

const PlayerManualRoleModel = models.PlayerManualRole || mongoose.model<IPlayerManualRole>("PlayerManualRole", playerManualRoleSchema)

export default PlayerManualRoleModel

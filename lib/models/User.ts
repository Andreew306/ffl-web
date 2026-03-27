import mongoose, { Schema, Document, models } from "mongoose"

export interface IUserRole {
  id: string
  name: string
}

export interface IUser extends Document {
  discordId: string
  discordAvatar?: string | null
  discordName?: string | null
  discordSyncedAt?: Date | null
  playerId?: mongoose.Types.ObjectId | null
  betballCoins: number
  fantasyCoins: number
  roles: IUserRole[]
}

const userRoleSchema = new Schema<IUserRole>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false }
)

const userSchema = new Schema<IUser>(
  {
    discordId: { type: String, required: true, unique: true, index: true },
    discordAvatar: { type: String, default: null },
    discordName: { type: String, default: null },
    discordSyncedAt: { type: Date, default: null },
    playerId: { type: Schema.Types.ObjectId, ref: "Player", default: null },
    betballCoins: { type: Number, default: 100 },
    fantasyCoins: { type: Number, default: 10000 },
    roles: { type: [userRoleSchema], default: [] },
  },
  { timestamps: true }
)

if (models.User && !("betballCoins" in (models.User as mongoose.Model<IUser>).schema.paths)) {
  delete models.User
}

const UserModel = models.User || mongoose.model<IUser>("User", userSchema)

export default UserModel

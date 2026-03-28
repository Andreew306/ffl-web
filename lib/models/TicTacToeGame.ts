import mongoose, { Document, Schema, models } from "mongoose"

export interface ITicTacToeHeader {
  type: "team" | "country"
  teamId?: mongoose.Types.ObjectId
  teamName?: string
  teamImage?: string
  country?: string
}

export interface ITicTacToeCellPick {
  row: number
  col: number
  playerObjectId?: mongoose.Types.ObjectId | null
  playerId?: number | null
  playerName?: string | null
  country?: string | null
  avatar?: string | null
  filledByUserId?: mongoose.Types.ObjectId | null
  filledAt?: Date | null
}

export interface ITicTacToeGame extends Document {
  mode: "solo" | "online"
  status: "pending" | "active" | "finished"
  difficulty?: "easy" | "medium" | "hard" | "all" | null
  result?: "win" | "draw" | null
  createdByUserId?: mongoose.Types.ObjectId | null
  opponentUserId?: mongoose.Types.ObjectId | null
  winnerUserId?: mongoose.Types.ObjectId | null
  currentTurnUserId?: mongoose.Types.ObjectId | null
  turnExpiresAt?: Date | null
  turnSeconds?: number | null
  turnNumber?: number
  rewardGrantedAt?: Date | null
  rewardAmount?: number | null
  rows: ITicTacToeHeader[]
  columns: ITicTacToeHeader[]
  picks: ITicTacToeCellPick[]
  createdAt: Date
  updatedAt: Date
  finishedAt?: Date | null
}

const headerSchema = new Schema<ITicTacToeHeader>(
  {
    type: { type: String, enum: ["team", "country"], required: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", default: null },
    teamName: { type: String, default: null },
    teamImage: { type: String, default: null },
    country: { type: String, default: null },
  },
  { _id: false }
)

const pickSchema = new Schema<ITicTacToeCellPick>(
  {
    row: { type: Number, required: true },
    col: { type: Number, required: true },
    playerObjectId: { type: Schema.Types.ObjectId, ref: "Player", default: null },
    playerId: { type: Number, default: null },
    playerName: { type: String, default: null },
    country: { type: String, default: null },
    avatar: { type: String, default: null },
    filledByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    filledAt: { type: Date, default: null },
  },
  { _id: false }
)

const ticTacToeGameSchema = new Schema<ITicTacToeGame>(
  {
    mode: { type: String, enum: ["solo", "online"], required: true },
    status: { type: String, enum: ["pending", "active", "finished"], required: true, default: "pending" },
    difficulty: { type: String, enum: ["easy", "medium", "hard", "all"], default: null },
    result: { type: String, enum: ["win", "draw"], default: null },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    opponentUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    winnerUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    currentTurnUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    turnExpiresAt: { type: Date, default: null },
    turnSeconds: { type: Number, default: 30 },
    turnNumber: { type: Number, default: 1 },
    rewardGrantedAt: { type: Date, default: null },
    rewardAmount: { type: Number, default: null },
    rows: { type: [headerSchema], default: [] },
    columns: { type: [headerSchema], default: [] },
    picks: { type: [pickSchema], default: [] },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

ticTacToeGameSchema.index({ mode: 1, status: 1, createdAt: -1 })
ticTacToeGameSchema.index({ createdByUserId: 1, opponentUserId: 1 })
ticTacToeGameSchema.index({ winnerUserId: 1, finishedAt: -1 })
ticTacToeGameSchema.index({ currentTurnUserId: 1, turnExpiresAt: 1 })

const TicTacToeGameModel =
  models.TicTacToeGame || mongoose.model<ITicTacToeGame>("TicTacToeGame", ticTacToeGameSchema)

export default TicTacToeGameModel

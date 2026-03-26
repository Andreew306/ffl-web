import mongoose, { Schema, models } from "mongoose"

export interface IFantasyWeekReward extends mongoose.Document {
  leagueId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  week: number
  weeklyBonus: number
  pointsBonus: number
  goalsBonus: number
  rankBonus: number
  totalBonus: number
  rankPosition?: number | null
  rewardedAt: Date
}

const fantasyWeekRewardSchema = new Schema<IFantasyWeekReward>(
  {
    leagueId: { type: Schema.Types.ObjectId, ref: "FantasyLeague", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    week: { type: Number, required: true, index: true },
    weeklyBonus: { type: Number, default: 0 },
    pointsBonus: { type: Number, default: 0 },
    goalsBonus: { type: Number, default: 0 },
    rankBonus: { type: Number, default: 0 },
    totalBonus: { type: Number, default: 0 },
    rankPosition: { type: Number, default: null },
    rewardedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

fantasyWeekRewardSchema.index({ leagueId: 1, userId: 1, week: 1 }, { unique: true })

const FantasyWeekRewardModel =
  models.FantasyWeekReward || mongoose.model<IFantasyWeekReward>("FantasyWeekReward", fantasyWeekRewardSchema)

export default FantasyWeekRewardModel

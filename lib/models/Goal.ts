// models/Goal.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGoal extends Document {
  match_id: mongoose.Types.ObjectId;
  team_competition_id: mongoose.Types.ObjectId;
  scorer_id: mongoose.Types.ObjectId;
  assist_id?: mongoose.Types.ObjectId;
  preassist_id?: mongoose.Types.ObjectId;
  minute: number;
}

const goalSchema: Schema<IGoal> = new Schema({
  match_id: { type: Schema.Types.ObjectId, ref: "Match", required: true },
  team_competition_id: { type: Schema.Types.ObjectId, ref: "TeamCompetition", required: true },
  scorer_id: { type: Schema.Types.ObjectId, ref: "PlayerCompetition", required: true },
  assist_id: { type: Schema.Types.ObjectId, ref: "PlayerCompetition" },
  preassist_id: { type: Schema.Types.ObjectId, ref: "PlayerCompetition" },
  minute: { type: Number, required: true },
}, {
  timestamps: true
});

// Opcional: índices para consultas rápidas
goalSchema.index({ match_id: 1 });
goalSchema.index({ scorer_id: 1 });
goalSchema.index({ team_competition_id: 1 });

const Goal: Model<IGoal> = mongoose.models.Goal || mongoose.model<IGoal>("Goal", goalSchema);

export default Goal;

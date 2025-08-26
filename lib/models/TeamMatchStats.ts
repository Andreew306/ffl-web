import mongoose, { Schema, Document, models } from "mongoose";

export interface ITeamMatchStats extends Document {
  team_match_stats_id: number;
  match_id: mongoose.Types.ObjectId;
  team_competition_id: mongoose.Types.ObjectId;
  won: boolean;
  draw: boolean;
  lost: boolean;
  goalsScored: number;
  goalsConceded: number;
  cs: number;
  points: number;
  possession: number;
  kicks: number;
  passes: number;
  shotsOnGoal: number;
}

const teamMatchStatsSchema = new Schema<ITeamMatchStats>({
  team_match_stats_id: { type: Number, required: true, unique: true },
  match_id: { type: Schema.Types.ObjectId, ref: "Match", required: true },
  team_competition_id: { type: Schema.Types.ObjectId, ref: "TeamCompetition", required: true },
  won: { type: Boolean, default: false },
  draw: { type: Boolean, default: false },
  lost: { type: Boolean, default: false },
  goalsScored: { type: Number, default: 0 },
  goalsConceded: { type: Number, default: 0 },
  cs: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  possession: { type: Number, default: 0 },
  kicks: { type: Number, default: 0 },
  passes: { type: Number, default: 0 },
  shotsOnGoal: { type: Number, default: 0 },
});

const TeamMatchStatsModel = models.TeamMatchStats || mongoose.model<ITeamMatchStats>("TeamMatchStats", teamMatchStatsSchema);
export default TeamMatchStatsModel;

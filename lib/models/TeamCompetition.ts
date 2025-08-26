import mongoose, { Schema, Document, models } from "mongoose";

export interface ITeamCompetition extends Document {
  team_id: mongoose.Types.ObjectId;
  competition_id: mongoose.Types.ObjectId;
  team_competition_id: number;
  matchesPlayed: number;
  matchesWon: number;
  matchesDraw: number;
  matchesLost: number;
  goalsScored: number;
  goalsConceded: number;
  cs: number;
  points: number;
  possessionAvg: number;
  kicks: number;
  passes: number;
  shotsOnGoal: number;
}

const teamCompetitionSchema = new Schema<ITeamCompetition>({
  team_id: { type: Schema.Types.ObjectId, ref: "Team" },
  competition_id: { type: Schema.Types.ObjectId, ref: "Competition" },
  team_competition_id: Number,
  matchesPlayed: { type: Number, default: 0 },
  matchesWon: { type: Number, default: 0 },
  matchesDraw: { type: Number, default: 0 },
  matchesLost: { type: Number, default: 0 },
  goalsScored: { type: Number, default: 0 },
  goalsConceded: { type: Number, default: 0 },
  cs: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  possessionAvg: { type: Number, default: 0 },
  kicks: { type: Number, default: 0 },
  passes: { type: Number, default: 0 },
  shotsOnGoal: { type: Number, default: 0 },
});

const TeamCompetitionModel = models.TeamCompetition || mongoose.model<ITeamCompetition>("TeamCompetition", teamCompetitionSchema);
export default TeamCompetitionModel;

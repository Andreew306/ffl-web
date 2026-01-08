// lib/models/PlayerCompetition.ts
import mongoose, { Schema, Document, models } from "mongoose";

export interface IPlayerCompetition extends Document {
  player_id: mongoose.Types.ObjectId;
  team_competition_id: mongoose.Types.ObjectId;
  player_competition_id: number;
  isActive: boolean;
  isCaptain?: boolean;
  isSubcaptain?: boolean;
  position: "GK" | "CB" | "LB" | "RB" | "DM" | "CM" | "AM" | "LW" | "RW" | "ST";
  matchesPlayed: number;
  matchesWon: number;
  matchesDraw: number;
  matchesLost: number;
  starter: number;
  substitute: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  preassists: number;
  kicks: number;
  passes: number;
  passesForward?: number;
  passesLateral?: number;
  passesBackward?: number;
  keypass?: number;
  autopass?: number;
  misspass?: number;
  shotsOnGoal: number;
  shotsDefended: number;
  shotsOffGoal?: number;
  saves?: number;
  clearances?: number;
  recoveries?: number;
  goalsConceded: number;
  cs: number;
  owngoals: number;
  avg?: number;
  TOTW: number;
  MVP: number;
}

const playerCompetitionSchema = new Schema<IPlayerCompetition>({
  player_id: { type: Schema.Types.ObjectId, ref: "Player" },
  team_competition_id: { type: Schema.Types.ObjectId, ref: "TeamCompetition" },
  player_competition_id: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  isCaptain: { type: Boolean, default: false },
  isSubcaptain: { type: Boolean, default: false },
  position: { 
    type: String, 
    enum: ["GK", "CB", "LB", "RB", "DM", "CM", "AM", "LW", "RW", "ST"] 
  },
  matchesPlayed: { type: Number, default: 0 },
  matchesWon: { type: Number, default: 0 },
  matchesDraw: { type: Number, default: 0 },
  matchesLost: { type: Number, default: 0 },
  starter: { type: Number, default: 0 },
  substitute: { type: Number, default: 0 },
  minutesPlayed: { type: Number, default: 0 },
  goals: { type: Number, default: 0 },
  assists: { type: Number, default: 0 },
  preassists: { type: Number, default: 0 },
  kicks: { type: Number, default: 0 },
  passes: { type: Number, default: 0 },
  passesForward: { type: Number, default: 0 },
  passesLateral: { type: Number, default: 0 },
  passesBackward: { type: Number, default: 0 },
  keypass: { type: Number, default: 0 },
  autopass: { type: Number, default: 0 },
  misspass: { type: Number, default: 0 },
  shotsOnGoal: { type: Number, default: 0 },
  shotsOffGoal: { type: Number, default: 0 },
  shotsDefended: { type: Number, default: 0 },
  saves: { type: Number, default: 0 },
  clearances: { type: Number, default: 0 },
  recoveries: { type: Number, default: 0 },
  goalsConceded: { type: Number, default: 0 },
  cs: { type: Number, default: 0 },
  owngoals: { type: Number, default: 0 },
  avg: { type: Number, default: 0 },
  TOTW: { type: Number, default: 0 },
  MVP: { type: Number, default: 0 },
});

playerCompetitionSchema.index({ player_id: 1 });
playerCompetitionSchema.index({ team_competition_id: 1 });
playerCompetitionSchema.index({ player_competition_id: 1 });

const PlayerCompetitionModel =
  models.PlayerCompetition ||
  mongoose.model<IPlayerCompetition>("PlayerCompetition", playerCompetitionSchema);

export default PlayerCompetitionModel;

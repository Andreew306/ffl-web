// lib/models/PlayerMatchStats.ts
import mongoose, { Schema, Document, models } from "mongoose";

export interface IPlayerMatchStats extends Document {
  player_match_stats_id: number;
  match_id: mongoose.Types.ObjectId;
  team_competition_id: mongoose.Types.ObjectId;
  player_competition_id: mongoose.Types.ObjectId;
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
  kicks: number;
  passes: number;
  shotsOnGoal: number;
  shotsDefended: number;
  goalsConceded: number;
  cs: number;
  owngoals: number;
  TOTW: number;
  MVP: number;
}

const playerMatchStatsSchema = new Schema<IPlayerMatchStats>({
  player_match_stats_id: { type: Number, required: true, unique: true },
  match_id: { type: Schema.Types.ObjectId, ref: "Match", required: true },
  team_competition_id: { type: Schema.Types.ObjectId, ref: "TeamCompetition", required: true },
  player_competition_id: { type: Schema.Types.ObjectId, ref: "PlayerCompetition", required: true },
  position: { 
    type: String, 
    enum: ["GK","CB","LB","RB","DM","CM","AM","LW","RW","ST"], 
    required: true 
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
  kicks: { type: Number, default: 0 },
  passes: { type: Number, default: 0 },
  shotsOnGoal: { type: Number, default: 0 },
  shotsDefended: { type: Number, default: 0 },
  goalsConceded: { type: Number, default: 0 },
  cs: { type: Number, default: 0 },
  owngoals: { type: Number, default: 0 },
  TOTW: { type: Number, default: 0 },
  MVP: { type: Number, default: 0 },
});

const PlayerMatchStatsModel = models.PlayerMatchStats || mongoose.model<IPlayerMatchStats>("PlayerMatchStats", playerMatchStatsSchema);

export default PlayerMatchStatsModel;
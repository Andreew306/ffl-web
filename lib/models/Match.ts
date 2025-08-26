import mongoose, { Schema, Document, models } from "mongoose";

export interface IMatch extends Document {
  match_id: number;
  competition_id: mongoose.Types.ObjectId;
  team1_competition_id: mongoose.Types.ObjectId;
  team2_competition_id: mongoose.Types.ObjectId;
  date: Date;
  score_team1: number;
  score_team2: number;
}

const matchSchema = new Schema<IMatch>({
  match_id: { type: Number, required: true, unique: true },
  competition_id: { type: Schema.Types.ObjectId, ref: "Competition" },
  team1_competition_id: { type: Schema.Types.ObjectId, ref: "TeamCompetition" },
  team2_competition_id: { type: Schema.Types.ObjectId, ref: "TeamCompetition" },
  date: { type: Date, required: true },
  score_team1: { type: Number, default: 0 },
  score_team2: { type: Number, default: 0 },
});

const MatchModel = models.Match || mongoose.model<IMatch>("Match", matchSchema);
export default MatchModel;

import mongoose, { Schema, Document, models } from "mongoose";

export interface ITeam extends Document {
  team_id: number;
  teamName: string;
  country: string;
  image?: string;
  kits?: string[];
  textColor?: string;
}

const teamSchema = new Schema<ITeam>({
  team_id: { type: Number, required: true, unique: true },
  teamName: { type: String, required: true },
  country: { type: String, required: true },
  image: { type: String },
  kits: [{ type: String }],
  textColor: { type: String },
});

const TeamModel = models.Team || mongoose.model<ITeam>("Team", teamSchema);
export default TeamModel;

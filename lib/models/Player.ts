import mongoose, { Schema, Document, models } from "mongoose";

export interface IPlayer extends Document {
  player_id: number;
  playerName: string;
  country: string;
  avatar?: string;
}

const playerSchema = new Schema<IPlayer>({
  player_id: { type: Number, unique: true },
  playerName: { type: String, required: true, unique: true },
  country: { type: String, required: true },
  avatar: { type: String },
});

const PlayerModel = models.Player || mongoose.model<IPlayer>("Player", playerSchema);
export default PlayerModel;

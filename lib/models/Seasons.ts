// lib/models/Season.ts
import mongoose from 'mongoose';

const seasonSchema = new mongoose.Schema({
  season_id: {
    type: String,
    required: true,
    unique: true,
  },
  season_number: {
    type: Number,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  start_date: {
    type: Date,
    required: true,
  },
  end_date: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['upcoming', 'active', 'finished'],
    default: 'upcoming',
  },
  divisions: {
    type: Number,
    enum: [1, 2],
    default: 1,
  },
  has_cup: {
    type: Boolean,
    default: false,
  },
  has_supercup: {
    type: Boolean,
    default: false,
  },
  champion_team_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    default: null,
  },
  cup_champion_team_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    default: null,
  },
  supercup_champion_team_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    default: null,
  },
  image: {
    type: String,
    default: "",
  },
  // Referencias a las competiciones individuales
  league_competition_id: {
    type: String,
    ref: "Competition",
  },
  cup_competition_id: {
    type: String,
    ref: "Competition",
    default: null,
  },
  supercup_competition_id: {
    type: String,
    ref: "Competition",
    default: null,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual para el nombre automático
seasonSchema.virtual('full_name').get(function() {
  const seasonNames = ['Winter', 'Spring', 'Summer', 'Autumn'];
  const seasonName = seasonNames[(this.season_number - 1) % 4] || '';
  return `Season ${this.season_number} - ${seasonName} ${this.divisions === 2 ? 'League' : 'Championship'}`;
});

// Virtual para estadísticas
seasonSchema.virtual('team_count').get(async function() {
  // Calcular desde registrations
  return 6; // Ejemplo
});

seasonSchema.virtual('match_count').get(async function() {
  // Calcular desde matches
  return 30; // Ejemplo
});

export default mongoose.models.Season || 
       mongoose.model('Season', seasonSchema);

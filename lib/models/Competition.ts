// lib/models/Competition.ts
import mongoose from 'mongoose';

const competitionSchema = new mongoose.Schema({
  competition_id: {
    type: String,
    required: true,
    unique: true,
  },
  type: {
    type: String,
    enum: ['league', 'cup', 'supercup', 'summer_cup', 'nations_cup'],
    required: true,
  },
  season_id: {
    type: String,
    ref: "Season",
    required: function(this: { type?: string }) {
      return ['league', 'cup', 'supercup'].includes(this.type || "");
    }
  },
  division: {
    type: Number,
    enum: [1, 2],
    required: function(this: { type?: string }) {
      return this.type === 'league';
    }
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
  champion_team_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    default: null,
  },
  team_count: {
    type: Number,
    required: true,
  },
  match_count: {
    type: Number,
    required: true,
  },
  image: {
    type: String,
    default: "",
  },
}, {
  timestamps: true
});

// Middleware para status automático
competitionSchema.pre('save', function(next) {
  const now = new Date();
  
  if (this.end_date < now) {
    this.status = 'finished';
  } else if (this.start_date <= now && this.end_date >= now) {
    this.status = 'active';
  } else {
    this.status = 'upcoming';
  }
  
  next();
});

export default mongoose.models.Competition || 
       mongoose.model('Competition', competitionSchema);

import connectDB from '../db/mongoose';
import Competition from '../models/Competition';
import { formatCompetition } from '../utils/competitionFormatter';

interface FormattedCompetition {
  id: string;
  name: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  champion?: string;
  image?: string;
}

export class CompetitionService {
  static async getAllCompetitions(): Promise<FormattedCompetition[]> {
    await connectDB();
    
    const competitions = await Competition.aggregate([
      {
        $lookup: {
          from: 'teams',
          localField: 'champion_team_id',
          foreignField: '_id',
          as: 'champion_team'
        }
      },
      { $unwind: { path: '$champion_team', preserveNullAndEmptyArrays: true } },
      { $sort: { startDate: -1 } }
    ]);

    return competitions.map(formatCompetition);
  }

  static async getActiveCompetitions(): Promise<FormattedCompetition[]> {
    await connectDB();
    const competitions = await Competition.find({ status: 'active' })
      .sort({ startDate: -1 })
      .populate('champion_team_id', 'name');
    
    return competitions.map(formatCompetition);
  }

  static async getCompetitionById(id: string): Promise<FormattedCompetition | null> {
    await connectDB();
    const competition = await Competition.findById(id)
      .populate('champion_team_id', 'name');
    
    return competition ? formatCompetition(competition) : null;
  }
}
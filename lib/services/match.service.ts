import connectDB from "@/lib/db/mongoose";
import MatchModel from "@/lib/models/Match";
import TeamMatchStatsModel from "@/lib/models/TeamMatchStats";
import PlayerMatchStatsModel from "@/lib/models/PlayerMatchStats";
import GoalModel from "@/lib/models/Goal"; // 👈 nuevo

export async function getMatchData(matchId: string) {
  await connectDB();

  const match = await MatchModel.findById(matchId)
    .populate({ path: "team1_competition_id", populate: { path: "team_id" } })
    .populate({ path: "team2_competition_id", populate: { path: "team_id" } })
    .lean();

  if (!match) return null;

  const teamStats = await TeamMatchStatsModel.find({ match_id: match._id })
    .populate("team_competition_id")
    .lean();

  const playerStats = await PlayerMatchStatsModel.find({ match_id: match._id })
    .populate({ path: "player_competition_id", populate: { path: "player_id" } })
    .lean();

  // Traer goles
  const goals = await GoalModel.find({ match_id: match._id })
    .populate({
      path: "scorer_id",
      populate: { path: "player_id" }
    })
    .populate({
      path: "assist_id",
      populate: { path: "player_id" }
    })
    .sort({ minute: 1 }) // orden cronológico
    .lean();

  return { match, teamStats, playerStats, goals };
}

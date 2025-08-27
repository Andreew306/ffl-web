// services/match.service.ts
import connectDB from "@/lib/db/mongoose";
import MatchModel from "@/lib/models/Match";
import TeamMatchStatsModel from "@/lib/models/TeamMatchStats";
import PlayerMatchStatsModel from "@/lib/models/PlayerMatchStats";

export async function getMatchData(matchId: string) {
  await connectDB();

  // Traer partido
const match = await MatchModel.findById(matchId)
  .populate({
    path: "team1_competition_id",
    populate: { path: "team_id" } // trae el objeto completo del team
  })
  .populate({
    path: "team2_competition_id",
    populate: { path: "team_id" }
  })
  .lean();


  if (!match) return null;

  // Estadísticas de equipo
  const teamStats = await TeamMatchStatsModel.find({ match_id: match._id })
    .populate("team_competition_id")
    .lean();

  // Estadísticas de jugadores
  const playerStats = await PlayerMatchStatsModel.find({ match_id: match._id })
    .populate({
      path: "player_competition_id",
      populate: { path: "player_id" } // para traer info del jugador
    })
    .lean();

  return { match, teamStats, playerStats };
}

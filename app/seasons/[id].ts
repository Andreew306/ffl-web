// pages/api/seasons/[id].ts
import dbConnect from "@/lib/db/mongoose";
import Competition from "@/lib/models/Competition";
import TeamCompetitionModel from "@/lib/models/TeamCompetition";
import MatchModel from "@/lib/models/Match";
import TeamMatchStatsModel from "@/lib/models/TeamMatchStats";

export default async function handler(req, res) {
  const { id } = req.query;
  const { highlight } = req.query;

  await dbConnect();

  // 🔹 Buscar la competición por ID
  const competition = await Competition.findById(id).lean();
  if (!competition) return res.status(404).json({ error: "Competición no encontrada" });

  // 🔹 Traer equipos de la competición
  const teams = await TeamCompetitionModel.find({ competition_id: id })
    .populate({ path: "team_id", select: "name logo" })
    .lean();

  // 🔹 Traer partidos de la competición
  const matches = await MatchModel.find({ competition_id: id })
    .populate({
      path: "team1_competition_id",
      populate: { path: "team_id", select: "name logo" },
    })
    .populate({
      path: "team2_competition_id",
      populate: { path: "team_id", select: "name logo" },
    })
    .lean();

  // 🔹 Traer estadísticas de cada partido
  const matchStats = await TeamMatchStatsModel.find({
    match_id: { $in: matches.map(m => m._id) }
  })
    .populate({
      path: "team_competition_id",
      populate: { path: "team_id", select: "name logo" },
    })
    .lean();

  // 🔹 Mapear estadísticas por equipo
  const statsByMatch = matches.map(match => ({
    ...match,
    stats: matchStats.filter(s => String(s.match_id) === String(match._id))
  }));

  // 🔹 Construir la respuesta
  const response = {
    ...competition,
    teams,
    matches: statsByMatch,
  };

  res.status(200).json(response);
}

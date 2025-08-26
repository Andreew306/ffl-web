// app/seasons/page.tsx
import dbConnect from "@/lib/db/mongoose";
import MatchModel from "@/lib/models/Match";
import TeamMatchStatsModel from "@/lib/models/TeamMatchStats";
import TeamCompetitionModel from "@/lib/models/TeamCompetition";

export default async function SeasonsPage() {
  await dbConnect();

  // 🔎 Buscar todos los partidos con populate de stats y equipos
  const matches = await MatchModel.find()
    .populate({
      path: "competition_id",
      select: "name season", // puedes ajustar los campos que quieras
    })
    .populate({
      path: "team1_competition_id",
      model: TeamCompetitionModel,
      populate: {
        path: "team_id",
        select: "name shortName", // muestra datos del equipo real
      },
    })
    .populate({
      path: "team2_competition_id",
      model: TeamCompetitionModel,
      populate: {
        path: "team_id",
        select: "name shortName",
      },
    })
    .lean();

  // 🔎 Buscar estadísticas de cada partido asociadas
  const matchStats = await TeamMatchStatsModel.find()
    .populate({
      path: "team_competition_id",
      model: TeamCompetitionModel,
      populate: { path: "team_id", select: "name shortName" },
    })
    .lean();

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">📊 Estadísticas de la temporada</h1>

      <div className="space-y-6">
        {matches.map((match) => {
          const statsForMatch = matchStats.filter(
            (s) => String(s.match_id) === String(match._id)
          );

          return (
            <div
              key={match._id.toString()}
              className="p-4 border rounded-xl shadow bg-white"
            >
              <h2 className="text-xl font-semibold mb-2">
                {match.team1_competition_id.team_id.name}{" "}
                {match.score_team1} - {match.score_team2}{" "}
                {match.team2_competition_id.team_id.name}
              </h2>
              <p className="text-gray-500 mb-3">
                Competición: {match.competition_id.name} |{" "}
                {new Date(match.date).toLocaleDateString()}
              </p>

              <div className="grid grid-cols-2 gap-4">
                {statsForMatch.map((stat) => (
                  <div
                    key={stat._id.toString()}
                    className="p-3 border rounded bg-gray-50"
                  >
                    <h3 className="font-bold">
                      {stat.team_competition_id.team_id.name}
                    </h3>
                    <ul className="text-sm mt-2 space-y-1">
                      <li>⚽ Goles: {stat.goalsScored}</li>
                      <li>🥅 Goles encajados: {stat.goalsConceded}</li>
                      <li>🧤 Porterías a 0: {stat.cs}</li>
                      <li>📈 Posesión: {stat.possession}%</li>
                      <li>👟 Disparos a puerta: {stat.shotsOnGoal}</li>
                      <li>🎯 Pases: {stat.passes}</li>
                      <li>💥 Remates: {stat.kicks}</li>
                      <li>⭐ Puntos: {stat.points}</li>
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

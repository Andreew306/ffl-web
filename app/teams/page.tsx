import connectDB from "@/lib/db/mongoose";
import MatchModel from "@/lib/models/Match";
import TeamMatchStatsModel from "@/lib/models/TeamMatchStats";
import PlayerMatchStatsModel from "@/lib/models/PlayerMatchStats";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield } from "lucide-react";

// Helper para obtener la URL del emoji de Twemoji
function getTwemojiUrl(emoji: string) {
  if (!emoji) return "";
  const codePoints = Array.from(emoji)
    .map(c => c.codePointAt(0)?.toString(16))
    .join("-");
  return `https://twemoji.maxcdn.com/v/latest/72x72/${codePoints}.png`;
}

// Barra visual comparativa
function StatBar({ value1, value2 }: { value1: number; value2: number }) {
  const total = value1 + value2 || 1;
  const width1 = (value1 / total) * 100;
  const width2 = (value2 / total) * 100;
  return (
    <div className="flex h-4 w-full bg-gray-700 rounded overflow-hidden my-1">
      <div className="bg-cyan-500" style={{ width: `${width1}%` }} />
      <div className="bg-purple-500" style={{ width: `${width2}%` }} />
    </div>
  );
}

export default async function MatchDetailPage({ params }: { params: { id: string } }) {
  const { id } = await params; // <--- await aquí
  await connectDB();

  const match = await MatchModel.findById(id)
    .populate({
      path: "team1_competition_id",
      populate: { path: "team_id" }
    })
    .populate({
      path: "team2_competition_id",
      populate: { path: "team_id" }
    })
    .lean();


  if (!match) return <p className="text-white p-4">Partido no encontrado</p>;

  // 2️⃣ Estadísticas de equipo
  const teamStats = await TeamMatchStatsModel.find({ match_id: match._id })
    .populate({
      path: "team_competition_id",
      populate: { path: "team_id" } // para tener logo y nombre
    })
    .lean();

  // 3️⃣ Estadísticas de jugadores
  const playerStats = await PlayerMatchStatsModel.find({ match_id: match._id })
    .populate({
      path: "player_competition_id",
      populate: { path: "player_id" }
    })
    .lean();

  return (
    <div className="min-h-screen bg-slate-900 p-4 text-white">
      {/* Header con logos y nombres */}
      <section className="text-center mb-8">
        <div className="flex items-center justify-center gap-8">
          <div className="flex items-center gap-2">
            <Image
              src={match.team1_competition_id?.team_id?.image || "/placeholder.svg"}
              alt={match.team1_competition_id?.team_id?.teamName || "Team 1"}
              width={40}
              height={40}
              className="rounded-full"
            />
            <span className="text-2xl font-bold">
              {match.team1_competition_id?.team_id?.teamName || "Team 1"}
            </span>
          </div>

          <span className="text-2xl font-bold">vs</span>

          <div className="flex items-center gap-2">
            <Image
              src={match.team2_competition_id?.team_id?.image || "/placeholder.svg"}
              alt={match.team2_competition_id?.team_id?.teamName || "Team 2"}
              width={40}
              height={40}
              className="rounded-full"
            />
            <span className="text-2xl font-bold">
              {match.team2_competition_id?.team_id?.teamName || "Team 2"}
            </span>
          </div>
        </div>

        <Badge variant="outline" className="mt-2">
          {match.date ? new Date(match.date).toLocaleDateString() : "-"}
        </Badge>

        <div className="text-2xl mt-2 font-bold">
          {match.score_team1 ?? 0} - {match.score_team2 ?? 0}
        </div>
      </section>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-3 mb-4 bg-slate-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-600">
            Resumen
          </TabsTrigger>
          <TabsTrigger value="teamStats" className="data-[state=active]:bg-purple-600">
            Equipos
          </TabsTrigger>
          <TabsTrigger value="playerStats" className="data-[state=active]:bg-yellow-600">
            Jugadores
          </TabsTrigger>
        </TabsList>

        {/* Resumen del partido */}
        <TabsContent value="overview">
          <Card className="bg-slate-800 mb-4 p-4">
            <CardHeader>
              <CardTitle className="text-center text-2xl font-bold">Resumen del Partido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Estadísticas comparativas */}
              <div>
                <h3 className="text-xl font-semibold text-center mb-2">STATS</h3>

                {["possession", "kicks", "passes", "shotsOnGoal"].map((statKey) => {
                  const value1 = teamStats[0]?.[statKey] ?? 0;
                  const value2 = teamStats[1]?.[statKey] ?? 0;
                  const display1 = statKey === "possession" ? (value1 / 10).toFixed(1) + "%" : value1;
                  const display2 = statKey === "possession" ? (value2 / 10).toFixed(1) + "%" : value2;
                  return (
                    <div key={statKey} className="mb-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{display1}</span>
                        <span className="font-semibold">{statKey.toUpperCase().replace(/([A-Z])/g, " $1")}</span>
                        <span>{display2}</span>
                      </div>
                      <StatBar value1={value1} value2={value2} />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Estadísticas de equipo */}
        <TabsContent value="teamStats">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamStats.map((team) => (
              <Card key={team._id} className="bg-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-cyan-400"/>
                    <span>{team.team_competition_id?.team_id?.teamName || "-"}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p>Goles: {team.goalsScored} - {team.goalsConceded}</p>
                  <p>Posesión: {(team.possession / 10).toFixed(1)}%</p>
                  <p>Kicks: {team.kicks}</p>
                  <p>Pases: {team.passes}</p>
                  <p>Shots on Goal: {team.shotsOnGoal}</p>
                  <p>Clean Sheets: {team.cs}</p>
                  <p>Resultado: {team.won ? "Ganado" : team.draw ? "Empate" : "Perdido"}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Estadísticas de jugadores */}
        <TabsContent value="playerStats">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {playerStats.map((player) => (
              <Card key={player._id} className="bg-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {player.player_competition_id?.player_id?.country && (
                      <img
                        src={getTwemojiUrl(player.player_competition_id.player_id.country)}
                        alt={player.player_competition_id.player_id.country}
                        className="w-6 h-6 rounded-sm"
                      />
                    )}
                    <span>{player.player_competition_id?.player_id?.playerName || "-"}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p>Posición: {player.position}</p>
                  <p>Minutos Jugados: {player.minutesPlayed}</p>
                  <p>Goles: {player.goals}</p>
                  <p>Asistencias: {player.assists}</p>
                  <p>Kicks: {player.kicks}</p>
                  <p>Pases: {player.passes}</p>
                  <p>Shots on Goal: {player.shotsOnGoal}</p>
                  <p>Clean Sheets: {player.cs}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

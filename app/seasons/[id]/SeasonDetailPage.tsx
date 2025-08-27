// app/seasons/[id]/SeasonDetailPage.tsx
'use client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Calendar, BarChart, Target, Award, Shield } from "lucide-react";
import Image from "next/image"
import Link from "next/link"

// Función para obtener la URL de Twemoji a partir de un emoji
function getTwemojiUrl(emoji: string) {
  if (!emoji) return "";
  const codePoints = Array.from(emoji)
    .map(c => c.codePointAt(0)?.toString(16))
    .join("-");
  return `https://twemoji.maxcdn.com/v/latest/72x72/${codePoints}.png`;
}


export default function SeasonDetailPage({ season }: { season: any }) {
  const teams = Array.isArray(season?.teams) ? season.teams : []
  const standings = Array.isArray(season?.standings) ? season.standings : []
  const matches = Array.isArray(season?.matches) ? season.matches : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <section className="py-16 bg-black/20 text-center">
        <Badge variant="default" className="mb-4">{season?.status || 'Desconocido'}</Badge>
        <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-4">
          {season?.competitionName || 'Competición'}
        </h1>
        <div className="flex justify-center space-x-8 text-sm text-gray-400">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>{season?.startDate ? new Date(season.startDate).toLocaleDateString() : '-'} - {season?.endDate ? new Date(season.endDate).toLocaleDateString() : '-'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{teams.length} equipos</Badge>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="py-16 container mx-auto px-4">
        <Tabs defaultValue="teams" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800 mb-8">
            <TabsTrigger value="teams" className="data-[state=active]:bg-cyan-600">Equipos</TabsTrigger>
            <TabsTrigger value="standings" className="data-[state=active]:bg-cyan-600">Clasificación</TabsTrigger>
            <TabsTrigger value="matches" className="data-[state=active]:bg-cyan-600">Partidos</TabsTrigger>
            <TabsTrigger value="statistics" className="data-[state=active]:bg-cyan-600">Estadísticas</TabsTrigger>
          </TabsList>

{/* Equipos */}
<TabsContent value="teams">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {teams.map(team => (
      <Card key={team._id} className="bg-gradient-to-br from-slate-800 to-slate-900 border-cyan-500/20 hover:border-cyan-500/40 transition-all">
        <CardContent className="p-6 text-center">
          <Image
            src={team.team_id?.logo || "/placeholder.svg"}
            alt={team.team_id?.teamName || "Equipo"}
            width={60}
            height={60}
            className="mx-auto mb-4 rounded-full border-2 border-cyan-400"
          />
          <h3 className="text-lg font-bold text-white mb-2">{team.team_id?.teamName || "Equipo"}</h3>
          <div className="space-y-1 text-sm text-gray-400">
            <p className="text-xs">{team.players || 0} jugadores</p>
            <p>{(team.matchesWon || 0)}V - {(team.matchesDraw || 0)}D - {(team.matchesLost || 0)}L</p>
          </div>
          <Link href={`/teams/${team.team_id?._id || ""}`}>
            <Button className="w-full mt-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600">
              Ver Equipo
            </Button>
          </Link>
        </CardContent>
      </Card>
    ))}
  </div>
</TabsContent>



          {/* Clasificación */}
<TabsContent value="standings">
  <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-cyan-500/20">
    <CardHeader>
      <CardTitle className="text-2xl font-bold text-cyan-400 flex items-center">
        <Trophy className="mr-2 h-6 w-6" /> Tabla de Posiciones
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-left">
              <th>#</th>
              <th>Equipo</th>
              <th>PJ</th>
              <th>V</th>
              <th>E</th>
              <th>D</th>
              <th>GF</th>
              <th>GC</th>
              <th>DG</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            {teams
              .slice() // copia para no mutar el array original
              .sort((a, b) => (b.points || 0) - (a.points || 0))
              .map((tc, idx) => (
                <tr key={tc._id} className="border-b border-gray-800 hover:bg-slate-700/50">
                  <td>{idx + 1}</td>
                  <td className="flex items-center space-x-2">
                    <Image
                      src={tc.team_id?.logo || "/placeholder.svg"}
                      alt={tc.team_id?.teamName || "-"}
                      width={30}
                      height={30}
                      className="rounded-full"
                    />
                    <span>{tc.team_id?.teamName || "-"}</span>
                  </td>
                  <td>{tc.matchesPlayed}</td>
                  <td>{tc.matchesWon}</td>
                  <td>{tc.matchesDraw}</td>
                  <td>{tc.matchesLost}</td>
                  <td>{tc.goalsScored}</td>
                  <td>{tc.goalsConceded}</td>
                  <td>{(tc.goalsScored || 0) - (tc.goalsConceded || 0)}</td>
                  <td>{tc.points}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
</TabsContent>



          {/* Partidos */}
<TabsContent value="matches">
  <div className="space-y-6">
    {matches.map(match => (
  <Link key={match._id} href={`/matches/${match._id}`} className="block">
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-cyan-500/20 hover:border-cyan-500/40 transition-all">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <Badge variant="outline">{match.week || '-'}</Badge>
          <span className="text-gray-400 text-sm">
            {match.date ? new Date(match.date).toLocaleDateString() : '-'}
          </span>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-4">
            {/* Equipo 1 */}
            <div className="flex items-center space-x-2">
              <Image
                src={match.team1?.logo || "/placeholder.svg"}
                alt={match.team1?.teamName || "-"}
                width={40}
                height={40}
                className="rounded-full"
              />
              <span className="text-white font-medium">{match.team1?.teamName || "-"}</span>
            </div>

            {/* Marcador */}
            <div className="text-center">
              <span className="text-3xl font-bold text-cyan-400">
                {match.score_team1 ?? 0} - {match.score_team2 ?? 0}
              </span>
            </div>

            {/* Equipo 2 */}
            <div className="flex items-center space-x-2">
              <Image
                src={match.team2?.logo || "/placeholder.svg"}
                alt={match.team2?.teamName || "-"}
                width={40}
                height={40}
                className="rounded-full"
              />
              <span className="text-white font-medium">{match.team2?.teamName || "-"}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </Link>
))}
  </div>
</TabsContent>

{/* Estadísticas */}
<TabsContent value="statistics">
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

    <Tabs defaultValue="goals" className="w-full">
      <TabsList className="grid grid-cols-3 gap-1 mb-2 bg-slate-800">
        <TabsTrigger value="goals" className="data-[state=active]:bg-cyan-600">Top Goles</TabsTrigger>
        <TabsTrigger value="assists" className="data-[state=active]:bg-purple-600">Top Asistencias</TabsTrigger>
        <TabsTrigger value="cs" className="data-[state=active]:bg-cyan-400">Top CS</TabsTrigger>
      </TabsList>

      {/* Top Goles */}
      <TabsContent value="goals">
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-green-500/20 mb-2">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-green-400 flex items-center">
              <Target className="mr-2 h-6 w-6" />
              Top Goleadores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {season.statistics?.topScorers?.slice(0, 7).map((p: any, idx: number) => (
              <div
                key={p._id}
                className="flex items-center justify-between bg-slate-700/50 rounded-lg p-2"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-slate-600 text-white">
                    {idx + 1}
                  </div>
                  <div className="flex items-center space-x-2">
                    {p.player_id?.country && (
                      <img
                        src={getTwemojiUrl(p.player_id.country)}
                        alt={p.player_id.country}
                        width={24}
                        height={24}
                        className="rounded-sm"
                      />
                    )}
                    <span className="text-white font-medium">{p.player_id?.playerName || "Jugador"}</span>
                  </div>
                </div>
                <p className="text-green-400 font-bold">{p.goals || 0} goles</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Top Asistencias */}
      <TabsContent value="assists">
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-purple-500/20 mb-2">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-purple-400 flex items-center">
              <Award className="mr-2 h-6 w-6" />
              Top Asistidores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {season.statistics?.topAssists?.slice(0, 7).map((p: any, idx: number) => (
              <div
                key={p._id}
                className="flex items-center justify-between bg-slate-700/50 rounded-lg p-2"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-slate-600 text-white">
                    {idx + 1}
                  </div>
                  <div className="flex items-center space-x-2">
                    {p.player_id?.country && (
                      <img
                        src={getTwemojiUrl(p.player_id.country)}
                        alt={p.player_id.country}
                        width={24}
                        height={24}
                        className="rounded-sm"
                      />
                    )}
                    <span className="text-white font-medium">{p.player_id?.playerName || "Jugador"}</span>
                  </div>
                </div>
                <p className="text-purple-400 font-bold">{p.assists || 0} asistencias</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Top CS */}
      <TabsContent value="cs">
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-cyan-500/20 mb-2">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-cyan-400 flex items-center">
              <Shield className="mr-2 h-6 w-6" />
              Top Clean Sheets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {season.statistics?.topCS?.slice(0, 7).map((p: any, idx: number) => (
              <div
                key={p._id}
                className="flex items-center justify-between bg-slate-700/50 rounded-lg p-2"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-slate-600 text-white">
                    {idx + 1}
                  </div>
                  <div className="flex items-center space-x-2">
                    {p.player_id?.country && (
                      <img
                        src={getTwemojiUrl(p.player_id.country)}
                        alt={p.player_id.country}
                        width={24}
                        height={24}
                        className="rounded-sm"
                      />
                    )}
                    <span className="text-white font-medium">{p.player_id?.playerName || "Jugador"}</span>
                  </div>
                </div>
                <p className="text-cyan-400 font-bold">{p.cs || 0} CS</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    {/* Estadísticas de temporada */}
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-yellow-500/20">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-yellow-400 flex items-center">
          <BarChart className="mr-2 h-6 w-6" />
          Estadísticas de Temporada
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-cyan-400">{season.statistics?.matchesPlayed || 0}</p>
            <p className="text-gray-400 text-sm">Partidos Jugados</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-400">{season.statistics?.goals || 0}</p>
            <p className="text-gray-400 text-sm">Goles Totales</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-400">
              {season.statistics?.matchesPlayed
                ? (season.statistics.goals / season.statistics.matchesPlayed).toFixed(2)
                : "0"}
            </p>
            <p className="text-gray-400 text-sm">Goles por Partido</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-400">{season.statistics?.activePlayers || 0}</p>
            <p className="text-gray-400 text-sm">Jugadores Activos</p>
          </div>
        </div>
      </CardContent>
    </Card>

  </div>
</TabsContent>




        </Tabs>
      </section>
    </div>
  )
}

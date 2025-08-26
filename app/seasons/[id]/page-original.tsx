import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Target, Calendar, Award } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function SeasonDetailPage({ params }: { params: { id: string } }) {
  const seasonId = Number.parseInt(params.id)

  // Mock data for current season
  const season = {
    id: seasonId,
    name: "Temporada 6 - Winter Championship",
    status: "Activa",
    startDate: "2024-01-01",
    endDate: "2024-03-31",
    description: "La sexta temporada regular de la FFL con 8 equipos luchando por el título de campeón.",
  }

  const teams = [
    {
      id: 1,
      name: "Digital Kings",
      logo: "/placeholder.svg?height=60&width=60",
      players: 7,
      wins: 6,
      losses: 2,
      points: 18,
    },
    {
      id: 2,
      name: "Thunder Bolts",
      logo: "/placeholder.svg?height=60&width=60",
      players: 7,
      wins: 5,
      losses: 3,
      points: 15,
    },
    {
      id: 3,
      name: "Neon Strikers",
      logo: "/placeholder.svg?height=60&width=60",
      players: 7,
      wins: 4,
      losses: 4,
      points: 12,
    },
    {
      id: 4,
      name: "Cyber Wolves",
      logo: "/placeholder.svg?height=60&width=60",
      players: 7,
      wins: 3,
      losses: 5,
      points: 9,
    },
    {
      id: 5,
      name: "Pixel Warriors",
      logo: "/placeholder.svg?height=60&width=60",
      players: 7,
      wins: 3,
      losses: 5,
      points: 9,
    },
    {
      id: 6,
      name: "Elite Squad",
      logo: "/placeholder.svg?height=60&width=60",
      players: 7,
      wins: 2,
      losses: 6,
      points: 6,
    },
    {
      id: 7,
      name: "Shadow Hunters",
      logo: "/placeholder.svg?height=60&width=60",
      players: 7,
      wins: 2,
      losses: 6,
      points: 6,
    },
    {
      id: 8,
      name: "Fire Dragons",
      logo: "/placeholder.svg?height=60&width=60",
      players: 7,
      wins: 1,
      losses: 7,
      points: 3,
    },
  ]

  const topScorers = [
    { name: "xXProGamerXx", team: "Digital Kings", goals: 12, assists: 8, flag: "🇪🇸" },
    { name: "NeonMaster", team: "Thunder Bolts", goals: 10, assists: 6, flag: "🇧🇷" },
    { name: "CyberStrike", team: "Neon Strikers", goals: 8, assists: 10, flag: "🇦🇷" },
    { name: "PixelKing", team: "Pixel Warriors", goals: 7, assists: 5, flag: "🇲🇽" },
    { name: "EliteShooter", team: "Elite Squad", goals: 6, assists: 7, flag: "🇨🇴" },
  ]

  const recentMatches = [
    {
      id: 1,
      team1: { name: "Thunder Bolts", logo: "/placeholder.svg?height=40&width=40", score: 4 },
      team2: { name: "Neon Strikers", logo: "/placeholder.svg?height=40&width=40", score: 2 },
      date: "2024-01-15",
      week: "Jornada 8",
    },
    {
      id: 2,
      team1: { name: "Cyber Wolves", logo: "/placeholder.svg?height=40&width=40", score: 1 },
      team2: { name: "Digital Kings", logo: "/placeholder.svg?height=40&width=40", score: 3 },
      date: "2024-01-14",
      week: "Jornada 8",
    },
    {
      id: 3,
      team1: { name: "Elite Squad", logo: "/placeholder.svg?height=40&width=40", score: 2 },
      team2: { name: "Fire Dragons", logo: "/placeholder.svg?height=40&width=40", score: 1 },
      date: "2024-01-13",
      week: "Jornada 8",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <section className="py-16 bg-black/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge className="mb-4" variant={season.status === "Activa" ? "default" : "secondary"}>
              {season.status}
            </Badge>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-4">
              {season.name}
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-6">{season.description}</p>
            <div className="flex justify-center space-x-8 text-sm text-gray-400">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {season.startDate} - {season.endDate}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Tabs */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="teams" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-slate-800 mb-8">
              <TabsTrigger value="teams" className="data-[state=active]:bg-cyan-600">
                Equipos
              </TabsTrigger>
              <TabsTrigger value="standings" className="data-[state=active]:bg-cyan-600">
                Clasificación
              </TabsTrigger>
              <TabsTrigger value="matches" className="data-[state=active]:bg-cyan-600">
                Partidos
              </TabsTrigger>
              <TabsTrigger value="stats" className="data-[state=active]:bg-cyan-600">
                Estadísticas
              </TabsTrigger>
            </TabsList>

            {/* Teams Tab */}
            <TabsContent value="teams">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {teams.map((team) => (
                  <Card
                    key={team.id}
                    className="bg-gradient-to-br from-slate-800 to-slate-900 border-cyan-500/20 hover:border-cyan-500/40 transition-all group"
                  >
                    <CardContent className="p-6 text-center">
                      <Image
                        src={team.logo || "/placeholder.svg"}
                        alt={team.name}
                        width={60}
                        height={60}
                        className="mx-auto mb-4 rounded-full border-2 border-cyan-400 group-hover:border-purple-400 transition-colors"
                      />
                      <h3 className="text-lg font-bold text-white mb-2">{team.name}</h3>
                      <div className="space-y-1 text-sm text-gray-400">
                        <p>{team.players} jugadores</p>
                        <p>
                          {team.wins}V - {team.losses}D
                        </p>
                        <p className="text-cyan-400 font-bold">{team.points} puntos</p>
                      </div>
                      <Link href={`/teams/${team.id}`}>
                        <Button className="w-full mt-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600">
                          Ver Equipo
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Standings Tab */}
            <TabsContent value="standings">
              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-cyan-500/20">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-cyan-400 flex items-center">
                    <Trophy className="mr-2 h-6 w-6" />
                    Tabla de Posiciones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 px-2 text-gray-400">Pos</th>
                          <th className="text-left py-3 px-2 text-gray-400">Equipo</th>
                          <th className="text-center py-3 px-2 text-gray-400">PJ</th>
                          <th className="text-center py-3 px-2 text-gray-400">V</th>
                          <th className="text-center py-3 px-2 text-gray-400">D</th>
                          <th className="text-center py-3 px-2 text-gray-400">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teams.map((team, index) => (
                          <tr key={team.id} className="border-b border-gray-800 hover:bg-slate-700/50">
                            <td className="py-3 px-2">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                  index === 0
                                    ? "bg-yellow-500 text-black"
                                    : index === 1
                                      ? "bg-gray-400 text-black"
                                      : index === 2
                                        ? "bg-amber-600 text-white"
                                        : "bg-slate-600 text-white"
                                }`}
                              >
                                {index + 1}
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center space-x-3">
                                <Image
                                  src={team.logo || "/placeholder.svg"}
                                  alt={team.name}
                                  width={32}
                                  height={32}
                                  className="rounded"
                                />
                                <span className="text-white font-medium">{team.name}</span>
                              </div>
                            </td>
                            <td className="text-center py-3 px-2 text-gray-300">{team.wins + team.losses}</td>
                            <td className="text-center py-3 px-2 text-green-400">{team.wins}</td>
                            <td className="text-center py-3 px-2 text-red-400">{team.losses}</td>
                            <td className="text-center py-3 px-2 text-cyan-400 font-bold">{team.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Matches Tab */}
            <TabsContent value="matches">
              <div className="space-y-6">
                {recentMatches.map((match) => (
                  <Card key={match.id} className="bg-gradient-to-br from-slate-800 to-slate-900 border-cyan-500/20">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="mb-4">
                          {match.week}
                        </Badge>
                        <span className="text-gray-400 text-sm">{match.date}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Image
                              src={match.team1.logo || "/placeholder.svg"}
                              alt={match.team1.name}
                              width={40}
                              height={40}
                              className="rounded"
                            />
                            <span className="text-white font-medium">{match.team1.name}</span>
                          </div>
                          <div className="text-center">
                            <span className="text-3xl font-bold text-cyan-400">
                              {match.team1.score} - {match.team2.score}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Image
                              src={match.team2.logo || "/placeholder.svg"}
                              alt={match.team2.name}
                              width={40}
                              height={40}
                              className="rounded"
                            />
                            <span className="text-white font-medium">{match.team2.name}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Stats Tab */}
            <TabsContent value="stats">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Scorers */}
                <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-green-500/20">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-green-400 flex items-center">
                      <Target className="mr-2 h-6 w-6" />
                      Top Goleadores
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {topScorers.map((player, index) => (
                        <div
                          key={player.name}
                          className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3"
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                index === 0
                                  ? "bg-yellow-500 text-black"
                                  : index === 1
                                    ? "bg-gray-400 text-black"
                                    : index === 2
                                      ? "bg-amber-600 text-white"
                                      : "bg-slate-600 text-white"
                              }`}
                            >
                              {index + 1}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-white font-medium">{player.name}</span>
                                <span className="text-lg">{player.flag}</span>
                              </div>
                              <p className="text-gray-400 text-sm">{player.team}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-green-400 font-bold">{player.goals} goles</p>
                            <p className="text-blue-400 text-sm">{player.assists} asistencias</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Season Stats */}
                <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-purple-500/20">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-purple-400 flex items-center">
                      <Award className="mr-2 h-6 w-6" />
                      Estadísticas de Temporada
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-cyan-400">32</p>
                        <p className="text-gray-400 text-sm">Partidos Jugados</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-green-400">128</p>
                        <p className="text-gray-400 text-sm">Goles Totales</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-yellow-400">4.0</p>
                        <p className="text-gray-400 text-sm">Goles por Partido</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-purple-400">56</p>
                        <p className="text-gray-400 text-sm">Jugadores Activos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  )
}

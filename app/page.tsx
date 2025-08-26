import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Users, Calendar, TrendingUp, Play, Star } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function HomePage() {
  const recentMatches = [
    {
      id: 1,
      team1: { name: "Thunder Bolts", logo: "/placeholder.svg?height=40&width=40", score: 4 },
      team2: { name: "Neon Strikers", logo: "/placeholder.svg?height=40&width=40", score: 2 },
      date: "2024-01-15",
      status: "Finalizado",
    },
    {
      id: 2,
      team1: { name: "Cyber Wolves", logo: "/placeholder.svg?height=40&width=40", score: 1 },
      team2: { name: "Digital Kings", logo: "/placeholder.svg?height=40&width=40", score: 3 },
      date: "2024-01-14",
      status: "Finalizado",
    },
    {
      id: 3,
      team1: { name: "Pixel Warriors", logo: "/placeholder.svg?height=40&width=40", score: null },
      team2: { name: "Elite Squad", logo: "/placeholder.svg?height=40&width=40", score: null },
      date: "2024-01-20",
      status: "Próximo",
    },
  ]

  const leaderboard = [
    { position: 1, team: "Digital Kings", points: 18, matches: 8, wins: 6, draws: 0, losses: 2 },
    { position: 2, team: "Thunder Bolts", points: 15, matches: 8, wins: 5, draws: 0, losses: 3 },
    { position: 3, team: "Neon Strikers", points: 12, matches: 8, wins: 4, draws: 0, losses: 4 },
    { position: 4, team: "Cyber Wolves", points: 9, matches: 8, wins: 3, draws: 0, losses: 5 },
  ]

  const topScorers = [
    { name: "xXProGamerXx", team: "Digital Kings", goals: 12, flag: "🇪🇸" },
    { name: "NeonMaster", team: "Thunder Bolts", goals: 10, flag: "🇧🇷" },
    { name: "CyberStrike", team: "Neon Strikers", goals: 8, flag: "🇦🇷" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 to-slate-800/20" />
        <div className="relative container mx-auto px-4 py-20 text-center">
          <div className="mb-8">
            <Image
              src="/ffl-logo.png"
              alt="FFL Logo"
              width={120}
              height={120}
              className="mx-auto mb-4 rounded-full border-4 border-teal-400 shadow-lg shadow-teal-400/50"
            />
            <h1 className="text-6xl font-bold bg-gradient-to-r from-teal-400 to-white bg-clip-text text-transparent mb-4">
              FUTSAL FUSION LEAGUE
            </h1>
            <p className="text-xl text-gray-300 mb-8">La liga más competitiva de Haxball 7v7 - FFL</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button
                size="lg"
                className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white"
              >
                <Play className="mr-2 h-5 w-5" />
                Ver Temporada Actual
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 bg-transparent"
              >
                <Users className="mr-2 h-5 w-5" />
                Únete a la Liga
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Overview */}
      <section className="py-16 bg-black/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-teal-500/20">
              <CardContent className="p-6 text-center">
                <Trophy className="h-12 w-12 text-teal-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white">8</h3>
                <p className="text-gray-400">Equipos Activos</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-white/20">
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 text-white mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white">56</h3>
                <p className="text-gray-400">Jugadores</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-teal-500/20">
              <CardContent className="p-6 text-center">
                <Calendar className="h-12 w-12 text-teal-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white">180</h3>
                <p className="text-gray-400">Partidos Jugados</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-white/20">
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-12 w-12 text-white mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white">10</h3>
                <p className="text-gray-400">Torneos</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Recent Matches & Leaderboard */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Matches */}
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-teal-500/20">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-teal-400 flex items-center">
                  <Calendar className="mr-2 h-6 w-6" />
                  Últimos Partidos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentMatches.map((match) => (
                  <div
                    key={match.id}
                    className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700/70 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Image
                            src={match.team1.logo || "/placeholder.svg"}
                            alt={match.team1.name}
                            width={32}
                            height={32}
                            className="rounded"
                          />
                          <span className="text-white font-medium">{match.team1.name}</span>
                        </div>
                        <div className="text-center">
                          {match.team1.score !== null ? (
                            <span className="text-2xl font-bold text-teal-400">
                              {match.team1.score} - {match.team2.score}
                            </span>
                          ) : (
                            <span className="text-gray-400">vs</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Image
                            src={match.team2.logo || "/placeholder.svg"}
                            alt={match.team2.name}
                            width={32}
                            height={32}
                            className="rounded"
                          />
                          <span className="text-white font-medium">{match.team2.name}</span>
                        </div>
                      </div>
                      <Badge
                        variant={match.status === "Finalizado" ? "default" : "secondary"}
                        className={
                          match.status === "Finalizado" ? "bg-teal-500/20 text-teal-400 border-teal-500/50" : ""
                        }
                      >
                        {match.status}
                      </Badge>
                    </div>
                    <p className="text-gray-400 text-sm mt-2">{match.date}</p>
                  </div>
                ))}
                <Link href="/matches">
                  <Button className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700">
                    Ver Todos los Partidos
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Leaderboard */}
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-white/20">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white flex items-center">
                  <Trophy className="mr-2 h-6 w-6" />
                  Tabla de Posiciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaderboard.map((team) => (
                    <div
                      key={team.position}
                      className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3 hover:bg-slate-700/70 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            team.position === 1
                              ? "bg-teal-500 text-black"
                              : team.position === 2
                                ? "bg-gray-400 text-black"
                                : team.position === 3
                                  ? "bg-amber-600 text-white"
                                  : "bg-slate-600 text-white"
                          }`}
                        >
                          {team.position}
                        </div>
                        <span className="text-white font-medium">{team.team}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-teal-400 font-bold">{team.points} pts</span>
                        <span className="text-gray-400">
                          {team.wins}V-{team.losses}D
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/leaderboard">
                  <Button className="w-full mt-4 bg-gradient-to-r from-white/10 to-white/20 hover:from-white/20 hover:to-white/30 text-white border border-white/20">
                    Ver Tabla Completa
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Top Scorers */}
      <section className="py-16 bg-black/20">
        <div className="container mx-auto px-4">
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-teal-500/20">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-teal-400 flex items-center justify-center">
                <Star className="mr-2 h-6 w-6" />
                Top Goleadores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topScorers.map((player, index) => (
                  <div
                    key={player.name}
                    className="bg-slate-700/50 rounded-lg p-4 text-center hover:bg-slate-700/70 transition-colors"
                  >
                    <div
                      className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center font-bold text-lg ${
                        index === 0
                          ? "bg-teal-500 text-black"
                          : index === 1
                            ? "bg-gray-400 text-black"
                            : "bg-amber-600 text-white"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <h3 className="text-white font-bold">{player.name}</h3>
                    <p className="text-gray-400 text-sm">{player.team}</p>
                    <div className="flex items-center justify-center space-x-2 mt-2">
                      <span className="text-2xl">{player.flag}</span>
                      <span className="text-teal-400 font-bold text-lg">{player.goals} goles</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Quick Access */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-8">Acceso Rápido</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/competitions">
              <Card className="bg-gradient-to-br from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 transition-all cursor-pointer">
                <CardContent className="p-8 text-center">
                  <Trophy className="h-16 w-16 text-white mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Competiciones</h3>
                  <p className="text-teal-100">Explora todas las temporadas</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/teams">
              <Card className="bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 transition-all cursor-pointer border border-white/20">
                <CardContent className="p-8 text-center">
                  <Users className="h-16 w-16 text-white mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Equipos</h3>
                  <p className="text-gray-300">Conoce a los equipos</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/gallery">
              <Card className="bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 transition-all cursor-pointer border border-teal-500/20">
                <CardContent className="p-8 text-center">
                  <Play className="h-16 w-16 text-teal-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Galería</h3>
                  <p className="text-gray-300">Videos y highlights</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

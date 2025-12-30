import dbConnect from "@/lib/db/mongoose"
import EloPlayerModel from "@/lib/models/EloPlayer"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, TrendingUp } from "lucide-react"

type EloPlayerRow = {
  playerId: string
  nickname?: string
  discordId?: string
  elo: number
  wins: number
  losses: number
  streaks: number
}

type EloSeasonRow = {
  seasonId: string
  name?: string
  status?: string
}

type EloPlayerSeasonRow = {
  playerId: string
  discordId?: string
  elo: number
  wins: number
  losses: number
  streaks: number
}

export default async function EloPage() {
  const mongoose = await dbConnect()
  const db = mongoose.connection.db

  if (!db) {
    throw new Error("Database connection not initialized")
  }

  const activeSeason = await db
    .collection("eloseasons")
    .findOne({ status: "active" }) as EloSeasonRow | null

  let ranked: Array<{
    playerId: string
    displayName: string
    elo: number
    wins: number
    losses: number
    streaks: number
  }> = []

  let usingSeason = false

  if (activeSeason?.seasonId) {
    const seasonPlayers = await db
      .collection("eloplayerseasons")
      .find({ seasonId: activeSeason.seasonId })
      .sort({ elo: -1 })
      .limit(50)
      .toArray() as EloPlayerSeasonRow[]

    if (seasonPlayers.length) {
      const discordIds = seasonPlayers
        .map((player) => player.discordId)
        .filter((id): id is string => Boolean(id))
      const playerDocs = discordIds.length
        ? await EloPlayerModel.find({ discordId: { $in: discordIds } }).lean<EloPlayerRow[]>()
        : []
      const playerByDiscord = new Map(
        playerDocs.map((player) => [player.discordId, player])
      )

      ranked = seasonPlayers.map((player) => {
        const info = player.discordId ? playerByDiscord.get(player.discordId) : undefined
        const displayName = info?.nickname?.trim()
          || info?.playerId
          || player.playerId
        return {
          playerId: player.playerId,
          displayName,
          elo: Number(player.elo) || 0,
          wins: Number(player.wins) || 0,
          losses: Number(player.losses) || 0,
          streaks: Number(player.streaks) || 0,
        }
      })
      usingSeason = true
    }
  }

  if (!ranked.length) {
    const players = await EloPlayerModel.find({})
      .sort({ elo: -1 })
      .limit(50)
      .lean<EloPlayerRow[]>()

    ranked = players.map((player) => ({
      playerId: player.playerId,
      displayName: player.nickname?.trim() || player.playerId,
      elo: Number(player.elo) || 0,
      wins: Number(player.wins) || 0,
      losses: Number(player.losses) || 0,
      streaks: Number(player.streaks) || 0,
    }))
  }

  const seasonLabel = usingSeason
    ? activeSeason?.name
      ? `Season: ${activeSeason.name}`
      : `Season ID: ${activeSeason?.seasonId}`
    : "Season data unavailable - showing overall Elo."

  const eloRanked = [...ranked].sort((a, b) => b.elo - a.elo)
  const matchesRanked = [...ranked].sort((a, b) => {
    const matchesA = a.wins + a.losses
    const matchesB = b.wins + b.losses
    if (matchesB !== matchesA) return matchesB - matchesA
    return b.elo - a.elo
  })
  const winRateRanked = [...ranked].sort((a, b) => {
    const matchesA = a.wins + a.losses
    const matchesB = b.wins + b.losses
    const rateA = matchesA ? a.wins / matchesA : 0
    const rateB = matchesB ? b.wins / matchesB : 0
    if (rateB !== rateA) return rateB - rateA
    return matchesB - matchesA
  })

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-6 pt-0 pb-12 space-y-10">
        <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-900/30 p-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-slate-900/60 px-4 py-2 text-xs uppercase tracking-[0.3em] text-teal-200">
            <TrendingUp className="h-4 w-4" />
            Elo Rankings
          </div>
          <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Current Season Elo</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">
            Top players by Elo for the current season.
          </p>
          <div className="mt-4 text-xs text-slate-400">
            {seasonLabel}
          </div>
        </section>

        <Card className="border-slate-800 bg-slate-900/70">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Leaderboard</p>
                <h2 className="mt-2 text-2xl font-semibold">Top Elo Players</h2>
              </div>
              <Trophy className="h-6 w-6 text-teal-300" />
            </div>
            <Tabs defaultValue="elo" className="mt-6">
              <TabsList className="bg-slate-900/60 text-slate-300">
                <TabsTrigger value="elo" className="data-[state=active]:bg-slate-800/80 data-[state=active]:text-white">
                  Elo Ranking
                </TabsTrigger>
                <TabsTrigger value="matches" className="data-[state=active]:bg-slate-800/80 data-[state=active]:text-white">
                  Most Matches
                </TabsTrigger>
                <TabsTrigger value="winrate" className="data-[state=active]:bg-slate-800/80 data-[state=active]:text-white">
                  Win Rate
                </TabsTrigger>
              </TabsList>
              <TabsContent value="elo">
                <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-2">
                  {eloRanked.map((player, index) => (
                    <div
                      key={player.playerId}
                      className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-teal-500/20 text-teal-200 flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-white font-medium">{player.displayName}</p>
                          <p className="text-xs text-slate-400">
                            {player.wins}W / {player.losses}L - Streak {player.streaks}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-teal-500/10 px-3 py-1 text-xs text-teal-200">
                        Elo {player.elo}
                      </span>
                    </div>
                  ))}
                  {!eloRanked.length && (
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-6 text-center text-slate-400">
                      No Elo data available yet.
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="matches">
                <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-2">
                  {matchesRanked.map((player, index) => {
                    const matchesPlayed = player.wins + player.losses
                    return (
                      <div
                        key={player.playerId}
                        className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-teal-500/20 text-teal-200 flex items-center justify-center text-sm font-semibold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-white font-medium">{player.displayName}</p>
                            <p className="text-xs text-slate-400">
                              W {player.wins} / D {player.losses}
                            </p>
                          </div>
                        </div>
                        <span className="rounded-full bg-teal-500/10 px-3 py-1 text-xs text-teal-200">
                          Matches {matchesPlayed}
                        </span>
                      </div>
                    )
                  })}
                  {!matchesRanked.length && (
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-6 text-center text-slate-400">
                      No match data available yet.
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="winrate">
                <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-2">
                  {winRateRanked.map((player, index) => {
                    const matchesPlayed = player.wins + player.losses
                    const rate = matchesPlayed ? (player.wins / matchesPlayed) * 100 : 0
                    return (
                      <div
                        key={player.playerId}
                        className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-teal-500/20 text-teal-200 flex items-center justify-center text-sm font-semibold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-white font-medium">{player.displayName}</p>
                            <p className="text-xs text-slate-400">
                              {player.wins}W / {matchesPlayed}T
                            </p>
                          </div>
                        </div>
                        <span className="rounded-full bg-teal-500/10 px-3 py-1 text-xs text-teal-200">
                          {rate.toFixed(1)}%
                        </span>
                      </div>
                    )
                  })}
                  {!winRateRanked.length && (
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-6 text-center text-slate-400">
                      No match data available yet.
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

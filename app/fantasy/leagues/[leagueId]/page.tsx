import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { Coins, Crown, Users } from "lucide-react"
import { authOptions, syncDiscordUser } from "@/lib/auth"
import FantasyMarketBoard from "@/components/fantasy/fantasy-market-board"
import FantasyOpenRosterBoard from "@/components/fantasy/fantasy-open-roster-board"
import FantasyRosterBoard from "@/components/fantasy/fantasy-roster-board"
import FantasyLeagueHome from "@/components/fantasy/fantasy-league-home"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getFantasyLeagueDetail } from "@/lib/services/fantasy.service"

type FantasyLeagueDetailPageProps = {
  params: Promise<{ leagueId: string }>
}

export default async function FantasyLeagueDetailPage({ params }: FantasyLeagueDetailPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.discordId) {
    redirect("/api/auth/signin/discord?callbackUrl=/fantasy/leagues")
  }

  await syncDiscordUser(session.user.discordId, session.user.image ?? null)
  const { leagueId } = await params
  const league = await getFantasyLeagueDetail(session.user.discordId, leagueId)

  if (!league) {
    notFound()
  }

  const getPositionClassName = (position: number) => {
    if (position === 1) return "text-amber-300"
    if (position === 2) return "text-slate-300"
    if (position === 3) return "text-orange-400"
    return "text-white"
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <section className="rounded-[36px] border border-white/10 bg-gradient-to-r from-slate-900 via-slate-900 to-fuchsia-950/60 p-6 shadow-[0_25px_80px_rgba(3,10,24,0.45)] sm:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.45em] text-slate-400">Fantasy league</div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{league.name}</h1>
              <p className="mt-4 text-lg text-slate-300">
                {league.teamName} · {league.role === "owner" ? "Owner" : "Member"} · Season {league.season?.name ?? "-"}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Invite code</div>
                <div className="mt-3 text-2xl font-semibold text-white">{league.inviteCode}</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Members</div>
                <div className="mt-3 text-2xl font-semibold text-white">{league.memberCount}</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                <div className="text-xs uppercase tracking-[0.35em] text-slate-500">FFL Coins</div>
                <div className="mt-3 text-2xl font-semibold text-white">{league.budgetRemaining}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <Tabs defaultValue="home" className="gap-6">
            <TabsList className="h-auto w-full justify-start rounded-2xl border border-white/10 bg-slate-900/60 p-2">
              <TabsTrigger value="home" className="rounded-xl px-5 py-3 data-[state=active]:bg-slate-950 data-[state=active]:text-white">
                Home
              </TabsTrigger>
              <TabsTrigger value="market" className="rounded-xl px-5 py-3 data-[state=active]:bg-slate-950 data-[state=active]:text-white">
                Market
              </TabsTrigger>
              <TabsTrigger value="team" className="rounded-xl px-5 py-3 data-[state=active]:bg-slate-950 data-[state=active]:text-white">
                Team
              </TabsTrigger>
              <TabsTrigger value="table" className="rounded-xl px-5 py-3 data-[state=active]:bg-slate-950 data-[state=active]:text-white">
                Table
              </TabsTrigger>
            </TabsList>

            <TabsContent value="home">
              <FantasyLeagueHome
                defaultWeek={league.home.defaultWeek}
                weeks={league.home.weeks}
                activity={league.home.activity}
              />
            </TabsContent>

            <TabsContent value="market">
              <div className="rounded-[30px] border border-white/10 bg-slate-900/60 p-6 text-white">
                <div className="mb-5 flex items-center gap-2 text-2xl font-semibold">
                  <Coins className="h-6 w-6 text-amber-300" />
                  Market
                </div>
                {league.teamView.mode === "open" ? (
                  <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-sm text-slate-300">
                    This league uses the open weekly lineup format. There is no transfer market, no clauses and no budget race.
                  </div>
                ) : league.market?.listings?.length ? (
                  <FantasyMarketBoard leagueId={league.id} listings={league.market.listings} />
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-sm text-slate-300">
                    No market is available for this league today.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="team">
              {league.teamView.mode === "open" ? (
                <FantasyOpenRosterBoard
                  leagueId={league.id}
                  currentWeek={league.teamView.currentWeek}
                  weeks={league.teamView.weeks}
                  availablePlayers={league.teamView.availablePlayers}
                />
              ) : (
                <FantasyRosterBoard leagueId={league.id} currentWeek={league.teamView.currentWeek} weeks={league.teamView.weeks} />
              )}
            </TabsContent>

            <TabsContent value="table">
              <Card className="border-white/10 bg-slate-900/60 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Users className="h-6 w-6 text-sky-300" />
                    League ranking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden rounded-2xl border border-white/10">
                    <div className="grid grid-cols-[80px_1fr_140px] gap-4 border-b border-white/10 bg-slate-950/70 px-4 py-3 text-xs uppercase tracking-[0.3em] text-slate-500">
                      <span>Pos</span>
                      <span>Team</span>
                      <span className="text-right">Points</span>
                    </div>
                    {league.standings.map((entry, index) => (
                      <div
                        key={entry.userId}
                        className="grid grid-cols-[80px_1fr_140px] gap-4 border-b border-white/10 bg-slate-900/40 px-4 py-4 last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-5 text-center text-xl font-semibold ${getPositionClassName(index + 1)}`}>
                            {index + 1}
                          </span>
                          <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-slate-950/70">
                            {entry.discordAvatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={entry.discordAvatar || (entry.discordId === session.user.discordId ? session.user.image ?? "" : "")}
                                alt={entry.teamName}
                                className="h-full w-full rounded-full object-cover"
                              />
                            ) : entry.discordId === session.user.discordId && session.user.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={session.user.image}
                                alt={entry.teamName}
                                className="h-full w-full rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-semibold text-white">
                                {entry.teamName.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold text-white">{entry.teamName}</div>
                          <div className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                            {entry.role === "owner" ? (
                              <span className="rounded-full border border-amber-300/30 bg-amber-400 p-1 text-slate-950">
                                <Crown className="h-3 w-3" />
                              </span>
                            ) : null}
                            <span>{entry.playerName ?? "Perfil sin jugador vinculado"}</span>
                          </div>
                        </div>
                        <span className="text-right text-lg font-semibold text-white">{entry.points}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  )
}

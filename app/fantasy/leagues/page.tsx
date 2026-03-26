import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { ArrowRight, Coins, Users } from "lucide-react"
import { authOptions } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getFantasyDashboardData } from "@/lib/services/fantasy.service"

type FantasyLeaguesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

export default async function FantasyLeaguesPage({ searchParams }: FantasyLeaguesPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.discordId) {
    redirect("/api/auth/signin/discord?callbackUrl=/fantasy/leagues")
  }

  const resolvedSearchParams = (await searchParams) ?? {}
  const created = readParam(resolvedSearchParams, "created")
  const joined = readParam(resolvedSearchParams, "joined")
  const error = readParam(resolvedSearchParams, "error")
  const dashboard = await getFantasyDashboardData(session.user.discordId)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <section className="rounded-[36px] border border-white/10 bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/60 p-6 shadow-[0_25px_80px_rgba(3,10,24,0.45)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.45em] text-slate-400">My leagues</div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Tus ligas fantasy</h1>
              <p className="mt-4 max-w-3xl text-lg text-slate-300">
                Entra a cada liga para revisar tu plantilla, presupuesto, clausulas y futuras opciones de mercado.
              </p>
            </div>
            <Button asChild className="bg-sky-400 text-slate-950 hover:bg-sky-300">
              <Link href="/fantasy/hub">Crear o unirse</Link>
            </Button>
          </div>
        </section>

        <div className="mt-8 grid gap-4">
          {error ? (
            <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
              {error}
            </div>
          ) : null}
          {created ? (
            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
              Liga creada. Invite code: <span className="font-semibold">{created}</span>
            </div>
          ) : null}
          {joined ? (
            <div className="rounded-3xl border border-sky-400/20 bg-sky-500/10 px-5 py-4 text-sm text-sky-100">
              Te has unido a la liga con codigo <span className="font-semibold">{joined}</span>.
            </div>
          ) : null}
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          {dashboard.leagues.length ? dashboard.leagues.map((league) => (
            <Card key={league.id} className="border-white/10 bg-slate-900/60 text-white">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl">{league.name}</CardTitle>
                    <CardDescription className="mt-2 text-slate-400">
                      {league.teamName} · {league.role === "owner" ? "Owner" : "Member"}
                    </CardDescription>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-right">
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Invite</div>
                    <div className="mt-1 text-lg font-semibold text-white">{league.inviteCode}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500">
                      <Users className="h-3.5 w-3.5" />
                      Members
                    </div>
                    <div className="mt-2 text-lg font-semibold">{league.memberCount}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500">
                      <Coins className="h-3.5 w-3.5" />
                      Budget
                    </div>
                    <div className="mt-2 text-lg font-semibold">{league.budgetRemaining}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Roster</div>
                    <div className="mt-2 text-lg font-semibold">{league.roster.length}/{league.squadSize}</div>
                  </div>
                </div>

                <Button asChild variant="outline" className="w-full justify-between border-white/10 bg-white/5 text-white hover:bg-white/10">
                  <Link href={`/fantasy/leagues/${league.id}`}>
                    Ver liga y plantilla
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )) : (
            <Card className="border-dashed border-white/10 bg-slate-900/40 text-white lg:col-span-2">
              <CardContent className="py-12 text-center text-slate-300">
                Aun no estas en ninguna liga fantasy. Entra al hub para crear una o unirte por invite code.
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  )
}

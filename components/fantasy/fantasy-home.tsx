"use client"

import { FormEvent, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ShieldPlus, Ticket, Trash2, X } from "lucide-react"
import { createFantasyLeagueAction, deleteFantasyLeagueAction, joinFantasyLeagueAction } from "@/app/fantasy/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type LeagueOption = {
  id: string
  name: string
  teamName: string
  role: "owner" | "member"
  leagueType: "market" | "open"
}

type CompetitionOption = {
  id: string
  competitionId: string
  name: string
  season: number
  division: number | null
}

type FantasyHomeProps = {
  created?: string
  joined?: string
  error?: string
  leagues: LeagueOption[]
  competitions: CompetitionOption[]
}

type ModalType = "create" | "join" | null

export function FantasyHome({ created, joined, error, leagues, competitions }: FantasyHomeProps) {
  const router = useRouter()
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [leaguePendingDelete, setLeaguePendingDelete] = useState<LeagueOption | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleCreateLeague(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLocalError(null)

    const formData = new FormData(event.currentTarget)
    const result = await createFantasyLeagueAction(formData)

    if (!result.ok) {
      if (result.requiresAuth) {
        router.push("/api/auth/signin/discord?callbackUrl=/fantasy")
        return
      }

      setLocalError(result.error)
      return
    }

    setActiveModal(null)
    router.push(`/fantasy?created=${result.inviteCode}`)
    router.refresh()
  }

  async function handleJoinLeague(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLocalError(null)

    const formData = new FormData(event.currentTarget)
    const result = await joinFantasyLeagueAction(formData)

    if (!result.ok) {
      if (result.requiresAuth) {
        router.push("/api/auth/signin/discord?callbackUrl=/fantasy")
        return
      }

      setLocalError(result.error)
      return
    }

    setActiveModal(null)
    router.push(`/fantasy?joined=${result.inviteCode}`)
    router.refresh()
  }

  async function handleDeleteLeague(leagueId: string) {
    setLocalError(null)

    const result = await deleteFantasyLeagueAction(leagueId)

    if (!result.ok) {
      if (result.requiresAuth) {
        router.push("/api/auth/signin/discord?callbackUrl=/fantasy")
        return
      }

      setLocalError(result.error)
      return
    }

    router.push("/fantasy")
    router.refresh()
    setLeaguePendingDelete(null)
  }

  return (
    <>
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <section className="rounded-[36px] border border-white/10 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/60 p-8 shadow-[0_25px_80px_rgba(3,10,24,0.45)]">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">FFL Fantasy</h1>
            <p className="mt-4 max-w-3xl text-lg text-slate-300">
              Tu punto de entrada al modo fantasy. Crea una liga privada, unete por invite code y
              accede a tus plantillas sin salir de aqui.
            </p>
          </section>

          <div className="mt-8 grid gap-4">
            {error || localError ? (
              <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
                {localError ?? error}
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
            <Card className="border-white/10 bg-slate-900/60 text-white">
              <CardHeader>
                <CardTitle className="text-2xl">League actions</CardTitle>
                <CardDescription className="text-slate-400">
                  Abre un popup para crear una liga nueva o entrar en otra existente.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  onClick={() => setActiveModal("create")}
                  className="h-12 justify-center bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                >
                  <ShieldPlus className="h-4 w-4" />
                  Create League
                </Button>
                <Button
                  type="button"
                  onClick={() => setActiveModal("join")}
                  variant="outline"
                  className="h-12 justify-center border-sky-400/30 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20"
                >
                  <Ticket className="h-4 w-4" />
                  Join League
                </Button>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-slate-900/60 text-white">
              <CardHeader>
                <CardTitle className="text-2xl">My leagues</CardTitle>
                <CardDescription className="text-slate-400">
                  Pulsa sobre una de tus ligas para entrar directamente a su plantilla.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {leagues.length ? leagues.map((league) => (
                    <div
                      key={league.id}
                      className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 transition hover:border-emerald-400/30 hover:bg-white/5"
                    >
                  <div className="flex items-start justify-between gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            startTransition(() => {
                              router.push(`/fantasy/leagues/${league.id}`)
                            })
                          }}
                          disabled={isPending}
                          className="flex-1 text-left disabled:opacity-60"
                        >
                          <div className="font-semibold text-white">{league.name}</div>
                          <div className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                            <span>{league.teamName}</span>
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                              {league.leagueType === "open" ? "Open Lineup" : "Transfer Market"}
                            </span>
                          </div>
                        </button>
                        {league.role === "owner" ? (
                          <button
                            type="button"
                            onClick={() => setLeaguePendingDelete(league)}
                            className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-2 text-rose-200 transition hover:bg-rose-500/20 hover:text-white"
                            aria-label={`Borrar liga ${league.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/70 px-4 py-4 text-sm text-slate-400">
                      No tienes ligas disponibles.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>

      {activeModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-900 p-6 shadow-[0_25px_80px_rgba(3,10,24,0.6)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Fantasy</div>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {activeModal === "create" ? "Create League" : "Join League"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null)
                  setLocalError(null)
                }}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Cerrar popup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {activeModal === "create" ? (
              <form onSubmit={handleCreateLeague} className="mt-6 grid gap-3">
                <Input
                  name="leagueName"
                  required
                  placeholder="Nombre de la liga fantasy"
                  className="border-white/10 bg-slate-950/70 text-white"
                />
                <select
                  name="leagueType"
                  defaultValue="market"
                  className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 text-white outline-none transition focus:border-emerald-400/40"
                >
                  <option value="market">Transfer Market · Budget, market and clauses</option>
                  <option value="open">Open Lineup · Weekly free picks with repeated players across managers</option>
                </select>
                <select
                  name="competitionObjectId"
                  required
                  defaultValue={competitions[0]?.id ?? ""}
                  className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 text-white outline-none transition focus:border-emerald-400/40"
                >
                  {competitions.length ? competitions.map((competition) => (
                    <option key={competition.id} value={competition.id}>
                      {competition.name} · Season {competition.season}{competition.division ? ` · Division ${competition.division}` : ""}
                    </option>
                  )) : (
                    <option value="">No hay competitions league disponibles</option>
                  )}
                </select>
                <Input
                  name="teamName"
                  placeholder="Nombre de tu equipo (opcional)"
                  className="border-white/10 bg-slate-950/70 text-white"
                />
                <Button
                  type="submit"
                  disabled={isPending || !competitions.length}
                  className="mt-2 h-11 justify-center bg-emerald-400 text-slate-950 hover:bg-emerald-300 disabled:bg-emerald-400/40"
                >
                  Crear liga
                </Button>
              </form>
            ) : (
              <form onSubmit={handleJoinLeague} className="mt-6 grid gap-3">
                <Input
                  name="inviteCode"
                  required
                  placeholder="Invite code"
                  className="border-white/10 bg-slate-950/70 text-white uppercase"
                />
                <Input
                  name="teamName"
                  placeholder="Nombre de tu equipo (opcional)"
                  className="border-white/10 bg-slate-950/70 text-white"
                />
                <Button type="submit" disabled={isPending} className="mt-2 h-11 justify-center bg-sky-400 text-slate-950 hover:bg-sky-300 disabled:bg-sky-400/40">
                  Unirse a liga
                </Button>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {leaguePendingDelete ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-900 p-6 shadow-[0_25px_80px_rgba(3,10,24,0.6)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Delete league</div>
                <h2 className="mt-2 text-2xl font-semibold text-white">Confirmar borrado</h2>
              </div>
              <button
                type="button"
                onClick={() => setLeaguePendingDelete(null)}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Cerrar popup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-6 text-sm leading-6 text-slate-300">
              Vas a borrar la liga <span className="font-semibold text-white">{leaguePendingDelete.name}</span>.
              Esta accion eliminara la liga y todos sus datos fantasy asociados.
            </p>

            <div className="mt-6 flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLeaguePendingDelete(null)}
                className="flex-1 border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => void handleDeleteLeague(leaguePendingDelete.id)}
                className="flex-1 bg-rose-500 text-white hover:bg-rose-400"
              >
                Borrar liga
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

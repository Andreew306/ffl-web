"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { BadgeDollarSign, ChevronDown, ChevronLeft, ChevronRight, Target } from "lucide-react"
import { cn } from "@/lib/utils"

type BetBallMatchCard = {
  id: string
  matchId: number
  date: string
  team1Name: string
  team1Image?: string
  team2Name: string
  team2Image?: string
}

type BetBallWeek = {
  week: number
  label: string
  matchdays: Array<{
    label: string
    matchday: number | null
    matches: BetBallMatchCard[]
  }>
}

type BetBallCompetition = {
  id: string
  label: string
  weeks: BetBallWeek[]
}

type BetBallSlipSelection = {
  id: string
  token: string
  label: string
  description: string
  odds: number
}

type BetBallUserSlip = {
  id: string
  matchId: string
  matchLabel: string
  competitionLabel: string
  kickoffAt: string
  selectionCount: number
  stake: number
  combinedOdds: number
  potentialReturn: number
  payout: number
  status: "pending" | "won" | "lost" | "void"
  selections: BetBallSlipSelection[]
}

type BetBallHomeProps = {
  competitions: BetBallCompetition[]
  fflCoins: number
  myBets: BetBallUserSlip[]
  initialTab: "fixtures" | "my-bets"
  createdSlipId?: string
}

function formatMatchDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return "Date TBD"
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(parsed)
}

function FflCoin({ value }: { value: number }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-[22px] border border-cyan-300/20 bg-[radial-gradient(circle_at_30%_30%,rgba(34,211,238,0.22),transparent_40%),linear-gradient(135deg,#11253a_0%,#0a1220_55%,#0c1d2c_100%)] px-4 py-3 shadow-[0_16px_40px_rgba(2,6,23,0.34)]">
      <div className="relative h-10 w-10 rounded-full bg-slate-950/80 ring-1 ring-white/10">
        <Image
          src="/ffl-logo2.png"
          alt="FFL Coin"
          fill
          sizes="40px"
          className="object-contain invert"
        />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-[0.26em] text-cyan-100/70">FFL Coin</div>
        <div className="mt-1 text-lg font-semibold text-white">{value.toLocaleString("en-GB")}</div>
      </div>
    </div>
  )
}

export function BetBallHome({ competitions, fflCoins, myBets, initialTab, createdSlipId }: BetBallHomeProps) {
  const [selectedCompetitionId, setSelectedCompetitionId] = useState(competitions[0]?.id ?? "")
  const [selectedWeek, setSelectedWeek] = useState<number>(competitions[0]?.weeks[0]?.week ?? 1)
  const [activeTab, setActiveTab] = useState<"fixtures" | "my-bets">(initialTab)

  const selectedCompetition = useMemo(
    () => competitions.find((competition) => competition.id === selectedCompetitionId) ?? competitions[0] ?? null,
    [competitions, selectedCompetitionId]
  )

  useEffect(() => {
    if (!selectedCompetition) return
    if (!selectedCompetition.weeks.some((week) => week.week === selectedWeek)) {
      setSelectedWeek(selectedCompetition.weeks[0]?.week ?? 1)
    }
  }, [selectedCompetition, selectedWeek])

  const currentWeek = selectedCompetition?.weeks.find((week) => week.week === selectedWeek) ?? selectedCompetition?.weeks[0] ?? null
  const currentWeekIndex = selectedCompetition?.weeks.findIndex((week) => week.week === selectedWeek) ?? -1
  const hasPreviousWeek = currentWeekIndex > 0
  const hasNextWeek = currentWeekIndex >= 0 && selectedCompetition ? currentWeekIndex < selectedCompetition.weeks.length - 1 : false

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(8,47,73,0.72))] p-4 shadow-[0_22px_70px_rgba(3,10,24,0.42)] sm:p-5">
          <div className="flex flex-col gap-4 rounded-[24px] border border-white/10 bg-slate-950/35 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-400/20 bg-slate-950/80 shadow-[0_12px_30px_rgba(2,6,23,0.38)]">
                <BadgeDollarSign className="h-6 w-6 text-sky-200" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.35em] text-sky-200/75">Minigame</div>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">BetBall</h1>
              </div>
            </div>

            {selectedCompetition ? (
              <div className="grid w-full gap-3 lg:max-w-4xl lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="relative">
                  <select
                    value={selectedCompetitionId}
                    onChange={(event) => setSelectedCompetitionId(event.target.value)}
                    className="h-14 w-full appearance-none rounded-[20px] border border-white/10 bg-slate-950/80 px-5 pr-14 text-base font-semibold text-white outline-none transition focus:border-sky-400/40 focus:shadow-[0_0_0_1px_rgba(56,189,248,0.18)]"
                  >
                    {competitions.map((competition) => (
                      <option key={competition.id} value={competition.id}>
                        {competition.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                </div>

                <div className="flex justify-start lg:justify-end">
                  <FflCoin value={fflCoins} />
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {selectedCompetition ? (
          <section className="mt-8">
            <div className="rounded-[30px] border border-white/10 bg-slate-900/60 p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  {([
                    { key: "fixtures", label: "Fixtures" },
                    { key: "my-bets", label: "My Bets" },
                  ] as const).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setActiveTab(item.key)}
                      className={cn(
                        "rounded-2xl border px-4 py-2 text-sm font-medium transition",
                        activeTab === item.key
                          ? "border-cyan-300/30 bg-cyan-400/10 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.18)]"
                          : "border-white/10 bg-slate-950/50 text-slate-300 hover:border-white/20 hover:text-white"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                {createdSlipId ? (
                  <div className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">
                    Slip created: {createdSlipId}
                  </div>
                ) : null}
              </div>

              {activeTab === "fixtures" ? (
                <>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Week board</div>
                  <h2 className="mt-2 text-3xl font-semibold text-white">{currentWeek?.label ?? "No week selected"}</h2>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/60 p-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedCompetition && hasPreviousWeek) {
                          setSelectedWeek(selectedCompetition.weeks[currentWeekIndex - 1].week)
                        }
                      }}
                      disabled={!hasPreviousWeek}
                      className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label="Previous week"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="min-w-[8rem] px-3 text-center text-sm font-semibold text-white">
                      {currentWeek?.label ?? "Week -"}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedCompetition && hasNextWeek) {
                          setSelectedWeek(selectedCompetition.weeks[currentWeekIndex + 1].week)
                        }
                      }}
                      disabled={!hasNextWeek}
                      className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label="Next week"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-emerald-200">
                    <Target className="h-4 w-4" />
                    1X2 odds
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                {currentWeek?.matchdays.map((matchday) => (
                  <div key={matchday.label} className="rounded-[24px] border border-white/10 bg-slate-950/60 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">{matchday.label}</div>
                      <div className="text-xs uppercase tracking-[0.25em] text-slate-500">{matchday.matches.length} matches</div>
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-2">
                      {matchday.matches.map((match) => (
                        <Link
                          key={match.id}
                          href={`/betball/matches/${match.id}`}
                          className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5 text-left transition hover:border-sky-400/30 hover:bg-slate-900"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">{formatMatchDate(match.date)}</div>
                            <div className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs font-semibold text-slate-300">
                              Match #{match.matchId}
                            </div>
                          </div>

                          <div className="mt-6 grid grid-cols-2 items-center gap-8">
                            <div className="flex flex-col items-center gap-4 text-center">
                              <div className="flex h-24 w-24 items-center justify-center">
                                {match.team1Image ? (
                                  <Image src={match.team1Image} alt={match.team1Name} width={76} height={76} className="h-20 w-20 object-contain" />
                                ) : (
                                  <span className="text-xl font-semibold text-slate-300">{match.team1Name.slice(0, 2).toUpperCase()}</span>
                                )}
                              </div>
                              <div className="text-lg font-semibold text-white">{match.team1Name}</div>
                            </div>

                            <div className="flex flex-col items-center gap-4 text-center">
                              <div className="flex h-24 w-24 items-center justify-center">
                                {match.team2Image ? (
                                  <Image src={match.team2Image} alt={match.team2Name} width={76} height={76} className="h-20 w-20 object-contain" />
                                ) : (
                                  <span className="text-xl font-semibold text-slate-300">{match.team2Name.slice(0, 2).toUpperCase()}</span>
                                )}
                              </div>
                              <div className="text-lg font-semibold text-white">{match.team2Name}</div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}

                {!currentWeek?.matchdays.length ? (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-slate-950/60 px-4 py-8 text-center text-slate-400">
                    No matchdays available for this week yet.
                  </div>
                ) : null}
              </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.35em] text-slate-500">History</div>
                    <h2 className="mt-2 text-3xl font-semibold text-white">My Bets</h2>
                  </div>
                  {myBets.length ? (
                    myBets.map((bet) => (
                      <div key={bet.id} className="rounded-[24px] border border-white/10 bg-slate-950/60 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="text-xs uppercase tracking-[0.28em] text-slate-500">{bet.competitionLabel}</div>
                            <div className="mt-2 text-xl font-semibold text-white">{bet.matchLabel}</div>
                            <div className="mt-2 text-sm text-slate-400">
                              {bet.kickoffAt ? formatMatchDate(bet.kickoffAt) : "Date TBD"} · {bet.selectionCount} selection{bet.selectionCount !== 1 ? "s" : ""}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
                                bet.status === "pending" && "border-amber-300/25 bg-amber-500/10 text-amber-100",
                                bet.status === "won" && "border-emerald-300/25 bg-emerald-500/10 text-emerald-100",
                                bet.status === "lost" && "border-rose-300/25 bg-rose-500/10 text-rose-100",
                                bet.status === "void" && "border-slate-300/20 bg-white/5 text-slate-200"
                              )}
                            >
                              {bet.status}
                            </span>
                            <Link
                              href={`/betball/matches/${bet.matchId}`}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
                            >
                              Open match
                            </Link>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-4">
                          <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
                            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Stake</div>
                            <div className="mt-2 text-2xl font-semibold text-white">{bet.stake.toFixed(2)}</div>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
                            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Odds</div>
                            <div className="mt-2 text-2xl font-semibold text-cyan-100">{bet.combinedOdds.toFixed(2)}</div>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
                            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Potential return</div>
                            <div className="mt-2 text-2xl font-semibold text-white">{bet.potentialReturn.toFixed(2)}</div>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
                            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Payout</div>
                            <div className="mt-2 text-2xl font-semibold text-white">{bet.payout.toFixed(2)}</div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3">
                          {bet.selections.map((selection) => (
                            <div key={`${bet.id}-${selection.id}`} className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-xs uppercase tracking-[0.24em] text-slate-500">{selection.token}</div>
                                  <div className="mt-1 text-base font-semibold text-white">{selection.label}</div>
                                  <div className="mt-1 text-sm text-slate-400">{selection.description}</div>
                                </div>
                                <div className="text-xl font-semibold text-cyan-100">{selection.odds.toFixed(2)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-white/10 bg-slate-950/60 px-4 py-8 text-center text-slate-400">
                      You have no bets yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        ) : (
          <div className="mt-8 rounded-[30px] border border-dashed border-white/10 bg-slate-900/60 px-6 py-10 text-center text-slate-400">
            No league competitions available for BetBall yet.
          </div>
        )}
      </div>
    </div>
  )
}

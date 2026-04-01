"use client"

import { useMemo, useState } from "react"
import { CalendarDays, ChevronDown, Repeat, ShoppingBag } from "lucide-react"

type HomeWeek = {
  week: number
  label: string
  matches: Array<{
    id: string
    matchId: number
    date: string
    team1Name: string
    team1Image?: string
    team2Name: string
    team2Image?: string
    scoreTeam1: number
    scoreTeam2: number
  }>
}

type ActivityItem = {
  id: string
  type: "purchase" | "sale" | "auto_sale" | "clause_up"
  title: string
  subtitle: string
  amount: number
  date: string
}

type FantasyLeagueHomeProps = {
  defaultWeek: number
  weeks: HomeWeek[]
  activity: ActivityItem[]
}

function formatDateTime(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return "Date TBD"
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed)
}

function formatMatchScore(home: number, away: number) {
  if (home === 0 && away === 0) {
    return "-"
  }
  return `${home} - ${away}`
}

function ActivityIcon({ type }: { type: ActivityItem["type"] }) {
  if (type === "clause_up") {
    return <Repeat className="h-4 w-4 text-sky-300" />
  }

  return <ShoppingBag className="h-4 w-4 text-emerald-300" />
}

function TeamBadge({ image, name, reverse = false }: { image?: string; name: string; reverse?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${reverse ? "flex-row-reverse justify-end text-right" : ""}`}>
      <div className="flex h-10 w-10 items-center justify-center overflow-hidden">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-semibold text-white">{name.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <span className="text-sm font-semibold text-white">{name}</span>
    </div>
  )
}

export default function FantasyLeagueHome({ defaultWeek, weeks, activity }: FantasyLeagueHomeProps) {
  const [selectedWeek, setSelectedWeek] = useState(defaultWeek)
  const [activityPage, setActivityPage] = useState(1)
  const pageSize = 7

  const selectedWeekData = useMemo(
    () => weeks.find((entry) => entry.week === selectedWeek) ?? weeks[0] ?? null,
    [selectedWeek, weeks]
  )

  const totalActivityPages = Math.max(1, Math.ceil(activity.length / pageSize))
  const paginatedActivity = useMemo(
    () => activity.slice((activityPage - 1) * pageSize, activityPage * pageSize),
    [activity, activityPage]
  )

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.85fr)]">
      <div className="rounded-[30px] border border-white/10 bg-slate-900/60 p-6 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.38em] text-slate-500">Home</div>
            <h2 className="mt-3 text-3xl font-semibold text-white">Matchdays by week</h2>
          </div>
          <label className="relative inline-flex min-w-[220px] items-center">
            <CalendarDays className="pointer-events-none absolute left-4 h-4 w-4 text-slate-400" />
            <select
              value={selectedWeek}
              onChange={(event) => setSelectedWeek(Number(event.target.value))}
              className="w-full appearance-none rounded-2xl border border-white/10 bg-slate-950/70 py-3 pl-11 pr-12 text-sm font-medium text-white outline-none transition focus:border-cyan-300/40"
            >
              {weeks.map((week) => (
                <option key={week.week} value={week.week}>
                  {week.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 h-4 w-4 text-cyan-200" />
          </label>
        </div>

        <div className="mt-6 space-y-4">
          {selectedWeekData?.matches.length ? (
            selectedWeekData.matches.map((match) => (
              <div
                key={match.id}
                className="rounded-[24px] border border-white/10 bg-slate-950/55 px-5 py-4"
              >
                <div className="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.3em] text-slate-500">
                  <span>Match #{match.matchId}</span>
                  <span>{formatDateTime(match.date)}</span>
                </div>
                <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                  <TeamBadge image={match.team1Image} name={match.team1Name} />
                  <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-2 text-center">
                    <div className="text-2xl font-semibold text-white">
                      {formatMatchScore(match.scoreTeam1, match.scoreTeam2)}
                    </div>
                  </div>
                  <div className="justify-self-end">
                    <TeamBadge image={match.team2Image} name={match.team2Name} reverse />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-sm text-slate-300">
              No matches found for this week.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[30px] border border-white/10 bg-slate-900/60 p-6 text-white">
        <div className="text-xs uppercase tracking-[0.38em] text-slate-500">League activity</div>
        <h2 className="mt-3 text-3xl font-semibold text-white">Transfers</h2>
        <div className="mt-6 space-y-3">
          {activity.length ? (
            paginatedActivity.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 rounded-[22px] border border-white/10 bg-slate-950/55 px-4 py-4"
              >
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-slate-900/80">
                  <ActivityIcon type={entry.type} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-white">{entry.title}</div>
                      <div className="mt-1 text-sm text-slate-400">{entry.subtitle}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-white">{entry.amount}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">
                        {formatDateTime(entry.date)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-sm text-slate-300">
              No transfer activity has been recorded yet.
            </div>
          )}
        </div>
        {activity.length > pageSize ? (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.28em] text-slate-500">
              Page {activityPage} / {totalActivityPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActivityPage((page) => Math.max(1, page - 1))}
                disabled={activityPage === 1}
                className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white transition hover:border-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setActivityPage((page) => Math.min(totalActivityPages, page + 1))}
                disabled={activityPage === totalActivityPages}
                className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white transition hover:border-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

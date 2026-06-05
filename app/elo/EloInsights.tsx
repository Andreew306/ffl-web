"use client"

import type { ReactNode } from "react"
import { useMemo, useRef, useState } from "react"
import { Activity, BarChart3, Crown, LineChart, ShieldCheck, TrendingDown, TrendingUp, Users } from "lucide-react"

type SummaryMetric = {
  label: string
  value: string
  detail: string
}

type DailyPoint = {
  date: string
  label: string
  matches: number
}

type PlayerMetric = {
  playerId: string
  name: string
  value: number
  detail: string
}

type CaptainMetric = {
  discordId: string
  name: string
  matches: number
  wins: number
  draws: number
  winRate: number
  avgBalanceDiff: number | null
}

type MatchQuality = {
  avgBalanceDiff: number | null
  balancedMatches: number
  upsetRate: number | null
  drawRate: number | null
  team1WinRate: number | null
  team2WinRate: number | null
}

type EloInsightsProps = {
  summary: SummaryMetric[]
  dailyActivity: DailyPoint[]
  risers: PlayerMetric[]
  fallers: PlayerMetric[]
  peaks: PlayerMetric[]
  volatile: PlayerMetric[]
  captains: CaptainMetric[]
  matchQuality: MatchQuality
}

const formatPercent = (value: number | null) =>
  value === null ? "-" : `${value.toFixed(1)}%`

export function EloInsights({
  summary,
  dailyActivity,
  risers,
  fallers,
  peaks,
  volatile,
  captains,
  matchQuality,
}: EloInsightsProps) {
  const timelineRef = useRef<HTMLDivElement | null>(null)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    label: string
    matches: number
  } | null>(null)
  const maxMatches = Math.max(1, ...dailyActivity.map((point) => point.matches))
  const dayWidth = 38
  const chartWidth = Math.max(720, dailyActivity.length * dayWidth)
  const chartHeight = 180
  const polyline = dailyActivity
    .map((point, index) => {
      const x = index * dayWidth + dayWidth / 2
      const y = chartHeight - 30 - (point.matches / maxMatches) * 120
      return `${x},${y}`
    })
    .join(" ")

  const showEvery = useMemo(() => {
    if (dailyActivity.length > 240) return 30
    if (dailyActivity.length > 120) return 14
    return 7
  }, [dailyActivity.length])

  function scrollTimeline(position: "start" | "end") {
    const element = timelineRef.current
    if (!element) return
    element.scrollTo({
      left: position === "start" ? 0 : element.scrollWidth,
      behavior: "smooth",
    })
  }

  function showTooltip(event: React.MouseEvent<SVGElement>, point: DailyPoint) {
    const container = timelineRef.current
    if (!container) return
    const bounds = container.getBoundingClientRect()
    setTooltip({
      x: event.clientX - bounds.left + container.scrollLeft,
      y: event.clientY - bounds.top + container.scrollTop,
      label: point.label,
      matches: point.matches,
    })
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
            <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
            <p className="mt-1 text-xs text-slate-400">{item.detail}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-teal-200">
              <Activity className="h-4 w-4" />
              Daily Activity
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-white">Elo match timeline</h2>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => scrollTimeline("start")}
              className="h-9 rounded-xl border border-slate-700 px-3 text-xs font-semibold text-slate-200 transition hover:border-teal-300 hover:text-white"
            >
              Earliest
            </button>
            <button
              type="button"
              onClick={() => scrollTimeline("end")}
              className="h-9 rounded-xl bg-teal-400 px-3 text-xs font-semibold text-slate-950 transition hover:bg-teal-300"
            >
              Latest
            </button>
          </div>
        </div>

        <div
          ref={timelineRef}
          onMouseLeave={() => setTooltip(null)}
          className="relative mt-5 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
        >
          {dailyActivity.length ? (
            <svg width={chartWidth} height={chartHeight} role="img" aria-label="Daily Elo activity timeline">
              <line x1="0" y1={chartHeight - 28} x2={chartWidth} y2={chartHeight - 28} stroke="rgb(51 65 85)" />
              {dailyActivity.map((point, index) => {
                const x = index * dayWidth + 8
                const barHeight = (point.matches / maxMatches) * 110
                const y = chartHeight - 29 - barHeight
                return (
                  <g key={point.date}>
                    <rect
                      x={x}
                      y={y}
                      width="22"
                      height={Math.max(2, barHeight)}
                      rx="5"
                      fill="rgba(45,212,191,0.28)"
                      className="cursor-pointer transition hover:fill-teal-300/70"
                      onMouseMove={(event) => showTooltip(event, point)}
                    />
                    <circle
                      cx={index * dayWidth + dayWidth / 2}
                      cy={chartHeight - 30 - (point.matches / maxMatches) * 120}
                      r="4"
                      fill="rgb(45 212 191)"
                      className="cursor-pointer"
                      onMouseMove={(event) => showTooltip(event, point)}
                    />
                    {index % showEvery === 0 ? (
                      <text x={x - 2} y={chartHeight - 8} fill="rgb(148 163 184)" fontSize="10">
                        {point.label.slice(0, 5)}
                      </text>
                    ) : null}
                  </g>
                )
              })}
              <polyline points={polyline} fill="none" stroke="rgb(45 212 191)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          ) : (
            <div className="py-12 text-center text-sm text-slate-400">No match activity available for this filter.</div>
          )}
          {tooltip ? (
            <div
              className="pointer-events-none absolute z-10 min-w-36 rounded-xl border border-teal-300/30 bg-slate-950 px-3 py-2 text-xs shadow-[0_12px_30px_rgba(2,6,23,0.45)]"
              style={{
                left: Math.min(tooltip.x + 12, chartWidth - 150),
                top: Math.max(tooltip.y - 52, 8),
              }}
            >
              <p className="font-semibold text-white">{tooltip.label}</p>
              <p className="mt-1 text-teal-200">{tooltip.matches} matches played</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <MetricPanel title="Elo Movement" icon={<LineChart className="h-4 w-4" />}>
          <CompactList title="Top risers" items={risers} tone="up" />
          <CompactList title="Biggest fallers" items={fallers} tone="down" />
        </MetricPanel>

        <MetricPanel title="Player Profiles" icon={<BarChart3 className="h-4 w-4" />}>
          <CompactList title="Highest peaks" items={peaks} tone="peak" />
          <CompactList title="Most volatile" items={volatile} tone="neutral" />
        </MetricPanel>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-teal-200">
            <ShieldCheck className="h-4 w-4" />
            Match Quality
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <QualityItem label="Avg balance gap" value={matchQuality.avgBalanceDiff === null ? "-" : `${matchQuality.avgBalanceDiff.toFixed(0)} Elo`} />
            <QualityItem label="Balanced matches" value={String(matchQuality.balancedMatches)} />
            <QualityItem label="Upset rate" value={formatPercent(matchQuality.upsetRate)} />
            <QualityItem label="Draw rate" value={formatPercent(matchQuality.drawRate)} />
            <QualityItem label="Team 1 win rate" value={formatPercent(matchQuality.team1WinRate)} />
            <QualityItem label="Team 2 win rate" value={formatPercent(matchQuality.team2WinRate)} />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-teal-200">
            <Crown className="h-4 w-4" />
            Captains
          </div>
          <div className="mt-5 space-y-3">
            {captains.length ? captains.map((captain, index) => (
              <div key={captain.discordId} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{index + 1}. {captain.name}</p>
                  <p className="text-xs text-slate-400">
                    {captain.matches} matches · {captain.wins}W · {captain.draws}D
                  </p>
                </div>
                <div className="text-right text-xs text-teal-100">
                  <p>{captain.winRate.toFixed(1)}%</p>
                  <p className="text-slate-500">{captain.avgBalanceDiff === null ? "-" : `${captain.avgBalanceDiff.toFixed(0)} gap`}</p>
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-6 text-center text-sm text-slate-400">
                No captain data available.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function MetricPanel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-teal-200">
        {icon}
        {title}
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </div>
  )
}

function CompactList({ title, items, tone }: { title: string; items: PlayerMetric[]; tone: "up" | "down" | "peak" | "neutral" }) {
  const Icon = tone === "down" ? TrendingDown : tone === "peak" ? Crown : tone === "neutral" ? Users : TrendingUp
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <Icon className="h-4 w-4 text-teal-300" />
        {title}
      </div>
      <div className="space-y-2">
        {items.length ? items.map((item, index) => (
          <div key={`${title}-${item.playerId}`} className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm text-white">{index + 1}. {item.name}</p>
              <p className="text-sm font-semibold text-teal-100">{item.value > 0 && tone !== "peak" && tone !== "neutral" ? "+" : ""}{item.value}</p>
            </div>
            <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
          </div>
        )) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-5 text-center text-xs text-slate-400">
            No data yet.
          </div>
        )}
      </div>
    </div>
  )
}

function QualityItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  )
}

"use client"

import type { MouseEvent } from "react"
import { useRef, useState } from "react"
import { Trophy } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type EloLeaderboardPlayer = {
  playerId: string
  displayName: string
  elo: number
  wins: number
  losses: number
  streaks: number
  eloHistory: number[]
}

type EloLeaderboardProps = {
  eloRanked: EloLeaderboardPlayer[]
  matchesRanked: EloLeaderboardPlayer[]
  winRateRanked: EloLeaderboardPlayer[]
  scopeLabel: string
}

export function EloLeaderboard({ eloRanked, matchesRanked, winRateRanked, scopeLabel }: EloLeaderboardProps) {
  const [openPlayerKey, setOpenPlayerKey] = useState<string | null>(null)

  function togglePlayer(tab: string, playerId: string) {
    const key = `${tab}:${playerId}`
    setOpenPlayerKey((current) => current === key ? null : key)
  }

  return (
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
            <LeaderboardRows
              tab="elo"
              players={eloRanked}
              scopeLabel={scopeLabel}
              openPlayerKey={openPlayerKey}
              onToggle={togglePlayer}
              valueLabel={(player) => `Elo ${player.elo}`}
              subLabel={(player) => `${player.wins}W / ${player.losses}L - Streak ${player.streaks}`}
            />
          </TabsContent>
          <TabsContent value="matches">
            <LeaderboardRows
              tab="matches"
              players={matchesRanked}
              scopeLabel={scopeLabel}
              openPlayerKey={openPlayerKey}
              onToggle={togglePlayer}
              valueLabel={(player) => `Matches ${player.wins + player.losses}`}
              subLabel={(player) => `${player.wins}W / ${player.losses}L`}
            />
          </TabsContent>
          <TabsContent value="winrate">
            <LeaderboardRows
              tab="winrate"
              players={winRateRanked}
              scopeLabel={scopeLabel}
              openPlayerKey={openPlayerKey}
              onToggle={togglePlayer}
              valueLabel={(player) => {
                const matches = player.wins + player.losses
                const rate = matches ? (player.wins / matches) * 100 : 0
                return `${rate.toFixed(1)}%`
              }}
              subLabel={(player) => `${player.wins}W / ${player.wins + player.losses}T`}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function LeaderboardRows({
  tab,
  players,
  scopeLabel,
  openPlayerKey,
  onToggle,
  valueLabel,
  subLabel,
}: {
  tab: string
  players: EloLeaderboardPlayer[]
  scopeLabel: string
  openPlayerKey: string | null
  onToggle: (tab: string, playerId: string) => void
  valueLabel: (player: EloLeaderboardPlayer) => string
  subLabel: (player: EloLeaderboardPlayer) => string
}) {
  return (
    <div className="mt-4 space-y-3">
      {players.map((player, index) => {
        const key = `${tab}:${player.playerId}`
        const isOpen = openPlayerKey === key
        return (
          <div key={key} className="rounded-2xl border border-slate-800 bg-slate-950/60">
            <button
              type="button"
              onClick={() => onToggle(tab, player.playerId)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-white/[0.03]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-sm font-semibold text-teal-200">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{player.displayName}</p>
                  <p className="text-xs text-slate-400">{subLabel(player)}</p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-teal-500/10 px-3 py-1 text-xs text-teal-200">
                {valueLabel(player)}
              </span>
            </button>
            {isOpen ? <PlayerEloChart player={player} scopeLabel={scopeLabel} /> : null}
          </div>
        )
      })}
      {!players.length && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-6 text-center text-slate-400">
          No Elo data available yet.
        </div>
      )}
    </div>
  )
}

function PlayerEloChart({ player, scopeLabel }: { player: EloLeaderboardPlayer; scopeLabel: string }) {
  const chartRef = useRef<HTMLDivElement | null>(null)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    match: number
    elo: number
    change: number
  } | null>(null)
  const history = player.eloHistory.length ? player.eloHistory : [player.elo]
  const values = history.length === 1 ? [history[0], history[0]] : history
  const min = Math.min(...values)
  const max = Math.max(...values)
  const width = 900
  const height = 520
  const padding = { left: 64, right: 38, top: 74, bottom: 58 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const yMin = Math.max(0, Math.floor((min - 30) / 10) * 10)
  const yMax = Math.ceil((max + 30) / 10) * 10
  const yRange = Math.max(1, yMax - yMin)
  const xFor = (index: number) =>
    values.length === 1 ? padding.left + plotWidth / 2 : padding.left + (index / (values.length - 1)) * plotWidth
  const yFor = (value: number) => padding.top + ((yMax - value) / yRange) * plotHeight
  const points = values
    .map((value, index) => {
      const x = xFor(index)
      const y = yFor(value)
      return `${x},${y}`
    })
    .join(" ")
  const end = values[values.length - 1]
  const lastTenDelta = values.length > 1 ? end - values[Math.max(0, values.length - 10)] : 0
  const yTicks = Array.from({ length: 6 }, (_, index) => Math.round(yMin + (index / 5) * yRange))
  const xTickEvery = values.length > 90 ? 10 : values.length > 45 ? 5 : values.length > 24 ? 3 : values.length > 14 ? 2 : 1

  function showTooltip(event: MouseEvent<SVGCircleElement>, index: number, value: number, change: number) {
    const bounds = chartRef.current?.getBoundingClientRect()
    if (!bounds) return
    setTooltip({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      match: index + 1,
      elo: value,
      change,
    })
  }

  return (
    <div className="border-t border-slate-800 px-4 pb-4 pt-4">
      <div
        ref={chartRef}
        onMouseLeave={() => setTooltip(null)}
        className="relative rounded-2xl border border-slate-800 bg-slate-950/80 p-3 shadow-[0_18px_45px_rgba(2,6,23,0.22)]"
      >
        <svg
          className="h-auto w-full"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${player.displayName} Elo progression`}
        >
          <rect x="0" y="0" width={width} height={height} rx="18" fill="rgb(2 6 23)" />
          <text x={width / 2} y="32" textAnchor="middle" fill="rgb(248 250 252)" fontSize="28" fontWeight="500">
            {`Elo Evolution - ${player.displayName} - ${scopeLabel}`}
          </text>
          <text x={width / 2} y="62" textAnchor="middle" fill="rgb(203 213 225)" fontSize="16">
            {`Current ${end} | Peak ${max} | Low ${min} | Last 10: ${lastTenDelta >= 0 ? "+" : ""}${lastTenDelta}`}
          </text>

          {yTicks.map((tick) => {
            const y = yFor(tick)
            return (
              <g key={tick}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="rgb(30 41 59)" />
                <text x={padding.left - 12} y={y + 4} textAnchor="end" fill="rgb(148 163 184)" fontSize="13">
                  {tick}
                </text>
              </g>
            )
          })}

          {values.map((_, index) => {
            if (index !== 0 && index !== values.length - 1 && index % xTickEvery !== 0) return null
            const x = xFor(index)
            return (
              <line
                key={`grid-${index}`}
                x1={x}
                y1={padding.top}
                x2={x}
                y2={height - padding.bottom}
                stroke="rgb(15 23 42)"
              />
            )
          })}

          <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="rgb(71 85 105)" strokeWidth="1.5" />
          <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="rgb(71 85 105)" strokeWidth="1.5" />
          <line
            x1={padding.left}
            y1={yFor(max)}
            x2={width - padding.right}
            y2={yFor(max)}
            stroke="rgb(45 212 191)"
            strokeWidth="1.5"
            strokeDasharray="8 10"
          />
          <text x={width - padding.right - 8} y={yFor(max) - 8} textAnchor="end" fill="rgb(94 234 212)" fontSize="15">
            Peak {max}
          </text>

          <polyline points={points} fill="none" stroke="rgb(45 212 191)" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
          {values.map((value, index) => {
            const x = xFor(index)
            const y = yFor(value)
            const previous = index === 0 ? value : values[index - 1]
            const change = value - previous
            const showMatchLabel = index === 0 || index === values.length - 1 || index % xTickEvery === 0
            return (
              <g key={`${player.playerId}-${index}`}>
                <circle
                  cx={x}
                  cy={y}
                  r="5.5"
                  fill="rgb(45 212 191)"
                  className="cursor-pointer"
                  onMouseMove={(event) => showTooltip(event, index, value, change)}
                />
                {showMatchLabel ? (
                  <text x={x} y={height - padding.bottom + 22} textAnchor="middle" fill="rgb(148 163 184)" fontSize="12">
                  #{index + 1}
                  </text>
                ) : null}
              </g>
            )
          })}
          <text
            x="18"
            y={padding.top + plotHeight / 2}
            textAnchor="middle"
            fill="rgb(226 232 240)"
            fontSize="16"
            transform={`rotate(-90 18 ${padding.top + plotHeight / 2})`}
          >
            Elo
          </text>
          <text x={padding.left + plotWidth / 2} y={height - 12} textAnchor="middle" fill="rgb(226 232 240)" fontSize="16">
            Matches
          </text>
        </svg>
        {tooltip ? (
          <div
            className="pointer-events-none absolute z-10 min-w-36 rounded-xl border border-teal-300/30 bg-slate-950 px-3 py-2 text-xs shadow-[0_12px_30px_rgba(2,6,23,0.45)]"
            style={{
              left: Math.min(Math.max(tooltip.x + 12, 8), 760),
              top: Math.max(tooltip.y - 58, 8),
            }}
          >
            <p className="font-semibold text-white">Match #{tooltip.match}</p>
            <p className="mt-1 text-teal-200">Elo {tooltip.elo}</p>
            <p className={tooltip.change >= 0 ? "text-emerald-200" : "text-rose-200"}>
              {tooltip.change >= 0 ? "+" : ""}{tooltip.change}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { BadgeDollarSign, Coins, Shield, Target, Trophy, Users } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn, getFlagBackgroundStyle, isImageUrl, shouldOverlayFlag } from "@/lib/utils"
import type { BetBallAnalysisPlayer, BetBallMarketOption, BetBallMatchDetail } from "@/lib/services/betball.service"

type BetBallMatchViewProps = {
  match: BetBallMatchDetail
  fflCoins: number
}

function formatMatchDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(new Date(value))
}

function factorial(value: number) {
  if (value <= 1) return 1
  let result = 1
  for (let index = 2; index <= value; index += 1) {
    result *= index
  }
  return result
}

function poissonProbability(lambda: number, goals: number) {
  const safeLambda = Math.max(0.05, lambda)
  return Math.exp(-safeLambda) * (safeLambda ** goals) / factorial(goals)
}

function toManualOdds(probability: number) {
  const safeProbability = Math.min(0.88, Math.max(0.0008, probability))
  const softenedProbability = Math.pow(safeProbability, 0.72)
  return Math.round(((1.08 / softenedProbability) * 0.25) * 100) / 100
}

function FflCoin({ value }: { value: number }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-[22px] border border-cyan-300/20 bg-[radial-gradient(circle_at_30%_30%,rgba(34,211,238,0.22),transparent_40%),linear-gradient(135deg,#11253a_0%,#0a1220_55%,#0c1d2c_100%)] px-4 py-3 shadow-[0_16px_40px_rgba(2,6,23,0.34)]">
      <div className="relative h-10 w-10">
        <Image src="/ffl-logo2.png" alt="FFL Coin" fill sizes="40px" className="object-contain invert" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-[0.26em] text-cyan-100/70">FFL Coin</div>
        <div className="mt-1 text-lg font-semibold text-white">{value.toLocaleString("en-GB")}</div>
      </div>
    </div>
  )
}

function TeamSide({ image, name }: { image?: string; name: string }) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="flex h-36 w-36 items-center justify-center">
        {image ? (
          <Image src={image} alt={name} width={144} height={144} className="h-32 w-32 object-contain" />
        ) : (
          <span className="text-3xl font-semibold text-slate-300">{name.slice(0, 2).toUpperCase()}</span>
        )}
      </div>
      <div className="max-w-[16rem] text-3xl font-semibold text-white">{name}</div>
    </div>
  )
}

function getTwemojiUrl(emoji: string) {
  const codePoints = Array.from(emoji).map((c) => c.codePointAt(0)?.toString(16)).join("-")
  return `https://twemoji.maxcdn.com/v/latest/72x72/${codePoints}.png`
}

function FlagBadge({ country, className }: { country?: string; className?: string }) {
  if (!country) return null
  const baseStyle = getFlagBackgroundStyle(country)
  const overlayUrl = shouldOverlayFlag(country) ? getTwemojiUrl(country) : ""
  const backgroundImage = overlayUrl
    ? baseStyle.backgroundImage
      ? `url(${overlayUrl}), ${baseStyle.backgroundImage}`
      : `url(${overlayUrl})`
    : baseStyle.backgroundImage

  return (
    <span
      aria-label={country}
      className={className}
      style={{
        ...baseStyle,
        backgroundImage,
        backgroundPosition: overlayUrl ? `center, ${baseStyle.backgroundPosition || "center"}` : baseStyle.backgroundPosition,
        backgroundSize: overlayUrl ? `cover, ${baseStyle.backgroundSize || "cover"}` : baseStyle.backgroundSize,
        backgroundRepeat: overlayUrl ? `no-repeat, ${baseStyle.backgroundRepeat || "no-repeat"}` : baseStyle.backgroundRepeat,
      }}
    />
  )
}

function PlayerChip({ player }: { player: BetBallAnalysisPlayer }) {
  const avatarIsImage = isImageUrl(player.avatar || "")
  const avatarText = !avatarIsImage ? (player.avatar || "").trim() : ""

  return (
    <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-slate-900/80 shadow-[0_10px_30px_rgba(2,6,23,0.45)]">
      {player.kitImage ? (
        <div className="absolute inset-0 rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${player.kitImage})` }} />
      ) : null}
      {avatarIsImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={player.avatar} alt={player.playerName} className="relative z-10 h-7 w-7 rounded-full border border-slate-950/70 object-cover shadow-[0_4px_12px_rgba(2,6,23,0.4)]" />
      ) : avatarText ? (
        <span className="relative z-10 text-xl leading-none">{avatarText}</span>
      ) : null}
      <FlagBadge country={player.country} className="-bottom-1 -right-1 absolute h-5 w-5 rounded-full ring-2 ring-slate-950" />
    </div>
  )
}

function MarketCard({
  title,
  icon,
  options,
  selectedIds,
  onToggle,
  columns = "md:grid-cols-2",
}: {
  title: string
  icon: React.ReactNode
  options: BetBallMarketOption[]
  selectedIds: Set<string>
  onToggle: (market: BetBallMarketOption) => void
  columns?: string
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-slate-950/45 p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.32em] text-slate-500">
        {icon}
        {title}
      </div>
      <div className={cn("mt-4 grid gap-3", columns)}>
        {options.map((option) => {
          const isSelected = selectedIds.has(option.id)
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggle(option)}
              className={cn(
                "rounded-[20px] border px-4 py-4 text-left transition",
                isSelected
                  ? "border-cyan-300/45 bg-cyan-400/10"
                  : "border-white/10 bg-slate-900/80 hover:border-cyan-300/25 hover:bg-slate-900"
              )}
            >
              <div className="text-xs uppercase tracking-[0.3em] text-slate-500">{option.token}</div>
              <div className="mt-2 text-lg font-semibold text-white">{option.label}</div>
              <div className="mt-1 text-sm text-slate-400">{option.description}</div>
              <div className="mt-4 text-2xl font-semibold text-cyan-100">{option.odds.toFixed(2)}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function BetBallMatchView({ match, fflCoins }: BetBallMatchViewProps) {
  const [betCategory, setBetCategory] = useState<"match" | "goals" | "players" | "defence" | "summary">("match")
  const [selectedBets, setSelectedBets] = useState<BetBallMarketOption[]>([])
  const [stake, setStake] = useState("100")
  const [exactScoreHome, setExactScoreHome] = useState("1")
  const [exactScoreAway, setExactScoreAway] = useState("0")

  const playerRows = useMemo(() => {
    const players = match.analysis.teams.flatMap((team) => team.topScorers)
    const unique = new Map<number, BetBallAnalysisPlayer>()
    for (const player of players) {
      if (!unique.has(player.playerId)) unique.set(player.playerId, player)
    }
    return [...unique.values()].sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals
      if (b.assists !== a.assists) return b.assists - a.assists
      return b.avg - a.avg
    })
  }, [match.analysis.teams])

  const selectedIds = useMemo(() => new Set(selectedBets.map((bet) => bet.id)), [selectedBets])
  const numericStake = Math.max(0, Number(stake || 0))
  const exactHomeValue = Math.max(0, Number(exactScoreHome || 0))
  const exactAwayValue = Math.max(0, Number(exactScoreAway || 0))
  const combinedOdds = useMemo(() => selectedBets.reduce((acc, bet) => acc * bet.odds, 1), [selectedBets])
  const potentialReturn = selectedBets.length ? Math.round(numericStake * combinedOdds * 100) / 100 : 0
  const canAfford = numericStake > 0 && numericStake <= fflCoins
  const exactScoreProbability = useMemo(
    () => {
      const poisson =
        poissonProbability(match.analysis.projectedGoals.home, exactHomeValue) *
        poissonProbability(match.analysis.projectedGoals.away, exactAwayValue)
      const historyKey = `${exactHomeValue}-${exactAwayValue}`
      const historical =
        match.analysis.exactScoreHistory.frequencies[historyKey] ??
        (match.analysis.exactScoreHistory.sampleSize > 0 ? 1 / (match.analysis.exactScoreHistory.sampleSize * 8) : 0)

      return poisson * 0.68 + historical * 0.32
    },
    [
      exactAwayValue,
      exactHomeValue,
      match.analysis.exactScoreHistory.frequencies,
      match.analysis.exactScoreHistory.sampleSize,
      match.analysis.projectedGoals.away,
      match.analysis.projectedGoals.home,
    ]
  )
  const exactScoreOdds = useMemo(() => toManualOdds(exactScoreProbability), [exactScoreProbability])

  const goalLines = useMemo(() => {
    const grouped = new Map<string, { line: string; over?: BetBallMarketOption; under?: BetBallMarketOption }>()
    for (const option of match.analysis.markets.goals) {
      const line = option.token.slice(1)
      if (!grouped.has(line)) {
        grouped.set(line, { line })
      }
      const entry = grouped.get(line)!
      if (option.token.startsWith("O")) entry.over = option
      if (option.token.startsWith("U")) entry.under = option
    }
    return [...grouped.values()].sort((a, b) => Number(a.line) - Number(b.line))
  }, [match.analysis.markets.goals])

  const toggleSelection = (market: BetBallMarketOption) => {
    setSelectedBets((current) => {
      const exists = current.some((item) => item.id === market.id)
      return exists ? current.filter((item) => item.id !== market.id) : [...current, market]
    })
  }

  const exactScoreMarket: BetBallMarketOption = useMemo(
    () => ({
      id: `exact-score-${exactHomeValue}-${exactAwayValue}`,
      token: `${exactHomeValue}-${exactAwayValue}`,
      label: `Exact score ${match.team1Name} ${exactHomeValue}-${exactAwayValue} ${match.team2Name}`,
      description: "Correct score entered manually",
      odds: exactScoreOdds,
      category: "exact-score",
    }),
    [exactAwayValue, exactHomeValue, exactScoreOdds, match.team1Name, match.team2Name]
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-5">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/betball"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Back to BetBall
          </Link>
          <FflCoin value={fflCoins} />
        </div>

        <section className="mt-6 rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(8,47,73,0.72))] p-6 shadow-[0_24px_70px_rgba(3,10,24,0.45)]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-slate-950/70 px-4 py-2 text-[11px] uppercase tracking-[0.35em] text-sky-200">
              <BadgeDollarSign className="h-4 w-4" />
              BetBall
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-white">{match.competitionLabel}</h1>
            <div className="mt-2 text-sm uppercase tracking-[0.25em] text-slate-400">
              {match.matchdayLabel} · Week {match.week} · {formatMatchDate(match.date)}
            </div>
          </div>

          <div className="mt-8 grid gap-8 rounded-[28px] border border-white/10 bg-slate-950/35 p-8 lg:grid-cols-2 lg:items-center">
            <TeamSide image={match.team1Image} name={match.team1Name} />
            <TeamSide image={match.team2Image} name={match.team2Name} />
          </div>
        </section>

        <section className="mt-8 rounded-[30px] border border-white/10 bg-slate-900/60 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {([
                { key: "match", label: "Match" },
                { key: "goals", label: "Goals" },
                { key: "players", label: "Players" },
                { key: "defence", label: "Defence" },
                { key: "summary", label: "Summary" },
              ] as const).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setBetCategory(item.key)}
                  className={cn(
                    "rounded-2xl border px-4 py-2 text-sm font-medium transition",
                    betCategory === item.key
                      ? "border-cyan-300/30 bg-cyan-400/10 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.18)]"
                      : "border-white/10 bg-slate-950/50 text-slate-300 hover:border-white/20 hover:text-white"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100">
              <Coins className="h-4 w-4" />
              {selectedBets.length} selection{selectedBets.length !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="mt-6">
            {betCategory === "match" ? (
                <div className="space-y-6">
                  <MarketCard title="Match result" icon={<Trophy className="h-4 w-4" />} options={match.analysis.markets.result} selectedIds={selectedIds} onToggle={toggleSelection} columns="md:grid-cols-3" />
                  <MarketCard title="Mercy" icon={<Trophy className="h-4 w-4" />} options={match.analysis.markets.mercy} selectedIds={selectedIds} onToggle={toggleSelection} columns="md:grid-cols-2" />
                  <MarketCard title="Both teams to score" icon={<Users className="h-4 w-4" />} options={match.analysis.markets.bothTeamsToScore} selectedIds={selectedIds} onToggle={toggleSelection} />
                </div>
            ) : null}

            {betCategory === "goals" ? (
              <div className="space-y-6">
                <div className="rounded-[24px] border border-white/10 bg-slate-950/45 p-5">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.32em] text-slate-500">
                    <Target className="h-4 w-4" />
                    Goals line
                  </div>
                  <div className="mt-4 overflow-hidden rounded-[20px] border border-white/10 bg-slate-900/60">
                    <div className="grid grid-cols-[110px_1fr_1fr] border-b border-white/10 px-4 py-3 text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                      <div>Line</div>
                      <div className="text-center">Over</div>
                      <div className="text-center">Under</div>
                    </div>
                    <div className="divide-y divide-white/10">
                      {goalLines.map((line) => (
                        <div key={line.line} className="grid grid-cols-[110px_1fr_1fr] items-center px-4 py-3">
                          <div className="text-lg font-semibold text-white">{line.line}</div>
                          {[line.over, line.under].map((market) => (
                            <button
                              key={market?.id ?? `${line.line}-empty`}
                              type="button"
                              disabled={!market}
                              onClick={() => market && toggleSelection(market)}
                              className={cn(
                                "mx-2 rounded-2xl border px-3 py-3 text-center transition",
                                market && selectedIds.has(market.id)
                                  ? "border-cyan-300/40 bg-cyan-400/10 text-cyan-100"
                                  : "border-white/10 bg-slate-900/80 text-white hover:border-cyan-300/25 hover:bg-slate-900",
                                !market ? "cursor-not-allowed opacity-40" : ""
                              )}
                            >
                              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">{market?.token.startsWith("O") ? "Over" : "Under"}</div>
                              <div className="mt-2 text-xl font-semibold">{market ? market.odds.toFixed(2) : "-"}</div>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-slate-950/45 p-5">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.32em] text-slate-500">
                    <Target className="h-4 w-4" />
                    Exact total goals
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {match.analysis.markets.exactTotalGoals.map((option) => {
                      const isSelected = selectedIds.has(option.id)
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleSelection(option)}
                          className={cn(
                            "rounded-[20px] border px-4 py-4 text-left transition",
                            isSelected
                              ? "border-cyan-300/45 bg-cyan-400/10"
                              : "border-white/10 bg-slate-900/80 hover:border-cyan-300/25 hover:bg-slate-900"
                          )}
                        >
                          <div className="text-lg font-semibold text-white">{option.label}</div>
                          <div className="mt-3 text-2xl font-semibold text-cyan-100">{option.odds.toFixed(2)}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-slate-950/45 p-5">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.32em] text-slate-500">
                    <Target className="h-4 w-4" />
                    Exact score
                  </div>
                  <div className="mt-2 text-sm text-slate-400">Enter the exact result and add it directly to your slip.</div>
                  <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto_1fr_auto] md:items-end">
                    <div>
                      <div className="mb-2 text-xs uppercase tracking-[0.24em] text-slate-500">{match.team1Name}</div>
                      <Input
                        type="number"
                        min="0"
                        value={exactScoreHome}
                        onChange={(event) => setExactScoreHome(event.target.value)}
                        className="border-white/10 bg-slate-950/80 text-white"
                      />
                    </div>
                    <div className="pb-3 text-2xl font-semibold text-slate-500">-</div>
                    <div>
                      <div className="mb-2 text-xs uppercase tracking-[0.24em] text-slate-500">{match.team2Name}</div>
                      <Input
                        type="number"
                        min="0"
                        value={exactScoreAway}
                        onChange={(event) => setExactScoreAway(event.target.value)}
                        className="border-white/10 bg-slate-950/80 text-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSelection(exactScoreMarket)}
                      className={cn(
                        "rounded-[20px] border px-4 py-4 text-left transition md:min-w-[180px]",
                        selectedIds.has(exactScoreMarket.id)
                          ? "border-cyan-300/45 bg-cyan-400/10"
                          : "border-white/10 bg-slate-900/80 hover:border-cyan-300/25 hover:bg-slate-900"
                      )}
                    >
                      <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Calculated odds</div>
                      <div className="mt-2 text-2xl font-semibold text-cyan-100">{exactScoreOdds.toFixed(2)}</div>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {betCategory === "defence" ? (
              <div className="space-y-6">
                <MarketCard title="Clean sheet markets" icon={<Shield className="h-4 w-4" />} options={match.analysis.markets.cleanSheet} selectedIds={selectedIds} onToggle={toggleSelection} />
              </div>
            ) : null}

            {betCategory === "players" ? (
              <div className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/50">
                <div className="border-b border-white/10 px-5 py-4">
                  <div className="text-xs uppercase tracking-[0.32em] text-slate-500">Players</div>
                  <div className="mt-2 text-xl font-semibold text-white">Player - Goal or assist</div>
                </div>

                <div className="grid grid-cols-[minmax(0,1.7fr)_110px_110px_130px] gap-0 border-b border-white/10 px-5 py-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  <div>Player</div>
                  <div className="text-center">To score</div>
                  <div className="text-center">To assist</div>
                  <div className="text-center">Goal or assist</div>
                </div>

                <div className="divide-y divide-white/10">
                  {playerRows.map((player) => {
                    const scoreMarket: BetBallMarketOption = {
                      id: `anytime-scorer-${player.playerId}`,
                      token: "AG",
                      label: `${player.playerName} to score`,
                      description: "Anytime goalscorer",
                      odds: player.odds,
                      category: "scorer",
                    }
                    const assistMarket: BetBallMarketOption = {
                      id: `anytime-assist-${player.playerId}`,
                      token: "AS",
                      label: `${player.playerName} to assist`,
                      description: "Anytime assist",
                      odds: player.assistOdds,
                      category: "scorer",
                    }
                    const goalOrAssistMarket: BetBallMarketOption = {
                      id: `goal-assist-${player.playerId}`,
                      token: "G/A",
                      label: `${player.playerName} goal or assist`,
                      description: "Any goal or assist contribution",
                      odds: player.goalOrAssistOdds,
                      category: "scorer",
                    }

                    return (
                      <div key={player.playerId} className="grid grid-cols-[minmax(0,1.7fr)_110px_110px_130px] items-center gap-0 px-5 py-3">
                        <div className="flex items-center gap-3 pr-3">
                          <PlayerChip player={player} />
                          <div className="min-w-0">
                            <div className="truncate text-base font-semibold text-white">{player.playerName}</div>
                            <div className="mt-1 truncate text-sm text-slate-400">
                              {player.goals} goals · {player.assists} assists · {player.matchesPlayed} matches
                            </div>
                          </div>
                        </div>

                        {[scoreMarket, assistMarket, goalOrAssistMarket].map((market, index) => (
                          <button
                            key={market.id ?? `${player.playerId}-${index}`}
                            type="button"
                            onClick={() => toggleSelection(market)}
                            className={cn(
                              "mx-2 rounded-2xl border px-3 py-3 text-center transition",
                              selectedIds.has(market.id)
                                ? "border-cyan-300/40 bg-cyan-400/10 text-cyan-100"
                                : "border-white/10 bg-slate-900/80 text-white hover:border-cyan-300/25 hover:bg-slate-900"
                            )}
                          >
                            <div className="text-lg font-semibold">{market.odds.toFixed(2)}</div>
                          </button>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {betCategory === "summary" ? (
              <div className="rounded-[24px] border border-white/10 bg-slate-950/50 p-5">
                <div className="text-xs uppercase tracking-[0.32em] text-slate-500">Bet summary</div>
                <div className="mt-2 text-2xl font-semibold text-white">Build your slip</div>

                {selectedBets.length ? (
                  <>
                    <div className="mt-5 grid gap-3">
                      {selectedBets.map((bet) => (
                        <div key={bet.id} className="flex items-center justify-between gap-4 rounded-[20px] border border-white/10 bg-slate-900/80 px-4 py-4">
                          <div>
                            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">{bet.token}</div>
                            <div className="mt-2 text-lg font-semibold text-white">{bet.label}</div>
                            <div className="mt-1 text-sm text-slate-400">{bet.description}</div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Odds</div>
                              <div className="mt-2 text-2xl font-semibold text-cyan-100">{bet.odds.toFixed(2)}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleSelection(bet)}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-[1fr_0.8fr]">
                      <div className="rounded-[24px] border border-white/10 bg-slate-900/80 p-4">
                        <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Stake</div>
                        <Input
                          type="number"
                          min="1"
                          value={stake}
                          onChange={(event) => setStake(event.target.value)}
                          className="mt-3 border-white/10 bg-slate-950/80 text-white"
                        />
                        {!canAfford && numericStake > 0 ? (
                          <div className="mt-3 text-sm text-rose-200">You do not have enough FFL Coins for this bet.</div>
                        ) : null}
                      </div>
                      <div className="rounded-[24px] border border-white/10 bg-slate-900/80 p-4">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500">
                          <Coins className="h-4 w-4" />
                          Combined return
                        </div>
                        <div className="mt-3 text-3xl font-semibold text-white">{Number.isFinite(potentialReturn) ? potentialReturn.toFixed(2) : "0.00"}</div>
                        <div className="mt-3 text-sm text-slate-400">
                          {selectedBets.length} selection{selectedBets.length > 1 ? "s" : ""} · total odds {combinedOdds.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <Button
                        type="button"
                        disabled={!canAfford}
                        className="w-full bg-sky-400 text-slate-950 hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-sky-400/40"
                      >
                        Prepare slip
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="mt-5 rounded-[20px] border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-500">
                    No selections yet. Add markets from Match, Goals, Players or Defence.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}

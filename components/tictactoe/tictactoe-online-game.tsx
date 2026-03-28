"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { Clock, Shield, Swords } from "lucide-react"
import { cn, getFlagBackgroundStyle, isImageUrl, shouldOverlayFlag } from "@/lib/utils"
import type { TicTacToeCellOption, TicTacToeOnlineGameSummary } from "@/lib/services/tictactoe.service"

type OnlineCell = {
  key: string
  row: number
  col: number
  options: TicTacToeCellOption[]
  optionCount: number
}

type OnlinePick = {
  row: number
  col: number
  filledByUserId: string | null
  option: TicTacToeCellOption
}

type SearchResult = {
  playerObjectId: string
  playerName: string
  avatar?: string
}

type OnlineState = {
  gameId: string
  status: "pending" | "active" | "finished"
  result?: "win" | "draw" | null
  difficulty?: string | null
  rows: string[]
  columns: Array<{ id: string; name: string; image?: string }>
  cells: OnlineCell[]
  picks: OnlinePick[]
  currentTurnUserId: string | null
  winnerUserId?: string | null
  yourUserId: string
  isYourTurn: boolean
  turnSeconds: number
  turnExpiresAt?: string | null
}

type TicTacToeOnlineGameProps = {
  game: TicTacToeOnlineGameSummary
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

function FilledPlayerBadge({ option }: { option: TicTacToeCellOption }) {
  const avatarIsImage = isImageUrl(option.avatar || "")
  const avatarText = !avatarIsImage ? (option.avatar || "").trim() : ""

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div
        className={cn(
          "relative h-16 w-16 rounded-full border shadow-[0_10px_24px_rgba(2,6,23,0.45)] sm:h-20 sm:w-20",
          option.kitImage ? "border-slate-900/90 bg-slate-900/80" : "border-white/10 bg-slate-900/80"
        )}
        style={
          option.kitImage
            ? {
                backgroundImage: `url(${option.kitImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        {avatarIsImage ? (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={option.avatar} alt={option.playerName} className="h-9 w-9 rounded-full object-cover sm:h-10 sm:w-10" />
          </div>
        ) : avatarText ? (
          <div className="absolute inset-0 flex items-center justify-center text-lg sm:text-xl">{avatarText}</div>
        ) : null}
        {option.teamImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={option.teamImage}
            alt={option.teamName || option.playerName}
            className="absolute -bottom-1.5 -left-1.5 h-6 w-6 rounded-full border border-white/10 bg-slate-950 object-cover ring-2 ring-slate-950 sm:h-7 sm:w-7"
          />
        ) : null}
        <FlagBadge country={option.country} className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full ring-2 ring-slate-950 sm:h-7 sm:w-7" />
      </div>

      <div className="max-w-[120px] truncate text-sm font-semibold text-white">{option.playerName}</div>
    </div>
  )
}

export function TicTacToeOnlineGame({ game }: TicTacToeOnlineGameProps) {
  const [state, setState] = useState<OnlineState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedCell, setSelectedCell] = useState<OnlineCell | null>(null)
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [pickError, setPickError] = useState("")
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  const fetchState = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const response = await fetch(`/api/tictactoe/online/${game.gameId}`)
      if (!response.ok) {
        const payload = await response.json().catch(() => ({} as { error?: string }))
        throw new Error(payload.error || "Unable to load match.")
      }
      const payload = await response.json() as OnlineState
      setState(payload)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load match.")
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    void fetchState()
    const interval = window.setInterval(() => {
      void fetchState(true)
    }, 3000)
    return () => window.clearInterval(interval)
  }, [game.gameId])

  useEffect(() => {
    if (!state?.turnExpiresAt) {
      setTimeLeft(null)
      return
    }

    const getRemaining = () => {
      if (!state.turnExpiresAt) {
        setTimeLeft(null)
        return
      }
      const expiresAt = new Date(state.turnExpiresAt).getTime()
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
      setTimeLeft(remaining)
    }

    getRemaining()
    const interval = window.setInterval(getRemaining, 1000)
    return () => window.clearInterval(interval)
  }, [state?.turnExpiresAt])

  const pickMap = useMemo(() => {
    const map = new Map<string, OnlinePick>()
    state?.picks.forEach((pick) => {
      map.set(`${pick.row}-${pick.col}`, pick)
    })
    return map
  }, [state?.picks])

  useEffect(() => {
    if (!selectedCell) {
      setSearchResults([])
      setSearchLoading(false)
      setPickError("")
      return
    }
    const query = search.trim()
    if (!query) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }

    setSearchLoading(true)
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/tictactoe/players?q=${encodeURIComponent(query)}`)
        if (!response.ok) {
          setSearchResults([])
          return
        }
        const payload = await response.json() as { players?: SearchResult[] }
        setSearchResults(payload.players ?? [])
      } finally {
        setSearchLoading(false)
      }
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [search, selectedCell])

  const canPlay = state?.status === "active" && state.isYourTurn
  const turnLabel = state?.status === "finished"
    ? "Match finished"
    : state?.isYourTurn
      ? "Your turn"
      : "Opponent's turn"
  const difficultyLabel = state?.difficulty ? state.difficulty.toUpperCase() : "ALL"
  const formattedTimeLeft = timeLeft === null
    ? "--:--"
    : `${Math.floor(timeLeft / 60).toString().padStart(2, "0")}:${(timeLeft % 60).toString().padStart(2, "0")}`
  const isWinner = state?.status === "finished" && state?.result === "win" && state?.winnerUserId === state?.yourUserId
  const isLoser = state?.status === "finished" && state?.result === "win" && state?.winnerUserId !== state?.yourUserId

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/tic-tac-toe"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
          >
            Back to Tic Tac Toe
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-emerald-100">
            <Swords className="h-4 w-4" />
            Online match
          </div>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-slate-900/60 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-2xl font-semibold text-white">Match created</div>
              <div className="mt-2 text-sm text-slate-400">
                Difficulty: <span className="text-slate-200">{difficultyLabel}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-slate-200">
              <Clock className="h-4 w-4 text-cyan-200" />
              {turnLabel}
              <span className="text-slate-400">|</span>
              <span className="font-semibold text-cyan-100">{formattedTimeLeft}</span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4">
            <div className="text-sm text-slate-300">Opponent</div>
            <div className="flex items-center gap-3">
              {game.opponent.avatar ? (
                <Image
                  src={game.opponent.avatar}
                  alt={game.opponent.displayName}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white">
                  {game.opponent.displayName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="text-sm font-semibold text-white">{game.opponent.displayName}</div>
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          {loading && !state ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-6 text-sm text-slate-300">
              Loading match...
            </div>
          ) : null}

          {state?.rows?.length ? (
            <div className="relative mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_34%),linear-gradient(180deg,#0b1325_0%,#0a1020_100%)] p-4">
              {!canPlay && state?.status === "active" ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/60 text-sm text-slate-200">
                  Waiting for your opponent...
                </div>
              ) : null}
              <div className="grid grid-cols-[120px_repeat(3,minmax(0,1fr))] gap-3">
                <div />
                {state.columns.map((column) => (
                  <div key={column.id} className="flex min-h-[112px] flex-col items-center justify-center rounded-[22px] border border-white/10 bg-slate-950/55 px-3 py-4 text-center">
                    {column.image ? (
                      <Image src={column.image} alt={column.name} width={54} height={54} className="h-14 w-14 object-contain" />
                    ) : (
                      <Shield className="h-12 w-12 text-slate-500" />
                    )}
                    <div className="mt-3 line-clamp-2 text-sm font-semibold text-white">{column.name}</div>
                  </div>
                ))}

                {state.rows.map((country, rowIndex) => (
                  <div key={`${country}-${rowIndex}`} className="contents">
                    <div className="flex min-h-[112px] flex-col items-center justify-center rounded-[22px] border border-white/10 bg-slate-950/55 px-3 py-4 text-center">
                      <FlagBadge country={country} className="h-14 w-14 rounded-full ring-2 ring-slate-900" />
                      <div className="mt-3 text-sm font-semibold text-white">{country}</div>
                    </div>

                    {state.cells
                      .filter((cell) => cell.row === rowIndex)
                      .map((cell) => {
                        const pick = pickMap.get(`${cell.row}-${cell.col}`)
                        return (
                          <button
                            key={cell.key}
                            type="button"
                            onClick={() => {
                              if (!canPlay || pick) return
                              setSelectedCell(cell)
                              setSearch("")
                              setSearchResults([])
                              setPickError("")
                            }}
                            className={cn(
                              "group min-h-[112px] rounded-[22px] border bg-emerald-500/10 p-3 text-left transition hover:border-cyan-300/25 hover:bg-emerald-500/15",
                              pick
                                ? pick.filledByUserId === state?.yourUserId
                                  ? "border-cyan-300/45 bg-cyan-400/20 shadow-[0_0_0_1px_rgba(34,211,238,0.25),0_0_28px_rgba(34,211,238,0.16)]"
                                  : "border-amber-300/45 bg-amber-400/20 shadow-[0_0_0_1px_rgba(251,191,36,0.25),0_0_28px_rgba(251,191,36,0.16)]"
                                : "border-white/10"
                            )}
                            disabled={!canPlay || Boolean(pick)}
                          >
                            {pick ? (
                              <FilledPlayerBadge option={pick.option} />
                            ) : (
                              <div className="flex h-full flex-col items-center justify-center text-center">
                                <div className="text-sm font-semibold text-white transition group-hover:text-cyan-100">Find player</div>
                                <div className="mt-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">
                                  {cell.optionCount} valid
                                </div>
                              </div>
                            )}
                          </button>
                        )
                      })}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {state?.status === "finished" ? (
        <div className="pointer-events-none fixed inset-x-0 top-28 z-[130] flex justify-center px-4">
          <div
            className={cn(
              "animate-[fadeInOut_2.8s_ease-in-out_forwards] rounded-full border px-6 py-3 shadow-[0_20px_60px_rgba(4,120,87,0.35)]",
              isWinner
                ? "border-emerald-300/25 bg-[linear-gradient(135deg,rgba(16,185,129,0.95),rgba(6,95,70,0.95))]"
                : isLoser
                  ? "border-rose-300/25 bg-[linear-gradient(135deg,rgba(244,63,94,0.95),rgba(159,18,57,0.95))]"
                  : "border-cyan-300/25 bg-[linear-gradient(135deg,rgba(34,211,238,0.9),rgba(14,116,144,0.9))]"
            )}
          >
            <div className="flex items-center gap-3 text-white">
              <span className="text-2xl">{isWinner ? "🏆" : isLoser ? "⚔️" : "🤝"}</span>
              <div>
                <div className="text-[10px] uppercase tracking-[0.35em] text-white/70">
                  {isWinner ? "Victory" : isLoser ? "Defeat" : "Draw"}
                </div>
                <div className="text-base font-semibold">
                  {isWinner
                    ? "You won +10 FFL coins"
                    : isLoser
                      ? "Your opponent won"
                      : "Match ended in a draw"}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedCell ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[30px] border border-white/10 bg-slate-900 p-6 shadow-[0_25px_80px_rgba(3,10,24,0.6)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.34em] text-slate-500">Select player</div>
                <div className="mt-2 text-2xl font-semibold text-white">Search any player</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300 hover:bg-white/10 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-5">
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPickError("")
                }}
                placeholder="Search player"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/20"
              />
            </div>

            {pickError ? (
              <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {pickError}
              </div>
            ) : null}

            <div className="mt-5 max-h-[320px] space-y-3 overflow-y-auto pr-2">
              {!search.trim() ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/50 px-4 py-6 text-center text-sm text-slate-400">
                  Start typing to search players.
                </div>
              ) : searchLoading ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-6 text-center text-sm text-slate-400">
                  Searching...
                </div>
              ) : searchResults.length ? searchResults.map((option) => (
                <button
                  key={option.playerObjectId}
                  type="button"
                  onClick={async () => {
                    if (!selectedCell) return
                    const isValid = selectedCell.options.some((candidate) => candidate.playerObjectId === option.playerObjectId)
                    if (!isValid) {
                      setPickError("This player is not valid.")
                      return
                    }
                    await fetch(`/api/tictactoe/online/${game.gameId}/pick`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        row: selectedCell.row,
                        col: selectedCell.col,
                        playerObjectId: option.playerObjectId,
                      }),
                    })
                    setSelectedCell(null)
                    setSearch("")
                    setSearchResults([])
                    setPickError("")
                    void fetchState(true)
                  }}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-3 transition hover:border-cyan-300/40 hover:bg-slate-950/80">
                    <div
                      className={cn(
                        "relative h-14 w-14 rounded-full border shadow-[0_10px_24px_rgba(2,6,23,0.45)]",
                        option.kitImage ? "border-slate-900/90 bg-slate-900/80" : "border-white/10 bg-slate-900/80"
                      )}
                      style={
                        option.kitImage
                          ? {
                              backgroundImage: `url(${option.kitImage})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : undefined
                      }
                    >
                      {isImageUrl(option.avatar || "") ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={option.avatar} alt={option.playerName} className="h-8 w-8 rounded-full object-cover" />
                        </div>
                      ) : option.avatar ? (
                        <div className="absolute inset-0 flex items-center justify-center text-lg">{option.avatar}</div>
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">{option.playerName}</div>
                    </div>
                  </div>
                </button>
              )) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/50 px-4 py-6 text-center text-sm text-slate-400">
                  No players found for this cell.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

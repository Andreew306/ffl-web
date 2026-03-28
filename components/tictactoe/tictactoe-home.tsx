"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { Bot, Grid3X3, Shield, Swords, Trophy, Users } from "lucide-react"
import { cn, getFlagBackgroundStyle, isImageUrl, shouldOverlayFlag } from "@/lib/utils"
import type { TicTacToeCellOption, TicTacToeDifficulty, TicTacToeLeaderboardEntry, TicTacToePageData, TicTacToeRivalEntry } from "@/lib/services/tictactoe.service"

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

function UserAvatar({ avatar, label }: { avatar?: string; label: string }) {
  if (avatar && isImageUrl(avatar)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatar} alt={label} className="h-10 w-10 rounded-full object-cover" />
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white">
      {label.slice(0, 1).toUpperCase()}
    </div>
  )
}

function PlayerOptionChip({ option }: { option: TicTacToeCellOption }) {
  const avatarIsImage = isImageUrl(option.avatar || "")
  const avatarText = !avatarIsImage ? (option.avatar || "").trim() : ""

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-3">
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
        {avatarIsImage ? (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={option.avatar} alt={option.playerName} className="h-8 w-8 rounded-full object-cover" />
          </div>
        ) : avatarText ? (
          <div className="absolute inset-0 flex items-center justify-center text-lg">{avatarText}</div>
        ) : null}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-white">{option.playerName}</div>
      </div>
    </div>
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

function StatCard({
  title,
  icon,
  entries,
  emptyText,
  valueLabel,
}: {
  title: string
  icon: React.ReactNode
  entries: TicTacToeLeaderboardEntry[]
  emptyText: string
  valueLabel: "wins" | "games" | "rating"
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.34em] text-slate-500">
        {icon}
        {title}
      </div>
      <div className="mt-4 space-y-3">
        {entries.length ? entries.map((entry, index) => (
          <div key={entry.userId} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="w-6 text-sm font-semibold text-slate-400">{index + 1}</div>
              <UserAvatar avatar={entry.avatar} label={entry.teamName} />
              <div>
                <div className="text-sm font-semibold text-white">{entry.teamName}</div>
                <div className="text-xs text-slate-400">{entry.playerName ?? "No linked player"}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-cyan-100">{entry[valueLabel]}</div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-slate-500">{valueLabel}</div>
            </div>
          </div>
        )) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/50 px-4 py-8 text-center text-sm text-slate-500">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  )
}

function RivalCard({ rivals }: { rivals: TicTacToeRivalEntry[] }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.34em] text-slate-500">
        <Users className="h-4 w-4" />
        Rivalries
      </div>
      <div className="mt-4 space-y-3">
        {rivals.length ? rivals.map((entry) => (
          <div key={entry.userId} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3">
            <div className="flex items-center gap-3">
              <UserAvatar avatar={entry.avatar} label={entry.teamName} />
              <div>
                <div className="text-sm font-semibold text-white">{entry.teamName}</div>
                <div className="text-xs text-slate-400">{entry.playerName ?? "No linked player"}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-cyan-100">{entry.games}</div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Games</div>
            </div>
          </div>
        )) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/50 px-4 py-8 text-center text-sm text-slate-500">
            No online rivalries yet.
          </div>
        )}
      </div>
    </div>
  )
}

type SearchableCellOption = TicTacToeCellOption & { isValidForCell?: boolean }

type OnlineUser = {
  userId: string
  displayName: string
  avatar?: string
}

type IncomingChallenge = {
  id: string
  fromUserId: string
  displayName?: string
  avatar?: string
  expiresAt?: string
}

type OutgoingChallenge = {
  id: string
  toUserId: string
  displayName?: string
  avatar?: string
  expiresAt?: string
}

type TicTacToeHomeProps = TicTacToePageData

const difficultyLabels: Record<TicTacToeDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  all: "All",
}

const winningLines = [
  ["0:0", "0:1", "0:2"],
  ["1:0", "1:1", "1:2"],
  ["2:0", "2:1", "2:2"],
  ["0:0", "1:0", "2:0"],
  ["0:1", "1:1", "2:1"],
  ["0:2", "1:2", "2:2"],
  ["0:0", "1:1", "2:2"],
  ["0:2", "1:1", "2:0"],
]

export function TicTacToeHome({ boards, searchablePlayers, topWins, mostGames, rivals }: TicTacToeHomeProps) {
  const [mode, setMode] = useState<"solo" | "online">("solo")
  const [difficulty, setDifficulty] = useState<TicTacToeDifficulty>("medium")
  const [boardIndexByDifficulty, setBoardIndexByDifficulty] = useState<Record<TicTacToeDifficulty, number>>({
    easy: 0,
    medium: 0,
    hard: 0,
    all: 0,
  })
  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null)
  const [filledCells, setFilledCells] = useState<Record<string, TicTacToeCellOption>>({})
  const [search, setSearch] = useState("")
  const [searchError, setSearchError] = useState("")
  const [showWinBanner, setShowWinBanner] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [incomingChallenges, setIncomingChallenges] = useState<IncomingChallenge[]>([])
  const [outgoingChallenges, setOutgoingChallenges] = useState<OutgoingChallenge[]>([])
  const [onlineError, setOnlineError] = useState("")

  const boardPool = boards[difficulty] ?? []
  const board = boardPool.length
    ? boardPool[boardIndexByDifficulty[difficulty] % boardPool.length]
    : null

  function getNextBoardIndex(current: number, total: number) {
    if (total <= 1) {
      return 0
    }

    const next = Math.floor(Math.random() * total)
    return next === current ? (current + 1) % total : next
  }

  const selectedCell = useMemo(() => board?.cells.find((cell) => cell.key === selectedCellKey) ?? null, [board, selectedCellKey])
  const winningCellKeys = useMemo(() => {
    if (!board) return [] as string[]

    const coordToKey = new Map(board.cells.map((cell) => [`${cell.row}:${cell.col}`, cell.key]))

    for (const line of winningLines) {
      const options = line.map((coord) => {
        const key = coordToKey.get(coord)
        return key ? filledCells[key] : null
      })

      if (options.some((value) => !value)) {
        continue
      }

      const players = options as TicTacToeCellOption[]
      const uniqueIds = new Set(players.map((player) => player.playerObjectId))
      if (uniqueIds.size === 3) {
        return line
          .map((coord) => coordToKey.get(coord))
          .filter((value): value is string => Boolean(value))
      }
    }

    return [] as string[]
  }, [board, filledCells])
  const hasWon = winningCellKeys.length > 0
  const filteredOptions = useMemo<SearchableCellOption[]>(() => {
    if (!selectedCell) return []
    const trimmedSearch = search.trim().toLowerCase()
    if (!trimmedSearch) return []
    const usedPlayerIds = new Set(Object.values(filledCells).map((entry) => entry.playerObjectId))
    const validOptionsById = new Map(selectedCell.options.map((option) => [option.playerObjectId, option]))
    return searchablePlayers
      .filter((option) => !usedPlayerIds.has(option.playerObjectId) || filledCells[selectedCell.key]?.playerObjectId === option.playerObjectId)
      .filter((option) => option.playerName.toLowerCase().includes(trimmedSearch))
      .map((option) => {
        const validOption = validOptionsById.get(option.playerObjectId)
        return {
          ...option,
          kitImage: validOption?.kitImage,
          teamImage: validOption?.teamImage,
          teamName: validOption?.teamName,
          isValidForCell: Boolean(validOption),
        }
      })
      .slice(0, 12)
  }, [filledCells, search, searchablePlayers, selectedCell])

  function setCellOption(option: TicTacToeCellOption) {
    if (!selectedCell) return
    const isValid = selectedCell.options.some((candidate) => candidate.playerObjectId === option.playerObjectId)
    if (!isValid) {
      setSearchError("Wrong pick. This player is not valid for this square.")
      return
    }
    setFilledCells((current) => ({ ...current, [selectedCell.key]: option }))
    setSelectedCellKey(null)
    setSearch("")
    setSearchError("")
  }

  function clearBoard() {
    setFilledCells({})
    setSelectedCellKey(null)
    setSearch("")
    setSearchError("")
    setShowWinBanner(false)
    setBoardIndexByDifficulty((current) => ({
      ...current,
      [difficulty]: getNextBoardIndex(current[difficulty], boardPool.length),
    }))
  }

  useEffect(() => {
    if (hasWon) {
      setShowWinBanner(true)
    }
  }, [hasWon])

  useEffect(() => {
    let mounted = true

    async function refreshOnline() {
      try {
        const response = await fetch("/api/tictactoe/online", { method: "POST" })
        if (!response.ok) return
        const data = await response.json() as {
          onlineUsers?: OnlineUser[]
          incoming?: IncomingChallenge[]
          outgoing?: OutgoingChallenge[]
        }
        if (!mounted) return
        setOnlineUsers(data.onlineUsers ?? [])
        setIncomingChallenges(data.incoming ?? [])
        setOutgoingChallenges(data.outgoing ?? [])
        setOnlineError("")
    } catch {
      if (!mounted) return
      setOnlineError("Unable to load online players.")
    }
    }

    refreshOnline()
    const interval = window.setInterval(refreshOnline, 20000)
    return () => {
      mounted = false
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (!showWinBanner) return

    const timeout = window.setTimeout(() => {
      setShowWinBanner(false)
    }, 2600)

    return () => window.clearTimeout(timeout)
  }, [showWinBanner])

  return (
    <>
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <section className="rounded-[34px] border border-white/10 bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/55 p-7 shadow-[0_24px_70px_rgba(3,10,24,0.46)]">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-slate-950/70 px-4 py-2 text-[11px] uppercase tracking-[0.35em] text-cyan-100">
                  <Grid3X3 className="h-4 w-4" />
                  Tic Tac Toe
                </div>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Tic Tac Toe</h1>
                <p className="mt-3 max-w-3xl text-base text-slate-300">
                  Build a 3x3 grid with club crests and national flags. Every square must match a real player who played for that team and carries that flag.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded-full border border-white/10 bg-slate-950/55 p-2">
                {([
                  { key: "solo", label: "Solo", icon: Bot },
                  { key: "online", label: "Online", icon: Swords },
                ] as const).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setMode(item.key)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition",
                      mode === item.key
                        ? "bg-cyan-400/15 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.22)]"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {mode === "solo" ? (
            <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[30px] border border-white/10 bg-slate-900/60 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.34em] text-slate-500">Solo board</div>
                    <div className="mt-2 text-3xl font-semibold text-white">Find the player</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/55 p-1.5">
                      {(["easy", "medium", "hard", "all"] as TicTacToeDifficulty[]).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            setDifficulty(item)
                            setFilledCells({})
                            setSelectedCellKey(null)
                            setSearch("")
                            setSearchError("")
                            setBoardIndexByDifficulty((current) => ({
                              ...current,
                              [item]: getNextBoardIndex(current[item], boards[item].length),
                            }))
                          }}
                          className={cn(
                            "rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] transition",
                            difficulty === item
                              ? "bg-cyan-400/15 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.22)]"
                              : "text-slate-300 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          {difficultyLabels[item]}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={clearBoard}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                    >
                      Reset board
                    </button>
                  </div>
                </div>

                {hasWon ? (
                  <div className="mt-5 rounded-[24px] border border-emerald-300/20 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.22),transparent_55%),linear-gradient(135deg,rgba(6,78,59,0.7),rgba(4,47,46,0.85))] px-5 py-4 shadow-[0_18px_40px_rgba(4,120,87,0.22)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.35em] text-emerald-100/80">Victory</div>
                        <div className="mt-1 text-2xl font-semibold text-white">Tic Tac Toe completed</div>
                        <div className="mt-1 text-sm text-emerald-50/80">You completed a valid three-in-a-row. Reset the board to try another combination.</div>
                      </div>
                      <div className="text-4xl">🏆</div>
                    </div>
                  </div>
                ) : null}

                {board ? (
                  <div className="mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_34%),linear-gradient(180deg,#0b1325_0%,#0a1020_100%)] p-4">
                    <div className="grid grid-cols-[120px_repeat(3,minmax(0,1fr))] gap-3">
                      <div />
                      {board.columns.map((column) => (
                        <div key={column.id} className="flex min-h-[112px] flex-col items-center justify-center rounded-[22px] border border-white/10 bg-slate-950/55 px-3 py-4 text-center">
                          {column.image ? (
                            <Image src={column.image} alt={column.name} width={54} height={54} className="h-14 w-14 object-contain" />
                          ) : (
                            <Shield className="h-12 w-12 text-slate-500" />
                          )}
                          <div className="mt-3 line-clamp-2 text-sm font-semibold text-white">{column.name}</div>
                        </div>
                      ))}

                      {board.rows.map((country, rowIndex) => (
                        <div key={country} className="contents">
                          <div className="flex min-h-[112px] flex-col items-center justify-center rounded-[22px] border border-white/10 bg-slate-950/55 px-3 py-4 text-center">
                            <FlagBadge country={country} className="h-14 w-14 rounded-full ring-2 ring-slate-900" />
                            <div className="mt-3 text-sm font-semibold text-white">{country}</div>
                          </div>

                          {board.cells
                            .filter((cell) => cell.row === rowIndex)
                            .map((cell) => {
                              const selected = filledCells[cell.key]
                              return (
                                <button
                                  key={cell.key}
                                  type="button"
                                  onClick={() => {
                                    if (hasWon) return
                                    setSelectedCellKey(cell.key)
                                  }}
                                  className={cn(
                                    "group min-h-[112px] rounded-[22px] border bg-emerald-500/10 p-3 text-left transition hover:border-cyan-300/25 hover:bg-emerald-500/15",
                                    winningCellKeys.includes(cell.key)
                                      ? "border-emerald-300/45 bg-emerald-400/20 shadow-[0_0_0_1px_rgba(110,231,183,0.25),0_0_28px_rgba(52,211,153,0.16)]"
                                      : "border-white/10"
                                  )}
                                  disabled={hasWon}
                                >
                                  {selected ? (
                                    <FilledPlayerBadge option={selected} />
                                  ) : (
                                    <div className="flex h-full flex-col items-center justify-center text-center">
                                      <div className="text-sm font-semibold text-white transition group-hover:text-cyan-100">Find player</div>
                                      <div className="mt-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">
                                        {cell.options.length} valid
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
                ) : (
                  <div className="mt-6 rounded-[24px] border border-dashed border-white/10 bg-slate-950/50 px-5 py-10 text-center text-sm text-slate-400">
                    No valid board could be generated for this difficulty with the current team/flag pool.
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <RivalCard rivals={rivals} />
              </div>
            </section>
          ) : (
            <section className="mt-8 grid gap-6 xl:grid-cols-3">
              <StatCard title="Top wins" icon={<Trophy className="h-4 w-4" />} entries={topWins} emptyText="No finished online games yet." valueLabel="wins" />
              <StatCard title="Most games" icon={<Grid3X3 className="h-4 w-4" />} entries={mostGames} emptyText="No online activity yet." valueLabel="games" />
              <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.34em] text-slate-500">
                  <Users className="h-4 w-4" />
                  Online players
                </div>
                <div className="mt-4 space-y-3">
                  {onlineError ? (
                    <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                      {onlineError}
                    </div>
                  ) : null}
                  {onlineUsers.length ? onlineUsers.map((entry) => {
                    const pending = outgoingChallenges.some((challenge) => challenge.toUserId === entry.userId)
                    return (
                      <div key={entry.userId} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar avatar={entry.avatar} label={entry.displayName} />
                          <div className="text-sm font-semibold text-white">{entry.displayName}</div>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            if (pending) return
                            await fetch("/api/tictactoe/challenge", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ targetUserId: entry.userId }),
                            })
                          }}
                          className={cn(
                            "rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition",
                            pending
                              ? "cursor-default border border-white/10 bg-white/5 text-slate-400"
                              : "border border-cyan-300/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"
                          )}
                        >
                          {pending ? "Pending" : "Challenge"}
                        </button>
                      </div>
                    )
                  }) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/50 px-4 py-8 text-center text-sm text-slate-500">
                      No online players yet.
                    </div>
                  )}
                </div>

                {incomingChallenges.length ? (
                  <div className="mt-6">
                    <div className="text-[10px] uppercase tracking-[0.32em] text-slate-500">Requests</div>
                    <div className="mt-3 space-y-3">
                      {incomingChallenges.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3">
                          <div className="flex items-center gap-3">
                            <UserAvatar avatar={entry.avatar} label={entry.displayName || "Rival"} />
                            <div className="text-sm font-semibold text-white">{entry.displayName ?? "Rival"}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                await fetch("/api/tictactoe/challenge/respond", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ challengeId: entry.id, action: "decline" }),
                                })
                              }}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-300 hover:bg-white/10 hover:text-white"
                            >
                              Decline
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const response = await fetch("/api/tictactoe/challenge/respond", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ challengeId: entry.id, action: "accept" }),
                                })
                                if (!response.ok) return
                                const payload = await response.json() as { gameId?: string }
                                if (payload.gameId) {
                                  window.location.href = `/tic-tac-toe/online/${payload.gameId}`
                                  return
                                }
                              }}
                              className="rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-50 hover:bg-emerald-400/25"
                            >
                              Accept
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          )}
        </div>
      </div>

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
                onClick={() => {
                  setSelectedCellKey(null)
                  setSearch("")
                  setSearchError("")
                }}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                Close
              </button>
            </div>

            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setSearchError("")
              }}
              placeholder="Search player..."
              className="mt-5 h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/30"
            />

            {searchError ? (
              <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {searchError}
              </div>
            ) : null}

            <div className="mt-5 max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {!search.trim() ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/50 px-4 py-8 text-center text-sm text-slate-500">
                  Start typing to search any player.
                </div>
              ) : filteredOptions.length ? filteredOptions.map((option) => (
                <button
                  key={option.playerObjectId}
                  type="button"
                  onClick={() => setCellOption(option)}
                  className="block w-full text-left"
                >
                  <PlayerOptionChip option={option} />
                </button>
              )) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/50 px-4 py-8 text-center text-sm text-slate-500">
                  No players match that search.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showWinBanner ? (
        <div className="pointer-events-none fixed inset-x-0 top-28 z-[130] flex justify-center px-4">
          <div className="animate-[fadeInOut_2.6s_ease-in-out_forwards] rounded-full border border-emerald-300/25 bg-[linear-gradient(135deg,rgba(16,185,129,0.95),rgba(6,95,70,0.95))] px-6 py-3 shadow-[0_20px_60px_rgba(4,120,87,0.35)]">
            <div className="flex items-center gap-3 text-white">
              <span className="text-2xl">✨</span>
              <div>
                <div className="text-[10px] uppercase tracking-[0.35em] text-emerald-50/75">Winner</div>
                <div className="text-base font-semibold">You completed the board</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        @keyframes fadeInOut {
          0% {
            opacity: 0;
            transform: translateY(-10px) scale(0.98);
          }
          12% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          82% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-6px) scale(0.985);
          }
        }
      `}</style>
    </>
  )
}

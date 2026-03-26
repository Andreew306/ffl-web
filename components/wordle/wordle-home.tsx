"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { Check, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type DailyWordle = {
  answer: string
  answerDisplay: string
  length: number
  dateKey: string
}

type GuessStatus = "correct" | "present" | "absent"

type Props = {
  daily: DailyWordle
  leaderboard: {
    dateKey: string
    results: Array<{
      discordId: string
      discordName?: string | null
      discordAvatar: string | null
      attempts: number
      solved: boolean
    }>
  }
}

const MAX_GUESSES = 6
const WORDLE_REWARD = 50

function normalizeLetters(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function buildPattern(value: string) {
  const pattern = value
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  const slots = Array.from(pattern).filter((char) => char !== " ").length
  return { pattern, slots }
}

function applyPattern(pattern: string, letters: string) {
  let index = 0
  return Array.from(pattern)
    .map((char) => {
      if (char === " ") return " "
      const letter = letters[index] ?? ""
      index += 1
      return letter
    })
    .join("")
}

function evaluateGuessWithPattern(answer: string, guess: string, pattern: string): Array<GuessStatus | "space"> {
  const statuses = evaluateGuess(answer, guess)
  let idx = 0
  return Array.from(pattern).map((char) => {
    if (char === " ") return "space"
    const status = statuses[idx] ?? "absent"
    idx += 1
    return status
  })
}

function evaluateGuess(answer: string, guess: string): GuessStatus[] {
  const result: GuessStatus[] = Array.from({ length: guess.length }, () => "absent")
  const answerChars = answer.split("")
  const guessChars = guess.split("")

  // First pass: correct positions
  for (let i = 0; i < guessChars.length; i += 1) {
    if (guessChars[i] === answerChars[i]) {
      result[i] = "correct"
      answerChars[i] = "*"
      guessChars[i] = "_"
    }
  }

  // Second pass: present letters
  for (let i = 0; i < guessChars.length; i += 1) {
    const letter = guessChars[i]
    if (letter === "_") continue
    const idx = answerChars.indexOf(letter)
    if (idx !== -1) {
      result[i] = "present"
      answerChars[idx] = "*"
    }
  }

  return result
}

export function WordleHome({ daily, leaderboard }: Props) {
  const [guesses, setGuesses] = useState<string[]>([])
  const [input, setInput] = useState("")
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"play" | "results" | "practice">("play")
  const [results, setResults] = useState<Props["leaderboard"]["results"]>(leaderboard.results)
  const [selectedDate, setSelectedDate] = useState(daily.dateKey)
  const [selectedAnswer, setSelectedAnswer] = useState(daily.answerDisplay)
  const [answerMissing, setAnswerMissing] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarView, setCalendarView] = useState(() => {
    const [year, month] = daily.dateKey.split("-").map((value) => Number(value))
    return { year, month }
  })
  const [betballCoins, setBetballCoins] = useState(0)
  const [dailyCompleted, setDailyCompleted] = useState(false)
  const [hintError, setHintError] = useState("")
  const [canBuyHints, setCanBuyHints] = useState(true)
  const [resetCountdown, setResetCountdown] = useState("")
  const [hints, setHints] = useState<{
    teamImage: string | null
    teamName: string | null
    exactLetter: string | null
    exactIndex: number | null
    presentLetter: string | null
    country: string | null
    position: string | null
  }>({
    teamImage: null,
    teamName: null,
    exactLetter: null,
    exactIndex: null,
    presentLetter: null,
    country: null,
    position: null,
  })
  const submittedRef = useRef(false)
  const storageKey = useMemo(() => `wordle:v4:${daily.dateKey}:guesses`, [daily.dateKey])

  const normalizedInput = useMemo(() => normalizeLetters(input), [input])
  const dailyPattern = useMemo(() => buildPattern(daily.answerDisplay), [daily.answerDisplay])
  const canSubmit =
    normalizedInput.length === dailyPattern.slots && guesses.length < MAX_GUESSES && !dailyCompleted
  const solvedIndex = guesses.findIndex((guess) => guess === daily.answer)
  const solved = solvedIndex !== -1
  const reveal = (!solved && guesses.length >= MAX_GUESSES) || (dailyCompleted && !solved)

  const rows = useMemo(() => {
    const base = [...guesses]
    while (base.length < MAX_GUESSES) base.push("")
    return base
  }, [guesses])

  useEffect(() => {
    setResults(leaderboard.results)
  }, [leaderboard.results])

  useEffect(() => {
    submittedRef.current = false
    setGuesses([])
    setInput("")
    setError("")
    setActiveTab("play")
    setSelectedDate(daily.dateKey)
    setSelectedAnswer(daily.answerDisplay)
    setAnswerMissing(false)
    setDailyCompleted(false)
    setHintError("")
    setCanBuyHints(true)
    setHints({
      teamImage: null,
      teamName: null,
      exactLetter: null,
      exactIndex: null,
      presentLetter: null,
      country: null,
      position: null,
    })
    setCalendarView(() => {
      const [year, month] = daily.dateKey.split("-").map((value) => Number(value))
      return { year, month }
    })
  }, [daily.dateKey])

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null
    if (!saved) return
    try {
      const parsed = JSON.parse(saved) as string[]
      if (Array.isArray(parsed)) {
        setGuesses(parsed.slice(0, MAX_GUESSES))
      }
    } catch {}
  }, [storageKey])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(storageKey, JSON.stringify(guesses))
  }, [guesses, storageKey])

  useEffect(() => {
    if (submittedRef.current) return
    if (!solved && guesses.length < MAX_GUESSES) return

    submittedRef.current = true
    const attempts = solved ? solvedIndex + 1 : MAX_GUESSES

    void fetch("/api/wordle/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attempts, solved }),
    })
      .then(() => fetch(`/api/wordle/leaderboard?dateKey=${daily.dateKey}`))
      .then(async (response) => {
        if (!response.ok) return null
        return (await response.json()) as Props["leaderboard"]
      })
      .then((payload) => {
        if (payload?.results) {
          setResults(payload.results)
        }
      })
      .catch(() => {})
  }, [daily.dateKey, guesses, solved, solvedIndex])

  useEffect(() => {
    void fetch(`/api/wordle/leaderboard?dateKey=${selectedDate}`)
      .then(async (response) => {
        if (!response.ok) return null
        return (await response.json()) as Props["leaderboard"]
      })
      .then((payload) => {
        if (payload?.results) {
          setResults(payload.results)
        }
      })
      .catch(() => {})

    void fetch(`/api/wordle/daily?dateKey=${selectedDate}`)
      .then(async (response) => {
        if (!response.ok) return null
        return (await response.json()) as { answerDisplay?: string | null }
      })
      .then((payload) => {
        if (payload?.answerDisplay) {
          setSelectedAnswer(payload.answerDisplay)
          setAnswerMissing(false)
        } else {
          setSelectedAnswer("Not found")
          setAnswerMissing(true)
        }
      })
      .catch(() => {
        setSelectedAnswer("Not found")
        setAnswerMissing(true)
      })
  }, [selectedDate])

  useEffect(() => {
    void fetch(`/api/wordle/status?dateKey=${daily.dateKey}`)
      .then(async (response) => {
        if (response.status === 401) {
          setCanBuyHints(false)
          setHintError("Sign in to buy hints.")
          return null
        }
        if (!response.ok) return null
        return (await response.json()) as {
          betballCoins?: number
          completed?: boolean
          hints?: {
            teamImage?: string | null
            teamName?: string | null
            exactLetter?: string | null
            exactIndex?: number | null
            presentLetter?: string | null
            country?: string | null
            position?: string | null
          }
        }
      })
      .then((payload) => {
        if (!payload) return
        setBetballCoins(Number(payload.betballCoins ?? 0))
        setDailyCompleted(Boolean(payload.completed))
        setCanBuyHints(true)
        setHints({
          teamImage: payload.hints?.teamImage ?? null,
          teamName: payload.hints?.teamName ?? null,
          exactLetter: payload.hints?.exactLetter ?? null,
          exactIndex: payload.hints?.exactIndex ?? null,
          presentLetter: payload.hints?.presentLetter ?? null,
          country: payload.hints?.country ?? null,
          position: payload.hints?.position ?? null,
        })
      })
      .catch(() => {})
  }, [daily.dateKey])

  useEffect(() => {
    if (solved || guesses.length >= MAX_GUESSES) {
      setDailyCompleted(true)
    }
  }, [guesses.length, solved])

  useEffect(() => {
    if (!calendarOpen) return
    const [year, month] = selectedDate.split("-").map((value) => Number(value))
    setCalendarView({ year, month })
  }, [calendarOpen, selectedDate])

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const madridNow = new Date(
        now.toLocaleString("en-US", { timeZone: "Europe/Madrid" })
      )
      const next = new Date(madridNow)
      next.setHours(24, 0, 0, 0)
      const diff = Math.max(next.getTime() - madridNow.getTime(), 0)
      const hours = Math.floor(diff / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setResetCountdown(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      )
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  const calendar = useMemo(() => {
    const { year, month } = calendarView
    const current = new Date(year, month - 1, 1)
    const monthLabel = current.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    })
    const startDay = new Date(year, month - 1, 1).getDay()
    const daysInMonth = new Date(year, month, 0).getDate()
    const leading = (startDay + 6) % 7
    const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7
    const cells = Array.from({ length: totalCells }, (_, idx) => {
      const day = idx - leading + 1
      if (day < 1 || day > daysInMonth) return null
      const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      return { day, dateKey }
    })

    return { monthLabel, cells, year, month }
  }, [calendarView])

  return (
    <div className="container mx-auto px-4 pb-16 pt-8">
      <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/70 to-slate-950/80 p-8 shadow-[0_30px_80px_rgba(4,8,18,0.55)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Minigame</div>
            <div className="mt-2 text-3xl font-semibold text-white">Wordle</div>
            <div className="mt-2 text-sm text-slate-400">
              Guess today&apos;s player in {dailyPattern.slots} letters. {MAX_GUESSES} attempts.
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-[18px] border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-xs uppercase tracking-[0.3em] text-emerald-100">
              {daily.dateKey}
            </div>
            <div className="rounded-[22px] border border-cyan-300/20 bg-[radial-gradient(circle_at_30%_30%,rgba(34,211,238,0.2),transparent_42%),linear-gradient(135deg,#11253a_0%,#0a1220_55%,#0c1d2c_100%)] px-4 py-3 shadow-[0_16px_30px_rgba(5,12,24,0.35)]">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 rounded-full bg-slate-950/80 ring-1 ring-white/10">
                  <Image src="/ffl-logo2.png" alt="FFL Coin" fill sizes="40px" className="object-contain invert" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-100/70">FFL Coin</div>
                  <div className="text-xl font-semibold text-white">
                    {betballCoins.toLocaleString("en-US")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {(["play", "results", "practice"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition",
                activeTab === tab
                  ? "border border-cyan-300/30 bg-cyan-400/15 text-cyan-100"
                  : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              )}
            >
              {tab === "play" ? "Play" : tab === "results" ? "Daily results" : "Practice"}
            </button>
          ))}
        </div>

        {activeTab === "play" ? (
          <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="rounded-[24px] border border-white/10 bg-slate-950/60 p-6">
              <div className="space-y-3">
                {rows.map((guess, rowIndex) => {
                  const filled = guess ? applyPattern(dailyPattern.pattern, guess) : ""
                  const evaluated = guess
                    ? evaluateGuessWithPattern(daily.answer, guess, dailyPattern.pattern)
                    : []
                  const segments = dailyPattern.pattern.split(" ")
                  const segmentWords = filled.split(" ")
                  return (
                    <div key={`${rowIndex}-${guess}`} className="flex flex-wrap gap-6">
                      {segments.map((segment, segmentIndex) => (
                        <div
                          key={`${rowIndex}-${segmentIndex}`}
                          className="grid gap-2"
                          style={{ gridTemplateColumns: `repeat(${segment.length}, minmax(0, 1fr))` }}
                        >
                          {Array.from({ length: segment.length }).map((_, index) => {
                            const absoluteIndex =
                              segments.slice(0, segmentIndex).join("").length
                              + segments.slice(0, segmentIndex).length
                              + index
                            const letter = segmentWords[segmentIndex]?.[index]?.toUpperCase() ?? ""
                            const status = evaluated[absoluteIndex]
                            return (
                              <div
                                key={`${rowIndex}-${segmentIndex}-${index}`}
                                className={cn(
                                  "flex h-11 w-11 items-center justify-center rounded-xl border text-sm font-semibold uppercase",
                                  status === "correct" && "border-emerald-300/30 bg-emerald-400/20 text-emerald-50",
                                  status === "present" && "border-amber-300/30 bg-amber-400/15 text-amber-50",
                                  status === "absent" && guess && "border-white/10 bg-slate-900/70 text-slate-400",
                                  !guess && "border-white/10 bg-slate-900/40 text-slate-600"
                                )}
                              >
                                {letter}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={`Enter ${dailyPattern.slots} letters`}
                  disabled={dailyCompleted}
                  className="flex-1 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <button
                  type="button"
                  disabled={!canSubmit || solved}
                  onClick={() => {
                    if (!canSubmit) return
                    setError("")
                    void fetch(`/api/wordle/validate?guess=${encodeURIComponent(input.trim())}`)
                      .then(async (response) => {
                        if (!response.ok) return { valid: false }
                        return (await response.json()) as { valid: boolean }
                      })
                      .then((payload) => {
                        if (!payload?.valid) {
                          setError("Only player names are allowed.")
                          return
                        }
                        setGuesses((prev) => [...prev, normalizedInput])
                        setInput("")
                      })
                      .catch(() => setError("Unable to validate the player name."))
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  Submit
                </button>
              </div>
              {error ? <div className="mt-3 text-sm text-rose-300">{error}</div> : null}
            </div>

            <div className="rounded-[24px] border border-white/10 bg-slate-950/60 p-6">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Today</div>
              <div className="mt-3 text-2xl font-semibold text-white">
                {solved || reveal ? daily.answerDisplay : "Hidden"}
              </div>
              <div className="mt-2 text-sm text-slate-400">
                {solved ? "Nice. You got it." : reveal ? "Revealed." : "Solve to unlock the name."}
              </div>

              <div className="mt-6 space-y-3 text-sm text-slate-300">
                <div>Green = correct</div>
                <div>Yellow = present</div>
                <div>Gray = not in name</div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200">
                  Daily challenge
                </div>
                <div className="text-xs uppercase tracking-[0.3em] text-emerald-200">
                  +{WORDLE_REWARD} FFL Coins on completion
                </div>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Reset in {resetCountdown}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/90 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Hints store</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-emerald-200">FFL Coins</div>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-slate-200">
                  {[
                    { key: "team", label: "Team name", cost: 25 },
                    { key: "exact", label: "Exact letter", cost: 20 },
                    { key: "present", label: "Letter (not exact)", cost: 15 },
                    { key: "country", label: "Nationality", cost: 10 },
                    { key: "position", label: "Position", cost: 5 },
                  ].map((hint) => {
                    const owned =
                      (hint.key === "team" && hints.teamImage)
                      || (hint.key === "exact" && hints.exactLetter)
                      || (hint.key === "present" && hints.presentLetter)
                      || (hint.key === "country" && hints.country)
                      || (hint.key === "position" && hints.position)
                    const disabled = owned || dailyCompleted || !canBuyHints
                    return (
                      <button
                        key={hint.key}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setHintError("")
                          void fetch("/api/wordle/hint", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ type: hint.key }),
                          })
                            .then(async (response) => {
                              if (response.status === 401) {
                                setHintError("Sign in to buy hints.")
                                return null
                              }
                              const payload = (await response.json().catch(() => null)) as
                                | { betballCoins?: number; hint?: Record<string, unknown>; error?: string }
                                | null
                              if (!response.ok) {
                                setHintError(payload?.error ?? "Unable to buy hint.")
                                return null
                              }
                              return payload
                            })
                            .then((payload) => {
                              if (!payload) return
                              if (typeof payload.betballCoins === "number") {
                                setBetballCoins(payload.betballCoins)
                              }
                              if (payload.hint) {
                                setHints((prev) => ({ ...prev, ...payload.hint }))
                              }
                            })
                            .catch(() => setHintError("Unable to buy hint."))
                        }}
                        className={cn(
                          "flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition",
                          owned
                            ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
                            : "border-white/10 bg-slate-950/60 text-slate-200 hover:border-cyan-300/30 hover:bg-cyan-400/10",
                          (dailyCompleted || !canBuyHints) && "opacity-50"
                        )}
                      >
                        <span>{hint.label}</span>
                        <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                          {owned ? "Owned" : `${hint.cost} coins`}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {hintError ? <div className="mt-3 text-xs text-rose-300">{hintError}</div> : null}
                <div className="mt-4 grid gap-2 text-xs text-slate-300">
                  {hints.teamImage ? (
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={hints.teamImage} alt={hints.teamName ?? "Team"} className="h-5 w-5 rounded-full" />
                      <span>{hints.teamName ?? "Team logo revealed"}</span>
                    </div>
                  ) : null}
                  {hints.country ? <div>Nationality: {hints.country}</div> : null}
                  {hints.position ? <div>Position: {hints.position}</div> : null}
                  {hints.exactLetter ? (
                    <div>
                      Exact letter {hints.exactIndex}: {hints.exactLetter}
                    </div>
                  ) : null}
                  {hints.presentLetter ? <div>Letter present: {hints.presentLetter}</div> : null}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "results" ? (
          <div className="mt-8 rounded-[24px] border border-white/10 bg-slate-950/60 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Daily results</div>
                <div className="mt-2 text-2xl font-semibold text-white">{selectedDate}</div>
                <div className="mt-2 text-sm text-slate-400">
                  Wordle answer:{" "}
                  <span className="text-white">{answerMissing ? "Not found" : selectedAnswer}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm text-slate-400">{results?.length ?? 0} completed</div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCalendarOpen((prev) => !prev)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.22em] text-slate-200 transition hover:bg-white/10"
                  >
                    Pick date
                    <span className="text-slate-400">{selectedDate}</span>
                  </button>
                  {calendarOpen ? (
                    <div className="absolute right-0 z-20 mt-3 w-64 rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-[0_20px_50px_rgba(4,10,20,0.6)]">
                      <div className="flex items-center justify-between">
                        <div className="text-xs uppercase tracking-[0.22em] text-slate-400">{calendar.monthLabel}</div>
                        <div className="text-xs text-slate-500">Madrid</div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const prev = new Date(calendar.year, calendar.month - 2, 1)
                            setCalendarView({ year: prev.getFullYear(), month: prev.getMonth() + 1 })
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-slate-300 transition hover:bg-white/10"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <select
                          value={calendar.year}
                          onChange={(event) => {
                            const nextYear = Number(event.target.value)
                            setCalendarView((prev) => ({ ...prev, year: nextYear }))
                          }}
                          className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200"
                        >
                          {Array.from({ length: 8 }).map((_, idx) => {
                            const year = new Date().getFullYear() - 5 + idx
                            return (
                              <option key={year} value={year} className="bg-slate-950 text-slate-100">
                                {year}
                              </option>
                            )
                          })}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const next = new Date(calendar.year, calendar.month, 1)
                            setCalendarView({ year: next.getFullYear(), month: next.getMonth() + 1 })
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-slate-300 transition hover:bg-white/10"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 grid grid-cols-7 gap-1 text-[11px] uppercase text-slate-500">
                        {["M", "T", "W", "T", "F", "S", "S"].map((label) => (
                          <div key={label} className="text-center">
                            {label}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 grid grid-cols-7 gap-1">
                        {calendar.cells.map((cell, idx) => (
                          <button
                            key={`${cell?.dateKey ?? "empty"}-${idx}`}
                            type="button"
                            onClick={() => {
                              if (!cell) return
                              setSelectedDate(cell.dateKey)
                              setCalendarOpen(false)
                            }}
                            className={cn(
                              "h-8 rounded-lg text-xs transition",
                              cell
                                ? "border border-white/5 text-slate-200 hover:border-cyan-300/40 hover:bg-cyan-400/10"
                                : "border border-transparent"
                            )}
                          >
                            {cell?.day ?? ""}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              {(results ?? []).map((entry) => (
                <div
                  key={`${entry.discordId}-${entry.attempts}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-slate-800">
                      {entry.discordAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={entry.discordAvatar} alt={entry.discordId} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {entry.discordName?.trim() || entry.discordId}
                      </div>
                      <div className="text-xs text-slate-400">
                        {entry.solved ? "Solved" : "Missed"}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-cyan-100">
                    {entry.attempts}/{MAX_GUESSES}
                  </div>
                </div>
              ))}
              {!results?.length ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-slate-400">
                  No results yet.
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <WordlePractice />
        )}
      </div>
    </div>
  )
}

function WordlePractice() {
  const [practice, setPractice] = useState<{
    answer: string
    answerDisplay: string
    length: number
  } | null>(null)
  const [guesses, setGuesses] = useState<string[]>([])
  const [input, setInput] = useState("")
  const [error, setError] = useState("")
  const [reveal, setReveal] = useState(false)
  const [hintError, setHintError] = useState("")
  const [hints, setHints] = useState<{
    teamName: string | null
    teamImage: string | null
    exactLetter: string | null
    exactIndex: number | null
    presentLetter: string | null
    country: string | null
    position: string | null
  }>({
    teamName: null,
    teamImage: null,
    exactLetter: null,
    exactIndex: null,
    presentLetter: null,
    country: null,
    position: null,
  })

  useEffect(() => {
    void fetch("/api/wordle/practice")
      .then(async (response) => {
        if (!response.ok) return null
        return (await response.json()) as { answer: string; answerDisplay: string; length: number }
      })
      .then((payload) => {
        if (!payload) return
        setPractice(payload)
        setGuesses([])
        setInput("")
        setReveal(false)
        setError("")
        setHintError("")
        setHints({
          teamName: null,
          teamImage: null,
          exactLetter: null,
          exactIndex: null,
          presentLetter: null,
          country: null,
          position: null,
        })
      })
      .catch(() => {})
  }, [])

  const normalizedInput = useMemo(() => normalizeLetters(input), [input])
  const practicePattern = useMemo(() => buildPattern(practice?.answerDisplay ?? ""), [practice?.answerDisplay])
  const canSubmit = practice && normalizedInput.length === practicePattern.slots
  const solved = Boolean(practice && guesses.some((guess) => guess === practice.answer))

  const rows = useMemo(() => {
    const base = [...guesses, ""]
    return base
  }, [guesses])

  if (!practice) {
    return (
      <div className="mt-8 rounded-[24px] border border-white/10 bg-slate-950/60 p-6 text-sm text-slate-400">
        Loading practice...
      </div>
    )
  }

  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="rounded-[24px] border border-white/10 bg-slate-950/60 p-6">
        <div className="space-y-3">
          {rows.map((guess, rowIndex) => {
            const filled = guess ? applyPattern(practicePattern.pattern, guess) : ""
            const evaluated = guess
              ? evaluateGuessWithPattern(practice.answer, guess, practicePattern.pattern)
              : []
            const segments = practicePattern.pattern.split(" ")
            const segmentWords = filled.split(" ")
            return (
              <div key={`${rowIndex}-${guess}`} className="flex flex-wrap gap-6">
                {segments.map((segment, segmentIndex) => (
                  <div
                    key={`${rowIndex}-${segmentIndex}`}
                    className="grid gap-2"
                    style={{ gridTemplateColumns: `repeat(${segment.length}, minmax(0, 1fr))` }}
                  >
                    {Array.from({ length: segment.length }).map((_, index) => {
                      const absoluteIndex =
                        segments.slice(0, segmentIndex).join("").length
                        + segments.slice(0, segmentIndex).length
                        + index
                      const letter = segmentWords[segmentIndex]?.[index]?.toUpperCase() ?? ""
                      const status = evaluated[absoluteIndex]
                      return (
                        <div
                          key={`${rowIndex}-${segmentIndex}-${index}`}
                          className={cn(
                            "flex h-11 w-11 items-center justify-center rounded-xl border text-sm font-semibold uppercase",
                            status === "correct" && "border-emerald-300/30 bg-emerald-400/20 text-emerald-50",
                            status === "present" && "border-amber-300/30 bg-amber-400/15 text-amber-50",
                            status === "absent" && guess && "border-white/10 bg-slate-900/70 text-slate-400",
                            !guess && "border-white/10 bg-slate-900/40 text-slate-600"
                          )}
                        >
                          {letter}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={`Enter ${practicePattern.slots} letters`}
            className="flex-1 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
          />
          <button
            type="button"
            disabled={!canSubmit || solved}
            onClick={() => {
              if (!canSubmit) return
              setError("")
              void fetch(`/api/wordle/validate?guess=${encodeURIComponent(input.trim())}`)
                .then(async (response) => {
                  if (!response.ok) return { valid: false }
                  return (await response.json()) as { valid: boolean }
                })
                .then((payload) => {
                  if (!payload?.valid) {
                    setError("Only player names are allowed.")
                    return
                  }
                  setGuesses((prev) => [...prev, normalizedInput])
                  setInput("")
                })
                .catch(() => setError("Unable to validate the player name."))
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Submit
          </button>
        </div>
        {error ? <div className="mt-3 text-sm text-rose-300">{error}</div> : null}
      </div>

      <div className="rounded-[24px] border border-white/10 bg-slate-950/60 p-6">
        <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Practice</div>
        <div className="mt-3 text-2xl font-semibold text-white">
          {solved || reveal ? practice.answerDisplay : "Hidden"}
        </div>
        <div className="mt-2 text-sm text-slate-400">
          {solved ? "Nice. You got it." : reveal ? "Revealed." : "Solve to unlock the name."}
        </div>

        <div className="mt-6 space-y-3 text-sm text-slate-300">
          <div>Green = correct</div>
          <div>Yellow = present</div>
          <div>Gray = not in name</div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setReveal(true)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200 transition hover:bg-white/10"
          >
            Reveal
          </button>
          <button
            type="button"
            onClick={() => {
              void fetch("/api/wordle/practice")
                .then(async (response) => {
                  if (!response.ok) return null
                  return (await response.json()) as {
                    answer: string
                    answerDisplay: string
                    length: number
                  }
                })
                .then((payload) => {
                  if (!payload) return
                  setPractice(payload)
                  setGuesses([])
                  setInput("")
                  setReveal(false)
                  setError("")
                  setHintError("")
                  setHints({
                    teamName: null,
                    teamImage: null,
                    exactLetter: null,
                    exactIndex: null,
                    presentLetter: null,
                    country: null,
                    position: null,
                  })
                })
                .catch(() => {})
            }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200 transition hover:bg-white/10"
          >
            Reset
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/90 p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Hints store</div>
            <div className="text-xs uppercase tracking-[0.2em] text-emerald-200">Free</div>
          </div>
          <div className="mt-4 grid gap-2 text-sm text-slate-200">
            {[
              { key: "team", label: "Team name" },
              { key: "exact", label: "Exact letter" },
              { key: "present", label: "Letter (not exact)" },
              { key: "country", label: "Nationality" },
              { key: "position", label: "Position" },
            ].map((hint) => {
              const owned =
                (hint.key === "team" && hints.teamName)
                || (hint.key === "exact" && hints.exactLetter)
                || (hint.key === "present" && hints.presentLetter)
                || (hint.key === "country" && hints.country)
                || (hint.key === "position" && hints.position)
              return (
                <button
                  key={hint.key}
                  type="button"
                  disabled={owned}
                  onClick={() => {
                    if (!practice) return
                    setHintError("")
                    if (hint.key === "team") {
                      void fetch("/api/wordle/practice-hint", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ type: hint.key, answer: practice.answer }),
                      })
                        .then(async (response) => {
                          const payload = (await response.json().catch(() => null)) as
                            | { teamName?: string | null; teamImage?: string | null; error?: string }
                            | null
                          if (!response.ok) {
                            setHintError(payload?.error ?? "Unable to get hint.")
                            return null
                          }
                          return payload
                        })
                        .then((payload) => {
                          if (!payload) return
                          setHints((prev) => ({ ...prev, ...payload }))
                        })
                        .catch(() => setHintError("Unable to get hint."))
                      return
                    }
                    if (hint.key === "country" || hint.key === "position" || hint.key === "exact" || hint.key === "present") {
                      void fetch("/api/wordle/practice-hint", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ type: hint.key, answer: practice.answer }),
                      })
                        .then(async (response) => {
                          const payload = (await response.json().catch(() => null)) as
                            | {
                                country?: string | null
                                position?: string | null
                                exactLetter?: string | null
                                exactIndex?: number | null
                                presentLetter?: string | null
                                error?: string
                              }
                            | null
                          if (!response.ok) {
                            setHintError(payload?.error ?? "Unable to get hint.")
                            return null
                          }
                          return payload
                        })
                        .then((payload) => {
                          if (!payload) return
                          setHints((prev) => ({ ...prev, ...payload }))
                        })
                        .catch(() => setHintError("Unable to get hint."))
                    }
                  }}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition",
                    owned
                      ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
                      : "border-white/10 bg-slate-950/60 text-slate-200 hover:border-cyan-300/30 hover:bg-cyan-400/10"
                  )}
                >
                  <span>{hint.label}</span>
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {owned ? "Owned" : "Free"}
                  </span>
                </button>
              )
            })}
          </div>
          {hintError ? <div className="mt-3 text-xs text-rose-300">{hintError}</div> : null}
          <div className="mt-4 grid gap-2 text-xs text-slate-300">
            {hints.teamName ? <div>Team: {hints.teamName}</div> : null}
            {hints.country ? <div>Nationality: {hints.country}</div> : null}
            {hints.position ? <div>Position: {hints.position}</div> : null}
            {hints.exactLetter ? (
              <div>
                Exact letter {hints.exactIndex}: {hints.exactLetter}
              </div>
            ) : null}
            {hints.presentLetter ? <div>Letter present: {hints.presentLetter}</div> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

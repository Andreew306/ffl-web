"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type HistoricMatch = {
  id: string
  team1Name: string
  team2Name: string
  team1Image: string
  team2Image: string
  score1: number
  score2: number
  date: string
}

type HistoricMatchesProps = {
  matches: HistoricMatch[]
}

export default function HistoricMatches({ matches }: HistoricMatchesProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const safeMatches = useMemo(() => matches.filter((match) => match.id), [matches])

  useEffect(() => {
    if (safeMatches.length <= 1) return
    const intervalId = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % safeMatches.length)
    }, 6500)
    return () => clearInterval(intervalId)
  }, [safeMatches.length])

  useEffect(() => {
    if (activeIndex >= safeMatches.length) {
      setActiveIndex(0)
    }
  }, [activeIndex, safeMatches.length])

  if (!safeMatches.length) {
    return (
      <>
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-6 text-center text-slate-400">
          No historic matches
        </div>
        <Link href="/matches">
          <Button className="w-full bg-white/10 text-white hover:bg-white/20">
            View full schedule
          </Button>
        </Link>
      </>
    )
  }

  return (
    <>
      <div className="relative min-h-[340px] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70">
        {safeMatches.map((match, index) => {
          const isActive = index === activeIndex
          return (
            <div
              key={match.id}
              className={`absolute inset-0 p-5 transition-all duration-700 ${
                isActive
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2 pointer-events-none"
              }`}
            >
              <div className="flex items-center justify-between">
                <Badge className="border border-teal-500/40 bg-teal-500/10 text-teal-200">
                  Historic
                </Badge>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                  {match.date}
                </span>
              </div>
              <div className="mt-5 space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-full bg-slate-950/60 p-2">
                      <Image
                        src={match.team1Image}
                        alt={match.team1Name}
                        width={44}
                        height={44}
                        className="h-full w-full rounded-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Home</p>
                      <p className="font-semibold text-white">{match.team1Name}</p>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Score</p>
                  <p className="mt-2 text-3xl font-semibold text-teal-200">
                    {match.score1} - {match.score2}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="ml-auto flex items-center gap-3 text-right">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Away</p>
                      <p className="font-semibold text-white">{match.team2Name}</p>
                    </div>
                    <div className="h-12 w-12 overflow-hidden rounded-full bg-slate-950/60 p-2">
                      <Image
                        src={match.team2Image}
                        alt={match.team2Name}
                        width={44}
                        height={44}
                        className="h-full w-full rounded-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between gap-3">
                <Link href={`/matches/${match.id}`}>
                  <Button className="bg-teal-400 text-slate-950 hover:bg-teal-300 shadow-[0_10px_25px_rgba(45,212,191,0.35)]">
                    View match
                  </Button>
                </Link>
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                  {safeMatches.map((_, dotIndex) => (
                    <button
                      key={`dot-${dotIndex}`}
                      type="button"
                      onClick={() => setActiveIndex(dotIndex)}
                      aria-label={`View historic match ${dotIndex + 1}`}
                      className={`h-2 w-2 rounded-full transition-all ${
                        dotIndex === activeIndex
                          ? "bg-teal-300 shadow-[0_0_10px_rgba(45,212,191,0.7)]"
                          : "bg-white/20 hover:bg-white/40"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

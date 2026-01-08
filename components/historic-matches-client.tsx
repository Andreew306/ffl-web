"use client"

import HistoricMatches from "@/components/historic-matches"

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

export default function HistoricMatchesClient({ matches }: HistoricMatchesProps) {
  return <HistoricMatches matches={matches} />
}

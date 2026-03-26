import { NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongoose"
import PlayerModel from "@/lib/models/Player"
import PlayerCompetitionModel from "@/lib/models/PlayerCompetition"

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function randomIndex(max: number) {
  return Math.floor(Math.random() * max)
}

export async function GET() {
  await dbConnect()

  const eligiblePlayers = await PlayerCompetitionModel.aggregate<
    Array<{ _id: string; matchesPlayed: number }>
  >([
    {
      $group: {
        _id: "$player_id",
        matchesPlayed: {
          $sum: { $ifNull: ["$matchesPlayed", "$matches_played"] },
        },
      },
    },
    { $match: { matchesPlayed: { $gte: 10 } } },
  ])

  const eligibleIds = eligiblePlayers.map((player) => player._id)

  if (!eligibleIds.length) {
    return NextResponse.json({
      answer: "player",
      answerDisplay: "Player",
      length: 6,
    })
  }

  const players = await PlayerModel.find({ _id: { $in: eligibleIds } })
    .select("player_name")
    .lean<Array<{ player_name?: string | null }>>()

  const candidates = players
    .map((player) => {
      const display = player.player_name?.trim()
      const normalized = display ? normalizeName(display) : ""
      return {
        display: display ?? "",
        normalized,
      }
    })
    .filter((entry) => entry.normalized.length >= 3 && entry.normalized.length <= 20)

  if (!candidates.length) {
    return NextResponse.json({
      answer: "player",
      answerDisplay: "Player",
      length: 6,
    })
  }

  const choice = candidates[randomIndex(candidates.length)]
  return NextResponse.json({
    answer: choice.normalized,
    answerDisplay: choice.display,
    length: choice.normalized.length,
  })
}

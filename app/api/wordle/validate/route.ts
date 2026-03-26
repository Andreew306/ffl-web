import { NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongoose"
import PlayerModel from "@/lib/models/Player"

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const guess = searchParams.get("guess")

  if (!guess) {
    return NextResponse.json({ valid: false })
  }

  const normalized = normalizeName(guess)
  if (!normalized) {
    return NextResponse.json({ valid: false })
  }

  await dbConnect()
  const players = await PlayerModel.find({})
    .select("player_name")
    .lean<Array<{ player_name?: string | null }>>()

  const valid = players.some((player) => {
    const display = player.player_name?.trim()
    if (!display) return false
    return normalizeName(display) === normalized
  })

  return NextResponse.json({ valid })
}

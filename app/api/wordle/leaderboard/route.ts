import { NextResponse } from "next/server"
import { getDailyWordleLeaderboard } from "@/lib/services/wordle.service"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dateKey = searchParams.get("dateKey") ?? undefined
  const leaderboard = await getDailyWordleLeaderboard(dateKey ?? undefined)
  return NextResponse.json(leaderboard)
}

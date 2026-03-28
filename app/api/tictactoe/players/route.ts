import { NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongoose"
import PlayerModel from "@/lib/models/Player"

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = (searchParams.get("q") || "").trim()
  if (!query) {
    return NextResponse.json({ players: [] })
  }

  await dbConnect()
  const safe = escapeRegex(query)
  const regex = new RegExp(safe, "i")

  const players = await PlayerModel.find({
    $or: [{ player_name: { $regex: regex } }, { playerName: { $regex: regex } }],
  })
    .select("_id player_name playerName avatar")
    .limit(12)
    .lean<Array<{ _id: unknown; player_name?: string; playerName?: string; avatar?: string | null }>>()

  return NextResponse.json({
    players: players.map((player) => ({
      playerObjectId: String(player._id),
      playerName: player.player_name || player.playerName || "Unknown player",
      avatar: player.avatar || undefined,
    })),
  })
}

import { NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongoose"
import PlayerModel from "@/lib/models/Player"
import PlayerCompetitionModel from "@/lib/models/PlayerCompetition"
import TeamCompetitionModel from "@/lib/models/TeamCompetition"
import TeamModel from "@/lib/models/Team"

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function pickIndex(seed: string, max: number) {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000
  }
  return max ? hash % max : 0
}

async function getAnswerPlayer(answerNormalized: string) {
  const players = await PlayerModel.find({})
    .select("player_name country")
    .lean<Array<{ _id: unknown; player_name?: string | null; country?: string | null }>>()

  return players.find((player) => {
    const name = player.player_name?.trim()
    return name ? normalizeName(name) === answerNormalized : false
  })
}

export async function POST(request: Request) {
  const payload = (await request.json()) as { type?: string; answer?: string } | null
  const type = payload?.type ?? ""
  const answerNormalized = payload?.answer ?? ""

  if (!type || !answerNormalized) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 })
  }

  await dbConnect()
  const answerPlayer = await getAnswerPlayer(answerNormalized)
  if (!answerPlayer?._id) {
    return NextResponse.json({ error: "Answer not found" }, { status: 404 })
  }

  if (type === "team") {
    const comps = await PlayerCompetitionModel.find({ player_id: answerPlayer._id })
      .select("team_competition_id matchesPlayed")
      .lean<Array<{ team_competition_id: unknown; matchesPlayed?: number }>>()
    const topTeamComp = comps
      .map((comp) => ({ id: comp.team_competition_id, matches: comp.matchesPlayed ?? 0 }))
      .sort((a, b) => b.matches - a.matches)[0]
    if (topTeamComp?.id) {
      const teamComp = await TeamCompetitionModel.findById(topTeamComp.id)
        .select("team_id")
        .lean<{ team_id?: unknown } | null>()
      if (teamComp?.team_id) {
        const team = await TeamModel.findById(teamComp.team_id)
          .select("team_name image")
          .lean<{ team_name?: string; image?: string } | null>()
        if (team) {
          return NextResponse.json({ teamName: team.team_name ?? null, teamImage: team.image ?? null })
        }
      }
    }
  }

  if (type === "country") {
    return NextResponse.json({ country: answerPlayer.country ?? null })
  }

  if (type === "position") {
    const comps = await PlayerCompetitionModel.find({ player_id: answerPlayer._id })
      .select("position matchesPlayed")
      .lean<Array<{ position?: string; matchesPlayed?: number }>>()
    const topPosition = comps
      .map((comp) => ({ pos: comp.position ?? "", matches: comp.matchesPlayed ?? 0 }))
      .filter((comp) => comp.pos)
      .sort((a, b) => b.matches - a.matches)[0]
    return NextResponse.json({ position: topPosition?.pos ?? null })
  }

  if (type === "exact") {
    const idx = pickIndex(`practice:exact:${answerNormalized}`, answerNormalized.length)
    return NextResponse.json({ exactIndex: idx + 1, exactLetter: answerNormalized[idx]?.toUpperCase() ?? null })
  }

  if (type === "present") {
    const idx = pickIndex(`practice:present:${answerNormalized}`, answerNormalized.length)
    return NextResponse.json({ presentLetter: answerNormalized[idx]?.toUpperCase() ?? null })
  }

  return NextResponse.json({ error: "Invalid hint" }, { status: 400 })
}

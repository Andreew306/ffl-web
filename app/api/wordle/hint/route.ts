import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import dbConnect from "@/lib/db/mongoose"
import UserModel from "@/lib/models/User"
import WordleResultModel from "@/lib/models/WordleResult"
import PlayerModel from "@/lib/models/Player"
import PlayerCompetitionModel from "@/lib/models/PlayerCompetition"
import TeamCompetitionModel from "@/lib/models/TeamCompetition"
import TeamModel from "@/lib/models/Team"
import { getDailyWordlePlayer, WORDLE_VERSION } from "@/lib/services/wordle.service"

const HINT_COSTS: Record<string, number> = {
  team: 25,
  exact: 20,
  present: 15,
  country: 10,
  position: 5,
}

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
  const session = await getServerSession(authOptions)
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const payload = (await request.json()) as { type?: string } | null
  const type = payload?.type ?? ""
  const cost = HINT_COSTS[type]
  if (!cost) {
    return NextResponse.json({ error: "Invalid hint" }, { status: 400 })
  }

  await dbConnect()
  const user = await UserModel.findOne({ discordId: session.user.discordId })
    .select("_id betballCoins discordId discordAvatar")
    .lean<{ _id: unknown; betballCoins?: number; discordId: string; discordAvatar?: string | null } | null>()

  if (!user?._id) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const daily = await getDailyWordlePlayer()
  const answerNormalized = daily.answer
  const answerPlayer = await getAnswerPlayer(answerNormalized)
  if (!answerPlayer?._id) {
    return NextResponse.json({ error: "Answer not found" }, { status: 404 })
  }

  const dateKey = daily.dateKey
  let existing = await WordleResultModel.findOne({ dateKey, userId: user._id })
  if (existing && existing.version !== WORDLE_VERSION) {
    existing.version = WORDLE_VERSION
    existing.attempts = 0
    existing.solved = false
    existing.completedAt = null
    existing.hintTeamImage = null
    existing.hintTeamName = null
    existing.hintExactLetter = null
    existing.hintExactIndex = null
    existing.hintPresentLetter = null
    existing.hintCountry = null
    existing.hintPosition = null
    existing.rewardGrantedAt = null
    existing.rewardAmount = null
    await existing.save()
  }

  if (!existing) {
    existing = await WordleResultModel.create({
      dateKey,
      version: WORDLE_VERSION,
      userId: user._id,
      discordId: user.discordId,
      discordAvatar: user.discordAvatar ?? null,
      attempts: 0,
      solved: false,
    })
  }

  if (existing.completedAt) {
    return NextResponse.json({ error: "Completed" }, { status: 400 })
  }

  const remaining = Number(user.betballCoins ?? 0)
  if (remaining < cost) {
    return NextResponse.json({ error: "Insufficient coins" }, { status: 400 })
  }

  let response: Record<string, unknown> = {}

  if (type === "team" && !existing.hintTeamName) {
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
          existing.hintTeamImage = team.image ?? null
          existing.hintTeamName = team.team_name ?? null
          response = { teamImage: existing.hintTeamImage, teamName: existing.hintTeamName }
        }
      }
    }
  }

  if (type === "country" && !existing.hintCountry) {
    existing.hintCountry = answerPlayer.country ?? null
    response = { country: existing.hintCountry }
  }

  if (type === "position" && !existing.hintPosition) {
    const comps = await PlayerCompetitionModel.find({ player_id: answerPlayer._id })
      .select("position matchesPlayed")
      .lean<Array<{ position?: string; matchesPlayed?: number }>>()
    const topPosition = comps
      .map((comp) => ({ pos: comp.position ?? "", matches: comp.matchesPlayed ?? 0 }))
      .filter((comp) => comp.pos)
      .sort((a, b) => b.matches - a.matches)[0]
    existing.hintPosition = topPosition?.pos ?? null
    response = { position: existing.hintPosition }
  }

  if (type === "exact" && !existing.hintExactLetter) {
    const idx = pickIndex(`${dateKey}:${user._id}:exact`, answerNormalized.length)
    existing.hintExactIndex = idx + 1
    existing.hintExactLetter = answerNormalized[idx]?.toUpperCase() ?? null
    response = { exactIndex: existing.hintExactIndex, exactLetter: existing.hintExactLetter }
  }

  if (type === "present" && !existing.hintPresentLetter) {
    const idx = pickIndex(`${dateKey}:${user._id}:present`, answerNormalized.length)
    existing.hintPresentLetter = answerNormalized[idx]?.toUpperCase() ?? null
    response = { presentLetter: existing.hintPresentLetter }
  }

  if (!Object.keys(response).length) {
    return NextResponse.json({ error: "Hint already owned" }, { status: 200 })
  }

  await UserModel.updateOne({ _id: user._id }, { $inc: { betballCoins: -cost } })
  await existing.save()

  return NextResponse.json({
    ok: true,
    cost,
    betballCoins: remaining - cost,
    hint: response,
  })
}

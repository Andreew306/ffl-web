import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import dbConnect from "@/lib/db/mongoose"
import UserModel from "@/lib/models/User"
import WordleResultModel from "@/lib/models/WordleResult"
import { WORDLE_VERSION } from "@/lib/services/wordle.service"

const MAX_GUESSES = 6
const WORDLE_REWARD = 50

function toMadridDateKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value)

  const year = parts.find((part) => part.type === "year")?.value ?? "0000"
  const month = parts.find((part) => part.type === "month")?.value ?? "00"
  const day = parts.find((part) => part.type === "day")?.value ?? "00"
  return `${year}-${month}-${day}`
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const payload = (await request.json()) as { attempts?: number; solved?: boolean } | null
  const attemptsRaw = Number(payload?.attempts ?? 0)
  const attempts = Number.isFinite(attemptsRaw)
    ? Math.min(Math.max(Math.floor(attemptsRaw), 1), MAX_GUESSES)
    : 1
  const solved = Boolean(payload?.solved)

  await dbConnect()
  const user = await UserModel.findOne({ discordId: session.user.discordId })
    .select("_id discordId discordAvatar discordName")
    .lean<{ _id: unknown; discordId: string; discordAvatar?: string | null; discordName?: string | null } | null>()

  if (!user?._id) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const dateKey = toMadridDateKey()
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
    const completed = solved || attempts >= MAX_GUESSES
    const created = await WordleResultModel.create({
      dateKey,
      version: WORDLE_VERSION,
      userId: user._id,
      discordId: user.discordId,
      discordName: user.discordName ?? null,
      discordAvatar: user.discordAvatar ?? null,
      attempts,
      solved,
      completedAt: completed ? new Date() : null,
    })
    if (solved) {
      await UserModel.updateOne(
        { _id: user._id },
        { $inc: { betballCoins: WORDLE_REWARD } }
      )
      created.rewardGrantedAt = new Date()
      created.rewardAmount = WORDLE_REWARD
      await created.save()
    }
    return NextResponse.json({ ok: true })
  }

  if (existing.completedAt) {
    return NextResponse.json({ ok: true })
  }

  const completed = solved || attempts >= MAX_GUESSES
  const nextAttempts = solved ? attempts : Math.max(existing.attempts ?? 0, attempts)
  existing.attempts = nextAttempts
  existing.solved = solved
  existing.discordName = user.discordName ?? null
  existing.discordAvatar = user.discordAvatar ?? null
  if (completed && !existing.completedAt) {
    existing.completedAt = new Date()
  }

  await existing.save()

  if (solved && !existing.rewardGrantedAt) {
    await UserModel.updateOne(
      { _id: user._id },
      { $inc: { betballCoins: WORDLE_REWARD } }
    )
    existing.rewardGrantedAt = new Date()
    existing.rewardAmount = WORDLE_REWARD
    await existing.save()
  }

  return NextResponse.json({ ok: true })
}

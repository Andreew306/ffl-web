import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import dbConnect from "@/lib/db/mongoose"
import UserModel from "@/lib/models/User"
import TicTacToeChallengeModel from "@/lib/models/TicTacToeChallenge"
import TicTacToeGameModel from "@/lib/models/TicTacToeGame"

const ONLINE_DIFFICULTIES = ["easy", "medium", "hard"] as const

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { challengeId, action } = await request.json().catch(() => ({} as { challengeId?: string; action?: string }))
  if (!challengeId || !action) {
    return NextResponse.json({ error: "Missing action." }, { status: 400 })
  }

  await dbConnect()
  const currentUser = await UserModel.findOne({ discordId: session.user.discordId })
    .select("_id")
    .lean<{ _id: unknown } | null>()

  if (!currentUser?._id) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const now = new Date()
  const challenge = await TicTacToeChallengeModel.findOne({
    _id: challengeId,
    status: "pending",
    expiresAt: { $gt: now },
  })

  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found." }, { status: 404 })
  }

  const isRecipient = String(challenge.toUserId) === String(currentUser._id)
  const isSender = String(challenge.fromUserId) === String(currentUser._id)
  if (!isRecipient && !isSender) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (action === "decline") {
    challenge.status = "declined"
    await challenge.save()
    return NextResponse.json({ ok: true, status: "declined" })
  }

  if (action === "cancel") {
    challenge.status = "cancelled"
    await challenge.save()
    return NextResponse.json({ ok: true, status: "cancelled" })
  }

  if (!isRecipient) {
    return NextResponse.json({ error: "Only the recipient can accept." }, { status: 403 })
  }

  challenge.status = "accepted"
  await challenge.save()

  const difficulty = ONLINE_DIFFICULTIES[Math.floor(Math.random() * ONLINE_DIFFICULTIES.length)]
  const firstTurn = Math.random() > 0.5 ? challenge.fromUserId : challenge.toUserId

  await TicTacToeGameModel.create({
    mode: "online",
    status: "active",
    difficulty,
    createdByUserId: challenge.fromUserId,
    opponentUserId: challenge.toUserId,
    currentTurnUserId: firstTurn,
    turnSeconds: 30,
    turnNumber: 1,
    rows: [],
    columns: [],
    picks: [],
  })

  return NextResponse.json({ ok: true, status: "accepted" })
}

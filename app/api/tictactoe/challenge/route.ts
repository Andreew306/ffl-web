import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import dbConnect from "@/lib/db/mongoose"
import UserModel from "@/lib/models/User"
import TicTacToeChallengeModel from "@/lib/models/TicTacToeChallenge"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { targetUserId } = await request.json().catch(() => ({} as { targetUserId?: string }))
  if (!targetUserId) {
    return NextResponse.json({ error: "Missing target user." }, { status: 400 })
  }

  await dbConnect()
  const currentUser = await UserModel.findOne({ discordId: session.user.discordId })
    .select("_id")
    .lean<{ _id: unknown } | null>()

  if (!currentUser?._id) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  if (String(currentUser._id) === targetUserId) {
    return NextResponse.json({ error: "Cannot challenge yourself." }, { status: 400 })
  }

  const now = new Date()
  const existing = await TicTacToeChallengeModel.findOne({
    fromUserId: currentUser._id,
    toUserId: targetUserId,
    status: "pending",
    expiresAt: { $gt: now },
  }).select("_id")

  if (existing?._id) {
    return NextResponse.json({ ok: true, id: String(existing._id), status: "pending" })
  }

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
  const challenge = await TicTacToeChallengeModel.create({
    fromUserId: currentUser._id,
    toUserId: targetUserId,
    status: "pending",
    expiresAt,
  })

  return NextResponse.json({ ok: true, id: String(challenge._id), status: "pending" })
}

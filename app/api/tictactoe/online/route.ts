import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import mongoose from "mongoose"
import dbConnect from "@/lib/db/mongoose"
import UserModel from "@/lib/models/User"
import PlayerModel from "@/lib/models/Player"
import TicTacToePresenceModel from "@/lib/models/TicTacToePresence"
import TicTacToeChallengeModel from "@/lib/models/TicTacToeChallenge"

const ONLINE_WINDOW_SECONDS = 75

type UserMeta = {
  userId: string
  displayName: string
  avatar?: string
}

async function getUserMetaMap(userIds: string[]) {
  if (!userIds.length) return new Map<string, UserMeta>()

  const users = await UserModel.find({ _id: { $in: userIds } })
    .select("_id discordId discordAvatar discordName playerId")
    .lean<Array<{ _id: mongoose.Types.ObjectId; discordId: string; discordAvatar?: string | null; discordName?: string | null; playerId?: mongoose.Types.ObjectId | null }>>()

  const playerIds = users
    .map((user) => user.playerId)
    .filter((value): value is mongoose.Types.ObjectId => Boolean(value))

  const players = playerIds.length
    ? await PlayerModel.find({ _id: { $in: playerIds } })
        .select("_id player_name playerName")
        .lean<Array<{ _id: unknown; player_name?: string; playerName?: string }>>()
    : []
  const playerMap = new Map(players.map((player) => [String(player._id), player]))

  return new Map(
    users.map((user) => {
      const player = user.playerId ? playerMap.get(String(user.playerId)) : null
      const displayName = player?.player_name || player?.playerName || user.discordName || user.discordId
      return [
        String(user._id),
        {
          userId: String(user._id),
          displayName,
          avatar: user.discordAvatar || undefined,
        },
      ]
    })
  )
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await dbConnect()
  const user = await UserModel.findOne({ discordId: session.user.discordId })
    .select("_id discordId")
    .lean<{ _id: unknown; discordId: string } | null>()

  if (!user?._id) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const now = new Date()
  await TicTacToePresenceModel.updateOne(
    { userId: user._id },
    { $set: { lastSeenAt: now, discordId: user.discordId } },
    { upsert: true }
  )

  const onlineSince = new Date(Date.now() - ONLINE_WINDOW_SECONDS * 1000)
  const onlinePresence = await TicTacToePresenceModel.find({ lastSeenAt: { $gte: onlineSince } })
    .select("userId lastSeenAt")
    .lean<Array<{ userId: unknown; lastSeenAt: Date }>>()

  const onlineUserIds = onlinePresence
    .map((row) => String(row.userId))
    .filter((id) => id !== String(user._id))

  const pendingChallenges = await TicTacToeChallengeModel.find({
    status: "pending",
    expiresAt: { $gt: now },
    $or: [{ toUserId: user._id }, { fromUserId: user._id }],
  })
    .select("_id fromUserId toUserId createdAt expiresAt")
    .lean<Array<{ _id: unknown; fromUserId: unknown; toUserId: unknown; createdAt: Date; expiresAt: Date }>>()

  const metaMap = await getUserMetaMap([
    ...onlineUserIds,
    ...pendingChallenges.map((entry) => String(entry.fromUserId)),
    ...pendingChallenges.map((entry) => String(entry.toUserId)),
  ])

  const onlineUsers = onlineUserIds
    .map((id) => metaMap.get(id))
    .filter((entry): entry is UserMeta => Boolean(entry))

  const incoming = pendingChallenges
    .filter((entry) => String(entry.toUserId) === String(user._id))
    .map((entry) => ({
      id: String(entry._id),
      fromUserId: String(entry.fromUserId),
      createdAt: entry.createdAt,
      expiresAt: entry.expiresAt,
      ...metaMap.get(String(entry.fromUserId)),
    }))

  const outgoing = pendingChallenges
    .filter((entry) => String(entry.fromUserId) === String(user._id))
    .map((entry) => ({
      id: String(entry._id),
      toUserId: String(entry.toUserId),
      createdAt: entry.createdAt,
      expiresAt: entry.expiresAt,
      ...metaMap.get(String(entry.toUserId)),
    }))

  return NextResponse.json({
    onlineUsers,
    incoming,
    outgoing,
  })
}

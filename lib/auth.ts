import type { NextAuthOptions } from "next-auth"
import DiscordProvider from "next-auth/providers/discord"
import type { JWT } from "next-auth/jwt"
import mongoose from "mongoose"
import dbConnect from "@/lib/db/mongoose"
import UserModel, { type IUserRole } from "@/lib/models/User"
import EloPlayerModel from "@/lib/models/EloPlayer"
import PlayerModel from "@/lib/models/Player"

type DiscordProfile = {
  id?: string
  avatar?: string | null
  username?: string | null
  global_name?: string | null
}

function buildDiscordAvatarUrl(discordId?: string, avatarHash?: string | null) {
  if (!discordId || !avatarHash) {
    return null
  }

  const extension = avatarHash.startsWith("a_") ? "gif" : "png"
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${extension}?size=256`
}

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function normalizeRoles(roles?: Array<IUserRole | string | null | undefined>) {
  return (roles ?? [])
    .map((role) => {
      if (typeof role === "string") {
        return { id: role, name: role }
      }

      if (role?.id && role?.name) {
        return role
      }

      return null
    })
    .filter((role): role is IUserRole => Boolean(role))
}

async function fetchDiscordRoles(discordId: string) {
  const guildId = process.env.DISCORD_GUILD_ID
  const botToken = process.env.DISCORD_BOT_TOKEN

  if (!guildId || !botToken) {
    return { roles: [], displayName: null }
  }

  const headers = {
    Authorization: `Bot ${botToken}`,
    "Content-Type": "application/json",
  }

  try {
    const [memberResponse, rolesResponse] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`, {
        headers,
        cache: "no-store",
      }),
      fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
        headers,
        cache: "no-store",
      }),
    ])

    if (!memberResponse.ok || !rolesResponse.ok) {
      return { roles: [], displayName: null }
    }

    const member = (await memberResponse.json()) as { roles?: string[]; nick?: string | null; user?: { username?: string | null; global_name?: string | null } }
    const roles = (await rolesResponse.json()) as Array<{ id?: string; name?: string }>
    const roleNamesById = new Map(
      roles
        .filter((role): role is { id: string; name: string } => Boolean(role.id && role.name))
        .map((role) => [role.id, role.name])
    )

    const displayName = member.nick || member.user?.global_name || member.user?.username || null

    const normalizedRoles = (member.roles || [])
      .map((roleId) => {
        const roleName = roleNamesById.get(roleId)
        return roleName ? { id: roleId, name: roleName } : null
      })
      .filter((role): role is IUserRole => Boolean(role))
    return { roles: normalizedRoles, displayName }
  } catch (error) {
    console.error("Failed to sync Discord roles", error)
    return { roles: [], displayName: null }
  }
}

async function inferPlayerIdFromDiscord(discordId: string) {
  const eloPlayer = await EloPlayerModel.findOne({ discordId }).lean<{
    playerId?: string
    nickname?: string
  } | null>()

  if (!eloPlayer) {
    return null
  }

  const candidateIds = new Set<string>()
  const exactNames = [eloPlayer.nickname, eloPlayer.playerId]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))

  if (eloPlayer.playerId && /^\d+$/.test(eloPlayer.playerId)) {
    const numericPlayer = await PlayerModel.findOne({
      player_id: Number.parseInt(eloPlayer.playerId, 10),
    })
      .select("_id")
      .lean<{ _id: mongoose.Types.ObjectId } | null>()

    if (numericPlayer?._id) {
      candidateIds.add(numericPlayer._id.toString())
    }
  }

  for (const exactName of exactNames) {
    const players = await PlayerModel.find({
      player_name: { $regex: `^${escapeRegex(exactName)}$`, $options: "i" },
    })
      .select("_id")
      .lean<Array<{ _id: mongoose.Types.ObjectId }>>()

    players.forEach((player) => candidateIds.add(player._id.toString()))
  }

  if (candidateIds.size !== 1) {
    return null
  }

  return new mongoose.Types.ObjectId([...candidateIds][0])
}

async function inferPlayerIdFromDisplayName(displayName: string) {
  const trimmed = displayName.trim()
  if (!trimmed) return null

  const players = await PlayerModel.find({
    player_name: { $regex: `^${escapeRegex(trimmed)}$`, $options: "i" },
  })
    .select("_id")
    .lean<Array<{ _id: mongoose.Types.ObjectId }>>()

  if (players.length !== 1) {
    return null
  }

  return players[0]._id
}

export async function syncDiscordUser(
  discordId: string,
  discordAvatar?: string | null,
  displayNameOverride?: string | null
) {
  await dbConnect()

  const existingUser = await UserModel.findOne({ discordId })
  const now = new Date()
  const syncedRecently =
    existingUser?.discordSyncedAt &&
    now.getTime() - existingUser.discordSyncedAt.getTime() < 1000 * 60 * 60 * 24
  const avatarChanged =
    Boolean(discordAvatar) && discordAvatar !== existingUser?.discordAvatar

  const { roles, displayName } = await fetchDiscordRoles(discordId)
  const resolvedDisplayName =
    displayName?.trim() ||
    displayNameOverride?.trim() ||
    existingUser?.discordName?.trim() ||
    null
  const displayNameChanged = Boolean(resolvedDisplayName && resolvedDisplayName !== existingUser?.discordName)

  if (existingUser && syncedRecently && !avatarChanged && !displayNameChanged) {
    return existingUser
  }

  const shouldTryDisplayName = Boolean(resolvedDisplayName) && (displayNameChanged || !existingUser?.playerId)
  const displayNamePlayerId = shouldTryDisplayName && resolvedDisplayName
    ? await inferPlayerIdFromDisplayName(resolvedDisplayName)
    : null
  const playerId =
    displayNamePlayerId ??
    existingUser?.playerId ??
    (await inferPlayerIdFromDiscord(discordId))
  const existingRoles = normalizeRoles(existingUser?.roles)
  const mergedRolesById = new Map(existingRoles.map((role) => [role.id, role]))

  for (const role of roles) {
    mergedRolesById.set(role.id, role)
  }

  const mergedRoles = [...mergedRolesById.values()]

  const user = await UserModel.findOneAndUpdate(
    { discordId },
    {
      $set: {
        roles: mergedRoles,
        ...(discordAvatar ? { discordAvatar } : {}),
        ...(resolvedDisplayName ? { discordName: resolvedDisplayName } : {}),
        ...(playerId ? { playerId } : {}),
        discordSyncedAt: now,
      },
      $setOnInsert: {
        discordId,
      },
    },
    { upsert: true, new: true }
  )

  return user
}

async function enrichToken(token: JWT) {
  if (!token.discordId || typeof token.discordId !== "string") {
    return token
  }

  await dbConnect()

  const user = await UserModel.findOne({ discordId: token.discordId })
    .select("discordId playerId betballCoins fantasyCoins fflCoins roles discordName")
    .lean<{
      discordId: string
      playerId?: mongoose.Types.ObjectId | null
      betballCoins?: number
      fantasyCoins?: number
      fflCoins?: number
      discordName?: string | null
      roles?: Array<IUserRole | string>
    } | null>()

  if (!user) {
    token.playerId = null
    token.betballCoins = 0
    token.fantasyCoins = 0
    token.roles = []
    return token
  }

  const legacyCoins = Number(user.fflCoins ?? 10000)
  const betballCoins = Number(user.betballCoins ?? 100)
  const fantasyCoins = Number(user.fantasyCoins ?? legacyCoins)

  token.playerId = user.playerId?.toString() ?? null
  token.betballCoins = betballCoins
  token.fantasyCoins = fantasyCoins
  token.discordName = user.discordName ?? null
  token.roles = normalizeRoles(user.roles)

  if (user.betballCoins === undefined || user.fantasyCoins === undefined) {
    await UserModel.updateOne(
      { discordId: token.discordId },
      {
        $set: {
          betballCoins,
          fantasyCoins,
        },
      }
    )
  }

  return token
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider !== "discord") {
        return true
      }

      const discordProfile = profile as DiscordProfile | undefined
      const discordId = discordProfile?.id
      const displayNameOverride =
        discordProfile?.global_name?.trim() ||
        discordProfile?.username?.trim() ||
        null

      if (!discordId) {
        return false
      }

      await syncDiscordUser(
        discordId,
        user?.image ?? buildDiscordAvatarUrl(discordId, discordProfile?.avatar) ?? null,
        displayNameOverride
      )
      return true
    },
    async jwt({ token, account, profile, user }) {
      if (account?.provider === "discord") {
        const discordProfile = profile as DiscordProfile | undefined
        const discordId = discordProfile?.id
        if (discordId) {
          token.discordId = discordId
        }

        const avatarUrl = user?.image ?? buildDiscordAvatarUrl(discordId, discordProfile?.avatar)
        if (avatarUrl) {
          token.picture = avatarUrl
        }
      }

      return enrichToken(token)
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.discordId = typeof token.discordId === "string" ? token.discordId : ""
        session.user.playerId = typeof token.playerId === "string" ? token.playerId : null
        session.user.betballCoins = typeof token.betballCoins === "number" ? token.betballCoins : 0
        session.user.fantasyCoins = typeof token.fantasyCoins === "number" ? token.fantasyCoins : 0
        session.user.discordName = typeof token.discordName === "string" ? token.discordName : null
        session.user.image = typeof token.picture === "string" ? token.picture : session.user.image
        session.user.roles = Array.isArray(token.roles)
          ? token.roles.filter((role): role is IUserRole => Boolean(role && typeof role === "object" && "id" in role && "name" in role))
          : []
      }

      return session
    },
  },
}

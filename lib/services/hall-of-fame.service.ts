import mongoose from "mongoose"
import dbConnect from "@/lib/db/mongoose"
import CompetitionModel from "@/lib/models/Competition"
import PlayerModel from "@/lib/models/Player"
import TeamCompetitionModel from "@/lib/models/TeamCompetition"
import UserModel, { type IUserRole } from "@/lib/models/User"
import PlayerManualRoleModel from "@/lib/models/PlayerManualRole"
import ProfileRolePointsModel from "@/lib/models/ProfileRolePoints"
import { fetchGuildRoles } from "@/lib/services/profile.service"
import { normalizeTeamImageUrl } from "@/lib/utils"

export type HallOfFameRoleColumn = {
  roleId: string
  roleName: string
  points: number
  sourceRoleIds: string[]
  kind: "collective" | "individual" | "other"
  orderIndex: number
}

export type HallOfFameEntry = {
  rank: number
  playerObjectId: string
  playerId: number
  playerName: string
  country: string
  avatar?: string
  kitImage?: string
  totalPoints: number
  roleCount: number
  roleHits: Record<string, number>
  roleHitNames: Record<string, string[]>
}

export type HallOfFameData = {
  roles: HallOfFameRoleColumn[]
  entries: HallOfFameEntry[]
}

export type HallOfFameFilter = "all" | "collective" | "individual"

function normalizeRoles(roles?: Array<IUserRole | string>) {
  return (roles ?? [])
    .map((role) => {
      if (typeof role === "string") return { id: role, name: role }
      if (role?.id && role?.name) return role
      return null
    })
    .filter((role): role is IUserRole => Boolean(role))
}

function normalizeRoleGroupName(roleName: string) {
  const normalized = roleName.normalize("NFKC")
  const withoutPrefix = normalized.replace(/\[[^\]]*]/g, " ")
  const withoutSeason = withoutPrefix
    .replace(/\(S\d+\)/gi, " ")
    .replace(/\bS\d+\b/gi, " ")
    .replace(/\b20\d{2}\b/g, " ")
  const cleaned = withoutSeason
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
  return cleaned.toLowerCase() || normalized.trim().toLowerCase()
}

type RawCompetition = {
  _id: mongoose.Types.ObjectId
  season?: number | string | null
  year?: number | null
  season_id?: string | null
}

type RawTeamCompetition = {
  _id: mongoose.Types.ObjectId
  competition_id?: mongoose.Types.ObjectId
  kits?: Array<string | { image?: string | null } | null> | null
}

type RawPlayerCompetition = {
  player_id?: mongoose.Types.ObjectId
  team_competition_id?: mongoose.Types.ObjectId
  matches_played?: number
  matchesPlayed?: number
}

function pickKitImage(kits?: Array<string | { image?: string | null } | null> | null) {
  if (!Array.isArray(kits)) return ""
  for (const entry of kits) {
    if (!entry) continue
    if (typeof entry === "string") {
      const normalized = normalizeTeamImageUrl(entry)
      if (normalized) return normalized
      continue
    }
    const normalized = normalizeTeamImageUrl(entry.image ?? "")
    if (normalized) return normalized
  }
  return ""
}

function extractSeasonValue(rawSeason: string | number | null | undefined) {
  if (rawSeason === null || rawSeason === undefined) return -1
  const numeric = Number(rawSeason)
  if (Number.isFinite(numeric)) return numeric
  const match = String(rawSeason).match(/\d+/)
  return match ? Number.parseInt(match[0], 10) : -1
}

function buildRoleGroupLabel(roleName: string) {
  const normalized = roleName.normalize("NFKC")
  const withoutPrefix = normalized.replace(/\[[^\]]*]/g, " ")
  const withoutSeason = withoutPrefix
    .replace(/\(S\d+\)/gi, " ")
    .replace(/\bS\d+\b/gi, " ")
    .replace(/\b20\d{2}\b/g, " ")
  const cleaned = withoutSeason
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
  return cleaned || normalized.trim()
}

type RoleOrderRule = {
  name: string
  kind: "collective" | "individual"
  orderIndex: number
  match: (normalizedLabel: string) => boolean
}

function hasAllTokens(label: string, tokens: string[]) {
  return tokens.every((token) => label.includes(token))
}

const ROLE_ORDER_RULES: RoleOrderRule[] = [
  { name: "1ST DIVISION WINNER", kind: "collective", orderIndex: 1, match: (s) => hasAllTokens(s, ["1st", "division", "winner"]) },
  { name: "2ND DIVISION WINNER", kind: "collective", orderIndex: 2, match: (s) => hasAllTokens(s, ["2nd", "division", "winner"]) },
  { name: "3RD DIVISION WINNER", kind: "collective", orderIndex: 3, match: (s) => hasAllTokens(s, ["3rd", "division", "winner"]) },
  { name: "CUP WINNER", kind: "collective", orderIndex: 4, match: (s) => hasAllTokens(s, ["cup", "winner"]) && !s.includes("supercup") && !s.includes("super cup") && !s.includes("nations cup") && !s.includes("summer cup") },
  { name: "SUPERCUP WINNER", kind: "collective", orderIndex: 5, match: (s) => (s.includes("supercup") || hasAllTokens(s, ["super", "cup"])) && !s.includes("mvp") },
  { name: "NATIONS CUP WINNER", kind: "collective", orderIndex: 6, match: (s) => hasAllTokens(s, ["nations", "cup", "winner"]) || hasAllTokens(s, ["ffl", "nations", "cup"]) },
  { name: "SUMMER CUP WINNER", kind: "collective", orderIndex: 7, match: (s) => hasAllTokens(s, ["summer", "cup", "winner"]) || hasAllTokens(s, ["ffl", "summer", "cup"]) },
  { name: "MVP", kind: "individual", orderIndex: 101, match: (s) => s === "mvp" },
  { name: "CUP MVP", kind: "individual", orderIndex: 102, match: (s) => hasAllTokens(s, ["cup", "mvp"]) && !s.includes("nations cup") && !s.includes("summer cup") },
  { name: "NATIONS CUP MVP", kind: "individual", orderIndex: 103, match: (s) => hasAllTokens(s, ["nations", "cup", "mvp"]) },
  { name: "SUMMER CUP MVP", kind: "individual", orderIndex: 104, match: (s) => hasAllTokens(s, ["summer", "cup", "mvp"]) },
  { name: "ROOKIE", kind: "individual", orderIndex: 105, match: (s) => s.includes("rookie") },
  { name: "BEST GK", kind: "individual", orderIndex: 106, match: (s) => s.includes("best gk") || s.includes("best goalkeeper") },
  { name: "BEST DEFENDER", kind: "individual", orderIndex: 107, match: (s) => s.includes("best def") || s.includes("best defender") },
  { name: "BEST MIDFIELDER", kind: "individual", orderIndex: 108, match: (s) => s.includes("best mid") || s.includes("best midfielder") },
  { name: "BEST ATTACKER", kind: "individual", orderIndex: 109, match: (s) => s.includes("best att") || s.includes("best attacker") },
  { name: "1ST DIVISION PICHICHI", kind: "individual", orderIndex: 110, match: (s) => s === "1st division pichichi" },
  { name: "2ND DIVISION PICHICHI", kind: "individual", orderIndex: 111, match: (s) => s === "2nd division pichichi" },
  { name: "3RD DIVISION PICHICHI", kind: "individual", orderIndex: 112, match: (s) => s === "3rd division pichichi" },
  { name: "1ST DIVISION PLAYMAKER", kind: "individual", orderIndex: 113, match: (s) => s === "1st division playmaker" },
  { name: "2ND DIVISION PLAYMAKER", kind: "individual", orderIndex: 114, match: (s) => s === "2nd division playmaker" },
  { name: "3RD DIVISION PLAYMAKER", kind: "individual", orderIndex: 115, match: (s) => s === "3rd division playmaker" },
  { name: "1ST DIVISION FAYE", kind: "individual", orderIndex: 116, match: (s) => s === "1st division faye" },
  { name: "2ND DIVISION FAYE", kind: "individual", orderIndex: 117, match: (s) => s === "2nd division faye" },
  { name: "3RD DIVISION FAYE", kind: "individual", orderIndex: 118, match: (s) => s === "3rd division faye" },
  { name: "1ST DIVISION TOTS", kind: "individual", orderIndex: 119, match: (s) => s === "1st division tots" },
  { name: "2ND DIVISION TOTS", kind: "individual", orderIndex: 120, match: (s) => s === "2nd division tots" },
  { name: "3RD DIVISION TOTS", kind: "individual", orderIndex: 121, match: (s) => s === "3rd division tots" },
]

function classifyRoleLabel(label: string) {
  const normalized = label.normalize("NFKC").toLowerCase()
  const matched = ROLE_ORDER_RULES.find((rule) => rule.match(normalized))
  if (matched) {
    return {
      displayName: matched.name,
      kind: matched.kind,
      orderIndex: matched.orderIndex,
    }
  }
  return {
    displayName: label,
    kind: "other" as const,
    orderIndex: 9999,
  }
}

export async function getHallOfFameData(filter: HallOfFameFilter = "all"): Promise<HallOfFameData> {
  await dbConnect()

  const guildRoles = await fetchGuildRoles()
  const guildRoleIds = new Set(guildRoles.map((role) => role.id).filter(Boolean))
  const guildRoleNameById = new Map(guildRoles.map((role) => [role.id, role.name]))
  if (!guildRoleIds.size) {
    return { roles: [], entries: [] }
  }

  const pointsRows = await ProfileRolePointsModel.find({ points: { $gt: 0 }, roleId: { $in: [...guildRoleIds] } })
    .select("roleId roleName points")
    .lean<Array<{ roleId: string; roleName: string; points: number }>>()

  const grouped = new Map<string, HallOfFameRoleColumn>()
  const roleNameBySourceId = new Map<string, string>()
  for (const row of pointsRows) {
    const points = Number.isFinite(row.points) ? Number(row.points) : 0
    if (points <= 0) continue
    const roleName = guildRoleNameById.get(row.roleId) || row.roleName || row.roleId
    roleNameBySourceId.set(row.roleId, roleName)
    const cls = classifyRoleLabel(buildRoleGroupLabel(roleName))
    const key = cls.kind === "other" ? normalizeRoleGroupName(roleName) : cls.displayName.toLowerCase()
    if (!grouped.has(key)) {
      grouped.set(key, {
        roleId: key,
        roleName: cls.displayName,
        points,
        sourceRoleIds: [row.roleId],
        kind: cls.kind,
        orderIndex: cls.orderIndex,
      })
      continue
    }
    const bucket = grouped.get(key)
    if (!bucket) continue
    bucket.points = Math.max(bucket.points, points)
    if (!bucket.sourceRoleIds.includes(row.roleId)) {
      bucket.sourceRoleIds.push(row.roleId)
    }
  }

  const roles = [...grouped.values()]
    .filter((role) => {
      if (filter === "all") return role.kind !== "other"
      return role.kind === filter
    })
    .sort((a, b) => {
      const orderDiff = a.orderIndex - b.orderIndex
      if (orderDiff !== 0) return orderDiff
      return a.roleName.normalize("NFKC").localeCompare(b.roleName.normalize("NFKC"), "es", { sensitivity: "base" })
    })

  if (!roles.length) {
    return { roles: [], entries: [] }
  }

  const roleGroupBySourceId = new Map<string, string>()
  for (const role of roles) {
    for (const sourceRoleId of role.sourceRoleIds) {
      roleGroupBySourceId.set(sourceRoleId, role.roleId)
    }
  }
  const sourceRoleIds = [...roleGroupBySourceId.keys()]

  const [manualRows, userRows] = await Promise.all([
    PlayerManualRoleModel.find({ "roles.id": { $in: sourceRoleIds } })
      .select("playerId roles")
      .lean<Array<{ playerId: mongoose.Types.ObjectId; roles?: Array<IUserRole | string> }>>(),
    UserModel.find({ playerId: { $ne: null }, "roles.id": { $in: sourceRoleIds } })
      .select("playerId roles")
      .lean<Array<{ playerId?: mongoose.Types.ObjectId | null; roles?: Array<IUserRole | string> }>>(),
  ])

  const roleBucketsByPlayerId = new Map<string, Map<string, Set<string>>>()

  const addRoles = (playerObjectId: string, rolesInput?: Array<IUserRole | string>) => {
    if (!playerObjectId) return
    if (!roleBucketsByPlayerId.has(playerObjectId)) {
      roleBucketsByPlayerId.set(playerObjectId, new Map<string, Set<string>>())
    }
    const bucket = roleBucketsByPlayerId.get(playerObjectId)
    if (!bucket) return
    for (const role of normalizeRoles(rolesInput)) {
      const groupId = roleGroupBySourceId.get(role.id)
      if (groupId) {
        if (!bucket.has(groupId)) {
          bucket.set(groupId, new Set<string>())
        }
        bucket.get(groupId)?.add(role.id)
      }
    }
  }

  for (const row of manualRows) {
    addRoles(String(row.playerId), row.roles)
  }
  for (const row of userRows) {
    if (!row.playerId) continue
    addRoles(String(row.playerId), row.roles)
  }

  const playerObjectIds = [...roleBucketsByPlayerId.keys()]
  if (!playerObjectIds.length) {
    return { roles, entries: [] }
  }

  const players = await PlayerModel.find({
    _id: { $in: playerObjectIds.map((id) => new mongoose.Types.ObjectId(id)) },
  })
    .select("_id player_id player_name country avatar")
    .lean<Array<{ _id: mongoose.Types.ObjectId; player_id: number; player_name: string; country: string; avatar?: string }>>()

  const playerObjectIdDocs = playerObjectIds.map((id) => new mongoose.Types.ObjectId(id))
  const rawPlayerCompetitions = await TeamCompetitionModel.db.collection("playercompetitions")
    .find(
      { player_id: { $in: playerObjectIdDocs } },
      {
        projection: {
          player_id: 1,
          team_competition_id: 1,
          matches_played: 1,
          matchesPlayed: 1,
        },
      }
    )
    .toArray() as RawPlayerCompetition[]

  const teamCompetitionIds = Array.from(
    new Set(
      rawPlayerCompetitions
        .map((row) => row.team_competition_id?.toString())
        .filter((value): value is string => Boolean(value))
    )
  ).map((id) => new mongoose.Types.ObjectId(id))

  const rawTeamCompetitions = teamCompetitionIds.length
    ? await TeamCompetitionModel.collection
        .find(
          { _id: { $in: teamCompetitionIds } },
          { projection: { _id: 1, competition_id: 1, kits: 1 } }
        )
        .toArray() as RawTeamCompetition[]
    : []

  const competitionIds = Array.from(
    new Set(
      rawTeamCompetitions
        .map((row) => row.competition_id?.toString())
        .filter((value): value is string => Boolean(value))
    )
  ).map((id) => new mongoose.Types.ObjectId(id))

  const rawCompetitions = competitionIds.length
    ? await CompetitionModel.collection
        .find({ _id: { $in: competitionIds } }, { projection: { _id: 1, season: 1, year: 1, season_id: 1 } })
        .toArray() as RawCompetition[]
    : []

  const seasonByCompetitionId = new Map(
    rawCompetitions.map((competition) => {
      const season = extractSeasonValue(competition.season)
      if (season >= 0) return [competition._id.toString(), season]
      const year = extractSeasonValue(competition.year)
      if (year >= 0) return [competition._id.toString(), year]
      return [competition._id.toString(), extractSeasonValue(competition.season_id)]
    })
  )

  const visualsByTeamCompetitionId = new Map(
    rawTeamCompetitions.map((row) => [
      row._id.toString(),
      {
        season: row.competition_id ? seasonByCompetitionId.get(row.competition_id.toString()) ?? -1 : -1,
        kitImage: pickKitImage(row.kits) || "",
      },
    ])
  )
  const kitPool = Array.from(
    new Set(
      [...visualsByTeamCompetitionId.values()]
        .map((visual) => visual.kitImage)
        .filter((value): value is string => Boolean(value))
    )
  )

  function pickRandomKit() {
    if (!kitPool.length) return ""
    const index = Math.floor(Math.random() * kitPool.length)
    return kitPool[index] || ""
  }

  const bestVisualByPlayerObjectId = new Map<string, { season: number; matchesPlayed: number; kitImage: string }>()
  for (const row of rawPlayerCompetitions) {
    if (!row.player_id || !row.team_competition_id) continue
    const playerKey = row.player_id.toString()
    const visuals = visualsByTeamCompetitionId.get(row.team_competition_id.toString())
    if (!visuals) continue
    const candidate = {
      season: visuals.season,
      matchesPlayed: Number(row.matches_played ?? row.matchesPlayed ?? 0),
      kitImage: visuals.kitImage,
    }
    const current = bestVisualByPlayerObjectId.get(playerKey)
    if (
      !current
      || candidate.season > current.season
      || (candidate.season === current.season && candidate.matchesPlayed > current.matchesPlayed)
    ) {
      bestVisualByPlayerObjectId.set(playerKey, candidate)
    }
  }

  const entriesBase = players
    .map((player) => {
      const playerKey = player._id.toString()
      const roleBuckets = roleBucketsByPlayerId.get(playerKey) ?? new Map<string, Set<string>>()
      const roleHits: Record<string, number> = {}
      const roleHitNames: Record<string, string[]> = {}
      let totalPoints = 0
      for (const role of roles) {
        const sourceRoleIds = roleBuckets.get(role.roleId)
          ? Array.from(roleBuckets.get(role.roleId) ?? [])
          : []
        const count = sourceRoleIds.length
        roleHits[role.roleId] = count
        roleHitNames[role.roleId] = sourceRoleIds
          .map((sourceRoleId) => roleNameBySourceId.get(sourceRoleId) || sourceRoleId)
          .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
        if (count > 0) {
          totalPoints += role.points * count
        }
      }

      return {
        playerObjectId: playerKey,
        playerId: Number(player.player_id),
        playerName: player.player_name,
        country: player.country,
        avatar: player.avatar,
        kitImage: bestVisualByPlayerObjectId.get(playerKey)?.kitImage || pickRandomKit() || undefined,
        totalPoints,
        roleCount: Object.values(roleHits).reduce((sum, value) => sum + value, 0),
        roleHits,
        roleHitNames,
      }
    })
    .filter((entry) => entry.totalPoints > 0)
    .sort((a, b) => {
      const totalDiff = b.totalPoints - a.totalPoints
      if (totalDiff !== 0) return totalDiff
      const roleDiff = b.roleCount - a.roleCount
      if (roleDiff !== 0) return roleDiff
      return a.playerName.normalize("NFKC").localeCompare(b.playerName.normalize("NFKC"), "es", { sensitivity: "base" })
    })

  const entries: HallOfFameEntry[] = entriesBase.map((entry, index) => ({
    rank: index + 1,
    ...entry,
  }))

  return { roles, entries }
}

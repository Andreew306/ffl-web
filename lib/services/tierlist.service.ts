import mongoose from "mongoose"
import dbConnect from "@/lib/db/mongoose"
import PlayerModel from "@/lib/models/Player"
import TeamCompetitionModel from "@/lib/models/TeamCompetition"
import TeamModel from "@/lib/models/Team"
import UserModel from "@/lib/models/User"
import TierListModel from "@/lib/models/TierList"
import { getIdeal7Data } from "@/lib/services/ideal7.service"
import { normalizeTeamImageUrl } from "@/lib/utils"

export type TierListPlayerItem = {
  id: string
  type: "player"
  playerId: number
  playerName: string
  country: string
  avatar?: string
  teamName: string
  teamImage?: string
  kitImage?: string
}

export type TierListTeamItem = {
  id: string
  type: "team"
  teamId: number
  teamName: string
  image: string
}

export type TierListItemType = "players" | "teams"
export type TierListMode = "template" | "submission"
export type TierListVote = "up" | "down" | null

export type TierListTierData = {
  id: string
  label: string
  color: string
  itemIds: string[]
}

export type TierListRecord = {
  id: string
  title: string
  itemType: TierListItemType
  mode: TierListMode
  published: boolean
  tiers: TierListTierData[]
  allowedItemIds: string[]
  authorName: string
  authorAvatar?: string
  updatedAt: string
  templateId?: string
  templateTitle?: string
  voteScore: number
  upvotes: number
  downvotes: number
  userVote: TierListVote
}

export type TierListPageData = {
  players: TierListPlayerItem[]
  teams: TierListTeamItem[]
  ownTemplates: TierListRecord[]
  ownSubmissions: TierListRecord[]
  publishedTemplates: TierListRecord[]
  communitySubmissions: TierListRecord[]
}

type TeamDoc = {
  _id: mongoose.Types.ObjectId
  team_id?: number
  team_name?: string
  teamName?: string
  image?: string
}

type TierListLeanRecord = {
  _id: mongoose.Types.ObjectId
  title: string
  itemType: TierListItemType
  mode: TierListMode
  tiers?: TierListTierData[]
  allowedItemIds?: string[]
  published?: boolean
  authorName?: string | null
  authorAvatar?: string | null
  ownerUserId?: mongoose.Types.ObjectId
  templateId?: mongoose.Types.ObjectId | null
  upvoteDiscordIds?: string[]
  downvoteDiscordIds?: string[]
  updatedAt?: Date
}

function pickString(value?: string | null) {
  return typeof value === "string" ? value.trim() : ""
}

function buildAuthorName(discordId: string, playerName?: string | null) {
  return pickString(playerName) || discordId
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

async function getEligibleTeams(): Promise<TierListTeamItem[]> {
  const eligibleRows = (await TeamCompetitionModel.collection
    .aggregate([
      { $group: { _id: "$team_id", competitionIds: { $addToSet: "$competition_id" } } },
      { $project: { competitionCount: { $size: "$competitionIds" } } },
      { $match: { competitionCount: { $gte: 3 } } },
    ])
    .toArray()) as Array<{ _id: mongoose.Types.ObjectId }>

  const eligibleTeamIds = eligibleRows.map((row) => row._id)
  if (!eligibleTeamIds.length) {
    return []
  }

  const teams = (await TeamModel.collection
    .find(
      { _id: { $in: eligibleTeamIds } },
      { projection: { _id: 1, team_id: 1, team_name: 1, teamName: 1, image: 1 } }
    )
    .toArray()) as TeamDoc[]

  return teams
    .map((team) => ({
      id: team._id.toString(),
      type: "team" as const,
      teamId: Number(team.team_id ?? 0),
      teamName: pickString(team.team_name) || pickString(team.teamName) || "Unknown team",
      image: normalizeTeamImageUrl(team.image),
    }))
    .filter((team) => Boolean(team.image))
    .sort((a, b) => a.teamName.localeCompare(b.teamName))
}

async function getUserMetaMap(userIds: mongoose.Types.ObjectId[]) {
  if (!userIds.length) return new Map<string, { authorName: string; authorAvatar?: string }>()

  const users = await UserModel.find({ _id: { $in: userIds } })
    .select("_id discordId discordAvatar playerId")
    .lean<Array<{ _id: mongoose.Types.ObjectId; discordId: string; discordAvatar?: string | null; playerId?: mongoose.Types.ObjectId | null }>>()

  const playerIds = users
    .map((user) => user.playerId)
    .filter((value): value is mongoose.Types.ObjectId => Boolean(value))

  const players = playerIds.length
    ? await PlayerModel.find({ _id: { $in: playerIds } })
        .select("_id player_name")
        .lean<Array<{ _id: mongoose.Types.ObjectId; player_name?: string }>>()
    : []

  const playerMap = new Map(players.map((player) => [player._id.toString(), pickString(player.player_name)]))

  return new Map(
    users.map((user) => [
      user._id.toString(),
      {
        authorName: buildAuthorName(user.discordId, user.playerId ? playerMap.get(user.playerId.toString()) : undefined),
        authorAvatar: pickString(user.discordAvatar) || undefined,
      },
    ])
  )
}

function normalizeTierListRecord(
  row: TierListLeanRecord,
  userMetaMap: Map<string, { authorName: string; authorAvatar?: string }>,
  templateTitleMap: Map<string, string>,
  viewerDiscordId?: string | null
): TierListRecord {
  const fallbackMeta = row.ownerUserId ? userMetaMap.get(row.ownerUserId.toString()) : undefined
  const upvotes = row.upvoteDiscordIds?.length ?? 0
  const downvotes = row.downvoteDiscordIds?.length ?? 0
  const userVote = viewerDiscordId
    ? row.upvoteDiscordIds?.includes(viewerDiscordId)
      ? "up"
      : row.downvoteDiscordIds?.includes(viewerDiscordId)
        ? "down"
        : null
    : null

  return {
    id: row._id.toString(),
    title: row.title,
    itemType: row.itemType,
    mode: row.mode,
    published: Boolean(row.published),
    tiers: (row.tiers ?? []).map((tier) => ({
      id: tier.id,
      label: tier.label,
      color: tier.color,
      itemIds: tier.itemIds ?? [],
    })),
    allowedItemIds: row.allowedItemIds ?? [],
    authorName: pickString(row.authorName) || fallbackMeta?.authorName || "Unknown user",
    authorAvatar: pickString(row.authorAvatar) || fallbackMeta?.authorAvatar,
    updatedAt: row.updatedAt?.toISOString() ?? new Date(0).toISOString(),
    templateId: row.templateId ? row.templateId.toString() : undefined,
    templateTitle: row.templateId ? templateTitleMap.get(row.templateId.toString()) : undefined,
    voteScore: upvotes - downvotes,
    upvotes,
    downvotes,
    userVote,
  }
}

function sanitizeTiers(tiers: TierListTierData[], allowedItemIds: string[]) {
  const allowedSet = new Set(allowedItemIds)
  const seen = new Set<string>()

  return tiers.map((tier) => ({
    id: tier.id,
    label: tier.label.trim().slice(0, 32) || "Tier",
    color: tier.color,
    itemIds: (tier.itemIds ?? []).filter((itemId) => {
      if (!allowedSet.has(itemId) || seen.has(itemId)) return false
      seen.add(itemId)
      return true
    }),
  }))
}

export async function getTierListPageData(discordId?: string | null): Promise<TierListPageData> {
  await dbConnect()

  const [ideal7Data, teams, ownUser] = await Promise.all([
    getIdeal7Data(),
    getEligibleTeams(),
    discordId
      ? UserModel.findOne({ discordId }).select("_id").lean<{ _id: mongoose.Types.ObjectId } | null>()
      : Promise.resolve(null),
  ])

  const players: TierListPlayerItem[] = ideal7Data.players.map((player) => ({
    id: player.id,
    type: "player",
    playerId: player.playerId,
    playerName: player.playerName,
    country: player.country,
    avatar: player.avatar,
    teamName: player.teamName,
    teamImage: player.teamImage,
    kitImage: player.kitImage,
  }))

  const [ownRaw, templatesRaw, communityRaw] = await Promise.all([
    ownUser
      ? TierListModel.find({ ownerUserId: ownUser._id }).sort({ updatedAt: -1 }).lean<TierListLeanRecord[]>()
      : Promise.resolve([] as TierListLeanRecord[]),
    TierListModel.find({ mode: "template", published: true }).sort({ updatedAt: -1 }).limit(30).lean<TierListLeanRecord[]>(),
    TierListModel.find({ mode: "submission", published: true }).sort({ updatedAt: -1 }).limit(40).lean<TierListLeanRecord[]>(),
  ])

  const ownerUserIds = [...ownRaw, ...templatesRaw, ...communityRaw]
    .map((row) => row.ownerUserId)
    .filter((value): value is mongoose.Types.ObjectId => Boolean(value))
  const templateIds = [...ownRaw, ...communityRaw]
    .map((row) => row.templateId)
    .filter((value): value is mongoose.Types.ObjectId => Boolean(value))

  const [userMetaMap, templateRows] = await Promise.all([
    getUserMetaMap(ownerUserIds),
    templateIds.length
      ? TierListModel.find({ _id: { $in: templateIds } }).select("_id title").lean<Array<{ _id: mongoose.Types.ObjectId; title: string }>>()
      : Promise.resolve([]),
  ])

  const templateTitleMap = new Map(templateRows.map((row) => [row._id.toString(), row.title]))

  return {
    players,
    teams,
    ownTemplates: ownRaw
      .filter((row) => row.mode === "template")
      .map((row) => normalizeTierListRecord(row, userMetaMap, templateTitleMap, discordId)),
    ownSubmissions: ownRaw
      .filter((row) => row.mode === "submission")
      .map((row) => normalizeTierListRecord(row, userMetaMap, templateTitleMap, discordId)),
    publishedTemplates: templatesRaw.map((row) => normalizeTierListRecord(row, userMetaMap, templateTitleMap, discordId)),
    communitySubmissions: communityRaw.map((row) => normalizeTierListRecord(row, userMetaMap, templateTitleMap, discordId)),
  }
}

export async function saveTierListTemplateForUser(
  discordId: string,
  input: {
    listId?: string
    title: string
    itemType: TierListItemType
    tiers: TierListTierData[]
    allowedItemIds: string[]
    published: boolean
  }
) {
  await dbConnect()

  const user = await UserModel.findOne({ discordId }).select("_id discordAvatar playerId").lean<{
    _id: mongoose.Types.ObjectId
    discordAvatar?: string | null
    playerId?: mongoose.Types.ObjectId | null
  } | null>()

  if (!user) {
    throw new Error("You need to sign in with Discord to use Tier List.")
  }

  const linkedPlayer = user.playerId
    ? await PlayerModel.findById(user.playerId).select("player_name").lean<{ player_name?: string } | null>()
    : null

  const allowedItemIds = uniqueStrings(input.allowedItemIds)
  if (!allowedItemIds.length) {
    throw new Error("Select at least one option for this template.")
  }

  const payload = {
    title: input.title.trim().slice(0, 80) || "Untitled tier template",
    itemType: input.itemType,
    mode: "template" as const,
    templateId: null,
    tiers: sanitizeTiers(input.tiers, allowedItemIds),
    allowedItemIds,
    published: input.published,
    authorName: buildAuthorName(discordId, linkedPlayer?.player_name),
    authorAvatar: pickString(user.discordAvatar) || null,
  }

  if (input.listId) {
    const updated = await TierListModel.findOneAndUpdate(
      { _id: input.listId, ownerUserId: user._id, mode: "template" },
      { $set: payload },
      { new: true }
    ).lean<{ _id: mongoose.Types.ObjectId } | null>()

    if (!updated) throw new Error("The tier template could not be updated.")
    return { id: updated._id.toString() }
  }

  const created = await TierListModel.create({
    ownerUserId: user._id,
    ownerDiscordId: discordId,
    ...payload,
  })

  return { id: String(created._id) }
}

export async function saveTierListSubmissionForUser(
  discordId: string,
  input: {
    listId?: string
    title: string
    templateId: string
    tiers: TierListTierData[]
    published: boolean
  }
) {
  await dbConnect()

  const user = await UserModel.findOne({ discordId }).select("_id discordAvatar playerId").lean<{
    _id: mongoose.Types.ObjectId
    discordAvatar?: string | null
    playerId?: mongoose.Types.ObjectId | null
  } | null>()

  if (!user) {
    throw new Error("You need to sign in with Discord to use Tier List.")
  }

  const template = await TierListModel.findOne({ _id: input.templateId, mode: "template", published: true }).lean<TierListLeanRecord | null>()
  if (!template) {
    throw new Error("This tier template is no longer available.")
  }

  const linkedPlayer = user.playerId
    ? await PlayerModel.findById(user.playerId).select("player_name").lean<{ player_name?: string } | null>()
    : null

  const payload = {
    title: input.title.trim().slice(0, 80) || template.title,
    itemType: template.itemType,
    mode: "submission" as const,
    templateId: template._id,
    tiers: sanitizeTiers(input.tiers, template.allowedItemIds ?? []),
    allowedItemIds: template.allowedItemIds ?? [],
    published: input.published,
    authorName: buildAuthorName(discordId, linkedPlayer?.player_name),
    authorAvatar: pickString(user.discordAvatar) || null,
  }

  if (input.listId) {
    const updated = await TierListModel.findOneAndUpdate(
      { _id: input.listId, ownerUserId: user._id, mode: "submission" },
      { $set: payload },
      { new: true }
    ).lean<{ _id: mongoose.Types.ObjectId } | null>()

    if (!updated) throw new Error("The tier list could not be updated.")
    return { id: updated._id.toString() }
  }

  const created = await TierListModel.create({
    ownerUserId: user._id,
    ownerDiscordId: discordId,
    ...payload,
  })

  return { id: String(created._id) }
}

export async function voteTierListForUser(discordId: string, listId: string, direction: "up" | "down") {
  await dbConnect()

  const list = await TierListModel.findById(listId).select("ownerDiscordId mode upvoteDiscordIds downvoteDiscordIds")
  if (!list || list.mode !== "submission") {
    throw new Error("This tier list is not available for voting.")
  }

  const upvotes = new Set(list.upvoteDiscordIds ?? [])
  const downvotes = new Set(list.downvoteDiscordIds ?? [])

  if (direction === "up") {
    if (upvotes.has(discordId)) {
      upvotes.delete(discordId)
    } else {
      upvotes.add(discordId)
      downvotes.delete(discordId)
    }
  } else if (downvotes.has(discordId)) {
    downvotes.delete(discordId)
  } else {
    downvotes.add(discordId)
    upvotes.delete(discordId)
  }

  list.upvoteDiscordIds = [...upvotes]
  list.downvoteDiscordIds = [...downvotes]
  await list.save()
}

export async function deleteTierListTemplateForUser(discordId: string, templateId: string) {
  await dbConnect()

  const user = await UserModel.findOne({ discordId }).select("_id").lean<{ _id: mongoose.Types.ObjectId } | null>()
  if (!user) {
    throw new Error("You need to sign in with Discord to use Tier List.")
  }

  const template = await TierListModel.findOne({
    _id: templateId,
    ownerUserId: user._id,
    mode: "template",
  })
    .select("_id")
    .lean<{ _id: mongoose.Types.ObjectId } | null>()

  if (!template) {
    throw new Error("This template could not be found.")
  }

  await TierListModel.deleteMany({
    $or: [{ _id: template._id }, { templateId: template._id }],
  })
}

export async function deleteTierListSubmissionForUser(discordId: string, submissionId: string) {
  await dbConnect()

  const user = await UserModel.findOne({ discordId }).select("_id").lean<{ _id: mongoose.Types.ObjectId } | null>()
  if (!user) {
    throw new Error("You need to sign in with Discord to use Tier List.")
  }

  const deleted = await TierListModel.findOneAndDelete({
    _id: submissionId,
    ownerUserId: user._id,
    mode: "submission",
  })
    .select("_id")
    .lean<{ _id: mongoose.Types.ObjectId } | null>()

  if (!deleted) {
    throw new Error("This submission could not be found.")
  }
}

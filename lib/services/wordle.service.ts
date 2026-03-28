import mongoose from "mongoose"
import dbConnect from "@/lib/db/mongoose"
import PlayerModel from "@/lib/models/Player"
import PlayerCompetitionModel from "@/lib/models/PlayerCompetition"
import WordleResultModel from "@/lib/models/WordleResult"
import UserModel from "@/lib/models/User"

export const WORDLE_VERSION = 4

type DailyWordle = {
  answer: string
  answerDisplay: string
  length: number
  dateKey: string
}

function toMadridDateKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(value)

  const year = parts.find((part) => part.type === "year")?.value ?? "0000"
  const month = parts.find((part) => part.type === "month")?.value ?? "00"
  const day = parts.find((part) => part.type === "day")?.value ?? "00"
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0")

  if (hour < 1) {
    const previous = new Date(value.getTime() - 24 * 60 * 60 * 1000)
    const prevParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(previous)

    const prevYear = prevParts.find((part) => part.type === "year")?.value ?? "0000"
    const prevMonth = prevParts.find((part) => part.type === "month")?.value ?? "00"
    const prevDay = prevParts.find((part) => part.type === "day")?.value ?? "00"
    return `${prevYear}-${prevMonth}-${prevDay}`
  }

  return `${year}-${month}-${day}`
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

export async function getWordlePlayerForDate(dateKey: string): Promise<DailyWordle> {
  await dbConnect()

  const eligiblePlayers = await PlayerCompetitionModel.aggregate<{
    _id: string
    matchesPlayed: number
  }>([
    {
      $group: {
        _id: "$player_id",
        matchesPlayed: {
          $sum: { $ifNull: ["$matchesPlayed", "$matches_played"] },
        },
      },
    },
    { $match: { matchesPlayed: { $gte: 10 } } },
  ])

  const eligibleIds = eligiblePlayers.map((player) => player._id)

  if (!eligibleIds.length) {
    return {
      answer: "player",
      answerDisplay: "Player",
      length: 6,
      dateKey,
    }
  }

  const players = await PlayerModel.find({ _id: { $in: eligibleIds } })
    .select("player_name")
    .lean<Array<{ player_name: string }>>()

  const candidates = players
    .map((player) => {
      const display = player.player_name?.trim()
      const normalized = display ? normalizeName(display) : ""
      return {
        display: display ?? "",
        normalized,
      }
    })
    .filter((entry) => entry.normalized.length >= 3 && entry.normalized.length <= 20)

  if (!candidates.length) {
    return {
      answer: "player",
      answerDisplay: "Player",
      length: 6,
      dateKey,
    }
  }

  const seed = dateKey.split("-").join("")
  const index = Number.parseInt(seed, 10) % candidates.length
  const choice = candidates[index]

  return {
    answer: choice.normalized,
    answerDisplay: choice.display,
    length: choice.normalized.length,
    dateKey,
  }
}

export async function getDailyWordlePlayer(): Promise<DailyWordle> {
  return getWordlePlayerForDate(toMadridDateKey())
}

export async function getDailyWordleLeaderboard(dateKey?: string) {
  await dbConnect()

  const targetDateKey = dateKey ?? toMadridDateKey()
  const results = await WordleResultModel.find({
    dateKey: targetDateKey,
    version: WORDLE_VERSION,
    completedAt: { $ne: null },
  })
    .select("discordId discordName discordAvatar attempts solved completedAt")
    .sort({ solved: -1, attempts: 1, completedAt: 1 })
    .lean<
      Array<{
        discordId: string
        discordName?: string | null
        discordAvatar?: string | null
        attempts: number
        solved: boolean
        completedAt?: Date | null
      }>
    >()

  const missingNames = results.filter((entry) => !entry.discordName?.trim()).map((entry) => entry.discordId)
  if (missingNames.length) {
    const users = await UserModel.find({ discordId: { $in: missingNames } })
      .select("discordId discordName playerId")
      .lean<Array<{ discordId: string; discordName?: string | null; playerId?: mongoose.Types.ObjectId | null }>>()
    const playerIds = users.map((user) => user.playerId).filter(Boolean) as mongoose.Types.ObjectId[]
    const players = playerIds.length
      ? await PlayerModel.find({ _id: { $in: playerIds } })
        .select("_id player_name")
        .lean<Array<{ _id: mongoose.Types.ObjectId; player_name?: string | null }>>()
      : []
    const playerNameById = new Map(players.map((player) => [player._id.toString(), player.player_name?.trim() ?? null]))

    const nameByDiscord = new Map(
      users.map((user) => [
        user.discordId,
        user.discordName?.trim()
          || (user.playerId ? playerNameById.get(user.playerId.toString()) : null)
          || null,
      ])
    )

    results.forEach((entry) => {
      const name = nameByDiscord.get(entry.discordId)
      if (name) {
        entry.discordName = name
      }
    })
  }

  return {
    dateKey: targetDateKey,
    results: results.map((result) => ({
      discordId: result.discordId,
      discordName: result.discordName ?? null,
      discordAvatar: result.discordAvatar ?? null,
      attempts: result.attempts,
      solved: result.solved,
    })),
  }
}

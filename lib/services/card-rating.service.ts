import mongoose from "mongoose"
import dbConnect from "@/lib/db/mongoose"
import PlayerModel from "@/lib/models/Player"
import type { CardRating } from "@/lib/models/CardRequest"

type RawDoc = Record<string, unknown>

export type GeneratedCardData = {
  player: {
    objectId: string
    playerId: number
    name: string
    country: string
    avatar?: string
  }
  team: {
    name?: string
    image?: string
  }
  position: string
  rating: CardRating
  summary: {
    matches: number
    weightedMatches: number
    minutes: number
    avg: number
    reliabilityApplied: boolean
  }
}

const MIN_RELIABLE_MATCHES = 18
const STAT_SEASON_MIN = 0.84
const STAT_SEASON_MAX = 1

function num(value: unknown) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function str(value: unknown) {
  return typeof value === "string" ? value : ""
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function rate(part: number, total: number) {
  return total > 0 ? part / total : 0
}

function roundRating(value: number) {
  return Math.round(clamp(value, 1, 99))
}

function getDivisionWeight(competition: RawDoc) {
  const type = str(competition.type).toLowerCase()
  const division = num(competition.division)

  if (type === "league") {
    if (division <= 1) return 1
    if (division === 2) return 0.5
    if (division === 3) return 0.2
    return 0.1
  }

  if (type === "cup" || type === "nations_cup") return 0.8
  if (type === "supercup" || type === "summer_cup") return 0.7
  return 0.6
}

function getSeasonNumber(competition: RawDoc) {
  const name = str(competition.name)
  const seasonId = str(competition.season_id)
  const match = `${name} ${seasonId}`.match(/season\s*(\d+)|\bs(\d+)\b/i)
  if (match) return num(match[1] || match[2])

  const year = num(competition.year)
  if (year >= 2026) return 9
  if (year === 2025) return 7
  if (year === 2024) return 4
  return 1
}

function getSeasonWeight(competition: RawDoc) {
  const seasonNumber = clamp(getSeasonNumber(competition), 1, 9)
  const progress = (seasonNumber - 1) / 8
  return STAT_SEASON_MIN + (STAT_SEASON_MAX - STAT_SEASON_MIN) * progress
}

function getCompetitionWeight(competition: RawDoc) {
  return getDivisionWeight(competition) * getSeasonWeight(competition)
}

function normalizePosition(position: string) {
  const value = position.toUpperCase()
  if (["GK"].includes(value)) return "GK"
  if (["CB", "LB", "RB", "DM"].includes(value)) return "DEF"
  if (["CM", "LM", "RM"].includes(value)) return "MID"
  return "FWD"
}

function ovrFromAttributes(position: string, rating: Omit<CardRating, "ovr">, avg: number, winRate: number, lossRate: number) {
  const group = normalizePosition(position)
  const weights =
    group === "GK"
      ? { sho: 0.02, pas: 0.18, def: 0.55, dri: 0.15 }
      : group === "DEF"
        ? { sho: 0.02, pas: 0.22, def: 0.52, dri: 0.24 }
        : group === "MID"
          ? { sho: 0.12, pas: 0.34, def: 0.29, dri: 0.25 }
          : { sho: 0.39, pas: 0.19, def: 0.06, dri: 0.36 }

  const attributeBase =
    rating.sho * weights.sho +
    rating.pas * weights.pas +
    rating.def * weights.def +
    rating.dri * weights.dri
  const avgBoost = clamp((avg - 6.8) * 1.6, -2.5, 3.5)
  const resultBoost = clamp(winRate * 4 - lossRate * 4, -3.5, 3.5)
  return roundRating(attributeBase + avgBoost + resultBoost)
}

export async function generateCardRatingForPlayer(playerObjectId: string): Promise<GeneratedCardData> {
  await dbConnect()

  if (!mongoose.Types.ObjectId.isValid(playerObjectId)) {
    throw new Error("Invalid player id.")
  }

  const objectId = new mongoose.Types.ObjectId(playerObjectId)
  const player = await PlayerModel.findById(objectId)
    .select("_id player_id player_name country avatar")
    .lean<{ _id: mongoose.Types.ObjectId; player_id: number; player_name: string; country: string; avatar?: string } | null>()

  if (!player) {
    throw new Error("Player not found.")
  }

  const db = mongoose.connection.db
  if (!db) {
    throw new Error("Mongo connection is not ready.")
  }

  const rows = await db
    .collection("playercompetitions")
    .aggregate<RawDoc>([
      { $match: { player_id: objectId } },
      {
        $lookup: {
          from: "teamcompetitions",
          localField: "team_competition_id",
          foreignField: "_id",
          as: "teamCompetition",
        },
      },
      { $unwind: { path: "$teamCompetition", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "competitions",
          localField: "teamCompetition.competition_id",
          foreignField: "_id",
          as: "competition",
        },
      },
      { $unwind: { path: "$competition", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "teams",
          localField: "teamCompetition.team_id",
          foreignField: "_id",
          as: "team",
        },
      },
      { $unwind: { path: "$team", preserveNullAndEmptyArrays: true } },
    ])
    .toArray()

  if (!rows.length) {
    throw new Error("This player has no competition stats.")
  }

  const totals = {
    matches: 0,
    weightedMatches: 0,
    minutes: 0,
    goals: 0,
    assists: 0,
    preassists: 0,
    kicks: 0,
    passes: 0,
    keypass: 0,
    autopass: 0,
    misspass: 0,
    shotsOnGoal: 0,
    shotsOffGoal: 0,
    saves: 0,
    clearances: 0,
    recoveries: 0,
    goalsConceded: 0,
    cleanSheets: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    avgWeighted: 0,
    avgWeight: 0,
  }

  const positions = new Map<string, number>()
  let bestTeam: { name?: string; image?: string; weight: number } = { weight: -1 }

  for (const row of rows) {
    const competition = (row.competition ?? {}) as RawDoc
    const team = (row.team ?? {}) as RawDoc
    const weight = getCompetitionWeight(competition)
    const matches = num(row.matches_played ?? row.matchesPlayed)
    const minutes = num(row.minutes_played ?? row.minutesPlayed)
    const position = str(row.position) || "CM"

    totals.matches += matches
    totals.weightedMatches += matches * weight
    totals.minutes += minutes
    totals.goals += num(row.goals) * weight
    totals.assists += num(row.assists) * weight
    totals.preassists += num(row.preassists) * weight
    totals.kicks += num(row.kicks) * weight
    totals.passes += num(row.passes) * weight
    totals.keypass += num(row.keypass ?? row.keyPass) * weight
    totals.autopass += num(row.autopass) * weight
    totals.misspass += num(row.misspass ?? row.missed_passes) * weight
    totals.shotsOnGoal += num(row.shots_on_goal ?? row.shotsOnGoal) * weight
    totals.shotsOffGoal += num(row.shots_off_goal ?? row.shotsOffGoal) * weight
    totals.saves += num(row.saves) * weight
    totals.clearances += num(row.clearances) * weight
    totals.recoveries += num(row.recoveries) * weight
    totals.goalsConceded += num(row.goals_conceded ?? row.goalsConceded) * weight
    totals.cleanSheets += num(row.cs) * weight
    totals.wins += num(row.matches_won ?? row.matchesWon) * weight
    totals.draws += num(row.matches_draw ?? row.matchesDraw) * weight
    totals.losses += num(row.matches_lost ?? row.matchesLost) * weight

    if (matches > 0) {
      totals.avgWeighted += num(row.avg) * matches * weight
      totals.avgWeight += matches * weight
      positions.set(position, (positions.get(position) ?? 0) + matches * weight)
    }

    const teamWeight = matches * weight
    if (teamWeight > bestTeam.weight) {
      bestTeam = {
        name: str(team.team_name),
        image: str(team.image),
        weight: teamWeight,
      }
    }
  }

  const weightedMatches = Math.max(totals.weightedMatches, 1)
  const realMatches = Math.max(totals.matches, 1)
  const shots = totals.shotsOnGoal + totals.shotsOffGoal
  const avg = totals.avgWeight > 0 ? totals.avgWeighted / totals.avgWeight : 6.5
  const passAccuracy = rate(totals.passes + totals.autopass, totals.passes + totals.autopass + totals.misspass)
  const autopassRate = rate(totals.autopass, totals.kicks)
  const goalAccuracy = rate(totals.goals, shots)
  const shotOnTargetRate = rate(totals.shotsOnGoal, shots)
  const goalsConcededRate = rate(totals.goalsConceded, weightedMatches)
  const winRate = rate(totals.wins, weightedMatches)
  const lossRate = rate(totals.losses, weightedMatches)
  const minutesPerMatch = rate(totals.minutes, realMatches)
  const starterReliability = clamp(minutesPerMatch / 100, 0.78, 1.08)
  const avgBonus = clamp((avg - 6.5) * 2.2, -4, 6)

  const goalsPer90 = rate(totals.goals * 90, totals.minutes || realMatches * 90)
  const assistsPer90 = rate(totals.assists * 90, totals.minutes || realMatches * 90)
  const keyPassPer90 = rate(totals.keypass * 90, totals.minutes || realMatches * 90)
  const recoveriesPer90 = rate(totals.recoveries * 90, totals.minutes || realMatches * 90)
  const clearancesPer90 = rate(totals.clearances * 90, totals.minutes || realMatches * 90)
  const autopassPer90 = rate(totals.autopass * 90, totals.minutes || realMatches * 90)

  const sho = roundRating(
    (48 + goalsPer90 * 19 + rate(totals.shotsOnGoal, weightedMatches) * 3.2 + goalAccuracy * 12 + shotOnTargetRate * 6 + avgBonus) *
      starterReliability
  )
  const pas = roundRating(
    (50 + assistsPer90 * 12 + rate(totals.preassists, weightedMatches) * 5 + keyPassPer90 * 2.9 + passAccuracy * 18 + avgBonus - rate(totals.misspass, totals.passes + totals.autopass + totals.misspass) * 18) *
      starterReliability
  )
  const def = roundRating(
    (48 + recoveriesPer90 * 2.7 + clearancesPer90 * 3.1 + rate(totals.saves, weightedMatches) * 1.7 + rate(totals.cleanSheets, weightedMatches) * 13 - goalsConcededRate * 2.1 + avgBonus) *
      starterReliability
  )
  const dri = roundRating((50 + autopassPer90 * 7.5 + autopassRate * 24 + passAccuracy * 8 + avgBonus) * starterReliability)

  const position = [...positions.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "CM"
  let ovr = ovrFromAttributes(position, { sho, pas, def, dri }, avg, winRate, lossRate)

  const reliabilityApplied = totals.matches < MIN_RELIABLE_MATCHES
  if (reliabilityApplied) {
    ovr = Math.min(ovr, 80)
  }

  return {
    player: {
      objectId: player._id.toString(),
      playerId: Number(player.player_id),
      name: player.player_name,
      country: player.country,
      avatar: player.avatar,
    },
    team: {
      name: bestTeam.name,
      image: bestTeam.image,
    },
    position,
    rating: { ovr, sho, pas, def, dri },
    summary: {
      matches: totals.matches,
      weightedMatches: Number(totals.weightedMatches.toFixed(2)),
      minutes: totals.minutes,
      avg: Number(avg.toFixed(2)),
      reliabilityApplied,
    },
  }
}

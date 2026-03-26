import mongoose from "mongoose"
import dbConnect from "@/lib/db/mongoose"
import CompetitionModel from "@/lib/models/Competition"
import PlayerModel from "@/lib/models/Player"
import TeamCompetitionModel from "@/lib/models/TeamCompetition"
import TeamModel from "@/lib/models/Team"
import { getKitTextColor, normalizeTeamImageUrl } from "@/lib/utils"

export type Ideal7Player = {
  id: string
  playerId: number
  playerName: string
  country: string
  avatar?: string
  teamName: string
  teamImage?: string
  kitImage?: string
  kitTextColor?: string
  goals: number
  assists: number
  matchesPlayed: number
}

export type Ideal7Data = {
  players: Ideal7Player[]
}

type RawCompetition = {
  _id: mongoose.Types.ObjectId
  season?: number | string | null
}

type RawTeamCompetition = {
  _id: mongoose.Types.ObjectId
  team_id?: mongoose.Types.ObjectId
  competition_id?: mongoose.Types.ObjectId
  kits?: string[]
  textColor?: string
}

type RawTeam = {
  _id: mongoose.Types.ObjectId
  team_name?: string
  teamName?: string
  image?: string
  kits?: string[]
  textColor?: string
}

type RawPlayerCompetition = {
  _id: mongoose.Types.ObjectId
  player_id?: mongoose.Types.ObjectId
  team_competition_id?: mongoose.Types.ObjectId
  matches_played?: number
  matchesPlayed?: number
  goals?: number
  assists?: number
}

type RawPlayer = {
  _id: mongoose.Types.ObjectId
  player_id: number
  player_name?: string
  playerName?: string
  country?: string
  avatar?: string
}

function pickString(value?: string | null) {
  return typeof value === "string" ? value.trim() : ""
}

function extractSeasonValue(rawSeason: string | number | null | undefined) {
  if (rawSeason === null || rawSeason === undefined) {
    return -1
  }

  const numeric = Number(rawSeason)
  if (Number.isFinite(numeric)) {
    return numeric
  }

  const match = String(rawSeason).match(/\d+/)
  return match ? Number.parseInt(match[0], 10) : -1
}

export async function getIdeal7Data(): Promise<Ideal7Data> {
  await dbConnect()

  const rawCompetitions = await CompetitionModel.collection
    .find({}, { projection: { _id: 1, season: 1 } })
    .toArray() as RawCompetition[]

  const seasonByCompetitionId = new Map(
    rawCompetitions.map((competition) => [
      competition._id.toString(),
      extractSeasonValue(competition.season),
    ])
  )

  const rawTeamCompetitions = await TeamCompetitionModel.collection
    .find({}, { projection: { _id: 1, team_id: 1, competition_id: 1, kits: 1, textColor: 1 } })
    .toArray() as RawTeamCompetition[]

  const teamIds = rawTeamCompetitions
    .map((entry) => entry.team_id)
    .filter((value): value is mongoose.Types.ObjectId => Boolean(value))

  const rawTeams = teamIds.length
    ? await TeamModel.collection
        .find(
          { _id: { $in: teamIds } },
          { projection: { _id: 1, team_name: 1, teamName: 1, image: 1, kits: 1, textColor: 1 } }
        )
        .toArray() as RawTeam[]
    : []

  const teamById = new Map(
    rawTeams.map((team) => [
      team._id.toString(),
      {
        teamName: pickString(team.team_name) || pickString(team.teamName) || "Unknown team",
        teamImage: normalizeTeamImageUrl(team.image),
        teamKit: team.kits?.[0] || "",
        teamTextColor: getKitTextColor(team.textColor),
      },
    ])
  )

  const visualsByTeamCompetitionId = new Map(
    rawTeamCompetitions.map((entry) => {
      const team = entry.team_id ? teamById.get(entry.team_id.toString()) : null
      const season = entry.competition_id ? seasonByCompetitionId.get(entry.competition_id.toString()) ?? -1 : -1
      return [
        entry._id.toString(),
        {
          season,
          teamName: team?.teamName ?? "Unknown team",
          teamImage: team?.teamImage ?? "",
          kitImage: entry.kits?.[0] || team?.teamKit || "",
          kitTextColor: getKitTextColor(entry.textColor) || team?.teamTextColor || "",
        },
      ]
    })
  )

  const rawPlayerCompetitions = await TeamCompetitionModel.db.collection("playercompetitions")
    .find(
      {},
      {
        projection: {
          _id: 1,
          player_id: 1,
          team_competition_id: 1,
          matches_played: 1,
          matchesPlayed: 1,
          goals: 1,
          assists: 1,
        },
      }
    )
    .toArray() as RawPlayerCompetition[]

  const bestByPlayerId = new Map<
    string,
    {
      playerObjectId: mongoose.Types.ObjectId
      teamCompetitionId: string
      season: number
      matchesPlayed: number
      goals: number
      assists: number
    }
  >()

  for (const row of rawPlayerCompetitions) {
    if (!row.player_id || !row.team_competition_id) continue
    const visuals = visualsByTeamCompetitionId.get(row.team_competition_id.toString())
    if (!visuals) continue

    const normalized = {
      playerObjectId: row.player_id,
      teamCompetitionId: row.team_competition_id.toString(),
      season: visuals.season,
      matchesPlayed: Number(row.matches_played ?? row.matchesPlayed ?? 0),
      goals: Number(row.goals ?? 0),
      assists: Number(row.assists ?? 0),
    }

    const key = row.player_id.toString()
    const current = bestByPlayerId.get(key)

    if (
      !current
      || normalized.season > current.season
      || (normalized.season === current.season && normalized.matchesPlayed > current.matchesPlayed)
      || (
        normalized.season === current.season
        && normalized.matchesPlayed === current.matchesPlayed
        && normalized.goals > current.goals
      )
      || (
        normalized.season === current.season
        && normalized.matchesPlayed === current.matchesPlayed
        && normalized.goals === current.goals
        && normalized.assists > current.assists
      )
    ) {
      bestByPlayerId.set(key, normalized)
    }
  }

  const playerObjectIds = [...bestByPlayerId.values()].map((entry) => entry.playerObjectId)
  const rawPlayers = playerObjectIds.length
    ? await PlayerModel.collection
        .find(
          { _id: { $in: playerObjectIds } },
          { projection: { _id: 1, player_id: 1, player_name: 1, playerName: 1, country: 1, avatar: 1 } }
        )
        .toArray() as RawPlayer[]
    : []

  const playerById = new Map(rawPlayers.map((player) => [player._id.toString(), player]))

  const players = [...bestByPlayerId.values()]
    .map((entry): Ideal7Player | null => {
      const player = playerById.get(entry.playerObjectId.toString())
      const visuals = visualsByTeamCompetitionId.get(entry.teamCompetitionId)
      if (!player || !visuals) {
        return null
      }

      return {
        id: entry.playerObjectId.toString(),
        playerId: Number(player.player_id),
        playerName: pickString(player.player_name) || pickString(player.playerName) || "Unknown player",
        country: pickString(player.country),
        avatar: pickString(player.avatar) || undefined,
        teamName: visuals.teamName,
        teamImage: visuals.teamImage || undefined,
        kitImage: visuals.kitImage || undefined,
        kitTextColor: visuals.kitTextColor || undefined,
        goals: entry.goals,
        assists: entry.assists,
        matchesPlayed: entry.matchesPlayed,
      }
    })
    .filter((player): player is Ideal7Player => player !== null)
    .sort((a, b) =>
      a.playerName.localeCompare(b.playerName)
      || b.matchesPlayed - a.matchesPlayed
    )

  return { players }
}

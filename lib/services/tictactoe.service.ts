import mongoose from "mongoose"
import dbConnect from "@/lib/db/mongoose"
import PlayerModel from "@/lib/models/Player"
import TeamCompetitionModel from "@/lib/models/TeamCompetition"
import TeamModel from "@/lib/models/Team"
import TicTacToeGameModel from "@/lib/models/TicTacToeGame"
import UserModel from "@/lib/models/User"
import { normalizeTeamImageUrl } from "@/lib/utils"

const ONLINE_WIN_REWARD = 10

export type TicTacToeCellOption = {
  playerObjectId: string
  playerId: number
  playerName: string
  country: string
  avatar?: string
  kitImage?: string
  teamImage?: string
  teamName?: string
}

export type TicTacToeHeaderTeam = {
  id: string
  name: string
  image?: string
  kitImage?: string
}

export type TicTacToeBoard = {
  columns: TicTacToeHeaderTeam[]
  rows: string[]
  cells: Array<{
    key: string
    row: number
    col: number
    options: TicTacToeCellOption[]
  }>
}

export type TicTacToeDifficulty = "easy" | "medium" | "hard" | "all"

export type TicTacToeLeaderboardEntry = {
  userId: string
  teamName: string
  playerName?: string
  avatar?: string
  wins: number
  games: number
  rating: number
}

export type TicTacToeRivalEntry = {
  userId: string
  teamName: string
  playerName?: string
  avatar?: string
  games: number
}

export type TicTacToePageData = {
  boards: Record<TicTacToeDifficulty, TicTacToeBoard[]>
  searchablePlayers: TicTacToeCellOption[]
  topWins: TicTacToeLeaderboardEntry[]
  mostGames: TicTacToeLeaderboardEntry[]
  rivals: TicTacToeRivalEntry[]
}

export type TicTacToeOnlineGameSummary = {
  gameId: string
  status: "pending" | "active" | "finished"
  difficulty?: "easy" | "medium" | "hard" | null
  createdAt: Date
  turnSeconds?: number | null
  turnExpiresAt?: Date | null
  currentTurnUserId?: string | null
  yourUserId: string
  opponent: {
    userId: string
    displayName: string
    avatar?: string
  }
  isYourTurn: boolean
}

type TeamDoc = {
  _id: mongoose.Types.ObjectId
  team_id?: number
  team_name?: string
  teamName?: string
  image?: string
  kits?: string[]
}

type PlayerDoc = {
  _id: mongoose.Types.ObjectId
  player_id?: number
  player_name?: string
  playerName?: string
  country?: string
  avatar?: string
}

function shuffle<T>(items: T[]) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function getTeamName(team: TeamDoc) {
  return team.team_name || team.teamName || "Unknown team"
}

function isCellCountValid(count: number, difficulty: TicTacToeDifficulty) {
  if (difficulty === "all") return count >= 1
  if (difficulty === "hard") return count >= 1 && count <= 2
  if (difficulty === "medium") return count >= 3 && count <= 5
  return count > 5
}

function buildBoard(
  teamRows: Array<{ team: TeamDoc; countries: string[] }>,
  teamCountryPlayers: Map<string, TicTacToeCellOption[]>,
  difficulty: TicTacToeDifficulty
) {
  const shuffled = shuffle(teamRows)

  for (let i = 0; i < shuffled.length; i += 1) {
    for (let j = i + 1; j < shuffled.length; j += 1) {
      for (let k = j + 1; k < shuffled.length; k += 1) {
        const teams = [shuffled[i], shuffled[j], shuffled[k]]
        const commonCountries = teams[0].countries
          .filter((country) => teams[1].countries.includes(country) && teams[2].countries.includes(country))
        const uniqueCommon = [...new Set(commonCountries)]
        if (uniqueCommon.length < 3) continue

        const chosenCountries = shuffle(uniqueCommon).slice(0, 3)
        const columns = teams.map(({ team }) => ({
          id: team._id.toString(),
          name: getTeamName(team),
          image: normalizeTeamImageUrl(team.image),
          kitImage: normalizeTeamImageUrl(team.kits?.[0]),
        }))
        const rows = chosenCountries
        const cells = rows.flatMap((country, rowIndex) =>
          columns.map((column, colIndex) => ({
            key: `${country}::${column.id}`,
            row: rowIndex,
            col: colIndex,
            options: teamCountryPlayers.get(`${column.id}::${country}`) ?? [],
          }))
        )

        if (cells.every((cell) => isCellCountValid(cell.options.length, difficulty))) {
          return { columns, rows, cells }
        }
      }
    }
  }

  return null
}

function buildBoards(
  teamRows: Array<{ team: TeamDoc; countries: string[] }>,
  teamCountryPlayers: Map<string, TicTacToeCellOption[]>,
  difficulty: TicTacToeDifficulty,
  targetCount = 8
) {
  const boards: TicTacToeBoard[] = []
  const seen = new Set<string>()

  for (let attempt = 0; attempt < 40 && boards.length < targetCount; attempt += 1) {
    const board = buildBoard(teamRows, teamCountryPlayers, difficulty)
    if (!board) {
      continue
    }

    const signature = [
      board.columns.map((column) => column.id).join("|"),
      board.rows.join("|"),
    ].join("::")

    if (seen.has(signature)) {
      continue
    }

    seen.add(signature)
    boards.push(board)
  }

  return boards
}

async function getUserMetaMap(userIds: mongoose.Types.ObjectId[]) {
  if (!userIds.length) return new Map<string, { teamName: string; playerName?: string; avatar?: string }>()

  const users = await UserModel.find({ _id: { $in: userIds } })
    .select("_id discordId discordAvatar playerId")
    .lean<Array<{ _id: mongoose.Types.ObjectId; discordId: string; discordAvatar?: string | null; playerId?: mongoose.Types.ObjectId | null }>>()

  const playerIds = users
    .map((user) => user.playerId)
    .filter((value): value is mongoose.Types.ObjectId => Boolean(value))

  const players = playerIds.length
    ? await PlayerModel.find({ _id: { $in: playerIds } })
        .select("_id player_name player_id")
        .lean<Array<{ _id: mongoose.Types.ObjectId; player_name?: string; player_id?: number }>>()
    : []
  const playerMap = new Map(players.map((player) => [player._id.toString(), player]))

  return new Map(
    users.map((user) => {
      const player = user.playerId ? playerMap.get(user.playerId.toString()) : null
      return [
        user._id.toString(),
        {
          teamName: player?.player_name || user.discordId,
          playerName: player?.player_name,
          avatar: user.discordAvatar || undefined,
        },
      ]
    })
  )
}

export async function getTicTacToeOnlineGameSummary(gameId: string, discordId: string | null): Promise<TicTacToeOnlineGameSummary | null> {
  if (!discordId || !mongoose.Types.ObjectId.isValid(gameId)) {
    return null
  }

  await dbConnect()
  const currentUser = await UserModel.findOne({ discordId })
    .select("_id discordId")
    .lean<{ _id: mongoose.Types.ObjectId; discordId: string } | null>()

  if (!currentUser?._id) {
    return null
  }

  const game = await TicTacToeGameModel.findOne({
    _id: new mongoose.Types.ObjectId(gameId),
    mode: "online",
    $or: [{ createdByUserId: currentUser._id }, { opponentUserId: currentUser._id }],
  })
    .select("_id status difficulty createdByUserId opponentUserId currentTurnUserId turnExpiresAt turnSeconds createdAt")
    .lean<{
      _id: mongoose.Types.ObjectId
      status: "pending" | "active" | "finished"
      difficulty?: "easy" | "medium" | "hard" | null
      createdByUserId?: mongoose.Types.ObjectId | null
      opponentUserId?: mongoose.Types.ObjectId | null
      currentTurnUserId?: mongoose.Types.ObjectId | null
      turnExpiresAt?: Date | null
      turnSeconds?: number | null
      createdAt: Date
    } | null>()

  if (!game) {
    return null
  }

  const opponentId = String(game.createdByUserId) === String(currentUser._id)
    ? game.opponentUserId
    : game.createdByUserId

  const metaMap = await getUserMetaMap(
    [currentUser._id, opponentId].filter((value): value is mongoose.Types.ObjectId => Boolean(value))
  )
  const opponentMeta = opponentId ? metaMap.get(String(opponentId)) : null

  const opponentDisplayName =
    opponentMeta?.playerName ||
    opponentMeta?.teamName ||
    "Opponent"

  return {
    gameId: game._id.toString(),
    status: game.status,
    difficulty: game.difficulty ?? null,
    createdAt: game.createdAt,
    turnSeconds: game.turnSeconds ?? null,
    turnExpiresAt: game.turnExpiresAt ?? null,
    currentTurnUserId: game.currentTurnUserId?.toString() ?? null,
    yourUserId: currentUser._id.toString(),
    opponent: {
      userId: opponentId?.toString() ?? "",
      displayName: opponentDisplayName,
      avatar: opponentMeta?.avatar,
    },
    isYourTurn: game.currentTurnUserId?.toString() === currentUser._id.toString(),
  }
}

async function grantPendingOnlineRewards() {
  const finishedGames = await TicTacToeGameModel.find({
    mode: "online",
    status: "finished",
    result: { $ne: "draw" },
    winnerUserId: { $ne: null },
    rewardGrantedAt: null,
  })
    .select("_id winnerUserId")
    .lean<Array<{ _id: mongoose.Types.ObjectId; winnerUserId?: mongoose.Types.ObjectId | null }>>()

  for (const game of finishedGames) {
    if (!game.winnerUserId) {
      continue
    }

    const rewardLock = await TicTacToeGameModel.updateOne(
      { _id: game._id, rewardGrantedAt: null },
      {
        $set: {
          rewardGrantedAt: new Date(),
          rewardAmount: ONLINE_WIN_REWARD,
        },
      }
    )

    if (!rewardLock.modifiedCount) {
      continue
    }

    await UserModel.updateOne(
      { _id: game.winnerUserId },
      { $inc: { betballCoins: ONLINE_WIN_REWARD } }
    )
  }
}

export async function getTicTacToePageData(discordId?: string | null): Promise<TicTacToePageData> {
  await dbConnect()
  await grantPendingOnlineRewards()

  const competitionCounts = await TeamCompetitionModel.collection.aggregate([
    { $group: { _id: "$team_id", competitionIds: { $addToSet: "$competition_id" } } },
    { $project: { competitionCount: { $size: "$competitionIds" } } },
    { $match: { competitionCount: { $gte: 3 } } },
  ]).toArray() as Array<{ _id: mongoose.Types.ObjectId; competitionCount: number }>

  const eligibleTeamIds = competitionCounts.map((entry) => entry._id)
  const teams = eligibleTeamIds.length
    ? await TeamModel.collection
        .find(
          { _id: { $in: eligibleTeamIds }, image: { $exists: true, $ne: "" } },
          { projection: { _id: 1, team_id: 1, team_name: 1, teamName: 1, image: 1, kits: 1 } }
        )
        .toArray() as TeamDoc[]
    : []

  const teamIdSet = new Set(teams.map((team) => team._id.toString()))
  const eligibleTeamCompetitions = await TeamCompetitionModel.collection
    .find(
      { team_id: { $in: teams.map((team) => team._id) } },
      { projection: { _id: 1, team_id: 1 } }
    )
    .toArray() as Array<{ _id: mongoose.Types.ObjectId; team_id: mongoose.Types.ObjectId }>

  const teamCompetitionIds = eligibleTeamCompetitions.map((row) => row._id)
  const teamCompetitionToTeam = new Map(eligibleTeamCompetitions.map((row) => [row._id.toString(), row.team_id.toString()]))

  const playerCompetitions = teamCompetitionIds.length
    ? await TeamCompetitionModel.db.collection("playercompetitions")
        .find(
          { team_competition_id: { $in: teamCompetitionIds } },
          { projection: { player_id: 1, team_competition_id: 1 } }
        )
        .toArray() as Array<{ player_id?: mongoose.Types.ObjectId; team_competition_id?: mongoose.Types.ObjectId }>
    : []

  const playerIds = [...new Set(
    playerCompetitions
      .map((row) => row.player_id?.toString())
      .filter((value): value is string => Boolean(value))
  )].map((value) => new mongoose.Types.ObjectId(value))

  const players = playerIds.length
    ? await PlayerModel.collection
        .find(
          { _id: { $in: playerIds } },
          { projection: { _id: 1, player_id: 1, player_name: 1, playerName: 1, country: 1, avatar: 1 } }
        )
        .toArray() as PlayerDoc[]
    : []
  const playerMap = new Map(players.map((player) => [player._id.toString(), player]))
  const searchablePlayers = players
    .map((player) => ({
      playerObjectId: player._id.toString(),
      playerId: Number(player.player_id ?? 0),
      playerName: player.player_name || player.playerName || "Unknown player",
      country: player.country || "",
      avatar: player.avatar,
    }))
    .sort((a, b) => a.playerName.localeCompare(b.playerName))

  const teamCountries = new Map<string, Set<string>>()
  const teamCountryPlayers = new Map<string, TicTacToeCellOption[]>()

  for (const row of playerCompetitions) {
    const player = row.player_id ? playerMap.get(row.player_id.toString()) : null
    const teamId = row.team_competition_id ? teamCompetitionToTeam.get(row.team_competition_id.toString()) : null
    if (!player || !teamId || !teamIdSet.has(teamId) || !player.country) continue

    if (!teamCountries.has(teamId)) {
      teamCountries.set(teamId, new Set())
    }
    teamCountries.get(teamId)!.add(player.country)

    const key = `${teamId}::${player.country}`
    const options = teamCountryPlayers.get(key) ?? []
    const team = teams.find((entry) => entry._id.toString() === teamId)
    if (!options.some((option) => option.playerObjectId === player._id.toString())) {
      options.push({
        playerObjectId: player._id.toString(),
        playerId: Number(player.player_id ?? 0),
        playerName: player.player_name || player.playerName || "Unknown player",
        country: player.country,
        avatar: player.avatar,
        kitImage: normalizeTeamImageUrl(team?.kits?.[0]),
        teamImage: normalizeTeamImageUrl(team?.image),
        teamName: team ? getTeamName(team) : undefined,
      })
      teamCountryPlayers.set(key, options)
    }
  }

  const teamRows = teams
    .map((team) => ({
      team,
      countries: [...(teamCountries.get(team._id.toString()) ?? new Set<string>())],
    }))
    .filter((entry) => entry.countries.length >= 3)

  const boards: Record<TicTacToeDifficulty, TicTacToeBoard[]> = {
    easy: buildBoards(teamRows, teamCountryPlayers, "easy"),
    medium: buildBoards(teamRows, teamCountryPlayers, "medium"),
    hard: buildBoards(teamRows, teamCountryPlayers, "hard"),
    all: buildBoards(teamRows, teamCountryPlayers, "all"),
  }

  const currentUser = discordId
    ? await UserModel.findOne({ discordId }).select("_id").lean<{ _id: mongoose.Types.ObjectId } | null>()
    : null

  const finishedOnlineGames = await TicTacToeGameModel.find({ mode: "online", status: "finished" })
    .select("createdByUserId opponentUserId winnerUserId")
    .lean<Array<{
      createdByUserId?: mongoose.Types.ObjectId | null
      opponentUserId?: mongoose.Types.ObjectId | null
      winnerUserId?: mongoose.Types.ObjectId | null
    }>>()

  const gamesByUser = new Map<string, { games: number; wins: number }>()
  const rivalMap = new Map<string, number>()

  for (const game of finishedOnlineGames) {
    const participants = [game.createdByUserId, game.opponentUserId].filter(
      (value): value is mongoose.Types.ObjectId => Boolean(value)
    )
    for (const userId of participants) {
      const key = userId.toString()
      const bucket = gamesByUser.get(key) ?? { games: 0, wins: 0 }
      bucket.games += 1
      if (game.winnerUserId?.toString() === key) {
        bucket.wins += 1
      }
      gamesByUser.set(key, bucket)
    }

    if (currentUser?._id) {
      const currentKey = currentUser._id.toString()
      const creatorKey = game.createdByUserId?.toString()
      const opponentKey = game.opponentUserId?.toString()
      if (creatorKey === currentKey && opponentKey) {
        rivalMap.set(opponentKey, (rivalMap.get(opponentKey) ?? 0) + 1)
      }
      if (opponentKey === currentKey && creatorKey) {
        rivalMap.set(creatorKey, (rivalMap.get(creatorKey) ?? 0) + 1)
      }
    }
  }

  const allUserIds = [...new Set([
    ...[...gamesByUser.keys()],
    ...[...rivalMap.keys()],
  ])].filter((value) => mongoose.Types.ObjectId.isValid(value)).map((value) => new mongoose.Types.ObjectId(value))
  const userMetaMap = await getUserMetaMap(allUserIds)

  const leaderboardBase = [...gamesByUser.entries()].map(([userId, stats]) => ({
    userId,
    wins: stats.wins,
    games: stats.games,
    rating: Math.round((stats.wins * 24) + (stats.games * 6)),
    ...userMetaMap.get(userId),
  }))

  const topWins = leaderboardBase
    .sort((a, b) => b.wins - a.wins || b.rating - a.rating || b.games - a.games)
    .slice(0, 8)
    .map((entry) => ({
      userId: entry.userId,
      teamName: entry.teamName ?? "Unknown manager",
      playerName: entry.playerName,
      avatar: entry.avatar,
      wins: entry.wins,
      games: entry.games,
      rating: entry.rating,
    }))

  const mostGames = leaderboardBase
    .sort((a, b) => b.games - a.games || b.wins - a.wins)
    .slice(0, 8)
    .map((entry) => ({
      userId: entry.userId,
      teamName: entry.teamName ?? "Unknown manager",
      playerName: entry.playerName,
      avatar: entry.avatar,
      wins: entry.wins,
      games: entry.games,
      rating: entry.rating,
    }))

  const rivals = [...rivalMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([userId, games]) => {
      const meta = userMetaMap.get(userId)
      return {
        userId,
        teamName: meta?.teamName ?? "Unknown manager",
        playerName: meta?.playerName,
        avatar: meta?.avatar,
        games,
      }
    })

  return {
    boards,
    searchablePlayers,
    topWins,
    mostGames,
    rivals,
  }
}

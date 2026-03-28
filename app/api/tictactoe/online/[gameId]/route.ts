import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import dbConnect from "@/lib/db/mongoose"
import TicTacToeGameModel from "@/lib/models/TicTacToeGame"
import UserModel from "@/lib/models/User"
import { createTicTacToeBoard, getTicTacToeTeamCountryPlayers } from "@/lib/services/tictactoe.service"

export async function GET(_request: Request, context: { params: Promise<{ gameId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { gameId } = await context.params
  if (!mongoose.Types.ObjectId.isValid(gameId)) {
    return NextResponse.json({ error: "Invalid game." }, { status: 400 })
  }

  await dbConnect()
  const currentUser = await UserModel.findOne({ discordId: session.user.discordId })
    .select("_id")
    .lean<{ _id: mongoose.Types.ObjectId } | null>()

  if (!currentUser?._id) {
    return NextResponse.json({ error: "User not found." }, { status: 404 })
  }

  const game = await TicTacToeGameModel.findOne({
    _id: new mongoose.Types.ObjectId(gameId),
    mode: "online",
    $or: [{ createdByUserId: currentUser._id }, { opponentUserId: currentUser._id }],
  })

  if (!game) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 })
  }

  if (!game.rows.length || !game.columns.length) {
    const board = await createTicTacToeBoard(game.difficulty ?? "all")
    if (board) {
      game.rows = board.rows.map((country) => ({ type: "country", country }))
      game.columns = board.columns.map((column) => ({
        type: "team",
        teamId: column.id,
        teamName: column.name,
        teamImage: column.image ?? null,
      }))
    }
  }

  const now = new Date()
  if (game.status === "active" && game.turnExpiresAt && game.turnExpiresAt.getTime() <= now.getTime()) {
    const nextTurn = String(game.currentTurnUserId) === String(game.createdByUserId)
      ? game.opponentUserId
      : game.createdByUserId
    game.currentTurnUserId = nextTurn ?? null
    const turnSeconds = game.turnSeconds ?? 30
    game.turnExpiresAt = new Date(now.getTime() + turnSeconds * 1000)
    game.turnNumber = (game.turnNumber ?? 1) + 1
  }

  await game.save()

  type TicTacToeColumn = { type?: string; teamId?: unknown; teamName?: string | null; teamImage?: string | null }
  const teamIds = game.columns
    .filter((column: TicTacToeColumn) => column.type === "team" && column.teamId)
    .map((column: TicTacToeColumn) => new mongoose.Types.ObjectId(column.teamId?.toString?.()))

  const { teamCountryPlayers } = await getTicTacToeTeamCountryPlayers(teamIds)
  const usedPlayers = new Set(game.picks.map((pick) => pick.playerObjectId?.toString()).filter(Boolean) as string[])

  const cells = game.rows.flatMap((row, rowIndex) => {
    const country = row.country || ""
    return game.columns.map((column, colIndex) => {
      const teamId = column.teamId?.toString() ?? ""
      const key = `${country}::${teamId}`
      const rawOptions = teamCountryPlayers.get(key) ?? []
      const options = rawOptions.filter((option) => !usedPlayers.has(option.playerObjectId))
      return {
        key: `${rowIndex}-${colIndex}`,
        row: rowIndex,
        col: colIndex,
        options,
        optionCount: rawOptions.length,
      }
    })
  })

  const picks = game.picks.map((pick) => {
    const row = game.rows[pick.row]
    const column = game.columns[pick.col]
    const country = row?.country || pick.country || ""
    const teamId = column?.teamId?.toString() ?? ""
    const rawOptions = teamCountryPlayers.get(`${country}::${teamId}`) ?? []
    const matched = rawOptions.find((option) => option.playerObjectId === pick.playerObjectId?.toString())
    return {
      row: pick.row,
      col: pick.col,
      filledByUserId: pick.filledByUserId?.toString() ?? null,
      option: matched ?? {
        playerObjectId: pick.playerObjectId?.toString() ?? "",
        playerId: pick.playerId ?? 0,
        playerName: pick.playerName ?? "Unknown",
        country: pick.country ?? "",
        avatar: pick.avatar ?? undefined,
        teamImage: column?.teamImage ?? undefined,
        teamName: column?.teamName ?? undefined,
      },
    }
  })

  const opponentId = String(game.createdByUserId) === String(currentUser._id)
    ? game.opponentUserId
    : game.createdByUserId

  return NextResponse.json({
    gameId: game._id.toString(),
    status: game.status,
    difficulty: game.difficulty ?? null,
    rows: game.rows.map((row) => row.country || ""),
    columns: game.columns.map((column: TicTacToeColumn) => ({
      id: column.teamId?.toString() ?? "",
      name: column.teamName ?? "Unknown team",
      image: column.teamImage ?? undefined,
    })),
    cells,
    picks,
    currentTurnUserId: game.currentTurnUserId?.toString() ?? null,
    yourUserId: currentUser._id.toString(),
    isYourTurn: String(game.currentTurnUserId) === String(currentUser._id),
    turnSeconds: game.turnSeconds ?? 30,
    turnExpiresAt: game.turnExpiresAt,
    opponentUserId: opponentId?.toString() ?? null,
  })
}

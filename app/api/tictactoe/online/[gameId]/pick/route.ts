import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import dbConnect from "@/lib/db/mongoose"
import TicTacToeGameModel from "@/lib/models/TicTacToeGame"
import UserModel from "@/lib/models/User"
import { getTicTacToeTeamCountryPlayers } from "@/lib/services/tictactoe.service"

function checkWinner(picks: Array<{ row: number; col: number; filledByUserId?: mongoose.Types.ObjectId | null }>, userId: mongoose.Types.ObjectId) {
  const owned = new Set(picks.filter((pick) => String(pick.filledByUserId) === String(userId)).map((pick) => `${pick.row}-${pick.col}`))
  const lines = [
    ["0-0", "0-1", "0-2"],
    ["1-0", "1-1", "1-2"],
    ["2-0", "2-1", "2-2"],
    ["0-0", "1-0", "2-0"],
    ["0-1", "1-1", "2-1"],
    ["0-2", "1-2", "2-2"],
    ["0-0", "1-1", "2-2"],
    ["0-2", "1-1", "2-0"],
  ]
  return lines.some((line) => line.every((cell) => owned.has(cell)))
}

export async function POST(request: Request, context: { params: Promise<{ gameId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { gameId } = await context.params
  if (!mongoose.Types.ObjectId.isValid(gameId)) {
    return NextResponse.json({ error: "Invalid game." }, { status: 400 })
  }

  const body = await request.json().catch(() => ({} as { row?: number; col?: number; playerObjectId?: string }))
  const { row, col, playerObjectId } = body
  if (row === undefined || col === undefined || !playerObjectId) {
    return NextResponse.json({ error: "Missing selection." }, { status: 400 })
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

  if (game.status !== "active") {
    return NextResponse.json({ error: "Match is not active." }, { status: 400 })
  }

  if (String(game.currentTurnUserId) !== String(currentUser._id)) {
    return NextResponse.json({ error: "Not your turn." }, { status: 403 })
  }

  if (game.picks.some((pick) => pick.row === row && pick.col === col)) {
    return NextResponse.json({ error: "Cell already filled." }, { status: 400 })
  }

  if (game.picks.some((pick) => pick.playerObjectId?.toString() === playerObjectId)) {
    return NextResponse.json({ error: "Player already used." }, { status: 400 })
  }

  const rowHeader = game.rows[row]
  const columnHeader = game.columns[col]
  if (!rowHeader?.country || !columnHeader?.teamId) {
    return NextResponse.json({ error: "Invalid cell." }, { status: 400 })
  }

  const teamIds = game.columns
    .filter((column) => column.type === "team" && column.teamId)
    .map((column) => new mongoose.Types.ObjectId(column.teamId?.toString()))

  const { teamCountryPlayers } = await getTicTacToeTeamCountryPlayers(teamIds)
  const key = `${rowHeader.country}::${columnHeader.teamId.toString()}`
  const options = teamCountryPlayers.get(key) ?? []
  const option = options.find((entry) => entry.playerObjectId === playerObjectId)

  if (!option) {
    return NextResponse.json({ error: "Player not valid for this cell." }, { status: 400 })
  }

  game.picks.push({
    row,
    col,
    playerObjectId: new mongoose.Types.ObjectId(playerObjectId),
    playerId: option.playerId,
    playerName: option.playerName,
    country: option.country,
    avatar: option.avatar,
    filledByUserId: currentUser._id,
    filledAt: new Date(),
  })

  const winner = checkWinner(game.picks, currentUser._id)
  const totalFilled = game.picks.length

  if (winner) {
    game.status = "finished"
    game.result = "win"
    game.winnerUserId = currentUser._id
    game.currentTurnUserId = null
    game.finishedAt = new Date()
  } else if (totalFilled >= 9) {
    game.status = "finished"
    game.result = "draw"
    game.currentTurnUserId = null
    game.finishedAt = new Date()
  } else {
    const nextTurn = String(game.createdByUserId) === String(currentUser._id)
      ? game.opponentUserId
      : game.createdByUserId
    game.currentTurnUserId = nextTurn ?? null
    const turnSeconds = game.turnSeconds ?? 30
    game.turnExpiresAt = new Date(Date.now() + turnSeconds * 1000)
    game.turnNumber = (game.turnNumber ?? 1) + 1
  }

  await game.save()

  return NextResponse.json({ ok: true })
}

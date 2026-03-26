import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import dbConnect from "@/lib/db/mongoose"
import UserModel from "@/lib/models/User"
import WordleResultModel from "@/lib/models/WordleResult"
import { WORDLE_VERSION } from "@/lib/services/wordle.service"

function toMadridDateKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value)

  const year = parts.find((part) => part.type === "year")?.value ?? "0000"
  const month = parts.find((part) => part.type === "month")?.value ?? "00"
  const day = parts.find((part) => part.type === "day")?.value ?? "00"
  return `${year}-${month}-${day}`
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const dateKey = searchParams.get("dateKey") ?? toMadridDateKey()

  await dbConnect()
  const user = await UserModel.findOne({ discordId: session.user.discordId })
    .select("_id betballCoins")
    .lean<{ _id: unknown; betballCoins?: number } | null>()

  if (!user?._id) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const result = await WordleResultModel.findOne({
    dateKey,
    userId: user._id,
  })
    .select(
      "version attempts solved completedAt hintTeamImage hintTeamName hintExactLetter hintExactIndex hintPresentLetter hintCountry hintPosition"
    )
    .lean<{
      version?: number
      attempts?: number
      solved?: boolean
      completedAt?: Date | null
      hintTeamImage?: string | null
      hintTeamName?: string | null
      hintExactLetter?: string | null
      hintExactIndex?: number | null
      hintPresentLetter?: string | null
      hintCountry?: string | null
      hintPosition?: string | null
    } | null>()

  if (!result || (result as { version?: number }).version !== WORDLE_VERSION) {
    return NextResponse.json({
      betballCoins: Number(user.betballCoins ?? 0),
      completed: false,
      hints: {
        teamImage: null,
        teamName: null,
        exactLetter: null,
        exactIndex: null,
        presentLetter: null,
        country: null,
        position: null,
      },
    })
  }

  return NextResponse.json({
    betballCoins: Number(user.betballCoins ?? 0),
    completed: Boolean(result?.completedAt),
    hints: {
      teamImage: result?.hintTeamImage ?? null,
      teamName: result?.hintTeamName ?? null,
      exactLetter: result?.hintExactLetter ?? null,
      exactIndex: result?.hintExactIndex ?? null,
      presentLetter: result?.hintPresentLetter ?? null,
      country: result?.hintCountry ?? null,
      position: result?.hintPosition ?? null,
    },
  })
}

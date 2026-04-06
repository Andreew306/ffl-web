import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { placeBetBallSlipForUser, type BetBallMarketOption } from "@/lib/services/betball.service"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  try {
    const body = await request.json() as {
      matchId?: string
      competitionLabel?: string
      matchLabel?: string
      kickoffAt?: string
      stake?: number
      selections?: BetBallMarketOption[]
    }

    const result = await placeBetBallSlipForUser(session.user.discordId, {
      matchId: String(body.matchId ?? ""),
      competitionLabel: String(body.competitionLabel ?? ""),
      matchLabel: String(body.matchLabel ?? ""),
      kickoffAt: typeof body.kickoffAt === "string" ? body.kickoffAt : undefined,
      stake: Number(body.stake ?? 0),
      selections: Array.isArray(body.selections) ? body.selections : [],
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "The slip could not be prepared."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

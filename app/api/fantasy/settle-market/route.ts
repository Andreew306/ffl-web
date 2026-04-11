import { NextResponse } from "next/server"
import { settleExpiredFantasyMarketsForAllLeagues } from "@/lib/services/fantasy.service"

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true
  const authHeader = request.headers.get("authorization")
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await settleExpiredFantasyMarketsForAllLeagues(new Date())
  return NextResponse.json({ ok: true, ...result })
}

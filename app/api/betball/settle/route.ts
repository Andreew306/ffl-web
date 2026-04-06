import { NextResponse } from "next/server"
import { settlePendingBetBallSlips } from "@/lib/services/betball.service"

function getMadridHour(date: Date) {
  const hour = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hour12: false,
    timeZone: "Europe/Madrid",
  }).format(date)
  return Number.parseInt(hour, 10)
}

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

  const now = new Date()
  const madridHour = getMadridHour(now)
  const force = new URL(request.url).searchParams.get("force") === "1"
  if (!force && madridHour !== 5) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "Outside 05:00 Europe/Madrid window.",
      madridHour,
    })
  }

  const result = await settlePendingBetBallSlips(now)
  return NextResponse.json({
    ok: true,
    skipped: false,
    madridHour,
    ...result,
  })
}

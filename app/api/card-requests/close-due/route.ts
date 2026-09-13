import { NextResponse } from "next/server"
import { closeDueCardRequests } from "@/lib/services/card-vote.service"
import { isAuthorizedCardWebhook, unauthorizedCardWebhook } from "@/lib/services/card-webhook-auth"

export const runtime = "nodejs"

function isAuthorizedCron(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  return request.headers.get("authorization") === `Bearer ${secret}`
}

async function closeDue() {
  const results = await closeDueCardRequests()
  return NextResponse.json({
    ok: true,
    closed: results.length,
    results,
  })
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return closeDue()
}

export async function POST(request: Request) {
  if (!isAuthorizedCardWebhook(request)) {
    return unauthorizedCardWebhook()
  }

  return closeDue()
}

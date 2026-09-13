import { NextResponse } from "next/server"
import { isAuthorizedCardWebhook, unauthorizedCardWebhook } from "@/lib/services/card-webhook-auth"
import { registerCardApprovalVote } from "@/lib/services/card-vote.service"

export const runtime = "nodejs"

type CardApprovalPayload = {
  requestId?: string
  staffDiscordId?: string
  authorId?: string
  decision?: "accept" | "reject"
}

export async function POST(request: Request) {
  if (!isAuthorizedCardWebhook(request)) {
    return unauthorizedCardWebhook()
  }

  const payload = (await request.json().catch(() => null)) as CardApprovalPayload | null
  if (!payload) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 })
  }

  const requestId = payload.requestId || ""
  const staffDiscordId = payload.staffDiscordId || payload.authorId || ""
  const decision = payload.decision

  if (!requestId || !staffDiscordId || (decision !== "accept" && decision !== "reject")) {
    return NextResponse.json({ error: "Missing requestId, staffDiscordId or valid decision." }, { status: 400 })
  }

  const result = await registerCardApprovalVote({
    requestId,
    staffDiscordId,
    decision,
  })

  return NextResponse.json(result)
}

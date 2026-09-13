import { NextResponse } from "next/server"
import { sendDiscordCardReviewReply } from "@/lib/services/discord-card.service"
import { registerDiscordCardVote } from "@/lib/services/card-vote.service"

export const runtime = "nodejs"

type DiscordMessagePayload = {
  threadId?: string
  channelId?: string
  authorId?: string
  staffDiscordId?: string
  content?: string
  messageId?: string
  authorBot?: boolean
  replyToDiscord?: boolean
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

function isAuthorized(request: Request) {
  const secret = process.env.CARD_REVIEW_WEBHOOK_SECRET
  if (!secret) return true

  const auth = request.headers.get("authorization")
  const headerSecret = request.headers.get("x-card-review-secret")
  return auth === `Bearer ${secret}` || headerSecret === secret
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return unauthorized()
  }

  const payload = (await request.json().catch(() => null)) as DiscordMessagePayload | null
  if (!payload) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 })
  }

  if (payload.authorBot) {
    return NextResponse.json({ ok: true, status: "ignored", responseContent: "Ignored bot message." })
  }

  const threadId = payload.threadId || payload.channelId || ""
  const staffDiscordId = payload.staffDiscordId || payload.authorId || ""
  const content = payload.content || ""

  const result = await registerDiscordCardVote({
    threadId,
    staffDiscordId,
    content,
    messageId: payload.messageId || null,
  })

  if (payload.replyToDiscord !== false && result.responseContent && threadId) {
    await sendDiscordCardReviewReply(threadId, result.responseContent)
  }

  return NextResponse.json(result)
}

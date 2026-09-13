import { NextResponse } from "next/server"

export function unauthorizedCardWebhook() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export function isAuthorizedCardWebhook(request: Request) {
  const secret = process.env.CARD_REVIEW_WEBHOOK_SECRET
  if (!secret) return true

  const auth = request.headers.get("authorization")
  const headerSecret = request.headers.get("x-card-review-secret")
  return auth === `Bearer ${secret}` || headerSecret === secret
}

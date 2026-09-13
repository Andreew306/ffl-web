import type { GeneratedCardData } from "@/lib/services/card-rating.service"

const DEFAULT_FORUM_CHANNEL_ID = "1548111097284923473"

type DiscordThreadResponse = {
  id?: string
  message?: {
    id?: string
  }
}

async function fetchDiscordWithTimeout(url: string, init: RequestInit, timeoutMs = 10000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    })
  } finally {
    clearTimeout(timeout)
  }
}

export async function createDiscordCardReviewThread(card: GeneratedCardData, image: Buffer) {
  const botToken = process.env.DISCORD_BOT_TOKEN
  const forumChannelId = process.env.DISCORD_CARD_FORUM_CHANNEL_ID || DEFAULT_FORUM_CHANNEL_ID

  if (!botToken) {
    throw new Error("DISCORD_BOT_TOKEN is not configured.")
  }

  const closesAt = Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000)
  const payload = {
    name: card.player.name.slice(0, 90),
    message: {
      content: [
        `**Card Review: ${card.player.name}**`,
        "",
        `Bot rating: **OVR ${card.rating.ovr}** | SHO ${card.rating.sho} | PAS ${card.rating.pas} | DEF ${card.rating.def} | DRI ${card.rating.dri}`,
        `Position: **${card.position}**`,
        `Review closes: <t:${closesAt}:R>`,
        "",
        "Staff can reply with corrections in this format:",
        "```",
        "OVR 00",
        "SHO 00",
        "PAS 00",
        "DEF 00",
        "DRI 00",
        "```",
        "If you send another vote in this thread, your previous vote will be updated.",
      ].join("\n"),
      attachments: [{ id: 0, filename: "player-card.png" }],
    },
  }

  const formData = new FormData()
  formData.append("payload_json", JSON.stringify(payload))
  formData.append("files[0]", new Blob([image], { type: "image/png" }), "player-card.png")

  const response = await fetchDiscordWithTimeout(`https://discord.com/api/v10/channels/${forumChannelId}/threads`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Discord forum post failed (${response.status}): ${errorText}`)
  }

  return (await response.json()) as DiscordThreadResponse
}

export async function sendDiscordCardReviewReply(threadId: string, content: string) {
  const botToken = process.env.DISCORD_BOT_TOKEN

  if (!botToken) {
    throw new Error("DISCORD_BOT_TOKEN is not configured.")
  }

  const response = await fetchDiscordWithTimeout(`https://discord.com/api/v10/channels/${threadId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
      allowed_mentions: { parse: [] },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Discord reply failed (${response.status}): ${errorText}`)
  }

  return response.json()
}

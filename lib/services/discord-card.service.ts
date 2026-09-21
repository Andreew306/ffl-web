import type { GeneratedCardData } from "@/lib/services/card-rating.service"

const DEFAULT_FORUM_CHANNEL_ID = "1548111097284923473"
const DEFAULT_CARD_FIXER_ROLE_ID = "1548650909574103060"

type DiscordThreadResponse = {
  id?: string
  message?: {
    id?: string
  }
}

async function fetchDiscordWithTimeout(url: string, init: RequestInit, timeoutMs = 30000) {
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

  const cardFixerRoleId = process.env.DISCORD_CARD_FIXER_ROLE_ID || DEFAULT_CARD_FIXER_ROLE_ID
  const closesAt = Math.floor((Date.now() + 12 * 60 * 60 * 1000) / 1000)
  const payload = {
    name: card.player.name.slice(0, 90),
    message: {
      content: [
        `<@&${cardFixerRoleId}>`,
        "",
        `**Card Review: ${card.player.name}**`,
        "",
        `Team: **${card.team.name || "Unknown"}**`,
        `Division: **${card.team.division || "Unknown"}**`,
        `Bot rating: **OVR ${card.rating.ovr}** | SHO ${card.rating.sho} | PAS ${card.rating.pas} | DEF ${card.rating.def} | DRI ${card.rating.dri}`,
        `Position: **${card.position}**`,
        `Review closes: <t:${closesAt}:R> or when 10 different staff fixes are received.`,
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
      allowed_mentions: { roles: [cardFixerRoleId] },
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

export async function sendDiscordFixedCardApprovalMessage(
  threadId: string,
  card: GeneratedCardData,
  image: Buffer,
  requestId: string,
) {
  const botToken = process.env.DISCORD_BOT_TOKEN
  const cardFixerRoleId = process.env.DISCORD_CARD_FIXER_ROLE_ID || DEFAULT_CARD_FIXER_ROLE_ID

  if (!botToken) {
    throw new Error("DISCORD_BOT_TOKEN is not configured.")
  }

  const payload = {
    content: [
      `<@&${cardFixerRoleId}>`,
      "",
      `**Fixed Card Approval: ${card.player.name}**`,
      `Team: **${card.team.name || "Unknown"}**`,
      `Division: **${card.team.division || "Unknown"}**`,
      `Final rating: **OVR ${card.rating.ovr}** | SHO ${card.rating.sho} | PAS ${card.rating.pas} | DEF ${card.rating.def} | DRI ${card.rating.dri}`,
      "",
      "Accept or reject the fixed card. First option to reach 6 different staff votes wins.",
    ].join("\n"),
    attachments: [{ id: 0, filename: "fixed-player-card.png" }],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 3,
            custom_id: `cardfix:accept:${requestId}`,
            label: "Accept",
          },
          {
            type: 2,
            style: 4,
            custom_id: `cardfix:reject:${requestId}`,
            label: "Reject",
          },
        ],
      },
    ],
    allowed_mentions: { roles: [cardFixerRoleId] },
  }

  const formData = new FormData()
  formData.append("payload_json", JSON.stringify(payload))
  formData.append("files[0]", new Blob([image], { type: "image/png" }), "fixed-player-card.png")

  const response = await fetchDiscordWithTimeout(`https://discord.com/api/v10/channels/${threadId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Discord fixed card message failed (${response.status}): ${errorText}`)
  }

  return response.json() as Promise<{ id?: string }>
}

export async function sendDiscordCardReviewReopenedMessage(threadId: string, card: GeneratedCardData, image: Buffer) {
  const botToken = process.env.DISCORD_BOT_TOKEN
  const cardFixerRoleId = process.env.DISCORD_CARD_FIXER_ROLE_ID || DEFAULT_CARD_FIXER_ROLE_ID

  if (!botToken) {
    throw new Error("DISCORD_BOT_TOKEN is not configured.")
  }

  const closesAt = Math.floor((Date.now() + 12 * 60 * 60 * 1000) / 1000)
  const payload = {
    content: [
      `<@&${cardFixerRoleId}>`,
      "",
      `**Card Review Reopened: ${card.player.name}**`,
      "",
      `Team: **${card.team.name || "Unknown"}**`,
      `Division: **${card.team.division || "Unknown"}**`,
      `Original bot rating: **OVR ${card.rating.ovr}** | SHO ${card.rating.sho} | PAS ${card.rating.pas} | DEF ${card.rating.def} | DRI ${card.rating.dri}`,
      `Review closes: <t:${closesAt}:R> or when 10 different staff fixes are received.`,
      "",
      "Send fixes again in this thread. A new vote from the same staff member replaces their previous vote for this round.",
    ].join("\n"),
    attachments: [{ id: 0, filename: "player-card.png" }],
    allowed_mentions: { roles: [cardFixerRoleId] },
  }

  const formData = new FormData()
  formData.append("payload_json", JSON.stringify(payload))
  formData.append("files[0]", new Blob([image], { type: "image/png" }), "player-card.png")

  const response = await fetchDiscordWithTimeout(`https://discord.com/api/v10/channels/${threadId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Discord reopened card message failed (${response.status}): ${errorText}`)
  }

  return response.json()
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

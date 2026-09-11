import type { GeneratedCardData } from "@/lib/services/card-rating.service"

const DEFAULT_FORUM_CHANNEL_ID = "1548109425070309470"

type DiscordThreadResponse = {
  id?: string
  message?: {
    id?: string
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
      ].join("\n"),
      attachments: [{ id: 0, filename: "player-card.png" }],
    },
  }

  const formData = new FormData()
  formData.append("payload_json", JSON.stringify(payload))
  formData.append("files[0]", new Blob([image], { type: "image/png" }), "player-card.png")

  const response = await fetch(`https://discord.com/api/v10/channels/${forumChannelId}/threads`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
    },
    body: formData,
    cache: "no-store",
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Discord forum post failed (${response.status}): ${errorText}`)
  }

  return (await response.json()) as DiscordThreadResponse
}

"use server"

import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import { authOptions } from "@/lib/auth"
import {
  deleteTierListSubmissionForUser,
  deleteTierListTemplateForUser,
  saveTierListSubmissionForUser,
  saveTierListTemplateForUser,
  voteTierListForUser,
  type TierListItemType,
  type TierListTierData,
} from "@/lib/services/tierlist.service"

type TierListActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; requiresAuth?: boolean }

async function requireDiscordSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.discordId) {
    return {
      ok: false as const,
      error: "You need to sign in with Discord to use Tier List.",
      requiresAuth: true,
    }
  }

  return { ok: true as const, discordId: session.user.discordId }
}

export async function saveTierListTemplateAction(input: {
  listId?: string
  title: string
  itemType: TierListItemType
  tiers: TierListTierData[]
  allowedItemIds: string[]
  published: boolean
}): Promise<TierListActionResult> {
  const auth = await requireDiscordSession()
  if (!auth.ok) return auth

  try {
    const result = await saveTierListTemplateForUser(auth.discordId, input)
    revalidatePath("/tier-list")
    return { ok: true, id: result.id }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "The tier template could not be saved.",
    }
  }
}

export async function saveTierListSubmissionAction(input: {
  listId?: string
  title: string
  templateId: string
  tiers: TierListTierData[]
  published: boolean
}): Promise<TierListActionResult> {
  const auth = await requireDiscordSession()
  if (!auth.ok) return auth

  try {
    const result = await saveTierListSubmissionForUser(auth.discordId, input)
    revalidatePath("/tier-list")
    return { ok: true, id: result.id }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "The tier list could not be published.",
    }
  }
}

export async function voteTierListAction(input: {
  listId: string
  direction: "up" | "down"
}): Promise<TierListActionResult> {
  const auth = await requireDiscordSession()
  if (!auth.ok) return auth

  try {
    await voteTierListForUser(auth.discordId, input.listId, input.direction)
    revalidatePath("/tier-list")
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "The vote could not be saved.",
    }
  }
}

export async function deleteTierListTemplateAction(input: {
  templateId: string
}): Promise<TierListActionResult> {
  const auth = await requireDiscordSession()
  if (!auth.ok) return auth

  try {
    await deleteTierListTemplateForUser(auth.discordId, input.templateId)
    revalidatePath("/tier-list")
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "The tier template could not be deleted.",
    }
  }
}

export async function deleteTierListSubmissionAction(input: {
  submissionId: string
}): Promise<TierListActionResult> {
  const auth = await requireDiscordSession()
  if (!auth.ok) return auth

  try {
    await deleteTierListSubmissionForUser(auth.discordId, input.submissionId)
    revalidatePath("/tier-list")
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "The tier submission could not be deleted.",
    }
  }
}

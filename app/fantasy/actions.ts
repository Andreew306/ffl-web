"use server"

import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import { authOptions } from "@/lib/auth"
import {
  cancelFantasyPlayerSale,
  createFantasyLeagueForUser,
  deleteFantasyLeagueForUser,
  joinFantasyLeagueByInviteCode,
  listFantasyPlayerForSale,
  moveFantasyRosterPlayer,
  placeFantasyBidForUser,
  raiseFantasyPlayerClause,
  setFantasyOpenLineupPlayer,
  setFantasyOpenLineupFormation,
} from "@/lib/services/fantasy.service"

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

type FantasyActionResult =
  | { ok: true; inviteCode: string }
  | { ok: false; error: string; requiresAuth?: boolean }

export async function createFantasyLeagueAction(formData: FormData) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.discordId) {
    return {
      ok: false,
      error: "Necesitas iniciar sesion con Discord para usar Fantasy.",
      requiresAuth: true,
    } satisfies FantasyActionResult
  }

  const leagueName = getStringValue(formData, "leagueName")
  const competitionObjectId = getStringValue(formData, "competitionObjectId")
  const leagueType = getStringValue(formData, "leagueType") === "open" ? "open" : "market"
  const teamName = getStringValue(formData, "teamName")

  try {
    const result = await createFantasyLeagueForUser(
      session.user.discordId,
      leagueName,
      competitionObjectId,
      leagueType,
      teamName
    )
    return { ok: true, inviteCode: result.inviteCode } satisfies FantasyActionResult
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se ha podido crear la liga fantasy."
    return { ok: false, error: message } satisfies FantasyActionResult
  }
}

export async function joinFantasyLeagueAction(formData: FormData) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.discordId) {
    return {
      ok: false,
      error: "Necesitas iniciar sesion con Discord para usar Fantasy.",
      requiresAuth: true,
    } satisfies FantasyActionResult
  }

  const inviteCode = getStringValue(formData, "inviteCode")
  const teamName = getStringValue(formData, "teamName")

  try {
    await joinFantasyLeagueByInviteCode(session.user.discordId, inviteCode, teamName)
    return { ok: true, inviteCode: inviteCode.trim().toUpperCase() } satisfies FantasyActionResult
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se ha podido unir a la liga fantasy."
    return { ok: false, error: message } satisfies FantasyActionResult
  }
}

export async function deleteFantasyLeagueAction(leagueId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.discordId) {
    return {
      ok: false,
      error: "Necesitas iniciar sesion con Discord para usar Fantasy.",
      requiresAuth: true,
    } satisfies FantasyActionResult
  }

  try {
    await deleteFantasyLeagueForUser(session.user.discordId, leagueId)
    return { ok: true, inviteCode: "" } satisfies FantasyActionResult
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se ha podido borrar la liga fantasy."
    return { ok: false, error: message } satisfies FantasyActionResult
  }
}

export async function placeFantasyBidAction(leagueId: string, playerObjectId: string, amount: number) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.discordId) {
    return {
      ok: false,
      error: "Necesitas iniciar sesion con Discord para usar Fantasy.",
      requiresAuth: true,
    } satisfies FantasyActionResult
  }

  try {
    await placeFantasyBidForUser(session.user.discordId, leagueId, playerObjectId, amount)
    revalidatePath(`/fantasy/leagues/${leagueId}`)
    return { ok: true, inviteCode: "" } satisfies FantasyActionResult
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se ha podido registrar la puja."
    return { ok: false, error: message } satisfies FantasyActionResult
  }
}

export async function listFantasyPlayerForSaleAction(leagueId: string, playerObjectId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.discordId) {
    return {
      ok: false,
      error: "You need to sign in with Discord to use Fantasy.",
      requiresAuth: true,
    } satisfies FantasyActionResult
  }

  try {
    await listFantasyPlayerForSale(session.user.discordId, leagueId, playerObjectId)
    revalidatePath(`/fantasy/leagues/${leagueId}`)
    return { ok: true, inviteCode: "" } satisfies FantasyActionResult
  } catch (error) {
    const message = error instanceof Error ? error.message : "The player could not be listed for sale."
    return { ok: false, error: message } satisfies FantasyActionResult
  }
}

export async function raiseFantasyPlayerClauseAction(leagueId: string, playerObjectId: string, newClause: number) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.discordId) {
    return {
      ok: false,
      error: "You need to sign in with Discord to use Fantasy.",
      requiresAuth: true,
    } satisfies FantasyActionResult
  }

  try {
    await raiseFantasyPlayerClause(session.user.discordId, leagueId, playerObjectId, newClause)
    revalidatePath(`/fantasy/leagues/${leagueId}`)
    return { ok: true, inviteCode: "" } satisfies FantasyActionResult
  } catch (error) {
    const message = error instanceof Error ? error.message : "The clause could not be updated."
    return { ok: false, error: message } satisfies FantasyActionResult
  }
}

export async function cancelFantasyPlayerSaleAction(leagueId: string, playerObjectId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.discordId) {
    return {
      ok: false,
      error: "You need to sign in with Discord to use Fantasy.",
      requiresAuth: true,
    } satisfies FantasyActionResult
  }

  try {
    await cancelFantasyPlayerSale(session.user.discordId, leagueId, playerObjectId)
    revalidatePath(`/fantasy/leagues/${leagueId}`)
    return { ok: true, inviteCode: "" } satisfies FantasyActionResult
  } catch (error) {
    const message = error instanceof Error ? error.message : "The sale could not be cancelled."
    return { ok: false, error: message } satisfies FantasyActionResult
  }
}

export async function moveFantasyRosterPlayerAction(
  leagueId: string,
  week: number,
  playerObjectId: string,
  target: "START" | "BENCH"
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.discordId) {
    return {
      ok: false,
      error: "You need to sign in with Discord to use Fantasy.",
      requiresAuth: true,
    } satisfies FantasyActionResult
  }

  try {
    await moveFantasyRosterPlayer(session.user.discordId, leagueId, week, playerObjectId, target)
    revalidatePath(`/fantasy/leagues/${leagueId}`)
    return { ok: true, inviteCode: "" } satisfies FantasyActionResult
  } catch (error) {
    const message = error instanceof Error ? error.message : "The lineup could not be updated."
    return { ok: false, error: message } satisfies FantasyActionResult
  }
}

export async function setFantasyOpenLineupPlayerAction(
  leagueId: string,
  week: number,
  slotIndex: number,
  playerObjectId: string | null
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.discordId) {
    return {
      ok: false,
      error: "You need to sign in with Discord to use Fantasy.",
      requiresAuth: true,
    } satisfies FantasyActionResult
  }

  try {
    await setFantasyOpenLineupPlayer(session.user.discordId, leagueId, week, slotIndex, playerObjectId)
    revalidatePath(`/fantasy/leagues/${leagueId}`)
    return { ok: true, inviteCode: "" } satisfies FantasyActionResult
  } catch (error) {
    const message = error instanceof Error ? error.message : "The lineup could not be updated."
    return { ok: false, error: message } satisfies FantasyActionResult
  }
}

export async function setFantasyOpenLineupFormationAction(
  leagueId: string,
  week: number,
  formation: string
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.discordId) {
    return {
      ok: false,
      error: "You need to sign in with Discord to use Fantasy.",
      requiresAuth: true,
    } satisfies FantasyActionResult
  }

  try {
    await setFantasyOpenLineupFormation(session.user.discordId, leagueId, week, formation)
    revalidatePath(`/fantasy/leagues/${leagueId}`)
    return { ok: true, inviteCode: "" } satisfies FantasyActionResult
  } catch (error) {
    const message = error instanceof Error ? error.message : "The formation could not be updated."
    return { ok: false, error: message } satisfies FantasyActionResult
  }
}

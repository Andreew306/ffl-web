"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { assignProfileRoleToPlayer, removeProfileRoleFromPlayer, setProfileRolePoints } from "@/lib/services/profile.service"

function buildReturnPath(roleId: string, query?: string | null, roleQuery?: string | null) {
  const params = new URLSearchParams()
  params.set("roleId", roleId)
  if (query?.trim()) {
    params.set("q", query.trim())
  }
  if (roleQuery?.trim()) {
    params.set("roleQ", roleQuery.trim())
  }
  return `/profile/manage-roles?${params.toString()}`
}

export async function assignProfileRoleAction(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.discordId) {
    redirect("/api/auth/signin/discord?callbackUrl=/profile/manage-roles")
  }

  const roleId = String(formData.get("roleId") || "")
  const playerObjectId = String(formData.get("playerObjectId") || "")
  const query = String(formData.get("q") || "")
  const roleQuery = String(formData.get("roleQ") || "")

  if (!roleId || !playerObjectId) {
    redirect("/profile/manage-roles")
  }

  await assignProfileRoleToPlayer(session.user.discordId, roleId, playerObjectId)
  revalidatePath("/profile")
  revalidatePath("/profile/manage-roles")
  redirect(buildReturnPath(roleId, query, roleQuery))
}

export async function removeProfileRoleAction(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.discordId) {
    redirect("/api/auth/signin/discord?callbackUrl=/profile/manage-roles")
  }

  const roleId = String(formData.get("roleId") || "")
  const playerObjectId = String(formData.get("playerObjectId") || "")
  const query = String(formData.get("q") || "")
  const roleQuery = String(formData.get("roleQ") || "")

  if (!roleId || !playerObjectId) {
    redirect("/profile/manage-roles")
  }

  await removeProfileRoleFromPlayer(session.user.discordId, roleId, playerObjectId)
  revalidatePath("/profile")
  revalidatePath("/profile/manage-roles")
  redirect(buildReturnPath(roleId, query, roleQuery))
}

export async function setProfileRolePointsAction(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.discordId) {
    redirect("/api/auth/signin/discord?callbackUrl=/profile/manage-roles")
  }

  const roleId = String(formData.get("roleId") || "")
  const query = String(formData.get("q") || "")
  const roleQuery = String(formData.get("roleQ") || "")
  const pointsRaw = Number(formData.get("points") || 0)

  if (!roleId) {
    redirect("/profile/manage-roles")
  }

  await setProfileRolePoints(session.user.discordId, roleId, pointsRaw)
  revalidatePath("/profile/manage-roles")
  redirect(buildReturnPath(roleId, query, roleQuery))
}

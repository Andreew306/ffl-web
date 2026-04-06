import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { assignProfileRoleToPlayer, removeProfileRoleFromPlayer } from "@/lib/services/profile.service"

type Body = {
  roleId?: string
  playerObjectId?: string
  op?: "assign" | "remove"
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as Body
  const roleId = (body.roleId || "").trim()
  const playerObjectId = (body.playerObjectId || "").trim()
  const op = body.op

  if (!roleId || !playerObjectId || (op !== "assign" && op !== "remove")) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  try {
    if (op === "assign") {
      await assignProfileRoleToPlayer(session.user.discordId, roleId, playerObjectId)
    } else {
      await removeProfileRoleFromPlayer(session.user.discordId, roleId, playerObjectId)
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operation failed"
    return NextResponse.json({ error: message }, { status: 403 })
  }
}

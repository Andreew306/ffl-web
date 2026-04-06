import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { setProfileRolePoints } from "@/lib/services/profile.service"

type Body = {
  roleId?: string
  points?: number
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as Body
  const roleId = (body.roleId || "").trim()
  const points = Number(body.points ?? 0)

  if (!roleId) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  try {
    await setProfileRolePoints(session.user.discordId, roleId, points)
    return NextResponse.json({ ok: true, points: Math.max(0, Math.trunc(points)) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operation failed"
    return NextResponse.json({ error: message }, { status: 403 })
  }
}

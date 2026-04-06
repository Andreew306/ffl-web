import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getProfileRoleManagerData } from "@/lib/services/profile.service"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const roleId = (searchParams.get("roleId") || "").trim()
  const query = (searchParams.get("q") || "").trim()
  if (!roleId) {
    return NextResponse.json({ players: [] })
  }

  try {
    const data = await getProfileRoleManagerData(session.user.discordId, { roleId, query })
    return NextResponse.json({
      selectedRoleId: data.selectedRole?.id ?? null,
      players: data.searchResults,
    })
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
}

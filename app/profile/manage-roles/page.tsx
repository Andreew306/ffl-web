import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions, syncDiscordUser } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { getProfileRoleManagerData } from "@/lib/services/profile.service"
import { ManageRolesWorkspace } from "@/components/profile/manage-roles-workspace"
import { RoleSelector } from "@/components/profile/role-selector"

type ManageRolesPageProps = {
  searchParams?: Promise<{
    roleId?: string
    q?: string
    roleQ?: string
  }>
}

export default async function ManageRolesPage({ searchParams }: ManageRolesPageProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.discordId) {
    redirect("/api/auth/signin/discord?callbackUrl=/profile/manage-roles")
  }

  await syncDiscordUser(session.user.discordId)
  const params = await searchParams
  const managerData = await getProfileRoleManagerData(session.user.discordId, {
    roleId: params?.roleId,
    query: params?.q,
  }).catch(() => null)
  if (!managerData) {
    redirect("/profile")
  }
  const roleQuery = params?.roleQ?.trim() ?? ""

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Profile</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Manage roles</h1>
          </div>
          <Button asChild className="bg-slate-800 text-slate-100 hover:bg-slate-700">
            <Link href="/profile">Back to profile</Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="rounded-3xl border border-white/10 bg-slate-900/70 p-4">
            <RoleSelector
              roles={managerData.availableRoles}
              rolePointsById={managerData.rolePointsById}
              selectedRoleId={managerData.selectedRole?.id ?? ""}
              playerQuery={managerData.searchQuery}
              initialRoleQuery={roleQuery}
            />
          </aside>

          <main className="space-y-6">
            <ManageRolesWorkspace
              roleId={managerData.selectedRole?.id ?? ""}
              roleName={managerData.selectedRole?.name ?? "-"}
              initialPoints={managerData.selectedRolePoints}
              initialSearchQuery={managerData.searchQuery}
              initialSearchResults={managerData.searchResults}
              initialAssignedPlayers={managerData.assignedPlayers}
            />
          </main>
        </div>
      </div>
    </div>
  )
}

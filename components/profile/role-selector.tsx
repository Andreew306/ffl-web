"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Search, ShieldCheck } from "lucide-react"
import { Input } from "@/components/ui/input"

type RoleItem = {
  id: string
  name: string
}

type RoleSelectorProps = {
  roles: RoleItem[]
  rolePointsById: Record<string, number>
  selectedRoleId: string
  playerQuery: string
  initialRoleQuery?: string
}

export function RoleSelector({ roles, rolePointsById, selectedRoleId, playerQuery, initialRoleQuery = "" }: RoleSelectorProps) {
  const [roleQuery, setRoleQuery] = useState(initialRoleQuery)
  const [localRolePoints, setLocalRolePoints] = useState<Record<string, number>>(rolePointsById)

  useEffect(() => {
    setLocalRolePoints(rolePointsById)
  }, [rolePointsById])

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ roleId?: string; points?: number }>
      const roleId = customEvent.detail?.roleId
      const points = customEvent.detail?.points
      if (!roleId || typeof points !== "number") return
      setLocalRolePoints((prev) => ({ ...prev, [roleId]: points }))
    }
    window.addEventListener("profile-role-points-updated", handler as EventListener)
    return () => window.removeEventListener("profile-role-points-updated", handler as EventListener)
  }, [])

  const filteredRoles = useMemo(() => {
    const normalizedQuery = roleQuery.normalize("NFKC").trim().toLowerCase()
    if (!normalizedQuery) return roles
    return roles.filter((role) => role.name.normalize("NFKC").toLowerCase().includes(normalizedQuery))
  }, [roles, roleQuery])

  return (
    <>
      <div className="mb-4 flex items-center gap-2 text-sm uppercase tracking-[0.25em] text-slate-400">
        <ShieldCheck className="h-4 w-4 text-cyan-300" />
        Server roles
      </div>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={roleQuery}
          onChange={(event) => setRoleQuery(event.target.value)}
          placeholder="Search role"
          className="border-white/10 bg-slate-950/60 pl-10 text-white"
        />
      </div>
      <div className="max-h-[68vh] space-y-2 overflow-y-auto pr-1">
        {filteredRoles.map((role) => {
          const isSelected = selectedRoleId === role.id
          const nextParams = new URLSearchParams()
          nextParams.set("roleId", role.id)
          if (playerQuery) nextParams.set("q", playerQuery)
          if (roleQuery.trim()) nextParams.set("roleQ", roleQuery.trim())
          return (
            <Link
              key={role.id}
              href={`/profile/manage-roles?${nextParams.toString()}`}
              className={`block rounded-xl border px-3 py-2 text-sm transition ${
                isSelected
                  ? "border-cyan-300/60 bg-cyan-500/15 text-cyan-100"
                  : "border-white/10 bg-slate-950/50 text-slate-200 hover:border-cyan-300/30 hover:bg-cyan-500/5"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="truncate font-medium">{role.name}</div>
                <div className="shrink-0 rounded-full border border-cyan-300/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] text-cyan-200">
                  {localRolePoints[role.id] ?? 0} pts
                </div>
              </div>
              <div className="mt-1 truncate text-xs text-slate-400">{role.id}</div>
            </Link>
          )
        })}
        {!filteredRoles.length ? (
          <div className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-400">
            No roles found.
          </div>
        ) : null}
      </div>
    </>
  )
}

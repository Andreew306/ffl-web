"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PlayerRoleAutocomplete, type RolePlayer } from "@/components/profile/player-role-autocomplete"

type ManageRolesWorkspaceProps = {
  roleId: string
  roleName: string
  initialPoints: number
  initialSearchQuery: string
  initialSearchResults: RolePlayer[]
  initialAssignedPlayers: RolePlayer[]
}

export function ManageRolesWorkspace({
  roleId,
  roleName,
  initialPoints,
  initialSearchQuery,
  initialSearchResults,
  initialAssignedPlayers,
}: ManageRolesWorkspaceProps) {
  const [points, setPoints] = useState(String(initialPoints))
  const [savingPoints, setSavingPoints] = useState(false)
  const [assignedPlayers, setAssignedPlayers] = useState<RolePlayer[]>(initialAssignedPlayers)

  useEffect(() => {
    setPoints(String(initialPoints))
    setAssignedPlayers(initialAssignedPlayers)
  }, [roleId, initialPoints, initialAssignedPlayers])

  async function savePoints() {
    if (!roleId) return
    setSavingPoints(true)
    try {
      const response = await fetch("/api/profile/manage-roles/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId,
          points: Number(points || 0),
        }),
      })
      if (!response.ok) return
      const payload = (await response.json()) as { points?: number }
      const savedPoints = Number(payload.points ?? 0)
      setPoints(String(savedPoints))
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("profile-role-points-updated", {
            detail: { roleId, points: savedPoints },
          })
        )
      }
    } finally {
      setSavingPoints(false)
    }
  }

  function handleRoleToggle(player: RolePlayer, hasRole: boolean) {
    setAssignedPlayers((prev) => {
      const exists = prev.some((entry) => entry.playerObjectId === player.playerObjectId)
      if (hasRole && !exists) {
        const next = [...prev, { ...player, hasRole: true }]
        next.sort((a, b) => a.playerName.normalize("NFKC").localeCompare(b.playerName.normalize("NFKC"), "es", { sensitivity: "base" }))
        return next
      }
      if (!hasRole && exists) {
        return prev.filter((entry) => entry.playerObjectId !== player.playerObjectId)
      }
      return prev
    })
  }

  const assignedCount = useMemo(() => assignedPlayers.length, [assignedPlayers])

  return (
    <>
      <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/85 to-slate-900/55 p-5 shadow-[0_14px_40px_rgba(2,8,22,0.35)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Role Workspace</div>
            <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-100">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
              {roleName || "-"}
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/45 p-2">
          <span className="pl-1 text-[11px] uppercase tracking-[0.22em] text-slate-400">Role points</span>
          <Input
            value={points}
            onChange={(event) => setPoints(event.target.value)}
            type="number"
            min={0}
            className="h-8 w-24 border-white/10 bg-slate-950/70 text-white"
          />
          <Button type="button" size="sm" className="bg-cyan-500 text-slate-950 hover:bg-cyan-400" onClick={savePoints} disabled={savingPoints}>
            {savingPoints ? "..." : "Save"}
          </Button>
        </div>

        <PlayerRoleAutocomplete
          roleId={roleId}
          initialQuery={initialSearchQuery}
          initialResults={initialSearchResults}
          onRoleToggle={handleRoleToggle}
        />
      </section>

      <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/80 to-slate-900/55 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-sm uppercase tracking-[0.25em] text-slate-400">Players with this role</div>
          <div className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-100">
            {assignedCount}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {assignedPlayers.map((player) => (
            <div key={player.playerObjectId} className="flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-cyan-300/20 bg-slate-950/40 text-[11px] font-semibold text-cyan-100">
                {player.playerName.charAt(0).toUpperCase()}
              </span>
              <span className="truncate">{player.playerName}</span>
            </div>
          ))}
          {!assignedPlayers.length ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-400">
              No players have this role yet.
            </div>
          ) : null}
        </div>
      </section>
    </>
  )
}

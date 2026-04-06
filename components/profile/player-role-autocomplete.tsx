"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { isImageUrl } from "@/lib/utils"

export type RolePlayer = {
  playerObjectId: string
  playerId: number
  playerName: string
  country: string
  avatar?: string
  hasRole: boolean
}

type PlayerRoleAutocompleteProps = {
  roleId: string
  initialQuery: string
  initialResults: RolePlayer[]
  onRoleToggle?: (player: RolePlayer, hasRole: boolean) => void
}

export function PlayerRoleAutocomplete({
  roleId,
  initialQuery,
  initialResults,
  onRoleToggle,
}: PlayerRoleAutocompleteProps) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<RolePlayer[]>(initialResults)
  const [loading, setLoading] = useState(false)
  const [pendingPlayerId, setPendingPlayerId] = useState<string | null>(null)

  useEffect(() => {
    setQuery(initialQuery)
    setResults(initialResults)
  }, [roleId, initialQuery, initialResults])

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      if (!roleId) return
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set("roleId", roleId)
        params.set("q", query)
        const response = await fetch(`/api/profile/manage-roles/players?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        })
        if (!response.ok) return
        const payload = (await response.json()) as { players?: RolePlayer[] }
        setResults(payload.players ?? [])
      } finally {
        setLoading(false)
      }
    }, 220)
    return () => window.clearTimeout(handle)
  }, [query, roleId])

  const emptyState = useMemo(() => {
    if (loading) return "Searching..."
    if (query.trim()) return "No players found."
    return "No players have this role yet."
  }, [loading, query])

  async function toggleRole(player: RolePlayer, targetHasRole: boolean) {
    if (!roleId) return
    setPendingPlayerId(player.playerObjectId)
    try {
      const response = await fetch("/api/profile/manage-roles/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId,
          playerObjectId: player.playerObjectId,
          op: targetHasRole ? "assign" : "remove",
        }),
      })
      if (!response.ok) return

      setResults((prev) =>
        prev.map((entry) =>
          entry.playerObjectId === player.playerObjectId
            ? { ...entry, hasRole: targetHasRole }
            : entry
        )
      )
      onRoleToggle?.(player, targetHasRole)
    } finally {
      setPendingPlayerId(null)
    }
  }

  return (
    <>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search player by name or id"
          className="h-11 border-white/10 bg-slate-950/65 pl-10 text-white"
        />
      </div>
      <div className="mt-2 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mt-3 max-h-[58vh] space-y-2 overflow-y-auto pr-1">
        {results.map((player) => (
          <div key={player.playerObjectId} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 transition hover:border-cyan-300/35 hover:bg-slate-950/60">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative h-11 w-11 overflow-hidden rounded-full border border-white/10 bg-slate-800">
                {player.avatar && isImageUrl(player.avatar) ? (
                  <Image src={player.avatar} alt={player.playerName} fill sizes="44px" className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-200">
                    {player.playerName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold text-white">{player.playerName}</div>
                <div className="truncate text-xs text-slate-400">#{player.playerId} - {player.country || "-"}</div>
              </div>
            </div>
            {player.hasRole ? (
              <Button
                type="button"
                size="sm"
                className="bg-rose-500 text-white hover:bg-rose-400"
                disabled={pendingPlayerId === player.playerObjectId}
                onClick={() => toggleRole(player, false)}
              >
                {pendingPlayerId === player.playerObjectId ? "..." : "Remove"}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                disabled={pendingPlayerId === player.playerObjectId}
                onClick={() => toggleRole(player, true)}
              >
                {pendingPlayerId === player.playerObjectId ? "..." : "Assign"}
              </Button>
            )}
          </div>
        ))}
        {!results.length ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-3 text-sm text-slate-400">
            {emptyState}
          </div>
        ) : null}
      </div>
    </>
  )
}

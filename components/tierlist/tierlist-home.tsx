"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Copy, Pencil, Plus, Save, Search, Sparkles, ThumbsDown, ThumbsUp, Trash2, Upload, Users, X } from "lucide-react"
import {
  deleteTierListSubmissionAction,
  deleteTierListTemplateAction,
  saveTierListSubmissionAction,
  saveTierListTemplateAction,
  voteTierListAction,
} from "@/app/tier-list/actions"
import type {
  TierListItemType,
  TierListPlayerItem,
  TierListRecord,
  TierListTeamItem,
  TierListTierData,
} from "@/lib/services/tierlist.service"
import { cn, isImageUrl } from "@/lib/utils"

type TierListHomeProps = {
  players: TierListPlayerItem[]
  teams: TierListTeamItem[]
  ownTemplates: TierListRecord[]
  ownSubmissions: TierListRecord[]
  publishedTemplates: TierListRecord[]
  communitySubmissions: TierListRecord[]
}

type EditorTier = TierListTierData
type Item = TierListPlayerItem | TierListTeamItem
type WorkspaceMode = "template" | "submission"
type DeleteTarget =
  | { kind: "template"; id: string; title: string }
  | { kind: "submission"; id: string; title: string }
  | null

const defaultTiers: EditorTier[] = [
  { id: "tier-s", label: "S", color: "#ef4444", itemIds: [] },
  { id: "tier-a", label: "A", color: "#fb923c", itemIds: [] },
  { id: "tier-b", label: "B", color: "#facc15", itemIds: [] },
  { id: "tier-c", label: "C", color: "#84cc16", itemIds: [] },
  { id: "tier-d", label: "D", color: "#38bdf8", itemIds: [] },
]

const tierPalette = ["#ef4444", "#fb923c", "#facc15", "#84cc16", "#38bdf8", "#8b5cf6", "#ec4899"]

function toIsoCode(value?: string) {
  const trimmed = (value || "").trim()
  if (!trimmed) return ""
  if (trimmed.length === 2) return trimmed.toLowerCase()
  const chars = Array.from(trimmed)
  if (chars.length < 2) return ""
  const codes = chars.slice(0, 2).map((char) => char.codePointAt(0) || 0)
  if (codes.some((code) => code < 0x1f1e6 || code > 0x1f1ff)) return ""
  return String.fromCharCode(codes[0] - 127397, codes[1] - 127397).toLowerCase()
}

function FlagBadge({ country, className }: { country: string; className?: string }) {
  const isoCode = toIsoCode(country)
  if (!isoCode) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/${isoCode}.svg`}
      alt={country}
      crossOrigin="anonymous"
      className={cn("rounded-full object-cover ring-2 ring-slate-950", className)}
    />
  )
}

function PlayerToken({ player }: { player: TierListPlayerItem }) {
  const avatarIsImage = isImageUrl(player.avatar || "")
  const avatarIsEmoji = Boolean(player.avatar && !avatarIsImage)

  return (
    <div className="flex min-w-[76px] flex-col items-center gap-2 text-center">
      <div className="relative h-12 w-12 shrink-0">
        <div
          className="flex h-full w-full items-center justify-center rounded-full border border-slate-950/90 bg-slate-900 shadow-[0_12px_26px_rgba(2,6,23,0.45)]"
          style={
            player.kitImage
              ? {
                  backgroundImage: `url(${player.kitImage})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          {avatarIsImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={player.avatar}
              alt={player.playerName}
              className="h-7 w-7 rounded-full border border-slate-950/70 object-cover"
            />
          ) : avatarIsEmoji ? (
            <span className="text-base leading-none">{player.avatar}</span>
          ) : null}
        </div>
        {player.country ? <FlagBadge country={player.country} className="-bottom-1 -right-1 absolute h-4 w-4" /> : null}
      </div>
      <div className="max-w-[92px] truncate text-sm font-semibold text-white">{player.playerName}</div>
    </div>
  )
}

function TeamToken({ team }: { team: TierListTeamItem }) {
  return (
    <div className="flex min-w-[76px] flex-col items-center gap-2 text-center">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={team.image} alt={team.teamName} className="h-full w-full object-contain" />
      </div>
      <div className="max-w-[92px] truncate text-sm font-semibold text-white">{team.teamName}</div>
    </div>
  )
}

function ItemToken({ item, itemType }: { item: Item; itemType: TierListItemType }) {
  return itemType === "players" ? <PlayerToken player={item as TierListPlayerItem} /> : <TeamToken team={item as TierListTeamItem} />
}

function getEmptyTier(color: string): EditorTier {
  return { id: crypto.randomUUID(), label: "New Tier", color, itemIds: [] }
}

function createBlankTierSet() {
  return defaultTiers.map((tier) => ({ ...tier, itemIds: [] }))
}

export function TierListHome({
  players,
  teams,
  ownTemplates,
  ownSubmissions,
  publishedTemplates,
  communitySubmissions,
}: TierListHomeProps) {
  const router = useRouter()
  const [activeView, setActiveView] = useState<"create" | "mine" | "templates" | "community">("create")
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("template")
  const [title, setTitle] = useState("My Tier Template")
  const [itemType, setItemType] = useState<TierListItemType>("players")
  const [tiers, setTiers] = useState<EditorTier[]>(createBlankTierSet())
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([])
  const [templateId, setTemplateId] = useState<string | undefined>(undefined)
  const [templateSourceId, setTemplateSourceId] = useState<string | undefined>(undefined)
  const [query, setQuery] = useState("")
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)
  const [draggedFromTierId, setDraggedFromTierId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()
  const [voting, startVoting] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)

  const sourceItems = itemType === "players" ? players : teams
  const itemMap = useMemo(() => new Map(sourceItems.map((item) => [item.id, item])), [sourceItems])
  const selectedSet = useMemo(() => new Set(selectedOptionIds), [selectedOptionIds])
  const assignedItemIds = useMemo(() => new Set(tiers.flatMap((tier) => tier.itemIds)), [tiers])

  const filteredSelectedPool = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return selectedOptionIds
      .map((id) => itemMap.get(id))
      .filter((item): item is Item => Boolean(item))
      .filter((item) => !assignedItemIds.has(item.id))
      .filter((item) => {
        if (!normalized) return true
        const name = item.type === "player" ? item.playerName : item.teamName
        return name.toLowerCase().includes(normalized)
      })
  }, [assignedItemIds, itemMap, query, selectedOptionIds])

  const filteredLibrary = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return sourceItems
      .filter((item) => {
        if (!normalized) return true
        const name = item.type === "player" ? item.playerName : item.teamName
        return name.toLowerCase().includes(normalized)
      })
      .slice(0, 80)
  }, [query, sourceItems])

  function resetEditor(nextType?: TierListItemType) {
    setWorkspaceMode("template")
    setTemplateId(undefined)
    setTemplateSourceId(undefined)
    setTitle("My Tier Template")
    setItemType(nextType ?? itemType)
    setTiers(createBlankTierSet())
    setSelectedOptionIds([])
    setQuery("")
    setMessage(null)
  }

  function assignItemToTier(itemId: string, targetTierId: string) {
    setTiers((current) =>
      current.map((tier) => ({
        ...tier,
        itemIds:
          tier.id === targetTierId
            ? [...tier.itemIds.filter((id) => id !== itemId), itemId]
            : tier.itemIds.filter((id) => id !== itemId),
      }))
    )
  }

  function moveItemBackToPool(itemId: string) {
    setTiers((current) => current.map((tier) => ({ ...tier, itemIds: tier.itemIds.filter((id) => id !== itemId) })))
  }

  function toggleTemplateOption(itemId: string) {
    if (workspaceMode !== "template") return

    setSelectedOptionIds((current) => {
      if (current.includes(itemId)) {
        moveItemBackToPool(itemId)
        return current.filter((id) => id !== itemId)
      }
      return [...current, itemId]
    })
  }

  function loadOwnTemplate(list: TierListRecord) {
    setActiveView("create")
    setWorkspaceMode("template")
    setTemplateId(list.id)
    setTemplateSourceId(undefined)
    setTitle(list.title)
    setItemType(list.itemType)
    setTiers(list.tiers.map((tier) => ({ ...tier, itemIds: [...tier.itemIds] })))
    setSelectedOptionIds([...list.allowedItemIds])
    setMessage("Template loaded.")
  }

  function startSubmissionFromTemplate(list: TierListRecord) {
    setActiveView("create")
    setWorkspaceMode("submission")
    setTemplateId(undefined)
    setTemplateSourceId(list.id)
    setTitle(`${list.title} - ${list.authorName}`)
    setItemType(list.itemType)
    setSelectedOptionIds([...list.allowedItemIds])
    setTiers(list.tiers.map((tier) => ({ ...tier, itemIds: [] })))
    setQuery("")
    setMessage("Template ready. Build your version and publish it.")
  }

  function loadOwnSubmission(list: TierListRecord) {
    setActiveView("create")
    setWorkspaceMode("submission")
    setTemplateId(list.id)
    setTemplateSourceId(list.templateId)
    setTitle(list.title)
    setItemType(list.itemType)
    setSelectedOptionIds([...list.allowedItemIds])
    setTiers(list.tiers.map((tier) => ({ ...tier, itemIds: [...tier.itemIds] })))
    setQuery("")
    setMessage("Submission loaded.")
  }

  function saveCurrent(published: boolean) {
    startSaving(async () => {
      const result =
        workspaceMode === "template"
          ? await saveTierListTemplateAction({
              listId: templateId,
              title,
              itemType,
              tiers,
              allowedItemIds: selectedOptionIds,
              published,
            })
          : await saveTierListSubmissionAction({
              listId: templateId,
              title,
              templateId: templateSourceId || "",
              tiers,
              published,
            })

      if (!result.ok) {
        setMessage(result.error)
        return
      }

      if (workspaceMode === "template") {
        setTemplateId(result.id)
      }
      router.refresh()
      setMessage(
        workspaceMode === "template"
          ? published
            ? "Template published."
            : "Template saved."
          : published
            ? "Tier list published."
            : "Tier list saved."
      )
    })
  }

  function castVote(listId: string, direction: "up" | "down") {
    startVoting(async () => {
      const result = await voteTierListAction({ listId, direction })
      if (!result.ok) {
        setMessage(result.error)
        return
      }
      router.refresh()
      setMessage("Vote saved.")
    })
  }

  function deleteTemplate(templateListId: string) {
    startSaving(async () => {
      setDeletingId(templateListId)
      const result = await deleteTierListTemplateAction({ templateId: templateListId })
      setDeletingId(null)
      if (!result.ok) {
        setMessage(result.error)
        return
      }
      if (workspaceMode === "template" && templateId === templateListId) {
        resetEditor(itemType)
      }
      router.refresh()
      setMessage("Template deleted.")
      setActiveView("mine")
    })
  }

  function deleteSubmission(submissionId: string) {
    startSaving(async () => {
      setDeletingId(submissionId)
      const result = await deleteTierListSubmissionAction({ submissionId })
      setDeletingId(null)
      if (!result.ok) {
        setMessage(result.error)
        return
      }
      if (workspaceMode === "submission" && templateId === submissionId) {
        resetEditor(itemType)
      }
      router.refresh()
      setMessage("Submission deleted.")
      setActiveView("mine")
    })
  }

  function confirmDelete() {
    if (!deleteTarget) return
    if (deleteTarget.kind === "template") {
      deleteTemplate(deleteTarget.id)
    } else {
      deleteSubmission(deleteTarget.id)
    }
    setDeleteTarget(null)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        {deleteTarget ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-900 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.55)]">
              <div className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Confirm delete</div>
              <h3 className="mt-3 text-2xl font-semibold text-white">Delete this {deleteTarget.kind}?</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {deleteTarget.kind === "template"
                  ? `This will delete "${deleteTarget.title}" and every tier list created from it.`
                  : `This will delete "${deleteTarget.title}" permanently.`}
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-full border border-white/10 bg-slate-950/80 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="rounded-full border border-rose-300/20 bg-rose-400/10 px-5 py-2.5 text-sm font-semibold text-rose-100 transition hover:border-rose-300/35"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(7,89,133,0.62))] p-4 shadow-[0_22px_70px_rgba(3,10,24,0.42)]">
          <div className="flex flex-col gap-4 rounded-[24px] border border-white/10 bg-slate-950/35 p-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/20 bg-slate-950/80 shadow-[0_12px_30px_rgba(2,6,23,0.38)]">
                <Sparkles className="h-7 w-7 text-cyan-300" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.35em] text-cyan-100/75">Minigame</div>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">Tier List</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {[
                { id: "create", label: "Create template" },
                { id: "mine", label: "My templates" },
                { id: "templates", label: "Available tiers" },
                { id: "community", label: "Community" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveView(tab.id as "create" | "mine" | "templates" | "community")}
                  className={cn(
                    "rounded-full border px-5 py-2.5 text-sm font-semibold transition",
                    activeView === tab.id
                      ? "border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
                      : "border-white/10 bg-slate-950/80 text-slate-300 hover:border-white/20 hover:text-white"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {activeView === "create" ? (
          <div className="mt-8 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <section className="rounded-[30px] border border-white/10 bg-slate-900/60 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={workspaceMode === "template" ? "Template title" : "Your tier title"}
                    className="h-14 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-5 text-2xl font-semibold text-white outline-none transition focus:border-cyan-300/30"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => resetEditor(itemType)} className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-slate-950/80 px-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/5">
                    <X className="h-4 w-4" />
                    Clear
                  </button>
                  <button type="button" disabled={saving} onClick={() => saveCurrent(false)} className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-slate-950/80 px-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/5 disabled:opacity-60">
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                  <button type="button" disabled={saving} onClick={() => saveCurrent(true)} className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60">
                    <Upload className="h-4 w-4" />
                    {workspaceMode === "template" ? "Publish template" : "Publish tier"}
                  </button>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceMode("template")
                    setTemplateSourceId(undefined)
                    setTemplateId(undefined)
                    setSelectedOptionIds([])
                    setTiers(createBlankTierSet())
                    setTitle("My Tier Template")
                  }}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-semibold transition",
                    workspaceMode === "template"
                      ? "border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
                      : "border-white/10 bg-slate-950/80 text-slate-300 hover:text-white"
                  )}
                >
                  Template mode
                </button>
                {workspaceMode === "submission" ? <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100"><Copy className="h-4 w-4" />Community submission</div> : null}
                {workspaceMode === "template"
                  ? (["players", "teams"] as TierListItemType[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => resetEditor(value)}
                        className={cn(
                          "rounded-full border px-4 py-2 text-sm font-semibold transition",
                          itemType === value
                            ? "border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
                            : "border-white/10 bg-slate-950/80 text-slate-300 hover:text-white"
                        )}
                      >
                        {value === "players" ? "Players" : "Teams"}
                      </button>
                    ))
                  : null}
                <button type="button" onClick={() => setTiers((current) => [...current, getEmptyTier(tierPalette[current.length % tierPalette.length])])} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:text-white">
                  <Plus className="h-4 w-4" />
                  Add tier
                </button>
              </div>

              <div className="mt-4 rounded-[24px] border border-white/10 bg-slate-950/45 px-4 py-3 text-sm text-slate-300">
                {workspaceMode === "template"
                  ? `Choose the exact options other users will have available. Current pool: ${selectedOptionIds.length} items.`
                  : `Build your own version from this fixed pool: ${selectedOptionIds.length} items.`}
              </div>

              <div className="mt-6 space-y-3">
                {tiers.map((tier) => (
                  <div key={tier.id} className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/50">
                    <div className="grid min-h-[96px] grid-cols-[140px_1fr]">
                      <div className="flex flex-col justify-between p-4" style={{ backgroundColor: tier.color }}>
                        <input
                          value={tier.label}
                          onChange={(event) =>
                            setTiers((current) =>
                              current.map((row) => (row.id === tier.id ? { ...row, label: event.target.value } : row))
                            )
                          }
                          className="w-full bg-transparent text-3xl font-black uppercase text-slate-950 outline-none placeholder:text-slate-950/60"
                        />
                        <div className="mt-3 flex items-center justify-end">
                          <button type="button" onClick={() => setTiers((current) => (current.length > 1 ? current.filter((row) => row.id !== tier.id) : current))} className="rounded-full bg-slate-950/10 p-1 hover:bg-slate-950/20">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="min-h-[96px] p-4" onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedItemId) assignItemToTier(draggedItemId, tier.id); setDraggedItemId(null); setDraggedFromTierId(null) }}>
                        {tier.itemIds.length ? (
                          <div className="flex flex-wrap gap-3">
                            {tier.itemIds.map((itemId) => {
                              const item = itemMap.get(itemId)
                              if (!item) return null
                              return (
                                <div key={itemId} draggable onDragStart={() => { setDraggedItemId(itemId); setDraggedFromTierId(tier.id) }} className="rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2">
                                  <ItemToken item={item} itemType={itemType} />
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="flex h-full min-h-[66px] items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-slate-500">Drop items here</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {message ? <div className="mt-4 text-sm text-cyan-100">{message}</div> : null}
            </section>

            <section className="rounded-[30px] border border-white/10 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between gap-4 text-[11px] uppercase tracking-[0.35em] text-slate-500">
                <span>{workspaceMode === "template" ? "Option builder" : "Tier options"}</span>
                <span>{filteredSelectedPool.length} in pool</span>
              </div>

              <div className="mt-4 rounded-[24px] border border-white/10 bg-slate-950/60 p-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={itemType === "players" ? "Search player" : "Search team"}
                    className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/80 pl-11 pr-4 text-white outline-none transition focus:border-cyan-300/30"
                  />
                </div>

                <div className="mt-4 min-h-[180px] rounded-2xl border border-white/10 bg-slate-950/50 p-3" onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedItemId && draggedFromTierId) moveItemBackToPool(draggedItemId); setDraggedItemId(null); setDraggedFromTierId(null) }}>
                  {filteredSelectedPool.length ? (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                      {filteredSelectedPool.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          draggable
                          onDragStart={() => { setDraggedItemId(item.id); setDraggedFromTierId(null) }}
                          onClick={() => { const firstOpenTier = tiers[0]; if (firstOpenTier) assignItemToTier(item.id, firstOpenTier.id) }}
                          className="flex min-h-[116px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-4 text-center transition hover:border-cyan-300/20 hover:bg-slate-900"
                        >
                          <ItemToken item={item} itemType={itemType} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex min-h-[140px] items-center justify-center text-sm text-slate-500">No unassigned options for this search.</div>
                  )}
                </div>

                {workspaceMode === "template" ? (
                  <div className="mt-6">
                    <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.35em] text-slate-500">
                      <span>Library</span>
                      <span>{filteredLibrary.length}</span>
                    </div>
                    <div className="grid max-h-[340px] grid-cols-2 gap-2 overflow-y-auto pr-1 md:grid-cols-3 xl:grid-cols-4">
                      {filteredLibrary.map((item) => {
                        const selected = selectedSet.has(item.id)
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleTemplateOption(item.id)}
                            className={cn(
                              "flex min-h-[116px] w-full flex-col items-center justify-center gap-3 rounded-2xl border px-4 py-4 text-center transition",
                              selected ? "border-cyan-300/20 bg-cyan-400/10" : "border-white/10 bg-slate-950/60 hover:border-white/20"
                            )}
                          >
                            <ItemToken item={item} itemType={itemType} />
                            <div className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-200">{selected ? "Added" : "Add"}</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : null}

              </div>
            </section>
          </div>
        ) : null}

        {activeView === "mine" ? (
          <section className="mt-8 rounded-[30px] border border-white/10 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Template manager</div>
                <h2 className="mt-2 text-3xl font-semibold text-white">My templates</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-slate-300">
                  <Users className="h-4 w-4" />
                  {ownTemplates.length} templates
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-slate-300">
                  <Copy className="h-4 w-4" />
                  {ownSubmissions.length} tiers
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-4 text-[11px] uppercase tracking-[0.35em] text-slate-500">Templates</div>
              <div className="grid gap-4 lg:grid-cols-2">
                {ownTemplates.length ? (
                  ownTemplates.map((list) => (
                    <div key={list.id} className="rounded-[24px] border border-white/10 bg-slate-950/55 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xl font-semibold text-white">{list.title}</div>
                          <div className="mt-1 text-sm text-slate-400">
                            {list.itemType === "players" ? "Players" : "Teams"} · {list.allowedItemIds.length} options
                          </div>
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                          {list.published ? "Published" : "Draft"}
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        {list.tiers.map((tier) => (
                          <div key={tier.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-3">
                            <div
                              className="flex h-10 w-12 items-center justify-center rounded-xl text-sm font-black text-slate-950"
                              style={{ backgroundColor: tier.color }}
                            >
                              {tier.label}
                            </div>
                            <div className="text-sm text-slate-300">{tier.itemIds.length} items placed by creator</div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => loadOwnTemplate(list)}
                          className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/35"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={saving && deletingId === list.id}
                          onClick={() => setDeleteTarget({ kind: "template", id: list.id, title: list.title })}
                          className="inline-flex items-center gap-2 rounded-full border border-rose-300/20 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-300/35 disabled:opacity-60"
                        >
                          <Trash2 className="h-4 w-4" />
                          {saving && deletingId === list.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full flex min-h-[220px] items-center justify-center rounded-[24px] border border-dashed border-white/10 text-slate-500">
                    You have not created any templates yet.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8">
              <div className="mb-4 text-[11px] uppercase tracking-[0.35em] text-slate-500">Your tiers</div>
              <div className="grid gap-4 lg:grid-cols-2">
                {ownSubmissions.length ? (
                  ownSubmissions.map((list) => (
                    <div key={list.id} className="rounded-[24px] border border-white/10 bg-slate-950/55 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xl font-semibold text-white">{list.title}</div>
                          <div className="mt-1 text-sm text-slate-400">
                            {list.templateTitle ? `From ${list.templateTitle}` : "Community tier"}
                          </div>
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                          {list.published ? "Published" : "Draft"}
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        {list.tiers.map((tier) => (
                          <div key={tier.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-3">
                            <div
                              className="flex h-10 w-12 items-center justify-center rounded-xl text-sm font-black text-slate-950"
                              style={{ backgroundColor: tier.color }}
                            >
                              {tier.label}
                            </div>
                            <div className="text-sm text-slate-300">
                              {tier.itemIds.length ? `${tier.itemIds.length} items placed` : "Empty tier"}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => loadOwnSubmission(list)}
                          className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/35"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={saving && deletingId === list.id}
                          onClick={() => setDeleteTarget({ kind: "submission", id: list.id, title: list.title })}
                          className="inline-flex items-center gap-2 rounded-full border border-rose-300/20 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-300/35 disabled:opacity-60"
                        >
                          <Trash2 className="h-4 w-4" />
                          {saving && deletingId === list.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full flex min-h-[220px] items-center justify-center rounded-[24px] border border-dashed border-white/10 text-slate-500">
                    You have not published any tiers yet.
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : null}

        {activeView === "templates" ? (
          <section className="mt-8 rounded-[30px] border border-white/10 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Published templates</div>
                <h2 className="mt-2 text-3xl font-semibold text-white">Available tiers</h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-slate-300">
                <Users className="h-4 w-4" />
                {publishedTemplates.length} templates
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {publishedTemplates.length ? (
                publishedTemplates.map((list) => (
                  <div key={list.id} className="rounded-[24px] border border-white/10 bg-slate-950/55 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xl font-semibold text-white">{list.title}</div>
                        <div className="mt-1 text-sm text-slate-400">{list.authorName}</div>
                      </div>
                      <button type="button" onClick={() => startSubmissionFromTemplate(list)} className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/35">
                        Make this tier
                      </button>
                    </div>
                    <div className="mt-3 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
                      {list.allowedItemIds.length} fixed options · {list.itemType === "players" ? "Players" : "Teams"}
                    </div>
                    <div className="mt-4 space-y-2">
                      {list.tiers.map((tier) => (
                        <div key={tier.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-3">
                          <div className="flex h-10 w-12 items-center justify-center rounded-xl text-sm font-black text-slate-950" style={{ backgroundColor: tier.color }}>
                            {tier.label}
                          </div>
                          <div className="text-sm text-slate-300">{tier.itemIds.length} items placed by creator</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full flex min-h-[220px] items-center justify-center rounded-[24px] border border-dashed border-white/10 text-slate-500">No templates published yet.</div>
              )}
            </div>
          </section>
        ) : null}

        {activeView === "community" ? (
          <section className="mt-8 rounded-[30px] border border-white/10 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Community feed</div>
                <h2 className="mt-2 text-3xl font-semibold text-white">Published user tiers</h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-slate-300">
                <Users className="h-4 w-4" />
                {communitySubmissions.length} submissions
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {communitySubmissions.length ? (
                communitySubmissions.map((list) => (
                  <div key={list.id} className="rounded-[24px] border border-white/10 bg-slate-950/55 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-xl font-semibold text-white">{list.title}</div>
                        <div className="mt-1 text-sm text-slate-400">{list.authorName}{list.templateTitle ? ` · ${list.templateTitle}` : ""}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-white">{list.voteScore}</div>
                        <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Score</div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {list.tiers.map((tier) => (
                        <div key={tier.id} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70">
                          <div className="grid grid-cols-[70px_1fr]">
                            <div className="flex items-center justify-center px-2 py-3 text-lg font-black text-slate-950" style={{ backgroundColor: tier.color }}>
                              {tier.label}
                            </div>
                            <div className="flex min-h-[60px] flex-wrap items-center gap-2 px-3 py-3">
                              {tier.itemIds.length ? (
                                tier.itemIds.slice(0, 10).map((itemId) => {
                                  const source = list.itemType === "players" ? players : teams
                                  const item = source.find((candidate) => candidate.id === itemId)
                                  if (!item) return null
                                  return <div key={itemId} className="rounded-xl border border-white/10 bg-slate-950/65 px-2 py-1.5"><ItemToken item={item} itemType={list.itemType} /></div>
                                })
                              ) : (
                                <div className="text-sm text-slate-500">Empty tier</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const template = list.templateId ? publishedTemplates.find((entry) => entry.id === list.templateId) : undefined
                          if (template) startSubmissionFromTemplate(template)
                        }}
                        className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/35"
                      >
                        Use template
                      </button>
                      <div className="flex items-center gap-2">
                        <button type="button" disabled={voting} onClick={() => castVote(list.id, "up")} className={cn("inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition", list.userVote === "up" ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100" : "border-white/10 bg-slate-950/80 text-slate-200 hover:text-white")}>
                          <ThumbsUp className="h-4 w-4" />
                          {list.upvotes}
                        </button>
                        <button type="button" disabled={voting} onClick={() => castVote(list.id, "down")} className={cn("inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition", list.userVote === "down" ? "border-rose-300/30 bg-rose-400/10 text-rose-100" : "border-white/10 bg-slate-950/80 text-slate-200 hover:text-white")}>
                          <ThumbsDown className="h-4 w-4" />
                          {list.downvotes}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full flex min-h-[220px] items-center justify-center rounded-[24px] border border-dashed border-white/10 text-slate-500">No community submissions published yet.</div>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Trash2, X } from "lucide-react"
import type { ProfileCardGalleryItem } from "@/lib/services/profile-card-gallery.service"

const STORAGE_KEY = "ffl-cards-base-squad"
const formations = ["1-3-2-1", "1-3-1-2", "1-2-1-3", "1-2-2-2", "1-1-2-3", "1-1-3-2"] as const
type Formation = (typeof formations)[number]
type PitchSlot = { position: string; x: number; y: number; row: number }
const rowXs: Record<number, number[]> = { 1: [50], 2: [32, 68], 3: [20, 50, 80] }

function buildSlots(formation: Formation): PitchSlot[] {
  const [, defenders, midfielders, attackers] = formation.split("-").map(Number)
  return [
    { count: attackers, position: "ST", y: 17, row: 0 },
    { count: midfielders, position: "CM", y: 42, row: 1 },
    { count: defenders, position: "CB", y: 67, row: 2 },
    { count: 1, position: "GK", y: 88, row: 3 },
  ].flatMap(({ count, position, y, row }) => rowXs[count].map((x) => ({ position, x, y, row })))
}

function buildLinks(slots: PitchSlot[]) {
  const links: Array<[number, number]> = []
  for (let row = 0; row < 3; row += 1) {
    const upper = slots.map((slot, index) => ({ ...slot, index })).filter((slot) => slot.row === row)
    const lower = slots.map((slot, index) => ({ ...slot, index })).filter((slot) => slot.row === row + 1)
    for (const low of lower) {
      const nearest = [...upper].sort((a, b) => Math.abs(a.x - low.x) - Math.abs(b.x - low.x)).slice(0, upper.length > 1 ? 2 : 1)
      for (const high of nearest) links.push([low.index, high.index])
    }
  }
  return links
}

function overall(card: ProfileCardGalleryItem) {
  return card.finalRating?.ovr || card.botRating.ovr
}

export function MyClub({ availableCards }: { availableCards: ProfileCardGalleryItem[] }) {
  const [formation, setFormation] = useState<Formation>("1-2-2-2")
  const [squad, setSquad] = useState<Array<string | null>>(() => Array(7).fill(null))
  const [activeSlot, setActiveSlot] = useState<number | null>(null)
  const [query, setQuery] = useState("")
  const [loaded, setLoaded] = useState(false)
  const slots = useMemo(() => buildSlots(formation), [formation])
  const links = useMemo(() => buildLinks(slots), [slots])
  const cardsById = useMemo(() => new Map(availableCards.map((card) => [card.id, card])), [availableCards])
  const selectedIds = useMemo(() => new Set(squad.filter((id): id is string => Boolean(id))), [squad])

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null")
      const storedSquad = Array.isArray(stored) ? stored : stored?.squad
      const storedFormation = formations.includes(stored?.formation) ? stored.formation : "1-2-2-2"
      if (Array.isArray(storedSquad)) {
        const availableIds = new Set(availableCards.map((card) => card.id))
        setSquad(Array.from({ length: 7 }, (_, index) => availableIds.has(storedSquad[index]) ? storedSquad[index] : null))
      }
      setFormation(storedFormation)
    } catch {}
    setLoaded(true)
  }, [availableCards])

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify({ formation, squad }))
  }, [formation, loaded, squad])

  const filteredCards = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return normalized
      ? availableCards.filter((card) => card.playerName.toLowerCase().includes(normalized) || String(card.playerId || "").includes(normalized))
      : availableCards
  }, [availableCards, query])

  function placeCard(cardId: string, target: number) {
    setSquad((current) => {
      const source = current.indexOf(cardId)
      if (source === target) return current
      const next = [...current]
      if (source !== -1) next[source] = next[target]
      next[target] = cardId
      return next
    })
    setActiveSlot(null)
  }

  function chooseCard(cardId: string) {
    const existing = squad.indexOf(cardId)
    if (existing !== -1) return setActiveSlot(existing)
    const target = activeSlot ?? squad.findIndex((id) => id === null)
    if (target !== -1) placeCard(cardId, target)
  }

  function chemistryColor(a: number, b: number) {
    const first = squad[a] ? cardsById.get(squad[a]!) : null
    const second = squad[b] ? cardsById.get(squad[b]!) : null
    if (!first || !second) return "rgba(148,163,184,.28)"
    const difference = Math.abs(overall(first) - overall(second))
    return difference <= 3 ? "#22c55e" : difference <= 7 ? "#f59e0b" : "#ef4444"
  }

  return (
    <section className="mt-10">
      <div className="mb-5 flex items-end justify-between gap-4 border-b border-white/10 pb-4">
        <div><h2 className="text-2xl font-semibold">My Club</h2><p className="mt-1 text-sm text-slate-400">Build your seven from the unlocked base collection.</p></div>
        <div className="text-sm text-amber-300">{availableCards.length} unlocked</div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <div className="border border-white/10 bg-slate-900/60 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><div className="font-semibold">Squad Builder</div><div className="text-xs text-slate-400">{selectedIds.size}/7 selected</div></div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400" htmlFor="formation">Formation</label>
              <select id="formation" value={formation} onChange={(event) => { setFormation(event.target.value as Formation); setActiveSlot(null) }} className="h-9 border border-white/15 bg-slate-950 px-3 text-sm text-white outline-none focus:border-amber-300/60">
                {formations.map((value) => <option key={value}>{value}</option>)}
              </select>
              <button type="button" onClick={() => { setSquad(Array(7).fill(null)); setActiveSlot(null) }} disabled={!selectedIds.size} className="flex h-9 w-9 items-center justify-center border border-white/10 text-slate-400 hover:border-red-400/40 hover:text-red-300 disabled:opacity-30" title="Clear squad" aria-label="Clear squad"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="relative aspect-[16/13] min-h-[570px] overflow-hidden border border-white/10 bg-slate-950 bg-cover bg-center" style={{ backgroundImage: "linear-gradient(rgba(2,10,18,.18),rgba(2,10,18,.36)),url('/ffl-cards/squad-stadium.png')" }}>
            <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {links.map(([a, b]) => <line key={`${a}-${b}`} x1={slots[a].x} y1={slots[a].y} x2={slots[b].x} y2={slots[b].y} stroke={chemistryColor(a, b)} strokeWidth="0.7" vectorEffect="non-scaling-stroke" />)}
            </svg>
            {slots.map((slot, index) => {
              const card = squad[index] ? cardsById.get(squad[index]!) : null
              return (
                <div key={`${formation}-${index}`} className="absolute z-20 -translate-x-1/2 -translate-y-1/2" style={{ left: `${slot.x}%`, top: `${slot.y}%` }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const id = event.dataTransfer.getData("text/card-id"); if (id) placeCard(id, index) }}>
                  <button type="button" draggable={Boolean(card)} onDragStart={(event) => { if (card) { event.dataTransfer.setData("text/card-id", card.id); event.dataTransfer.effectAllowed = "move" } }} onClick={() => setActiveSlot(index)} className={`relative flex h-32 w-24 items-center justify-center transition sm:h-40 sm:w-28 ${activeSlot === index ? "drop-shadow-[0_0_12px_rgba(252,211,77,.9)]" : "drop-shadow-[0_10px_10px_rgba(0,0,0,.55)]"}`} aria-label={`Select ${slot.position} slot`}>
                    {card ? <img src={card.approvedImageUrl!} alt={card.playerName} className="h-full w-full object-contain" /> : <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-white/45 bg-slate-950/65 text-sm font-semibold">{slot.position}</span>}
                  </button>
                  {card ? <button type="button" onClick={() => { setSquad((current) => current.map((id, i) => i === index ? null : id)); setActiveSlot(index) }} className="absolute right-0 top-0 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-slate-950" title={`Remove ${card.playerName}`} aria-label={`Remove ${card.playerName}`}><X className="h-4 w-4" /></button> : null}
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400"><span><i className="mr-1 inline-block h-2 w-5 bg-green-500" />Strong</span><span><i className="mr-1 inline-block h-2 w-5 bg-amber-500" />Balanced</span><span><i className="mr-1 inline-block h-2 w-5 bg-red-500" />Weak</span></div>
        </div>

        <aside className="border border-white/10 bg-slate-900/60 p-4">
          <div className="flex items-end justify-between"><div><h3 className="font-semibold">Collection</h3><p className="mt-1 text-xs text-slate-400">Base cards</p></div><span className="text-xs text-slate-400">{filteredCards.length}</span></div>
          <label className="mt-4 flex h-10 items-center gap-2 border border-white/10 bg-slate-950 px-3 focus-within:border-amber-300/50"><Search className="h-4 w-4 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-600" /></label>
          <div className="mt-4 grid max-h-[720px] grid-cols-2 gap-3 overflow-y-auto pr-1">
            {filteredCards.map((card) => <button key={card.id} type="button" draggable onDragStart={(event) => { event.dataTransfer.setData("text/card-id", card.id); event.dataTransfer.effectAllowed = "copyMove" }} onClick={() => chooseCard(card.id)} className={`bg-transparent text-left transition ${selectedIds.has(card.id) ? "drop-shadow-[0_0_8px_rgba(252,211,77,.75)]" : "opacity-90 hover:opacity-100"}`}><div className="aspect-[670/1080]"><img src={card.approvedImageUrl!} alt={`${card.playerName} card`} className="h-full w-full object-contain" /></div><div className="px-1 pb-2"><div className="truncate text-xs font-semibold">{card.playerName}</div><div className="mt-1 text-[11px] text-slate-400">OVR {overall(card)}</div></div></button>)}
          </div>
        </aside>
      </div>
    </section>
  )
}

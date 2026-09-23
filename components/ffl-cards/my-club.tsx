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
    { count: attackers, positions: attackers === 1 ? ["ST"] : attackers === 2 ? ["LW", "RW"] : ["LW", "ST", "RW"], y: 13, row: 0 },
    { count: midfielders, positions: Array(midfielders).fill("CM"), y: 38, row: 1 },
    { count: defenders, positions: Array(defenders).fill("CB"), y: 63, row: 2 },
    { count: 1, positions: ["GK"], y: 88, row: 3 },
  ].flatMap(({ count, positions, y, row }) => rowXs[count].map((x, index) => ({ position: positions[index], x, y, row })))
}

function isPositionMatch(playerPosition: string | undefined, slotPosition: string) {
  const actual = playerPosition?.toUpperCase() || ""
  if (["LW", "RW"].includes(actual) && ["LW", "RW"].includes(slotPosition)) return true
  return actual === slotPosition
}

function buildLinks(slots: PitchSlot[]) {
  const links: Array<[number, number]> = []
  const rows = Array.from({ length: 4 }, (_, row) =>
    slots.map((slot, index) => ({ ...slot, index })).filter((slot) => slot.row === row),
  )

  for (const row of rows) {
    for (let first = 0; first < row.length; first += 1) {
      for (let second = first + 1; second < row.length; second += 1) {
        links.push([row[first].index, row[second].index])
      }
    }
  }

  for (let row = 0; row < rows.length - 1; row += 1) {
    const upper = rows[row]
    const lower = rows[row + 1]

    for (const player of upper) {
      const minimumDistance = Math.min(...lower.map((candidate) => Math.abs(candidate.x - player.x)))
      for (const nearest of lower.filter((candidate) => Math.abs(candidate.x - player.x) === minimumDistance)) {
        links.push([player.index, nearest.index])
      }
    }
    for (const player of lower) {
      const minimumDistance = Math.min(...upper.map((candidate) => Math.abs(candidate.x - player.x)))
      for (const nearest of upper.filter((candidate) => Math.abs(candidate.x - player.x) === minimumDistance)) {
        if (!links.some(([a, b]) => a === nearest.index && b === player.index)) {
          links.push([nearest.index, player.index])
        }
      }
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
  const [previewCard, setPreviewCard] = useState<ProfileCardGalleryItem | null>(null)
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

    let points = 0
    const firstInPosition = isPositionMatch(first.position, slots[a].position)
    const secondInPosition = isPositionMatch(second.position, slots[b].position)
    const sameCountry = Boolean(first.country && second.country
      && first.country.trim().toLowerCase() === second.country.trim().toLowerCase())
    const sameTeam = Boolean(first.teamId && second.teamId && first.teamId === second.teamId)

    if ((!firstInPosition || !secondInPosition) && !sameCountry && !sameTeam) return "#ef4444"

    points += firstInPosition && secondInPosition ? 1 : -1
    if (sameCountry) points += 1
    if (sameTeam) points += 1

    return points >= 2 ? "#22c55e" : points === 1 ? "#f59e0b" : "#ef4444"
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

          <div className="relative aspect-[16/13] min-h-[570px] overflow-hidden border border-white/10 bg-[#414141]">
            <div className="pointer-events-none absolute inset-[3%] border-2 border-white/30" />
            <div className="pointer-events-none absolute left-[3%] right-[3%] top-1/2 h-px bg-white/25" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[24%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/20" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/35 bg-[#414141]" />
            <div className="pointer-events-none absolute left-1/2 top-[3%] h-[16%] w-[36%] -translate-x-1/2 rounded-b-[50%] border-2 border-t-0 border-white/20" />
            <div className="pointer-events-none absolute bottom-[3%] left-1/2 h-[16%] w-[36%] -translate-x-1/2 rounded-t-[50%] border-2 border-b-0 border-white/20" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-[1] flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#414141]/85 p-3 opacity-55">
              <img src="/ffl-logo.png" alt="" className="h-full w-full object-contain grayscale" />
            </div>
            <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {links.map(([a, b]) => <line key={`${a}-${b}`} x1={slots[a].x} y1={slots[a].y} x2={slots[b].x} y2={slots[b].y} stroke={chemistryColor(a, b)} strokeWidth="0.7" vectorEffect="non-scaling-stroke" />)}
            </svg>
            {slots.map((slot, index) => {
              const card = squad[index] ? cardsById.get(squad[index]!) : null
              return (
                <div key={`${formation}-${index}`} className="absolute z-20 -translate-x-1/2 -translate-y-1/2" style={{ left: `${slot.x}%`, top: `${slot.y}%` }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const id = event.dataTransfer.getData("text/card-id"); if (id) placeCard(id, index) }}>
                  <button type="button" draggable={Boolean(card)} onDragStart={(event) => { if (card) { event.dataTransfer.setData("text/card-id", card.id); event.dataTransfer.effectAllowed = "move" } }} onClick={() => setActiveSlot(index)} className={`relative flex h-24 w-16 items-center justify-center transition sm:h-32 sm:w-20 ${activeSlot === index ? "drop-shadow-[0_0_12px_rgba(252,211,77,.9)]" : "drop-shadow-[0_10px_10px_rgba(0,0,0,.55)]"}`} aria-label={`Select ${slot.position} slot`}>
                    {card ? <img src={card.approvedImageUrl!} alt={card.playerName} className="h-full w-full object-contain" /> : <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-white/45 bg-slate-950/65 text-sm font-semibold">{slot.position}</span>}
                  </button>
                  {card ? <button type="button" onClick={() => { setSquad((current) => current.map((id, i) => i === index ? null : id)); setActiveSlot(index) }} className="absolute -right-7 top-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-slate-950" title={`Remove ${card.playerName}`} aria-label={`Remove ${card.playerName}`}><X className="h-4 w-4" /></button> : null}
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400"><span><i className="mr-1 inline-block h-2 w-5 bg-green-500" />2-3 points</span><span><i className="mr-1 inline-block h-2 w-5 bg-amber-500" />1 point</span><span><i className="mr-1 inline-block h-2 w-5 bg-red-500" />0 points</span></div>
        </div>

        <aside className="relative border border-white/10 bg-slate-900/60 p-4">
          <div className="flex items-end justify-between"><div><h3 className="font-semibold">Collection</h3><p className="mt-1 text-xs text-slate-400">Base cards</p></div><span className="text-xs text-slate-400">{filteredCards.length}</span></div>
          <label className="mt-4 flex h-10 items-center gap-2 border border-white/10 bg-slate-950 px-3 focus-within:border-amber-300/50"><Search className="h-4 w-4 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-600" /></label>
          <div className="mt-4 grid max-h-[720px] grid-cols-5 gap-1.5 overflow-y-auto pr-1">
            {filteredCards.map((card) => <button key={card.id} type="button" draggable title={`${card.playerName} - OVR ${overall(card)}`} onMouseEnter={() => setPreviewCard(card)} onMouseLeave={() => setPreviewCard(null)} onFocus={() => setPreviewCard(card)} onBlur={() => setPreviewCard(null)} onDragStart={(event) => { setPreviewCard(null); event.dataTransfer.setData("text/card-id", card.id); event.dataTransfer.effectAllowed = "copyMove" }} onClick={() => chooseCard(card.id)} className={`min-w-0 bg-transparent text-left transition ${selectedIds.has(card.id) ? "drop-shadow-[0_0_6px_rgba(252,211,77,.9)]" : "opacity-90 hover:opacity-100"}`}><div className="aspect-[670/1080]"><img src={card.approvedImageUrl!} alt={`${card.playerName} card`} className="h-full w-full object-contain" /></div><div className="truncate px-0.5 pb-1 text-center text-[9px] font-medium text-slate-300">{card.playerName}</div></button>)}
          </div>
          {previewCard ? <div className="pointer-events-none fixed bottom-6 right-6 z-50 hidden w-64 border border-amber-300/40 bg-slate-950/95 p-2 shadow-2xl shadow-black/70 lg:block"><img src={previewCard.approvedImageUrl!} alt="" className="aspect-[670/1080] w-full object-contain" /><div className="mt-1 truncate text-center text-sm font-semibold text-white">{previewCard.playerName} <span className="text-amber-300">OVR {overall(previewCard)}</span></div></div> : null}
        </aside>
      </div>
    </section>
  )
}

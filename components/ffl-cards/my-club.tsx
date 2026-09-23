"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Trash2, X } from "lucide-react"
import type { ProfileCardGalleryItem } from "@/lib/services/profile-card-gallery.service"

const STORAGE_KEY = "ffl-cards-base-squad"
const slots = [
  { position: "ST", area: "attack" },
  { position: "CM", area: "midfield" },
  { position: "CM", area: "midfield" },
  { position: "CM", area: "midfield" },
  { position: "CB", area: "defence" },
  { position: "CB", area: "defence" },
  { position: "GK", area: "goalkeeper" },
] as const

function rating(card: ProfileCardGalleryItem) {
  return card.finalRating?.ovr || card.botRating.ovr
}

export function MyClub({ availableCards }: { availableCards: ProfileCardGalleryItem[] }) {
  const [squad, setSquad] = useState<Array<string | null>>(() => slots.map(() => null))
  const [activeSlot, setActiveSlot] = useState<number | null>(null)
  const [query, setQuery] = useState("")
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
      if (Array.isArray(stored)) {
        const availableIds = new Set(availableCards.map((card) => card.id))
        setSquad(slots.map((_, index) => availableIds.has(stored[index]) ? stored[index] : null))
      }
    } catch {}
    setLoaded(true)
  }, [availableCards])

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(squad))
  }, [loaded, squad])

  const cardsById = useMemo(() => new Map(availableCards.map((card) => [card.id, card])), [availableCards])
  const selectedIds = useMemo(() => new Set(squad.filter((id): id is string => Boolean(id))), [squad])
  const filteredCards = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return availableCards
    return availableCards.filter((card) =>
      card.playerName.toLowerCase().includes(normalized)
      || String(card.playerId || "").includes(normalized)
    )
  }, [availableCards, query])

  function chooseCard(cardId: string) {
    const existingSlot = squad.indexOf(cardId)
    if (existingSlot !== -1) {
      setActiveSlot(existingSlot)
      return
    }

    const target = activeSlot ?? squad.findIndex((id) => id === null)
    if (target === -1) return
    setSquad((current) => current.map((id, index) => index === target ? cardId : id))
    setActiveSlot(null)
  }

  function removeCard(index: number) {
    setSquad((current) => current.map((id, slotIndex) => slotIndex === index ? null : id))
    setActiveSlot(index)
  }

  return (
    <section className="mt-10">
      <div className="mb-5 flex items-end justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-semibold">My Club</h2>
          <p className="mt-1 text-sm text-slate-400">Build your seven from the unlocked base collection.</p>
        </div>
        <div className="text-sm text-amber-300">{availableCards.length} unlocked</div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <div className="border border-white/10 bg-slate-900/60 p-4 sm:p-6">
          <div className="mb-4 flex h-10 items-center justify-between">
            <div>
              <div className="font-semibold text-white">Squad Builder</div>
              <div className="text-xs text-slate-400">{selectedIds.size}/7 selected</div>
            </div>
            <button
              type="button"
              onClick={() => { setSquad(slots.map(() => null)); setActiveSlot(null) }}
              disabled={selectedIds.size === 0}
              className="flex h-9 w-9 items-center justify-center border border-white/10 text-slate-400 transition-colors hover:border-red-400/40 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30"
              title="Clear squad"
              aria-label="Clear squad"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="relative min-h-[680px] overflow-hidden border border-emerald-300/25 bg-emerald-950 p-5">
            <div className="pointer-events-none absolute inset-5 border border-white/15" />
            <div className="pointer-events-none absolute left-1/2 top-5 h-[calc(50%-20px)] w-px bg-white/15" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
            <div className="pointer-events-none absolute bottom-5 left-1/2 h-20 w-44 -translate-x-1/2 border border-b-0 border-white/15" />

            <div className="relative grid min-h-[638px] grid-rows-4 items-center gap-3">
              {(["attack", "midfield", "defence", "goalkeeper"] as const).map((area) => (
                <div key={area} className="flex items-center justify-center gap-3 sm:gap-5">
                  {slots.map((slot, index) => {
                    if (slot.area !== area) return null
                    const card = squad[index] ? cardsById.get(squad[index]!) : null
                    return (
                      <div key={index} className="relative">
                        <button
                          type="button"
                          onClick={() => setActiveSlot(index)}
                          className={`relative flex h-32 w-20 items-center justify-center overflow-hidden border bg-slate-950/85 transition-colors sm:h-40 sm:w-24 ${
                            activeSlot === index ? "border-amber-300 ring-2 ring-amber-300/25" : "border-white/20 hover:border-white/45"
                          }`}
                          aria-label={`Select ${slot.position} slot`}
                        >
                          {card ? (
                            <img src={card.approvedImageUrl!} alt={card.playerName} className="h-full w-full object-contain" />
                          ) : (
                            <span className="text-sm font-semibold text-slate-400">{slot.position}</span>
                          )}
                        </button>
                        {card ? (
                          <button
                            type="button"
                            onClick={() => removeCard(index)}
                            className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-slate-950 text-slate-300 hover:text-white"
                            title={`Remove ${card.playerName}`}
                            aria-label={`Remove ${card.playerName}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="border border-white/10 bg-slate-900/60 p-4 sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3 className="font-semibold text-white">Collection</h3>
              <p className="mt-1 text-xs text-slate-400">Base cards</p>
            </div>
            <span className="text-xs text-slate-400">{filteredCards.length}</span>
          </div>
          <label className="mt-4 flex h-10 items-center gap-2 border border-white/10 bg-slate-950 px-3 focus-within:border-amber-300/50">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search player"
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
            />
          </label>

          <div className="mt-4 grid max-h-[690px] grid-cols-2 gap-3 overflow-y-auto pr-1">
            {filteredCards.map((card) => {
              const selected = selectedIds.has(card.id)
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => chooseCard(card.id)}
                  className={`overflow-hidden border bg-slate-950 text-left transition-colors ${
                    selected ? "border-amber-300/70" : "border-white/10 hover:border-white/35"
                  }`}
                >
                  <div className="aspect-[670/1080]">
                    <img src={card.approvedImageUrl!} alt={`${card.playerName} card`} className="h-full w-full object-contain" />
                  </div>
                  <div className="border-t border-white/10 p-2">
                    <div className="truncate text-xs font-semibold text-white">{card.playerName}</div>
                    <div className="mt-1 text-[11px] text-slate-400">OVR {rating(card)}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>
      </div>
    </section>
  )
}

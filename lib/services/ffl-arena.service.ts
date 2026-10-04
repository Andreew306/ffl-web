import mongoose from 'mongoose'
import dbConnect from '@/lib/db/mongoose'
import { getAllApprovedBaseCards } from '@/lib/services/profile-card-gallery.service'
import { arenaFormations, type ArenaCard, type ArenaSquad } from '@/lib/ffl-arena'

export type SavedArenaSquad = { owner: string; name: string; formation: string; squad: (string | null)[]; updatedAt: Date }
export async function arenaDb() {
  await dbConnect()
  if (!mongoose.connection.db) throw new Error('Database unavailable')
  return mongoose.connection.db
}

export async function arenaCatalog() {
  const cards = await getAllApprovedBaseCards()
  return new Map(cards.map(card => [card.id, {
    id: card.id, playerName: card.playerName, position: card.position || '', country: card.country || '', teamId: card.teamId || '',
    image: card.approvedImageUrl || '', rating: card.finalRating || card.botRating,
  } satisfies ArenaCard]))
}

export function resolveArenaSquad(saved: SavedArenaSquad, catalog: Map<string, ArenaCard>, id: string): ArenaSquad | null {
  if (!arenaFormations.includes(saved.formation as typeof arenaFormations[number]) || saved.squad.length !== 7 || new Set(saved.squad).size !== 7) return null
  const cards = saved.squad.map(key => key ? catalog.get(key) : undefined)
  if (cards.some(card => !card)) return null
  const complete = cards as ArenaCard[]
  return { id, name: saved.name, formation: saved.formation, cards: complete, rating: complete.reduce((sum, c) => sum + Object.values(c.rating).reduce((a, b) => a + b, 0), 0) }
}

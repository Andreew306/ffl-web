import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { randomInt } from 'node:crypto'
import { ObjectId } from 'mongodb'
import { authOptions } from '@/lib/auth'
import { arenaDb, arenaCatalog, resolveArenaSquad, type SavedArenaSquad } from '@/lib/services/ffl-arena.service'
import { arenaFormations, simulateArena, type ArenaReplay } from '@/lib/ffl-arena'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.discordId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = await arenaDb()
  const owner = session.user.discordId
  const url = new URL(request.url)
  if (url.searchParams.get('replay')) {
    const id = url.searchParams.get('replay')!
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid match' }, { status: 400 })
    const match = await db.collection('fflarenamatches').findOne({ _id: new ObjectId(id), owner })
    return match ? NextResponse.json(match.replay) : NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }
  const saved = await db.collection<SavedArenaSquad>('fflarenasquads').findOne({ owner })
  if (url.searchParams.get('squad') === '1') return NextResponse.json({ saved: saved ? { formation: saved.formation, squad: saved.squad } : null })
  const catalog = await arenaCatalog()
  const own = saved ? resolveArenaSquad(saved, catalog, String(saved._id)) : null
  if (!own) return NextResponse.json({ own: null, rivals: [], history: [], nextPage: false })
  const query = (url.searchParams.get('q') || '').trim().slice(0, 80)
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const page = Math.floor(Math.max(0, Math.min(1000, Number(url.searchParams.get('page')) || 0)))
  const rows = await db.collection<SavedArenaSquad>('fflarenasquads').find({ owner: { $ne: owner }, squad: { $size: 7, $not: { $elemMatch: { $eq: null } } }, ...(query ? { name: { $regex: escaped, $options: 'i' } } : {}) }).sort({ updatedAt: -1, _id: -1 }).skip(page * 20).limit(21).toArray()
  const rivals = rows.slice(0, 20).map(row => resolveArenaSquad(row, catalog, String(row._id))).filter(Boolean)
  const history = await db.collection('fflarenamatches').find({ owner }).sort({ createdAt: -1 }).limit(15).project({ summary: 1 }).toArray()
  return NextResponse.json({ own, rivals, history: history.map(row => ({ id: String(row._id), ...row.summary })), nextPage: rows.length > 20 })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.discordId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const db = await arenaDb()
  const owner = session.user.discordId
  const squads = db.collection<SavedArenaSquad>('fflarenasquads')
  await squads.createIndex({ owner: 1 }, { unique: true })
  const catalog = await arenaCatalog()
  if (body.action === 'save') {
    if (!arenaFormations.includes(body.formation) || !Array.isArray(body.squad) || body.squad.length !== 7 || body.squad.some((id: unknown) => id !== null && (typeof id !== 'string' || !catalog.has(id))) || new Set(body.squad.filter(Boolean)).size !== body.squad.filter(Boolean).length) return NextResponse.json({ error: 'Invalid squad. Select seven different available cards.' }, { status: 400 })
    await squads.updateOne({ owner }, { $set: { owner, name: session.user.name || 'Player', formation: body.formation, squad: body.squad, updatedAt: new Date() } }, { upsert: true })
    return NextResponse.json({ ok: true })
  }
  if (body.action !== 'play' || typeof body.rivalId !== 'string' || !ObjectId.isValid(body.rivalId)) return NextResponse.json({ error: 'Invalid opponent' }, { status: 400 })
  const homeRow = await squads.findOne({ owner })
  const awayRow = await squads.findOne({ _id: new ObjectId(body.rivalId), owner: { $ne: owner } })
  const home = homeRow && resolveArenaSquad(homeRow, catalog, String(homeRow._id))
  const away = awayRow && resolveArenaSquad(awayRow, catalog, String(awayRow._id))
  if (!home || !away) return NextResponse.json({ error: 'Both squads must have seven available cards. Save your squad in My Club.' }, { status: 409 })
  // Atomic cooldown also prevents simultaneous requests from creating duplicate matches.
  const claim = await squads.updateOne({ owner, $or: [{ lastPlayedAt: { $exists: false } }, { lastPlayedAt: { $lt: new Date(Date.now() - 15000) } }] }, { $set: { lastPlayedAt: new Date() } })
  if (!claim.modifiedCount) return NextResponse.json({ error: 'Wait a few seconds before starting another match.' }, { status: 429 })
  const events = simulateArena(home, away, () => randomInt(0, 1000000) / 1000000)
  const id = new ObjectId()
  const createdAt = new Date()
  const replay: ArenaReplay = { id: String(id), home, away, events, createdAt: createdAt.toISOString() }
  await db.collection('fflarenamatches').insertOne({ _id: id, owner, createdAt, replay, summary: { home: home.name, away: away.name, score: events[events.length - 1].score, createdAt: createdAt.toISOString() } })
  return NextResponse.json(replay)
}

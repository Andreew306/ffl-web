import type { ArenaEvent, Point } from './ffl-arena'

export const motionStep = 1000 / 60

export function arenaTimeline(events: ArenaEvent[]) {
  const timed = events.some(e => e.durationMs !== undefined)
  const weights = events.slice(0, -1).map(e => e.durationMs ?? (e.fast ? 600 : 1200))
  const scale = timed ? 1 : 120000 / (weights.reduce((sum, w) => sum + w, 0) || 1)
  let at = 0
  return [0, ...weights.map(w => (at += w * scale))]
}

export function arenaOwners(events: ArenaEvent[]): Array<number | null> {
  let owner: number | null = null
  return events.map(event => {
    if (event.kind === 'pressure') return owner
    if (['pass', 'dribble', 'recovery', 'tackle', 'interception', 'kickoff', 'restart', 'windup', 'save', 'keeper-ball'].includes(event.kind) || (event.kind === 'shot' && event.durationMs !== undefined)) {
      owner = event.team * 7 + (event.kind === 'pass' ? event.target : event.actor)
    } else owner = null
    return owner
  })
}

function eventIndex(starts: number[], time: number) {
  let low = 0, high = starts.length - 1
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    if (starts[mid] <= time) low = mid
    else high = mid - 1
  }
  return low
}

// Integrate a persistent velocity on a fixed clock, independent of event boundaries.
// Coordinates are canvas pixels so horizontal and vertical speed have the same limit.
export function buildArenaMotion(events: ArenaEvent[], starts: number[], duration: number) {
  if (!events.length) return []
  const positions = events[0].players.map(p => ({ x: p.x * 9.4, y: p.y * 5.5 }))
  const velocities = positions.map(() => ({ x: 0, y: 0 }))
  const frames: Point[][] = [positions.map(p => ({ ...p }))]
  const owners = arenaOwners(events)
  let index = 0
  const dt = motionStep / 1000
  for (let frame = 1; frame <= Math.ceil(duration / motionStep); frame++) {
    const time = Math.min(duration, frame * motionStep + 250)
    while (index + 1 < starts.length && starts[index + 1] <= time) index++
    const next = Math.min(events.length - 1, index + 1)
    const span = starts[next] - starts[index]
    const t = span > 0 ? Math.min(1, (time - starts[index]) / span) : 1
    // Anticipate the moving target and keep supporting runs independent of the event clock.
    const targetPositions = positions.map((p, player) => {
      const a = events[index].players[player], b = events[next].players[player]
      const target = { x: (a.x + (b.x - a.x) * t) * 9.4, y: (a.y + (b.y - a.y) * t) * 5.5 }
      const owner = owners[index]
      const live = owner !== null && !['windup', 'shot', 'kickoff', 'save', 'keeper-ball', 'restart'].includes(events[index].kind)
      if (live && player % 7 !== 6 && player !== owner) {
        const carrier = positions[owner]
        const sameTeam = Math.floor(player / 7) === Math.floor(owner / 7)
        const direction = player < 7 ? 1 : -1
        if (sameTeam) {
          const run = time / 1000 * .9 + player * 1.7
          target.x += direction * (12 + 10 * Math.sin(run))
          target.y += (target.y >= carrier.y ? 1 : -1) * (14 + 8 * Math.sin(run * .7))
        } else {
          const proximity = Math.max(0, 1 - Math.hypot(p.x - carrier.x, p.y - carrier.y) / 210)
          target.x += (carrier.x - target.x) * proximity * .32
          target.y += (carrier.y - target.y) * proximity * .32
        }
      }
      // Soft separation changes steering, never the rendered position directly.
      positions.forEach((other, otherIndex) => {
        if (otherIndex === player) return
        const dx = p.x - other.x, dy = p.y - other.y
        const distance = Math.hypot(dx, dy)
        if (distance < 40) {
          const angle = player < otherIndex ? -1 : 1
          target.x += (distance > .01 ? dx / distance : angle) * (40 - distance) * .6
          target.y += (distance > .01 ? dy / distance : 0) * (40 - distance) * .6
        }
      })
      target.x = Math.max(18, Math.min(922, target.x))
      target.y = Math.max(18, Math.min(532, target.y))
      return target
    })
    positions.forEach((p, player) => {
      const a = events[index].players[player], b = events[next].players[player]
      const dx = targetPositions[player].x - p.x
      const dy = targetPositions[player].y - p.y
      const distance = Math.hypot(dx, dy)
      const desired = { x: dx * 2.4, y: dy * 2.4 }
      if (span > 0 && distance < 100) {
        desired.x += (b.x - a.x) * 9.4 / (span / 1000) * .4
        desired.y += (b.y - a.y) * 5.5 / (span / 1000) * .4
      }
      const desiredSpeed = Math.hypot(desired.x, desired.y)
      if (desiredSpeed > 85) { desired.x *= 85 / desiredSpeed; desired.y *= 85 / desiredSpeed }
      const velocity = velocities[player]
      const ax = desired.x - velocity.x, ay = desired.y - velocity.y
      const change = Math.hypot(ax, ay)
      const ratio = change ? Math.min(1, 160 * dt / change) : 0
      velocity.x += ax * ratio
      velocity.y += ay * ratio
      p.x += velocity.x * dt
      p.y += velocity.y * dt
    })
    frames.push(positions.map(p => ({ ...p })))
  }
  return frames
}

export function sampleArenaMotion(frames: Point[][], elapsed: number) {
  if (!frames.length) return []
  const at = Math.max(0, Math.min(frames.length - 1, elapsed / motionStep))
  const index = Math.floor(at), t = at - index
  return frames[index].map((a, player) => {
    const b = frames[Math.min(index + 1, frames.length - 1)][player]
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
  })
}

// Ball contact uses the same sampled trajectories as the chips, including during a dribble.
export function sampleArenaBall(events: ArenaEvent[], starts: number[], frames: Point[][], owners: Array<number | null>, elapsed: number) {
  const index = eventIndex(starts, elapsed), nextIndex = Math.min(events.length - 1, index + 1)
  const event = events[index], next = events[nextIndex]
  const span = starts[nextIndex] - starts[index]
  const progress = span > 0 ? Math.max(0, Math.min(1, (elapsed - starts[index]) / span)) : 0
  const contact = (owner: number, time: number): Point => {
    const point = sampleArenaMotion(frames, time)[owner]
    const direction = owner < 7 ? 1 : -1
    return { x: point.x + direction * (19 + Math.sin(time / 95 + owner) * 1.5), y: point.y + 6 }
  }
  const pointAt = (event: ArenaEvent, owner: number | null, time: number): Point => {
    if (owner !== null) return contact(owner, time)
    const net = ['goal', 'celebration', 'reset'].includes(event.kind) && (event.ball.x === 0 || event.ball.x === 100)
    return { x: event.ball.x * 9.4 + (net ? event.ball.x === 0 ? -12 : 12 : 0), y: event.ball.y * 5.5 }
  }
  const owner = owners[index], receiver = owners[nextIndex]
  const result = (p: Point, alpha = 1, trail: Point | null = null) => ({ ...p, alpha, trail })
  if (owner !== null && owner === receiver) return result(contact(owner, elapsed))
  const from = pointAt(event, owner, starts[index]), to = pointAt(next, receiver, starts[nextIndex])
  if (event.kind === 'reset' && next.kind === 'kickoff') return result(progress < .5 ? from : to, Math.abs(progress * 2 - 1))
  const shot = event.kind === 'shot' && event.durationMs !== undefined
  // A short carry precedes the pass; travel time follows distance, with no mid-air stop.
  const flightMs = shot ? span : Math.min(span, Math.max(180, Math.hypot(to.x - from.x, to.y - from.y) / 480 * 1000))
  const releaseAt = starts[nextIndex] - flightMs
  if (!shot && owner !== null && elapsed < releaseAt) return result(contact(owner, elapsed))
  const release = owner !== null ? contact(owner, shot ? starts[index] : releaseAt) : from
  const flight = shot ? progress : flightMs > 0 ? Math.max(0, Math.min(1, (elapsed - releaseAt) / flightMs)) : 1
  const p = { x: release.x + (to.x - release.x) * flight, y: release.y + (to.y - release.y) * flight - Math.sin(flight * Math.PI) * (shot ? 7 : 3) }
  const trail = shot || next.kind === 'pass' ? { x: p.x - (to.x - release.x) * .035, y: p.y - (to.y - release.y) * .035 } : null
  return result(p, 1, trail)
}

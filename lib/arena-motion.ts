import type { ArenaEvent, Point } from './ffl-arena'

export const motionStep = 1000 / 60

// Integrate a persistent velocity on a fixed clock, independent of event boundaries.
// Coordinates are canvas pixels so horizontal and vertical speed have the same limit.
export function buildArenaMotion(events: ArenaEvent[], starts: number[], duration: number) {
  if (!events.length) return []
  const positions = events[0].players.map(p => ({ x: p.x * 9.4, y: p.y * 5.5 }))
  const velocities = positions.map(() => ({ x: 0, y: 0 }))
  const frames: Point[][] = [positions.map(p => ({ ...p }))]
  let index = 0
  const dt = motionStep / 1000
  for (let frame = 1; frame <= Math.ceil(duration / motionStep); frame++) {
    const time = Math.min(duration, frame * motionStep + 250)
    while (index + 1 < starts.length && starts[index + 1] <= time) index++
    const next = Math.min(events.length - 1, index + 1)
    const span = starts[next] - starts[index]
    const t = span > 0 ? Math.min(1, (time - starts[index]) / span) : 1
    positions.forEach((p, player) => {
      const a = events[index].players[player], b = events[next].players[player]
      const dx = (a.x + (b.x - a.x) * t) * 9.4 - p.x
      const dy = (a.y + (b.y - a.y) * t) * 5.5 - p.y
      const distance = Math.hypot(dx, dy)
      const speed = Math.min(85, distance * 3)
      const desired = distance ? { x: dx / distance * speed, y: dy / distance * speed } : { x: 0, y: 0 }
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

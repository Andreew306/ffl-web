export const arenaFormations = ['1-3-2-1', '1-3-1-2', '1-2-1-3', '1-2-2-2', '1-1-2-3', '1-1-3-2'] as const
export type ArenaCard = { id: string; playerName: string; position: string; country: string; teamId: string; image: string; rating: { ovr: number; sho: number; pas: number; def: number; dri: number } }
export type ArenaSquad = { id: string; name: string; formation: string; cards: ArenaCard[]; rating: number }
export type Point = { x: number; y: number }
export type ArenaEvent = { kind: string; text: string; team: number; actor: number; target: number; ball: Point; players: Point[]; score: number[] }
export type ArenaReplay = { id: string; home: ArenaSquad; away: ArenaSquad; events: ArenaEvent[]; createdAt: string }

export function arenaSlots(formation: string) {
  const [, d, m, a] = formation.split('-').map(Number)
  return [
    { positions: a === 1 ? ['ST'] : a === 2 ? ['LW', 'RW'] : ['LW', 'ST', 'RW'], x: 66 },
    { positions: Array(m).fill('CM') as string[], x: 44 },
    { positions: Array(d).fill('CB') as string[], x: 25 },
    { positions: ['GK'], x: 8 },
  ].flatMap(row => row.positions.map((position, i) => ({ position, x: row.x, y: (i + 1) * 100 / (row.positions.length + 1) })))
}

export function inPosition(actual: string, slot: string) {
  return actual === slot || (['LW', 'RW'].includes(actual) && ['LW', 'RW'].includes(slot))
}

// Server supplies the random source. A fixed source makes replays and tests reproducible.
export function simulateArena(home: ArenaSquad, away: ArenaSquad, random: () => number): ArenaEvent[] {
  const squads = [home, away]
  const slots = squads.map(s => arenaSlots(s.formation))
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
  const score = [0, 0]
  const events: ArenaEvent[] = []
  let team = random() < .5 ? 0 : 1
  let actor = 3
  let ball: Point = { x: 50, y: 50 }
  const attribute = (side: number, index: number, key: keyof ArenaCard['rating']) => {
    const card = squads[side].cards[index]
    const fit = inPosition(card.position, slots[side][index].position) ? 1 : .84
    return card.rating[key] * fit
  }
  const positions = (celebrate = false) => slots.flatMap((line, side) => line.map((slot, i) => {
    const baseX = side === 0 ? slot.x : 100 - slot.x
    const mobility = squads[side].cards[i].rating.dri / 100
    if (celebrate && side === team && i !== 6) return { x: clamp(ball.x + (random() - .5) * 10, 5, 95), y: clamp(ball.y + (random() - .5) * 12, 8, 92) }
    return { x: clamp(baseX + (ball.x - 50) * (i === 6 ? .04 : .22) + (random() - .5) * 6 * mobility, 5, 95), y: clamp(slot.y + (ball.y - 50) * .12 + (random() - .5) * 6, 7, 93) }
  }))
  const emit = (kind: string, text: string, target = actor, celebrate = false) => {
    const players = positions(celebrate)
    if (!['goal', 'miss', 'shot', 'celebration', 'fulltime'].includes(kind)) players[team * 7 + target] = { ...ball }
    events.push({ kind, text, team, actor, target, ball: { ...ball }, players, score: [...score] })
  }
  const kickoff = () => { ball = { x: 50, y: 50 }; actor = Math.min(3, 5); emit('kickoff', `${squads[team].name}: saque de centro.`) }
  kickoff()
  // Around 60 actions, rendered over two minutes. Outcome is never selected in advance.
  for (let step = 0; step < 60; step++) {
    const opponent = 1 - team
    const defender = 3 + Math.floor(random() * 3)
    const player = squads[team].cards[actor]
    const progress = team === 0 ? ball.x : 100 - ball.x
    if (progress > 62 && random() < .4 + attribute(team, actor, 'sho') / 400) {
      const origin = { ...ball }
      ball = { x: team === 0 ? 98 : 2, y: 43 + random() * 14 }
      emit('shot', `${player.playerName} dispara a puerta.`)
      const shooting = attribute(team, actor, 'sho') * .85 + attribute(team, actor, 'ovr') * .15
      const keeping = attribute(opponent, 6, 'def') * .85 + attribute(opponent, 6, 'ovr') * .15
      const goalChance = clamp(.23 + (shooting - keeping) / 170 + (progress - 70) / 180, .08, .65)
      if (random() < goalChance) {
        score[team]++
        emit('goal', `GOL de ${player.playerName}! ${score[0]} - ${score[1]}.`)
        emit('celebration', `${squads[team].name} celebra el gol.`, actor, true)
        team = opponent
        kickoff()
      } else if (random() < .7) {
        team = opponent; actor = 6; ball = { x: team === 0 ? 8 : 92, y: 50 }
        emit('save', `${squads[team].cards[6].playerName} detiene el disparo.`)
      } else {
        ball.y = random() < .5 ? 30 : 70
        emit('miss', `${player.playerName} dispara fuera.`)
        team = opponent; actor = 6; ball = { x: team === 0 ? 8 : 92, y: origin.y }
        emit('restart', `${squads[team].cards[6].playerName} saca de puerta.`)
      }
      continue
    }
    const dribble = actor !== 6 && random() < .18 + attribute(team, actor, 'dri') / 330
    if (dribble) {
      const chance = clamp(.58 + (attribute(team, actor, 'dri') - attribute(opponent, defender, 'def')) / 160, .2, .88)
      if (random() < chance) {
        ball = { x: clamp(ball.x + (team === 0 ? 1 : -1) * (8 + random() * 12), 8, 92), y: clamp(ball.y + (random() - .5) * 22, 10, 90) }
        emit('dribble', `${player.playerName} supera a ${squads[opponent].cards[defender].playerName}.`)
      } else {
        team = opponent; actor = defender
        emit('tackle', `${squads[team].cards[actor].playerName} recupera el balon.`)
      }
    } else {
      const candidates = [0, 1, 2, 3, 4, 5].filter(i => i !== actor)
      const target = candidates[Math.floor(random() * candidates.length)]
      const receiver = squads[team].cards[target]
      const chemistry = Number(Boolean(player.country && player.country === receiver.country)) + Number(Boolean(player.teamId && player.teamId === receiver.teamId))
      const chance = clamp(.74 + (attribute(team, actor, 'pas') - attribute(opponent, defender, 'def')) / 190 + chemistry * .035, .35, .96)
      const destination = slots[team][target]
      ball = { x: clamp((team === 0 ? destination.x : 100 - destination.x) + (team === 0 ? 1 : -1) * random() * 18, 10, 90), y: destination.y }
      if (random() < chance) {
        emit('pass', `${player.playerName} conecta con ${receiver.playerName}.`, target)
        actor = target
      } else {
        team = opponent; actor = defender
        emit('interception', `${squads[team].cards[actor].playerName} intercepta el pase de ${player.playerName}.`)
      }
    }
  }
  emit('fulltime', `Final: ${home.name} ${score[0]} - ${score[1]} ${away.name}.`)
  return events
}

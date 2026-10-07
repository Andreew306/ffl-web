export const arenaFormations = ['1-3-2-1', '1-3-1-2', '1-2-1-3', '1-2-2-2', '1-1-2-3', '1-1-3-2'] as const
export type ArenaCard = { id: string; playerName: string; position: string; country: string; teamId: string; image: string; rating: { ovr: number; sho: number; pas: number; def: number; dri: number } }
export type ArenaSquad = { id: string; name: string; formation: string; cards: ArenaCard[]; rating: number }
export type Point = { x: number; y: number }
// minute and fast were added by engine 2; replays saved before it have neither.
export type ArenaEvent = { kind: string; text: string; team: number; actor: number; target: number; ball: Point; players: Point[]; score: number[]; minute?: number; fast?: boolean }
export type ArenaReplay = { id: string; home: ArenaSquad; away: ArenaSquad; events: ArenaEvent[]; createdAt: string; engine?: number }

type Stat = keyof ArenaCard['rating']
type Line = 'gk' | 'def' | 'mid' | 'att'

export const arenaEngineVersion = 2

// Sector model (see "FFL Arena Engine v2 - Sector Model"). Every value here is tuned by scripts/arena-balance.cjs.
export const arenaTuning = {
  phases: 16,
  k: 1.7,
  lambda: 1,
  laneFocus: .8,
  counterRate: .2,
  counterDefence: .8,
  goalBase: .34,
  goalScale: 150,
  goalMin: .12,
  goalMax: .6,
  saveShare: .65,
  chemistryBonus: .05,
  mix: {
    mid: { pas: .45, dri: .2, def: .25, ovr: .15 },
    att: { sho: .4, dri: .35, pas: .25 },
    def: { def: .6, dri: .15, ovr: .2 },
    keeper: { def: .6, ovr: .4 },
    shot: { sho: .75, ovr: .25 },
  } as Record<'mid' | 'att' | 'def' | 'keeper' | 'shot', Partial<Record<Stat, number>>>,
  lines: {
    att: { mid: .4, att: .9, def: .2 },
    mid: { mid: .8, att: .35, def: .3 },
    def: { mid: .3, att: .1, def: 1.25 },
    gk: { mid: .15, att: 0, def: 0 },
  } as Record<Line, { mid: number; att: number; def: number }>,
  // Share of a slot's attack and defence in the top, centre and bottom lanes, by slot height.
  coverage: [[.7, .3, 0], [.2, .6, .2], [0, .3, .7]],
  // A player alone in their line roams the width.
  loneCoverage: [.3, .55, .3],
}
export type ArenaTuning = typeof arenaTuning

export function arenaSlots(formation: string) {
  const [, d, m, a] = formation.split('-').map(Number)
  return [
    { positions: a === 1 ? ['ST'] : a === 2 ? ['LW', 'RW'] : ['LW', 'ST', 'RW'], x: 66 },
    { positions: Array(m).fill('CM') as string[], x: 44 },
    { positions: Array(d).fill('CB') as string[], x: 25 },
    { positions: ['GK'], x: 8 },
  ].flatMap(row => row.positions.map((position, i) => ({ position, x: row.x, y: (i + 1) * 100 / (row.positions.length + 1) })))
}

const lineOf = (position: string): Line | null => position === 'GK' ? 'gk' : ['CB', 'LB', 'RB'].includes(position) ? 'def' : ['CM', 'DM', 'AM'].includes(position) ? 'mid' : ['LW', 'RW', 'ST'].includes(position) ? 'att' : null
const lineOrder: Record<Line, number> = { gk: 0, def: 1, mid: 2, att: 3 }
const laneOf = (y: number) => y < 40 ? 0 : y <= 60 ? 1 : 2

export function positionFit(actual: string, slot: string) {
  if (actual === slot || (['LW', 'RW'].includes(actual) && ['LW', 'RW'].includes(slot))) return 1
  const a = lineOf(actual), s = lineOf(slot)
  if (!a || !s) return .85
  if (a === 'gk' || s === 'gk') return .5
  if (a === s) return .95
  return Math.abs(lineOrder[a] - lineOrder[s]) === 1 ? .85 : .7
}

// Chemistry links as drawn in My Club: neighbours in the same line (not winger to winger) and the nearest slot in the next line.
export function arenaLinks(formation: string) {
  const slots = arenaSlots(formation).map((slot, index) => ({ ...slot, index }))
  const lines = Array.from(new Set(slots.map(slot => slot.x))).map(x => slots.filter(slot => slot.x === x))
  const links: Array<[number, number]> = []
  for (const line of lines) for (let first = 0; first < line.length; first++) for (let second = first + 1; second < line.length; second++) {
    if (line[first].position === 'LW' && line[second].position === 'RW') continue
    links.push([line[first].index, line[second].index])
  }
  for (let row = 0; row < lines.length - 1; row++) {
    const upper = lines[row], lower = lines[row + 1]
    const nearest = (slot: typeof slots[number], candidates: typeof slots) => { const min = Math.min(...candidates.map(c => Math.abs(c.y - slot.y))); return candidates.filter(c => Math.abs(c.y - slot.y) - min < 1e-9) }
    for (const player of upper) for (const other of nearest(player, lower)) links.push([player.index, other.index])
    for (const player of lower) for (const other of nearest(player, upper)) if (!links.some(([a, b]) => a === other.index && b === player.index)) links.push([other.index, player.index])
  }
  return links
}

type LinkCard = { position?: string; country?: string; teamId?: string }
// 0 to 3: +1 both in position (-1 otherwise), +1 same country, +1 same club. My Club colours links by this.
export function arenaLinkPoints(first: LinkCard, second: LinkCard, firstSlot: string, secondSlot: string) {
  const inPosition = positionFit((first.position || '').toUpperCase(), firstSlot) === 1 && positionFit((second.position || '').toUpperCase(), secondSlot) === 1
  const sameCountry = Boolean(first.country && second.country && first.country.trim().toLowerCase() === second.country.trim().toLowerCase())
  const sameTeam = Boolean(first.teamId && first.teamId === second.teamId)
  return Math.max(0, (inPosition ? 1 : -1) + Number(sameCountry) + Number(sameTeam))
}

// 0 to 1. Only shared country or club counts, and only between players in position.
export function arenaChemistry(squad: ArenaSquad) {
  const slots = arenaSlots(squad.formation)
  const links = arenaLinks(squad.formation)
  const score = links.reduce((sum, [a, b]) => sum + Math.max(0, arenaLinkPoints(squad.cards[a], squad.cards[b], slots[a].position, slots[b].position) - 1) / 2, 0)
  return links.length ? score / links.length : 0
}

export type SectorRatings = { midfield: number; attack: number[]; defence: number[]; keeper: number; chemistry: number; players: { fit: number; mid: number; attack: number[]; defence: number[] }[] }

export function sectorRatings(squad: ArenaSquad, tuning: ArenaTuning = arenaTuning): SectorRatings {
  const slots = arenaSlots(squad.formation)
  const mix = (card: ArenaCard, weights: Partial<Record<Stat, number>>) => Object.entries(weights).reduce((sum, [key, weight]) => sum + card.rating[key as Stat] * weight!, 0)
  const chemistry = arenaChemistry(squad)
  const boost = 1 + tuning.chemistryBonus * chemistry
  const players = squad.cards.map((card, i) => {
    const slot = slots[i]
    const alone = slots.filter(other => other.x === slot.x).length === 1
    const weights = tuning.lines[lineOf(slot.position)!]
    const fit = positionFit(card.position, slot.position) * boost
    const cover = alone ? tuning.loneCoverage : tuning.coverage[laneOf(slot.y)]
    return {
      fit,
      mid: fit * weights.mid * mix(card, tuning.mix.mid),
      attack: cover.map(share => fit * weights.att * share * mix(card, tuning.mix.att)),
      defence: cover.map(share => fit * weights.def * share * mix(card, tuning.mix.def)),
    }
  })
  const total = (value: (player: SectorRatings['players'][number]) => number) => players.reduce((sum, player) => sum + value(player), 0)
  const keeper = squad.cards[6]
  return {
    midfield: total(p => p.mid),
    attack: [0, 1, 2].map(lane => total(p => p.attack[lane])),
    defence: [0, 1, 2].map(lane => total(p => p.defence[lane])),
    keeper: positionFit(keeper.position, 'GK') * boost * mix(keeper, tuning.mix.keeper),
    chemistry,
    players,
  }
}

// Server supplies the random source. A fixed source makes replays and tests reproducible.
export function simulateArena(home: ArenaSquad, away: ArenaSquad, random: () => number, tuning: ArenaTuning = arenaTuning): ArenaEvent[] {
  const squads = [home, away]
  const slots = squads.map(s => arenaSlots(s.formation))
  const ratings = squads.map(s => sectorRatings(s, tuning))
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
  const toward = (side: number, depth: number) => side === 0 ? depth : 100 - depth
  const contest = (a: number, b: number) => a + b > 0 ? a ** tuning.k / (a ** tuning.k + b ** tuning.k) : .5
  const pick = (weights: number[], skip = -1) => {
    const options = weights.map((w, i) => i === skip ? 0 : w)
    let roll = random() * options.reduce((a, b) => a + b, 0)
    for (let i = 0; i < options.length; i++) if (options[i] > 0 && (roll -= options[i]) < 0) return i
    return weights.indexOf(Math.max(...weights))
  }
  const name = (side: number, index: number) => squads[side].cards[index].playerName
  const laneY = [25, 50, 75]
  const score = [0, 0]
  const events: ArenaEvent[] = []
  let ball: Point = { x: 50, y: 50 }
  let minute = 0
  const positions = (team: number, celebrate: boolean) => slots.flatMap((line, side) => line.map((slot, i) => {
    const baseX = toward(side, slot.x + (side === team ? 6 : -4))
    const mobility = squads[side].cards[i].rating.dri / 100
    if (celebrate && side === team && i !== 6) return { x: clamp(ball.x + (random() - .5) * 10, 5, 95), y: clamp(ball.y + (random() - .5) * 12, 8, 92) }
    return { x: clamp(baseX + (ball.x - 50) * (i === 6 ? .04 : .22) + (random() - .5) * 6 * mobility, 5, 95), y: clamp(slot.y + (ball.y - 50) * .12 + (random() - .5) * 6, 7, 93) }
  }))
  const emit = (kind: string, text: string, team: number, actor: number, target = actor, fast = false, celebrate = false) => {
    const players = positions(team, celebrate)
    if (!['goal', 'miss', 'shot', 'celebration', 'fulltime'].includes(kind)) players[team * 7 + target] = { ...ball }
    events.push({ kind, text, team, actor, target, ball: { ...ball }, players, score: [...score], minute, ...(fast ? { fast } : {}) })
  }
  const kickoff = (team: number) => {
    ball = { x: 50, y: 50 }
    emit('kickoff', `${squads[team].name}: saque de centro.`, team, pick(ratings[team].players.map(p => p.mid)))
  }
  const shoot = (team: number, shooter: number, fast: boolean) => {
    const opponent = 1 - team
    const card = squads[team].cards[shooter]
    const quality = (card.rating.sho * (tuning.mix.shot.sho ?? 0) + card.rating.ovr * (tuning.mix.shot.ovr ?? 0)) * ratings[team].players[shooter].fit
    const goalChance = clamp(tuning.goalBase + (quality - ratings[opponent].keeper) / tuning.goalScale, tuning.goalMin, tuning.goalMax)
    const originY = ball.y
    ball = { x: toward(team, 98), y: 43 + random() * 14 }
    emit('shot', `${card.playerName} dispara a puerta.`, team, shooter, shooter, fast)
    if (random() < goalChance) {
      score[team]++
      emit('goal', `GOL de ${card.playerName}! ${score[0]} - ${score[1]}.`, team, shooter)
      emit('celebration', `${squads[team].name} celebra el gol.`, team, shooter, shooter, false, true)
      kickoff(opponent)
    } else if (random() < tuning.saveShare) {
      ball = { x: toward(opponent, 8), y: 50 }
      emit('save', `${name(opponent, 6)} detiene el disparo.`, opponent, 6)
    } else {
      ball.y = random() < .5 ? 30 : 70
      emit('miss', `${card.playerName} dispara fuera.`, team, shooter)
      ball = { x: toward(opponent, 8), y: originY }
      emit('restart', `${name(opponent, 6)} saca de puerta.`, opponent, 6)
    }
  }
  // The lane's attack against the opponent's defence in the same lane. Returns the defender who stopped it, or -1.
  const attack = (team: number, carrier: number, lane: number, defenceFactor: number, fast: boolean) => {
    const opponent = 1 - team
    if (random() < contest(ratings[team].attack[lane], tuning.lambda * defenceFactor * ratings[opponent].defence[lane])) {
      const shooter = pick(ratings[team].players.map(p => p.attack[lane]))
      if (shooter === carrier) {
        ball = { x: toward(team, 74 + random() * 10), y: clamp(ball.y + (random() - .5) * 14, 10, 90) }
        emit('dribble', `${name(team, carrier)} se va de su marca.`, team, carrier, carrier, fast)
      } else {
        ball = { x: toward(team, 72 + random() * 10), y: laneY[lane] + (random() - .5) * 16 }
        emit('pass', `${name(team, carrier)} conecta con ${name(team, shooter)}.`, team, carrier, shooter, fast)
      }
      shoot(team, shooter, fast)
      return -1
    }
    const defender = pick(ratings[opponent].players.map(p => p.defence[lane]))
    if (random() < .5) emit('tackle', `${name(opponent, defender)} le roba el balon a ${name(team, carrier)}.`, opponent, defender, defender, fast)
    else emit('interception', `${name(opponent, defender)} corta el avance de ${name(team, carrier)}.`, opponent, defender, defender, fast)
    return defender
  }
  kickoff(random() < .5 ? 0 : 1)
  for (let phase = 0; phase < tuning.phases; phase++) {
    minute = Math.min(89, Math.floor((phase + .15 + random() * .7) * 90 / tuning.phases))
    const team = random() < contest(ratings[0].midfield, ratings[1].midfield) ? 0 : 1
    const own = ratings[team]
    const winner = pick(own.players.map(p => p.mid))
    ball = { x: toward(team, 40 + random() * 15), y: 30 + random() * 40 }
    emit('recovery', `${name(team, winner)} gana la posesion en el medio.`, team, winner)
    // Teams lean toward the lane where their attack has the best odds against that lane's defence.
    const odds = own.attack.map((a, l) => contest(a, tuning.lambda * ratings[1 - team].defence[l]))
    const totalOdds = odds.reduce((a, b) => a + b, 0) || 1
    const lane = pick(odds.map(o => (1 - tuning.laneFocus) / 3 + tuning.laneFocus * o / totalOdds))
    const carrier = pick(own.players.map(p => p.attack[lane]), winner)
    ball = { x: toward(team, 58 + random() * 10), y: laneY[lane] + (random() - .5) * 16 }
    emit('pass', `${name(team, winner)} abre el juego para ${name(team, carrier)} ${lane === 1 ? 'por el centro' : 'por la banda'}.`, team, winner, carrier)
    const defender = attack(team, carrier, lane, 1, false)
    if (defender < 0 || random() >= tuning.counterRate) continue
    const opponent = 1 - team
    const runner = pick(ratings[opponent].players.map(p => p.attack[lane]), defender)
    ball = { x: toward(opponent, 60 + random() * 8), y: laneY[lane] + (random() - .5) * 16 }
    emit('pass', `Contraataque! ${name(opponent, defender)} lanza a ${name(opponent, runner)}.`, opponent, defender, runner, true)
    attack(opponent, runner, lane, tuning.counterDefence, true)
  }
  minute = 90
  emit('fulltime', `Final: ${home.name} ${score[0]} - ${score[1]} ${away.name}.`, 0, 0)
  return events
}

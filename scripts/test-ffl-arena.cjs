const fs = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const ts = require('typescript')
const output = ts.transpileModule(fs.readFileSync('lib/ffl-arena.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const sandbox = { exports: {} }
vm.runInNewContext(output, sandbox)
const { simulateArena, arenaSlots, arenaFormations, positionFit, sectorRatings, arenaChemistry, arenaLinks } = sandbox.exports
const rng = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
function squad(value, formation = '1-2-2-2', chem = true) {
  return { id: String(value), name: `Team ${value}`, formation, cards: arenaSlots(formation).map((slot, i) => ({ id: String(i), playerName: `Player ${i}`, position: slot.position, country: chem ? 'ES' : `C${i}`, teamId: chem ? 'team' : `T${i}`, rating: { ovr: value, sho: value, pas: value, def: value, dri: value } })) }
}
assert.equal(positionFit('RW', 'LW'), 1)
assert.equal(positionFit('ST', 'LW'), .95)
assert.equal(positionFit('CM', 'CB'), .85)
assert.equal(positionFit('CB', 'ST'), .7)
assert.equal(positionFit('ST', 'GK'), .5)
// Same links My Club draws: LW and RW are not linked to each other; each player links to the one directly behind.
assert.equal(JSON.stringify(arenaLinks('1-2-2-2')), JSON.stringify([[2, 3], [4, 5], [0, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 6]]))
assert.equal(arenaLinks('1-1-3-2').length, 11)
assert.equal(arenaChemistry(squad(80)), 1)
assert.equal(arenaChemistry(squad(80, '1-2-2-2', false)), 0)
const flat = sectorRatings(squad(80))
assert.ok(flat.attack[0] === flat.attack[2] && flat.defence[0] === flat.defence[2], 'Symmetric formations rate both flanks equally')
assert.ok(sectorRatings(squad(80, '1-3-2-1')).defence[1] > sectorRatings(squad(80, '1-1-2-3')).defence[1], 'More defenders defend the centre better')
assert.ok(sectorRatings(squad(80, '1-1-2-3')).attack[1] > sectorRatings(squad(80, '1-3-2-1')).attack[1], 'More attackers attack better')
assert.ok(sectorRatings(squad(80, '1-1-3-2')).midfield > sectorRatings(squad(80, '1-2-1-3')).midfield, 'More midfielders win more midfield')
for (const formation of arenaFormations) {
  assert.equal(arenaSlots(formation).length, 7)
  const home = squad(85, formation), away = squad(75)
  const events = simulateArena(home, away, rng(42))
  assert.equal(JSON.stringify(events), JSON.stringify(simulateArena(home, away, rng(42))))
  assert.equal(events[0].kind, 'kickoff')
  assert.equal(events.at(-1).kind, 'fulltime')
  assert.equal(events.at(-1).minute, 90)
  events.reduce((last, event) => { assert.ok(event.minute >= last, 'Minutes never go backwards'); return event.minute }, 0)
  for (const event of events) {
    assert.equal(event.players.length, 14)
    for (const point of [...event.players, event.ball]) assert.ok(point.x >= 0 && point.x <= 100 && point.y >= 0 && point.y <= 100)
  }
  for (const side of [0, 1]) assert.equal(events.at(-1).score[side], events.filter(e => e.kind === 'goal' && e.team === side).length)
}
let strongerWins = 0, weakerWins = 0, draws = 0
for (let seed = 1; seed <= 500; seed++) {
  const [a, b] = simulateArena(squad(90), squad(65), rng(seed)).at(-1).score
  if (a > b) strongerWins++; else if (a < b) weakerWins++; else draws++
}
assert.ok(strongerWins > weakerWins, 'Higher attributes must confer an advantage')
assert.ok(weakerWins + draws > 0, 'Weaker squads must still be able to take points')
console.log({ strongerWins, weakerWins, draws, checked: 'six formations, deterministic replay, minutes, bounds and scores' })
const service = { exports: {}, require: name => name === '@/lib/ffl-arena' ? sandbox.exports : {} }
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/services/ffl-arena.service.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, service)
const catalog = new Map(squad(80).cards.map(c => [c.id, c]))
const saved = { name: 'Test', formation: '1-2-2-2', squad: ['0', '1', '2', '3', '4', '5', '6'] }
assert.ok(service.exports.resolveArenaSquad(saved, catalog, 'test'))
assert.equal(service.exports.resolveArenaSquad({ ...saved, squad: ['0', '1', '2', '3', '4', '5', null] }, catalog, 'test'), null)
assert.equal(service.exports.resolveArenaSquad({ ...saved, squad: ['0', '1', '2', '3', '4', '5', '5'] }, catalog, 'test'), null)
assert.equal(service.exports.resolveArenaSquad({ ...saved, formation: 'invalid' }, catalog, 'test'), null)
catalog.delete('6')
assert.equal(service.exports.resolveArenaSquad(saved, catalog, 'test'), null)
console.log('Incomplete, duplicate, unavailable cards and invalid formations rejected')

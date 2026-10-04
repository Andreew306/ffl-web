const fs = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const ts = require('typescript')
const output = ts.transpileModule(fs.readFileSync('lib/ffl-arena.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const sandbox = { exports: {} }
vm.runInNewContext(output, sandbox)
const { simulateArena, arenaSlots, arenaFormations, inPosition } = sandbox.exports
const rng = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
function squad(value, formation = '1-2-2-2') {
  return { id: String(value), name: `Team ${value}`, formation, cards: arenaSlots(formation).map((slot, i) => ({ id: String(i), playerName: `Player ${i}`, position: slot.position, country: 'ES', teamId: 'team', rating: { ovr: value, sho: value, pas: value, def: value, dri: value } })) }
}
assert.ok(inPosition('RW', 'LW'))
assert.ok(!inPosition('CM', 'ST'))
for (const formation of arenaFormations) {
  assert.equal(arenaSlots(formation).length, 7)
  const home = squad(85, formation), away = squad(75)
  const events = simulateArena(home, away, rng(42))
  assert.equal(JSON.stringify(events), JSON.stringify(simulateArena(home, away, rng(42))))
  assert.equal(events[0].kind, 'kickoff')
  assert.equal(events.at(-1).kind, 'fulltime')
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
assert.ok(weakerWins > 0, 'Weaker squads must still be able to win')
console.log({ strongerWins, weakerWins, draws, checked: 'six formations, deterministic replay, bounds and scores' })
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

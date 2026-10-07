// Balance checks for the FFL Arena engine. Exits 1 when a target fails.
// node scripts/arena-balance.cjs [--tuning '{"k":2.5,"lines":{"mid":{"mid":.9}}}'] [--matches 3000]
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const output = ts.transpileModule(fs.readFileSync('lib/ffl-arena.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const sandbox = { exports: {} }
vm.runInNewContext(output, sandbox)
const { simulateArena, arenaSlots, arenaFormations, arenaTuning } = sandbox.exports

const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined }
const merge = (base, patch) => Object.fromEntries(Object.entries(base).map(([k, v]) => [k, patch && k in patch ? (v && typeof v === 'object' && !Array.isArray(v) ? merge(v, patch[k]) : patch[k]) : v]))
const tuning = merge(arenaTuning, JSON.parse(arg('--tuning') || '{}'))
const N = Number(arg('--matches')) || 3000
const stats = ['ovr', 'sho', 'pas', 'def', 'dri']
const lineOf = position => position === 'GK' ? 'gk' : position === 'CB' ? 'def' : position === 'CM' ? 'mid' : 'att'

function squad(name, formation, stats, { chem = true } = {}) {
  return {
    id: name, name, formation, rating: 0,
    cards: arenaSlots(formation).map((slot, i) => {
      const r = typeof stats === 'function' ? stats(slot, i) : stats
      return { id: name + i, playerName: 'P' + i, position: slot.position, country: chem ? 'ES' : 'C' + i, teamId: chem ? 'T' : 'T' + i, image: '', rating: typeof r === 'number' ? { ovr: r, sho: r, pas: r, def: r, dri: r } : r }
    }),
  }
}
const flat = (value, patch = {}) => ({ ovr: value, sho: value, pas: value, def: value, dri: value, ...patch })

// Fixed seed per duel, alternating home and away, so results are reproducible.
function duel(a, b, matches = N) {
  let seed = 12345, w = 0, d = 0, l = 0, goals = 0
  const rng = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
  for (let k = 0; k < matches; k++) {
    const flip = k % 2
    const s = simulateArena(flip ? b : a, flip ? a : b, rng, tuning).at(-1).score
    const x = flip ? s[1] : s[0], y = flip ? s[0] : s[1]
    goals += x + y
    if (x > y) w++; else if (x < y) l++; else d++
  }
  const win = 100 * w / matches, draw = 100 * d / matches, loss = 100 * l / matches
  return { win, draw, loss, net: win - loss, goals: goals / matches }
}

const failures = []
const check = (label, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(58)} ${detail}`); if (!ok) failures.push(label) }
const fmt = r => `W ${r.win.toFixed(1)} D ${r.draw.toFixed(1)} L ${r.loss.toFixed(1)} (net ${r.net >= 0 ? '+' : ''}${r.net.toFixed(1)})`
const started = Date.now()
const base = '1-2-2-2'

console.log('Formation matrix, all stats 80: row net (win% - loss%) vs column')
console.log(''.padEnd(9) + arenaFormations.map(f => f.padStart(8)).join(''))
// Home and away alternate, so B vs A is the mirror of A vs B; only the upper triangle is played.
const matrix = arenaFormations.map(() => arenaFormations.map(() => 0))
arenaFormations.forEach((f, i) => arenaFormations.forEach((g, j) => { if (j > i) { matrix[i][j] = duel(squad('A', f, 80), squad('B', g, 80)).net; matrix[j][i] = -matrix[i][j] } }))
arenaFormations.forEach((f, i) => console.log(f.padEnd(9) + matrix[i].map((v, j) => (i === j ? '-' : v.toFixed(1)).padStart(8)).join('') + `   avg ${(matrix[i].reduce((a, b) => a + b, 0) / 5).toFixed(1)}`))
const averages = matrix.map(row => row.reduce((a, b) => a + b, 0) / 5)
const bestWin = matrix.map((row, i) => Math.max(...row.filter((v, j) => j !== i)))
check('Formation spread: every average within +-6', averages.every(v => Math.abs(v) <= 6), `${Math.min(...averages).toFixed(1)} to ${Math.max(...averages).toFixed(1)}`)
check('Counters: every formation beats another by 4+', bestWin.every(v => v >= 4), arenaFormations.map((f, i) => `${f} +${bestWin[i].toFixed(1)}`).join(', '))
const unbeaten = arenaFormations.filter((f, i) => matrix[i].every((v, j) => i === j || v > 0))
check('No formation beats every other', !unbeaten.length, unbeaten.join(', ') || 'none')

const mirror = duel(squad('A', base, 80), squad('B', base, 80))
check('Goals per match 2.2-3.0', mirror.goals >= 2.2 && mirror.goals <= 3, mirror.goals.toFixed(2))
check('Draws between equal squads 22-30%', mirror.draw >= 22 && mirror.draw <= 30, mirror.draw.toFixed(1))

const statNets = stats.map(stat => duel(squad('A', base, flat(80, { [stat]: 90 })), squad('B', base, 80)).net)
stats.forEach((stat, i) => console.log(`      +10 ${stat} on all cards: net ${statNets[i].toFixed(1)}`))
check('Every stat matters: +10 each >= +3 net', statNets.every(v => v >= 3), statNets.map((v, i) => `${stats[i]} ${v.toFixed(1)}`).join(', '))
check('No stat dominates: max <= 2.5x min', Math.max(...statNets) <= 2.5 * Math.min(...statNets), `${(Math.max(...statNets) / Math.max(.1, Math.min(...statNets))).toFixed(2)}x`)

// Exact: a stat is dead in a line when no sector mix (or shot quality) gives it weight there. Keepers never shoot.
const weight = (line, stat) => ['mid', 'att', 'def'].reduce((sum, sector) => sum + tuning.lines[line][sector] * (tuning.mix[sector][stat] || 0), 0) + (line === 'gk' ? tuning.mix.keeper[stat] || 0 : (tuning.mix.shot[stat] || 0) * tuning.lines[line].att)
const dead = ['att', 'mid', 'def', 'gk'].flatMap(line => stats.filter(stat => weight(line, stat) <= 0 && !(line === 'gk' && stat === 'sho')).map(stat => `${line}.${stat}`))
check('No dead stat in any line (keeper shooting excepted)', !dead.length, dead.join(', ') || ['att', 'mid', 'def', 'gk'].map(line => `${line} min ${Math.min(...stats.filter(s => !(line === 'gk' && s === 'sho')).map(s => weight(line, s))).toFixed(2)}`).join(', '))

// Specialists should beat generalists with the same stat total, but by less than an 8-point rating gap.
const gap8 = duel(squad('A', base, 80), squad('B', base, 72))
const stacked = duel(squad('A', base, slot => ({
  att: { ovr: 80, sho: 95, pas: 80, def: 50, dri: 95 },
  mid: { ovr: 80, sho: 65, pas: 95, def: 80, dri: 80 },
  def: { ovr: 80, sho: 65, pas: 80, def: 95, dri: 80 },
  gk: { ovr: 80, sho: 65, pas: 80, def: 95, dri: 80 },
})[lineOf(slot.position)]), squad('B', base, 80))
check('Specialists: stacked vs flat (same total) below 80 vs 72', stacked.net > 0 && stacked.net < gap8.net, `${fmt(stacked)} vs ${fmt(gap8)}`)

const chem83 = duel(squad('A', base, 83, { chem: false }), squad('B', base, 80))
const chem85 = duel(squad('A', base, 85, { chem: false }), squad('B', base, 80))
check('Chemistry worth 3-5 points (no-chem 83 loses, 85 wins)', chem83.net < 0 && chem85.net > 0, `83: net ${chem83.net.toFixed(1)}, 85: net ${chem85.net.toFixed(1)}`)

const gap5 = duel(squad('A', base, 80), squad('B', base, 75))
check('80 vs 75 wins 45-55%', gap5.win >= 45 && gap5.win <= 55, fmt(gap5))
const gap25 = duel(squad('A', base, 90), squad('B', base, 65))
check('90 vs 65 wins <= 92%', gap25.win <= 92, fmt(gap25))

const seconds = (Date.now() - started) / 1000
check('Runtime under 2 minutes', seconds < 120, `${seconds.toFixed(0)}s`)
console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nAll balance targets met')
process.exitCode = failures.length ? 1 : 0

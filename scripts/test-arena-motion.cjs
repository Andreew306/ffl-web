const fs = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const ts = require('typescript')
const sandbox = { exports: {} }
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/arena-motion.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, sandbox)
const { arenaOwners, arenaTimeline, buildArenaMotion, sampleArenaBall, sampleArenaMotion, motionStep } = sandbox.exports
const events = [10, 90, 15, 85].map(x => ({ players: [{ x, y: 50 }] }))
const frames = buildArenaMotion(events, [0, 500, 1700, 3000], 3000)
const dt = motionStep / 1000
let previousVelocity = { x: 0, y: 0 }
for (let i = 1; i < frames.length; i++) {
  const velocity = { x: (frames[i][0].x - frames[i - 1][0].x) / dt, y: (frames[i][0].y - frames[i - 1][0].y) / dt }
  assert.ok(Math.hypot(velocity.x, velocity.y) <= 85.00001, 'Speed is bounded even across field-wide event jumps')
  assert.ok(Math.hypot(velocity.x - previousVelocity.x, velocity.y - previousVelocity.y) / dt <= 160.00001, 'Acceleration stays bounded at event boundaries')
  previousVelocity = velocity
}
assert.deepEqual(sampleArenaMotion(frames, 1234), sampleArenaMotion(frames, 1234), 'Seeking is deterministic')
assert.ok(Math.abs(sampleArenaMotion(frames, 500)[0].x - sampleArenaMotion(frames, 499)[0].x) < .086)
console.log('Continuous motion: speed, acceleration, event boundaries and seeking passed')

const players = Array.from({ length: 14 }, (_, i) => ({ x: i < 7 ? 20 + i * 5 : 80 - (i - 7) * 5, y: 15 + (i % 7) * 10 }))
const action = (kind, team, actor, target = actor) => ({ kind, team, actor, target, players, ball: { x: 50, y: 50 }, score: [0, 0], text: '', durationMs: 1200 })
const sequence = [action('recovery', 0, 0), action('pass', 0, 0, 2), action('pressure', 1, 3), action('dribble', 0, 2), action('pass', 0, 2, 1), action('windup', 0, 1), action('shot', 0, 1), action('save', 1, 6), action('keeper-ball', 1, 6)]
const timeline = arenaTimeline(sequence)
const owners = arenaOwners(sequence)
assert.equal(owners[2], 2, 'Pressure does not transfer possession to the defender')
const movement = buildArenaMotion(sequence, timeline, timeline.at(-1))
const ballAt = time => sampleArenaBall(sequence, timeline, movement, owners, time)
for (const boundary of timeline.slice(1)) {
  const a = ballAt(boundary - .001), b = ballAt(boundary)
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < .02, 'Ball must not jump at pass receptions, pressure, shots or saves')
}
for (const at of [timeline[1], timeline[1] + 400, timeline[2] + 500, timeline[7] + 300]) {
  const owner = owners[timeline.findLastIndex(start => start <= at)]
  const player = sampleArenaMotion(movement, at)[owner], ball = ballAt(at)
  assert.ok(Math.hypot(ball.x - player.x, ball.y - player.y) < 24, 'Possession and dribbling stay attached to the visible player')
}
const beforeSupport = sampleArenaMotion(movement, 300)[4]
const afterSupport = sampleArenaMotion(movement, 900)[4]
assert.ok(Math.hypot(beforeSupport.x - afterSupport.x, beforeSupport.y - afterSupport.y) > 1, 'Off-ball support continues even with stationary event snapshots')
for (let i = 1; i < movement.length; i++) for (let player = 0; player < 14; player++) {
  const a = movement[i - 1][player], b = movement[i][player]
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) / dt <= 85.00001, 'Support and pressing obey the speed limit')
}
assert.deepEqual(ballAt(2700), ballAt(2700), 'Ball seeking is deterministic')
console.log('Passing, possession, pressure, off-ball support and ball continuity passed')

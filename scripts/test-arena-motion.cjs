const fs = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const ts = require('typescript')
const sandbox = { exports: {} }
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/arena-motion.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, sandbox)
const { buildArenaMotion, sampleArenaMotion, motionStep } = sandbox.exports
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

import test from 'node:test'
import assert from 'node:assert/strict'
import { playGong } from '../src/modules/presence/gong.ts'

function setup(t, AudioContext) {
  const oldContext = globalThis.AudioContext
  const oldWindow = globalThis.window
  const scheduled = []
  globalThis.AudioContext = AudioContext
  globalThis.window = { setTimeout(callback, delay) { scheduled.push({ callback, delay }) } }
  t.after(() => { globalThis.AudioContext = oldContext; globalThis.window = oldWindow })
  return scheduled
}

test('an unavailable gong does not interrupt session completion', t => {
  setup(t, class { constructor() { throw new Error('Audio unavailable') } })
  let saved = false
  assert.doesNotThrow(() => { playGong(); saved = true })
  assert.equal(saved, true)
})

test('failed setup releases its context and tolerates a rejected close', async t => {
  let closed = 0
  setup(t, class {
    createGain() { throw new Error('Audio setup failed') }
    close() { closed++; return Promise.reject(new Error('Close failed')) }
  })
  assert.doesNotThrow(playGong)
  assert.equal(closed, 1)
  await new Promise(resolve => setImmediate(resolve))
})

test('the normal gong plays three partials and closes after the sound', t => {
  const oscillators = []
  let closed = 0
  const scheduled = setup(t, class {
    currentTime = 10
    destination = {}
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} } }
    createOscillator() {
      const oscillator = { frequency: {}, connect(node) { return node }, start() {}, stop(at) { this.stopAt = at } }
      oscillators.push(oscillator)
      return oscillator
    }
    close() { closed++; return Promise.resolve() }
  })
  playGong()
  assert.deepEqual(oscillators.map(o => o.frequency.value), [196, 392, 588])
  assert.ok(oscillators.every(o => o.stopAt === 13.25))
  assert.equal(closed, 0)
  assert.equal(scheduled[0].delay, 3500)
  scheduled[0].callback()
  assert.equal(closed, 1)
})

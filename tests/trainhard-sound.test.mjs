import { test } from 'node:test'
import assert from 'node:assert/strict'
import { playTimerBeep } from '../src/utils/timerSound.ts'

test('timer alarm releases each audio context after its sound ends', () => {
  const original = globalThis.AudioContext
  const contexts = []
  class AudioContext {
    currentTime = 5
    destination = {}
    closed = 0
    oscillator = { frequency: {}, connect() {}, disconnected: false, disconnect() { this.disconnected = true }, start(at) { this.startAt = at }, stop(at) { this.stopAt = at } }
    gain = { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnected: false, disconnect() { this.disconnected = true } }
    constructor() { contexts.push(this) }
    createOscillator() { return this.oscillator }
    createGain() { return this.gain }
    close() { this.closed++; return Promise.resolve() }
  }
  globalThis.AudioContext = AudioContext
  try {
    playTimerBeep(); playTimerBeep()
    assert.equal(contexts.length, 2)
    for (const context of contexts) {
      assert.equal(context.closed, 0)
      assert.equal(context.oscillator.frequency.value, 880)
      assert.ok(Math.abs(context.oscillator.stopAt - context.oscillator.startAt - 0.9) < 1e-9)
      context.oscillator.onended()
      assert.equal(context.closed, 1)
      assert.equal(context.oscillator.disconnected, true)
      assert.equal(context.gain.disconnected, true)
    }
  } finally { globalThis.AudioContext = original }
})

test('failed alarm setup closes its context without blocking the timer', async () => {
  const original = globalThis.AudioContext
  let closed = 0
  globalThis.AudioContext = class {
    createOscillator() { throw new Error('Audio unavailable') }
    close() { closed++; return Promise.reject(new Error('Already closed')) }
  }
  try {
    assert.doesNotThrow(playTimerBeep)
    assert.equal(closed, 1)
    await new Promise(resolve => setImmediate(resolve))
    globalThis.AudioContext = class { constructor() { throw new Error('Unsupported') } }
    assert.doesNotThrow(playTimerBeep)
  } finally { globalThis.AudioContext = original }
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { createAmbience } from '../src/modules/presence/RecordedAmbience.ts'

function setup(t, fetchImpl) {
  const oldFetch = globalThis.fetch
  const oldAudioContext = globalThis.AudioContext
  const calls = { decode: 0, start: 0, close: 0, error: 0 }
  globalThis.fetch = fetchImpl
  globalThis.AudioContext = class {
    state = 'running'
    currentTime = 0
    destination = {}
    createGain() { return { gain: { value: 0, setTargetAtTime() {} }, connect() {} } }
    async decodeAudioData() { calls.decode++; return {} }
    createBufferSource() { return { connect() {}, start() { calls.start++ } } }
    async close() { this.state = 'closed'; calls.close++ }
  }
  t.after(() => { globalThis.fetch = oldFetch; globalThis.AudioContext = oldAudioContext })
  return { calls, create: () => createAmbience('rain', '/sport-tracker/', () => calls.error++) }
}

test('closing an ambience aborts its download without reporting an error', async t => {
  let signal
  const { calls, create } = setup(t, (_url, options) => {
    signal = options.signal
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Aborted'))))
  })
  const ambience = create()
  await ambience.close()
  await ambience.ready
  assert.equal(signal.aborted, true)
  assert.deepEqual(calls, { decode: 0, start: 0, close: 1, error: 0 })
})

test('a body resolved after closing is neither decoded nor played', async t => {
  let finishBody
  const { calls, create } = setup(t, async () => ({ ok: true, arrayBuffer: () => new Promise(resolve => { finishBody = resolve }) }))
  const ambience = create()
  await Promise.resolve()
  await ambience.close()
  finishBody(new ArrayBuffer(1))
  await ambience.ready
  assert.deepEqual(calls, { decode: 0, start: 0, close: 1, error: 0 })
})

test('an open ambience still decodes and plays, and genuine errors are reported', async t => {
  const { calls, create } = setup(t, async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) }))
  const ambience = create()
  await ambience.ready
  assert.equal(calls.decode, 1)
  assert.equal(calls.start, 1)
  await ambience.close()
  globalThis.fetch = async () => ({ ok: false })
  const unavailable = create()
  await unavailable.ready
  assert.equal(calls.error, 1)
  await unavailable.close()
})

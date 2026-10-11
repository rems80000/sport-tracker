import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerTempoTap } from '../src/modules/guitar/tapTempo.ts'

test('tap tempo ignores duplicate timestamps instead of producing an infinite tempo', () => {
  const first = registerTempoTap([], 400)
  assert.equal(first.bpm, null)
  const duplicate = registerTempoTap(first.taps, 400)
  assert.deepEqual(duplicate, { taps: [400], bpm: null })
  assert.deepEqual(registerTempoTap(duplicate.taps, 900), { taps: [400, 900], bpm: 120 })
  assert.deepEqual(registerTempoTap([400, 900], 800), { taps: [400, 900], bpm: null })
})

test('tap tempo averages normal intervals and keeps at most five recent taps', () => {
  assert.equal(registerTempoTap([0, 400], 1000).bpm, 120)
  assert.deepEqual(registerTempoTap([0, 400, 800, 1200, 1600], 2000), {
    taps: [400, 800, 1200, 1600, 2000], bpm: 150,
  })
})

test('tap tempo starts a new rhythm after a pause and supports slow taps', () => {
  assert.deepEqual(registerTempoTap([0, 500], 2700), { taps: [2700], bpm: null })
  assert.deepEqual(registerTempoTap([100], 2100), { taps: [100, 2100], bpm: 30 })
})

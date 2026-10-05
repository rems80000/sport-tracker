import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectPitch, pitchLabel } from '../src/modules/guitar/audio.ts'

for (const sampleRate of [44100, 48000]) {
  for (const hz of [82.4069, 110, 146.832, 195.998, 246.942, 329.628, 440]) {
    test(`tuner identifies ${hz} Hz at ${sampleRate} Hz with harmonics`, () => {
      const samples = Float32Array.from({ length: 4096 }, (_, i) => .3 * Math.sin(2 * Math.PI * hz * i / sampleRate) + .12 * Math.sin(4 * Math.PI * hz * i / sampleRate))
      const detected = detectPitch(samples, sampleRate)
      assert.ok(detected)
      assert.ok(Math.abs(1200 * Math.log2(detected / hz)) < 5, `detected ${detected}`)
    })
  }
}
test('tuner ignores silence and gives signed tuning guidance', () => {
  assert.equal(detectPitch(new Float32Array(4096),48000),null)
  assert.deepEqual(pitchLabel(440), {note:'La',octave:4,cents:0})
  assert.ok(pitchLabel(443).cents > 0)
  assert.ok(pitchLabel(437).cents < 0)
})

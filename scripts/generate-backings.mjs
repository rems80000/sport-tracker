// Original, synthesized 8-bar accompaniment loops. No third-party recording.
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const dir = new URL('../public/backing-tracks/', import.meta.url)
mkdirSync(dir, { recursive: true })
const sampleRate = 24000, bars = 8
const tracks = [
  { id: 'am-groove', bpm: 90, bass: 45, chord: [57, 60, 64, 67], funk: false },
  { id: 'em-rock', bpm: 100, bass: 40, chord: [55, 59, 62, 64], funk: false },
  { id: 'c-funk', bpm: 105, bass: 36, chord: [60, 64, 67, 69], funk: true },
]
for (const track of tracks) {
  const seconds = bars * 4 * 60 / track.bpm
  const samples = new Float64Array(Math.round(seconds * sampleRate))
  let seed = 341
  const noise = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2147483648 - 1 }
  function event(start, duration, render) {
    const begin = Math.round(start * sampleRate)
    for (let j = 0; j < duration * sampleRate; j++) samples[(begin + j) % samples.length] += render(j / sampleRate, j)
  }
  function note(start, duration, midi, volume, tone) {
    const frequency = 440 * 2 ** ((midi - 69) / 12)
    event(start, duration, t => {
      const attack = Math.min(t / .005, 1), release = Math.min((duration - t) / .035, 1)
      const envelope = attack * release * Math.exp(-t * (tone === 'bass' ? 3 : 6))
      return volume * envelope * (Math.sin(2 * Math.PI * frequency * t) + .3 * Math.sin(4 * Math.PI * frequency * t) + .1 * Math.sin(6 * Math.PI * frequency * t))
    })
  }
  const beat = 60 / track.bpm
  for (let i = 0; i < bars * 4; i++) {
    const time = i * beat
    if (i % 2 === 0 || track.funk && i % 4 === 3) event(time, .22, t => .32 * Math.exp(-t * 26) * Math.sin(2 * Math.PI * (48 * t + 2.2 * (1 - Math.exp(-t * 35)))))
    if (i % 4 === 1 || i % 4 === 3) event(time, .14, t => .13 * Math.exp(-t * 32) * noise() + .1 * Math.exp(-t * 40) * Math.sin(2 * Math.PI * 185 * t))
    for (const off of [0, .5]) event(time + off * beat, .06, t => .045 * Math.exp(-t * 90) * noise())
    note(time, beat * .8, track.bass + [0, 0, 7, 12][i % 4], .22, 'bass')
    if (track.funk) note(time + beat * .5, beat * .3, track.bass + 7, .12, 'bass')
    for (const offset of track.funk ? [.5] : [0, .5]) for (const midi of track.chord) note(time + beat * offset, beat * .36, midi, .042, 'chord')
  }
  // Events crossing the loop boundary wrap around, preserving the decay tail.
  let peak = 0
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample))
  const out = Buffer.alloc(44 + samples.length * 2)
  out.write('RIFF'); out.writeUInt32LE(out.length - 8, 4); out.write('WAVEfmt ', 8)
  out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22)
  out.writeUInt32LE(sampleRate, 24); out.writeUInt32LE(sampleRate * 2, 28)
  out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(samples.length * 2, 40)
  for (let i = 0; i < samples.length; i++) out.writeInt16LE(Math.round(samples[i] * .8 / peak * 32767), 44 + i * 2)
  const file = new URL(track.id + '.wav', dir)
  writeFileSync(file, out)
  console.log(`${track.id}: ${seconds.toFixed(2)} s, ${(out.length / 1024).toFixed(0)} KB — ${fileURLToPath(file)}`)
}

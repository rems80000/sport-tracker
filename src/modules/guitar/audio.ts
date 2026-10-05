// YIN pitch estimate. Local processing only: no recording or upload.
export function detectPitch(samples: Float32Array, sampleRate: number): number | null {
  const step = 2
  const size = Math.floor(samples.length / step)
  const rate = sampleRate / step
  const maxLag = Math.min(Math.floor(rate / 65), Math.floor(size / 2))
  const minLag = Math.floor(rate / 1200)
  let energy = 0
  for (let i = 0; i < samples.length; i++) energy += samples[i] ** 2
  if (Math.sqrt(energy / samples.length) < 0.008) return null
  const difference = new Float32Array(maxLag + 1)
  let total = 0
  difference[0] = 1
  for (let lag = 1; lag <= maxLag; lag++) {
    let sum = 0
    for (let i = 0; i < size - maxLag; i++) sum += (samples[i * step] - samples[(i + lag) * step]) ** 2
    total += sum
    difference[lag] = total ? sum * lag / total : 1
  }
  for (let lag = Math.max(2, minLag); lag < maxLag - 1; lag++) {
    if (difference[lag] > 0.15) continue
    while (lag + 1 < maxLag && difference[lag + 1] < difference[lag]) lag++
    const a = difference[lag - 1], b = difference[lag], c = difference[lag + 1]
    const denominator = 2 * (2 * b - a - c)
    const correction = denominator ? (c - a) / denominator : 0
    return rate / (lag + correction)
  }
  return null
}

export function pitchLabel(frequency: number) {
  const midi = Math.round(69 + 12 * Math.log2(frequency / 440))
  const target = 440 * 2 ** ((midi - 69) / 12)
  return { note: ['Do', 'Do♯', 'Ré', 'Ré♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'][((midi % 12) + 12) % 12], octave: Math.floor(midi / 12) - 1, cents: Math.round(1200 * Math.log2(frequency / target)) }
}

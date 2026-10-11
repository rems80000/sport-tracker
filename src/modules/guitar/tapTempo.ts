export function registerTempoTap(previous: number[], now: number): { taps: number[]; bpm: number | null } {
  const last = previous.at(-1)
  if (last !== undefined && now <= last) return { taps: previous, bpm: null }
  const taps = [...previous.filter(time => now - time < 2200), now].slice(-5)
  const bpm = taps.length > 1 ? 60000 * (taps.length - 1) / (now - taps[0]) : null
  return { taps, bpm }
}

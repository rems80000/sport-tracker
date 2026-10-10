export function playGong() {
  let context: AudioContext | undefined
  function close() {
    try { void context?.close().catch(() => {}) } catch { /* Le son reste facultatif. */ }
  }
  try {
    context = new AudioContext()
    const master = context.createGain()
    master.gain.setValueAtTime(0.0001, context.currentTime)
    master.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.025)
    master.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 3.2)
    master.connect(context.destination)
    for (const [index, frequency] of [196, 392, 588].entries()) {
      const oscillator = context.createOscillator()
      const partial = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      partial.gain.value = 1 / (index + 1)
      oscillator.connect(partial).connect(master)
      oscillator.start()
      oscillator.stop(context.currentTime + 3.25)
    }
    window.setTimeout(close, 3500)
  } catch {
    close()
  }
}

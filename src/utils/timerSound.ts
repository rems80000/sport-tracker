export function playTimerBeep() {
  let context: AudioContext | undefined
  try {
    const ctx = new AudioContext()
    context = ctx
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.7, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9)
    osc.onended = () => {
      osc.disconnect()
      gain.disconnect()
      void ctx.close().catch(() => {})
    }
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.9)
  } catch {
    // An unavailable alarm must not prevent the timer from completing.
    if (context) void context.close().catch(() => {})
  }
}

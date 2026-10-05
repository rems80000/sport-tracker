export type Ambience = 'rain' | 'waves' | 'forest' | 'fire' | 'stream' | 'night'

// Audio is bundled locally: no streaming service, account or tracking at playback.
export function createAmbience(kind: Ambience, base: string, onError: () => void) {
  const context = new AudioContext()
  const master = context.createGain()
  master.gain.value = 0
  master.connect(context.destination)
  let closed = false
  let level = 0.4
  let started = false
  const ready = fetch(`${base}presence/ambience/${kind}.mp3`)
    .then(response => {
      if (!response.ok) throw new Error('Audio unavailable')
      return response.arrayBuffer()
    })
    .then(buffer => context.decodeAudioData(buffer))
    .then(buffer => {
      if (closed) return
      const source = context.createBufferSource()
      source.buffer = buffer
      source.loop = true
      source.connect(master)
      source.start()
      started = true
      master.gain.setTargetAtTime(level, context.currentTime, 0.4)
    }).catch(() => { if (!closed) onError() })
  return {
    ready,
    close: async () => {
      if (closed) return
      closed = true
      if (context.state === 'running' && started) {
        master.gain.setTargetAtTime(0, context.currentTime, 0.06)
        await new Promise(resolve => setTimeout(resolve, 250))
      }
      if (context.state !== 'closed') await context.close()
    },
    suspend: () => context.state !== 'closed' ? context.suspend() : Promise.resolve(),
    resume: () => context.state !== 'closed' ? context.resume() : Promise.resolve(),
    setVolume: (value: number) => {
      level = value
      if (!closed && started) master.gain.setTargetAtTime(value, context.currentTime, 0.25)
    },
  }
}

import type { SpokenStep } from './guidedSessions'

// Only the current cue is spoken after a delayed tick: never queue missed guidance.
export function cueAt(steps: SpokenStep[], elapsed: number) {
  return steps.findLastIndex(step => step.at <= elapsed)
}

export class GuidancePlayer {
  private synth: SpeechSynthesis
  private notify: (speaking: boolean, error?: string) => void
  private steps: SpokenStep[] = []
  private last = -1
  private utterance: SpeechSynthesisUtterance | null = null
  private interrupted = false
  volume = 0.85
  enabled = true
  voiceURI = ''

  constructor(synth: SpeechSynthesis, notify: (speaking: boolean, error?: string) => void) {
    this.synth = synth
    this.notify = notify
  }

  start(steps: SpokenStep[]) {
    this.stop()
    this.steps = steps
    this.last = -1
    this.tick(0)
  }

  tick(elapsed: number, replay = false) {
    const index = cueAt(this.steps, elapsed)
    if (index < 0 || (index === this.last && !replay)) return
    this.last = index
    if (!this.enabled || (!replay && elapsed - this.steps[index].at > 20)) return
    this.speak(this.steps[index].text)
  }

  private speak(text: string) {
    this.cancel()
    const voice = new SpeechSynthesisUtterance(text)
    voice.lang = 'fr-FR'
    voice.rate = 0.88
    voice.volume = this.volume
    const french = this.synth.getVoices().filter(item => /^fr(?:-|_)/i.test(item.lang) || item.lang === 'fr')
    voice.voice = french.find(item => item.voiceURI === this.voiceURI) ?? french.find(item => item.localService) ?? french[0] ?? null
    voice.onstart = () => { if (this.utterance === voice) this.notify(true) }
    voice.onend = () => { if (this.utterance === voice) { this.utterance = null; this.notify(false) } }
    voice.onerror = event => {
      if (this.utterance !== voice) return
      this.utterance = null
      this.notify(false, ['canceled', 'interrupted'].includes(event.error) ? undefined : 'La voix n’a pas pu démarrer. Vérifiez le volume et essayez « Réécouter la consigne ».')
    }
    this.utterance = voice
    this.synth.speak(voice)
  }

  private cancel() {
    // Invalidate callbacks before cancel() fires asynchronous end/error events.
    this.utterance = null
    this.synth.cancel()
    this.notify(false)
  }

  pause() {
    this.interrupted = this.utterance !== null
    this.cancel()
  }

  resume(elapsed: number) {
    this.tick(elapsed, this.interrupted)
    this.interrupted = false
  }

  mute() { this.interrupted = false; this.cancel() }

  stop() {
    this.steps = []
    this.last = -1
    this.interrupted = false
    this.cancel()
  }
}

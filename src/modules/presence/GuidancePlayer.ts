import type { SpokenStep } from './guidedSessions'

export function cueAt(steps: SpokenStep[], elapsed: number) {
  return steps.findLastIndex(step => step.at <= elapsed)
}

export class GuidancePlayer {
  private synth: SpeechSynthesis | null
  private notify: (speaking: boolean, error?: string) => void
  private steps: SpokenStep[] = []
  private sessionId = ''
  private base: string
  private audioFactory: () => HTMLAudioElement
  private audio: HTMLAudioElement | null = null
  private last = -1
  private utterance: SpeechSynthesisUtterance | null = null
  private interrupted = false
  private level = 0.85
  get volume() { return this.level }
  set volume(value: number) { this.level = value; if (this.audio) this.audio.volume = value }
  enabled = true
  voiceURI = ''

  constructor(synth: SpeechSynthesis | null, notify: (speaking: boolean, error?: string) => void, base = '', audioFactory = () => new Audio()) {
    this.synth = synth
    this.notify = notify
    this.base = base
    this.audioFactory = audioFactory
  }

  start(steps: SpokenStep[], sessionId = '') {
    this.stop()
    this.steps = steps
    this.sessionId = sessionId
    this.last = -1
    this.tick(0)
  }

  tick(elapsed: number, replay = false) {
    const index = cueAt(this.steps, elapsed)
    if (index < 0 || (index === this.last && !replay)) return
    this.last = index
    if (!this.enabled || (!replay && elapsed - this.steps[index].at > 20)) return
    this.cancel()
    const text = this.steps[index].text
    if (!this.sessionId || this.voiceURI) { this.speak(text); return }
    const audio = this.audioFactory()
    this.audio = audio
    audio.src = `${this.base}presence/voice/${this.sessionId}-${index}.mp3`
    audio.volume = this.level
    audio.playbackRate = 0.9
    audio.preservesPitch = true
    audio.onplaying = () => { if (this.audio === audio) this.notify(true) }
    audio.onended = () => { if (this.audio === audio) { this.audio = null; this.notify(false) } }
    const failed = () => {
      if (this.audio !== audio) return
      audio.pause()
      this.audio = null
      this.notify(false, 'La voix intégrée est indisponible. Voix de l’appareil utilisée en secours.')
      this.speak(text)
    }
    audio.onerror = failed
    void audio.play().catch(failed)
  }

  private speak(text: string) {
    if (!this.synth) { this.notify(false, 'Guidage audio indisponible. Les consignes restent affichées.'); return }
    const voice = new SpeechSynthesisUtterance(text)
    voice.lang = 'fr-FR'
    voice.rate = 0.94
    voice.volume = this.level
    const french = this.synth.getVoices().filter(item => /^fr(?:-|_)/i.test(item.lang) || item.lang === 'fr')
    voice.voice = french.find(item => item.voiceURI === this.voiceURI)
      ?? french.find(item => /natural|neural|online|google/i.test(item.name)) ?? french[0] ?? null
    voice.onstart = () => { if (this.utterance === voice) this.notify(true) }
    voice.onend = () => { if (this.utterance === voice) { this.utterance = null; this.notify(false) } }
    voice.onerror = event => {
      if (this.utterance !== voice) return
      this.utterance = null
      this.notify(false, ['canceled', 'interrupted'].includes(event.error) ? undefined : 'La voix n’a pas pu démarrer. Essayez « Réécouter la consigne ».')
    }
    this.utterance = voice
    this.synth.speak(voice)
  }

  private cancel() {
    this.utterance = null
    const audio = this.audio
    this.audio = null
    if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load() }
    this.synth?.cancel()
    this.notify(false)
  }
  pause() { this.interrupted = this.utterance !== null || this.audio !== null; this.cancel() }
  resume(elapsed: number) { this.tick(elapsed, this.interrupted); this.interrupted = false }
  mute() { this.interrupted = false; this.cancel() }
  stop() { this.steps = []; this.sessionId = ''; this.last = -1; this.interrupted = false; this.cancel() }
}

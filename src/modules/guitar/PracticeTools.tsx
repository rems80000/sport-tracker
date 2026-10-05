import { useEffect, useRef, useState } from 'react'
import { AUDIO_PAUSE_EVENT } from '../../data/audioSources'
import { detectPitch, pitchLabel } from './audio'

export function PracticeTools() {
  const [bpm, setBpm] = useState(() => {
    try { const saved = Number(localStorage.getItem('life_hub_guitar_bpm_v1')); return saved >= 30 && saved <= 240 ? saved : 80 } catch { return 80 }
  })
  const [beats, setBeats] = useState(4)
  const [running, setRunning] = useState(false)
  const [beat, setBeat] = useState(0)
  const [tuning, setTuning] = useState(false)
  const [frequency, setFrequency] = useState<number | null>(null)
  const [error, setError] = useState('')
  const tap = useRef<number[]>([])

  useEffect(() => {
    if (!running) return
    let context: AudioContext
    try { context = new AudioContext() } catch { setTimeout(() => { setError('Audio Web indisponible sur ce navigateur.'); setRunning(false) }, 0); return }
    let cancelled = false, timer: ReturnType<typeof setInterval> | undefined
    const flashes = new Set<ReturnType<typeof setTimeout>>()
    let next = 0, count = 0
    void context.resume().then(() => {
      if (cancelled) return
      next = context.currentTime + 0.05
      timer = setInterval(() => {
        if (context.state !== 'running') return
        // Discard missed beats after suspension; never produce a burst of clicks.
        if (next < context.currentTime) next = context.currentTime + 0.02
        while (next < context.currentTime + 0.1) {
          const oscillator = context.createOscillator(), gain = context.createGain()
          oscillator.frequency.value = count === 0 ? 1200 : 800
          gain.gain.setValueAtTime(0.0001, next)
          gain.gain.exponentialRampToValueAtTime(0.2, next + 0.003)
          gain.gain.exponentialRampToValueAtTime(0.0001, next + 0.045)
          oscillator.connect(gain).connect(context.destination)
          oscillator.start(next); oscillator.stop(next + 0.05)
          oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
          const current = count
          const flash = setTimeout(() => { flashes.delete(flash); if (!cancelled) setBeat(current) }, Math.max(0, (next - context.currentTime) * 1000))
          flashes.add(flash)
          count = (count + 1) % beats
          next += 60 / bpm
        }
      }, 25)
    }).catch(() => { if (!cancelled) { setError('Impossible de démarrer le son. Réessayez.'); setRunning(false) } })
    return () => { cancelled = true; clearInterval(timer); flashes.forEach(clearTimeout); void context.close().catch(() => {}) }
  }, [running, bpm, beats])

  useEffect(() => {
    if (!tuning) return
    let cancelled = false, stream: MediaStream | undefined, context: AudioContext | undefined
    let timer: ReturnType<typeof setInterval> | undefined
    async function start() {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('Le micro nécessite HTTPS et un navigateur compatible.')
        context = new AudioContext()
        await context.resume()
        if (cancelled) return
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
        if (cancelled) { stream.getTracks().forEach(track => track.stop()); return }
        const analyser = context.createAnalyser()
        analyser.fftSize = 4096
        context.createMediaStreamSource(stream).connect(analyser)
        const samples = new Float32Array(analyser.fftSize)
        timer = setInterval(() => { analyser.getFloatTimeDomainData(samples); setFrequency(detectPitch(samples, context!.sampleRate)) }, 120)
      } catch (caught) {
        stream?.getTracks().forEach(track => track.stop())
        if (context && context.state !== 'closed') void context.close().catch(() => {})
        if (!cancelled) { setError(caught instanceof Error && caught.name === 'NotAllowedError' ? 'Micro refusé. Autorisez le micro dans les réglages du navigateur puis réessayez.' : 'Micro indisponible. Vérifiez HTTPS, les autorisations et les autres applications.'); setTuning(false) }
      }
    }
    void start()
    return () => { cancelled = true; clearInterval(timer); stream?.getTracks().forEach(track => track.stop()); if (context && context.state !== 'closed') void context.close().catch(() => {}) }
  }, [tuning])

  useEffect(() => {
    const stop = () => { if (document.hidden) { setRunning(false); setTuning(false); setFrequency(null) } }
    document.addEventListener('visibilitychange', stop)
    return () => document.removeEventListener('visibilitychange', stop)
  }, [])

  function tempo(value: number) {
    const next = Math.max(30, Math.min(240, Math.round(value)))
    setBpm(next)
    try { localStorage.setItem('life_hub_guitar_bpm_v1', String(next)) } catch { setError('Le tempo ne peut pas être mémorisé sur cet appareil.') }
  }
  function tapTempo() {
    const now = performance.now()
    tap.current = [...tap.current.filter(time => now - time < 2200), now].slice(-5)
    if (tap.current.length > 1) tempo(60000 * (tap.current.length - 1) / (now - tap.current[0]))
  }
  const pitch = frequency ? pitchLabel(frequency) : null
  return <>
    <div className="guitar-tools">
      <section className="guitar-card" aria-labelledby="metronome-title">
        <p className="guitar-kicker">Le rythme</p><h2 id="metronome-title">Métronome</h2>
        <div className="guitar-tempo"><button onClick={() => tempo(bpm - 1)} aria-label="Diminuer le tempo">−</button><strong>{bpm}<small> BPM</small></strong><button onClick={() => tempo(bpm + 1)} aria-label="Augmenter le tempo">+</button></div>
        <input aria-label="Tempo" type="range" min="30" max="240" value={bpm} onChange={event => tempo(Number(event.target.value))} />
        <div className="guitar-beats" aria-label={`${beats} temps par mesure`}>{Array.from({ length: beats }, (_, i) => <i key={i} className={running && i === beat ? 'active' : ''} />)}</div>
        <div className="guitar-actions"><button className="primary" onClick={() => { setError(''); setTuning(false); setFrequency(null); setRunning(!running) }}>{running ? 'Arrêter le métronome' : 'Démarrer le métronome'}</button><button onClick={tapTempo}>Tap tempo</button><select aria-label="Temps par mesure" value={beats} onChange={e => setBeats(Number(e.target.value))}>{[2, 3, 4, 6].map(n => <option key={n} value={n}>{n} temps</option>)}</select></div>
      </section>
      <section className="guitar-card" aria-labelledby="tuner-title">
        <p className="guitar-kicker">Le son juste</p><h2 id="tuner-title">Accordeur</h2>
        <div className="guitar-pitch" aria-live="polite"><strong>{tuning && pitch ? `${pitch.note}${pitch.octave}` : '—'}</strong><span>{tuning && pitch ? `${frequency!.toFixed(1)} Hz · ${pitch.cents > 0 ? '+' : ''}${pitch.cents} cents` : tuning ? 'Jouez une corde à vide' : 'Mi · La · Ré · Sol · Si · Mi'}</span></div>
        <meter aria-label="Écart de justesse en cents" min={-50} max={50} low={-5} high={5} optimum={0} value={tuning ? pitch?.cents ?? 0 : 0} />
        <p>{tuning && pitch ? Math.abs(pitch.cents) <= 5 ? 'Accordé' : pitch.cents < 0 ? 'Tendez légèrement la corde' : 'Détendez légèrement la corde' : 'La = 440 Hz. Une seule corde à la fois, dans le calme.'}</p>
        <button className="primary" onClick={() => { setError(''); setFrequency(null); setRunning(false); if (!tuning) window.dispatchEvent(new Event(AUDIO_PAUSE_EVENT)); setTuning(!tuning) }}>{tuning ? 'Arrêter le micro' : 'Activer le micro'}</button>
        <p className="guitar-hint">Micro traité sur cet appareil, sans enregistrement. Les outils s’arrêtent en quittant ce module ou en masquant l’application.</p>
      </section>
    </div>
    {error && <p role="alert" className="guitar-error">{error}</p>}
  </>
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { LIFE_HUB_PRESENCE_IMPORTED_EVENT, loadPresenceSnapshot, savePresenceData } from '../../cloud/moduleStorage'
import { loadPresenceAudio, removePresenceAudio, savePresenceAudio } from './presenceAudio'
import type { PresenceAudioSlot } from './presenceAudio'
import './presence.css'

type Page = 'today' | 'practice' | 'journey' | 'tips' | 'settings'
type Ambience = 'rain' | 'waves' | 'forest' | 'fire' | 'stream' | 'night'
type BackgroundChoice = Ambience | 'custom'
type GuidanceStep = { at: number; text: string }
type Session = { id: string; title: string; subtitle: string; description: string; minutes: number; tone: string; icon: string; audio?: string; ambience: Ambience; guidance: GuidanceStep[] }
type HistoryItem = { id: number; title: string; minutes: number; date: string }
type AudioChoice = { name: string; url: string } | null
type WakeLockHandle = { released: boolean; release: () => Promise<void> }

const sessions: Session[] = [
  { id: 'calm', title: 'Respiration guidée', subtitle: 'Revenir au souffle', description: 'Une séance audio simple pour ralentir le rythme et retrouver un peu d’espace intérieur.', minutes: 5, tone: 'sage', icon: '♫', audio: 'meditation.m4a', ambience: 'forest', guidance: [{ at: 0, text: 'Installez-vous confortablement et laissez le souffle venir.' }, { at: 90, text: 'Allongez doucement l’expiration, sans forcer.' }, { at: 210, text: 'Observez ce qui est plus calme maintenant.' }] },
  { id: 'body', title: 'Scan corporel express', subtitle: 'Relâcher les tensions', description: 'Parcourez le corps de la tête aux pieds pour dénouer les tensions en huit minutes.', minutes: 8, tone: 'sand', icon: '◌', ambience: 'stream', guidance: [{ at: 0, text: 'Sentez les points de contact du corps avec le support.' }, { at: 90, text: 'Desserrez le front, la mâchoire et les épaules.' }, { at: 220, text: 'Relâchez le ventre, les jambes, puis les pieds.' }, { at: 390, text: 'Accueillez le corps dans son ensemble.' }] },
  { id: 'focus', title: 'Ancrage et concentration', subtitle: 'Clarifier son attention', description: 'Un recentrage guidé sur les sons et les sensations avant une tâche importante.', minutes: 7, tone: 'sage', icon: '✦', ambience: 'forest', guidance: [{ at: 0, text: 'Choisissez un point d’ancrage : souffle, sons ou contact des pieds.' }, { at: 120, text: 'Quand l’esprit part, revenez simplement à votre ancre.' }, { at: 300, text: 'Choisissez maintenant la prochaine action utile.' }] },
  { id: 'stress', title: 'Apaiser le stress', subtitle: 'Faire redescendre la pression', description: 'Une pratique courte pour retrouver des appuis et calmer progressivement l’agitation.', minutes: 6, tone: 'rose', icon: '≈', ambience: 'rain', guidance: [{ at: 0, text: 'Nommez trois choses que vous voyez autour de vous.' }, { at: 75, text: 'Sentez vos pieds et expirez un peu plus longtemps.' }, { at: 240, text: 'Laissez les épaules descendre à chaque souffle.' }] },
  { id: 'sleep', title: 'Préparer le sommeil', subtitle: 'Ralentir avant la nuit', description: 'Dix minutes pour détendre le corps et laisser la journée se déposer avant de dormir.', minutes: 10, tone: 'blue', icon: '☾', ambience: 'waves', guidance: [{ at: 0, text: 'Fermez les yeux et laissez la journée s’éloigner.' }, { at: 150, text: 'Relâchez chaque zone du corps de haut en bas.' }, { at: 360, text: 'Comptez doucement cinq expirations.' }, { at: 510, text: 'Vous n’avez plus rien à accomplir maintenant.' }] },
  { id: 'gratitude', title: 'Gratitude du soir', subtitle: 'Finir sur une note douce', description: 'Revisitez trois moments simples de la journée qui méritent d’être gardés.', minutes: 7, tone: 'sand', icon: '♡', ambience: 'night', guidance: [{ at: 0, text: 'Pensez à un petit moment agréable de cette journée.' }, { at: 120, text: 'Accueillez une personne ou un geste qui vous a aidé.' }, { at: 270, text: 'Remerciez-vous pour un effort, même discret.' }] },
  { id: 'reset', title: 'Pause entre deux tâches', subtitle: 'Couper puis repartir', description: 'Cinq minutes pour fermer une séquence, respirer et repartir avec une intention claire.', minutes: 5, tone: 'blue', icon: '↺', ambience: 'fire', guidance: [{ at: 0, text: 'Laissez la tâche précédente se terminer mentalement.' }, { at: 80, text: 'Revenez à trois respirations lentes.' }, { at: 210, text: 'Formulez une intention simple pour la suite.' }] },
]

const ambienceOptions: { id: Ambience; label: string; icon: string }[] = [
  { id: 'forest', label: 'Forêt', icon: '⌁' },
  { id: 'rain', label: 'Pluie', icon: '≈' },
  { id: 'waves', label: 'Vagues', icon: '≋' },
  { id: 'fire', label: 'Feu doux', icon: '✦' },
  { id: 'stream', label: 'Ruisseau', icon: '⌇' },
  { id: 'night', label: 'Nuit calme', icon: '☾' },
]

const nav = [
  { id: 'today' as Page, label: "Aujourd'hui", icon: '⌂' },
  { id: 'practice' as Page, label: 'Pratiquer', icon: '◉' },
  { id: 'journey' as Page, label: 'Parcours', icon: '↗' },
  { id: 'tips' as Page, label: 'Conseils', icon: '♡' },
  { id: 'settings' as Page, label: 'Réglages', icon: '⚙' },
]

function playGong() {
  const context = new AudioContext()
  const master = context.createGain()
  master.gain.setValueAtTime(0.0001, context.currentTime)
  master.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.025)
  master.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 3.2)
  master.connect(context.destination)
  ;[196, 392, 588].forEach((frequency, index) => {
    const oscillator = context.createOscillator()
    const partial = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    partial.gain.value = 1 / (index + 1)
    oscillator.connect(partial).connect(master)
    oscillator.start()
    oscillator.stop(context.currentTime + 3.25)
  })
  window.setTimeout(() => void context.close(), 3500)
}

function createAmbience(kind: Ambience) {
  const context = new AudioContext()
  const duration = context.sampleRate * 3
  const buffer = context.createBuffer(1, duration, context.sampleRate)
  const data = buffer.getChannelData(0)
  let brown = 0
  for (let index = 0; index < data.length; index += 1) {
    const white = Math.random() * 2 - 1
    brown = (brown + 0.02 * white) / 1.02
    data[index] = ['forest', 'fire', 'night'].includes(kind) ? brown * 3.2 : white
  }
  const source = context.createBufferSource()
  const filter = context.createBiquadFilter()
  const volume = context.createGain()
  source.buffer = buffer
  source.loop = true
  filter.type = kind === 'rain' || kind === 'stream' ? 'highpass' : 'lowpass'
  filter.frequency.value = kind === 'rain' ? 1100 : kind === 'stream' ? 520 : kind === 'waves' ? 650 : kind === 'fire' ? 420 : kind === 'night' ? 260 : 1250
  volume.gain.value = kind === 'rain' ? 0.045 : kind === 'night' ? 0.035 : kind === 'fire' ? 0.055 : 0.075
  source.connect(filter).connect(volume).connect(context.destination)
  if (kind === 'waves' || kind === 'stream') {
    const lfo = context.createOscillator()
    const depth = context.createGain()
    lfo.frequency.value = kind === 'stream' ? 0.32 : 0.09
    depth.gain.value = kind === 'stream' ? 0.025 : 0.05
    lfo.connect(depth).connect(volume.gain)
    lfo.start()
  }
  source.start()
  if (kind === 'night') {
    const tone = context.createOscillator()
    const toneVolume = context.createGain()
    tone.type = 'sine'
    tone.frequency.value = 174
    toneVolume.gain.value = 0.008
    tone.connect(toneVolume).connect(context.destination)
    tone.start()
  }
  return context
}

function formatTime(value: number) {
  const min = Math.floor(value / 60)
  const sec = value % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function PresenceApp() {
  const [page, setPage] = useState<Page>('today')
  const [selected, setSelected] = useState<Session>(sessions[0])
  const [active, setActive] = useState(false)
  const [running, setRunning] = useState(false)
  const [seconds, setSeconds] = useState(selected.minutes * 60)
  const [sound, setSound] = useState(true)
  const [breathing, setBreathing] = useState(true)
  const [history, setHistory] = useState<HistoryItem[]>(() => loadPresenceSnapshot().data.history as HistoryItem[])
  const [voiceAudio, setVoiceAudio] = useState<AudioChoice>(null)
  const [relaxAudio, setRelaxAudio] = useState<AudioChoice>(null)
  const [backgroundPlaying, setBackgroundPlaying] = useState(false)
  const [ambience, setAmbience] = useState<BackgroundChoice>(() => {
    const saved = localStorage.getItem('presence_ambience_v1') as BackgroundChoice | null
    if (saved === 'custom') return saved
    return ambienceOptions.some(option => option.id === saved) ? saved as Ambience : 'forest'
  })
  const [keepAwake, setKeepAwake] = useState(true)
  const completedRef = useRef(false)
  const voiceRef = useRef<HTMLAudioElement>(null)
  const relaxRef = useRef<HTMLAudioElement>(null)
  const voiceEndedRef = useRef(false)
  const ambienceRef = useRef<AudioContext | null>(null)
  const endAtRef = useRef<number | null>(null)
  const wakeLockRef = useRef<WakeLockHandle | null>(null)
  const backgroundAllowedRef = useRef(true)

  useEffect(() => {
    let cancelled = false
    void Promise.all([loadPresenceAudio('voice'), loadPresenceAudio('relax')]).then(([voice, relax]) => {
      if (cancelled) {
        if (voice?.url) URL.revokeObjectURL(voice.url)
        if (relax?.url) URL.revokeObjectURL(relax.url)
        return
      }
      setVoiceAudio(voice)
      setRelaxAudio(relax)
    }).catch(() => undefined)
    return () => { cancelled = true }
  }, [])

  useEffect(() => () => { if (voiceAudio?.url) URL.revokeObjectURL(voiceAudio.url) }, [voiceAudio])
  useEffect(() => () => { if (relaxAudio?.url) URL.revokeObjectURL(relaxAudio.url) }, [relaxAudio])

  useEffect(() => {
    const refreshFromDrive = () => setHistory(loadPresenceSnapshot().data.history as HistoryItem[])
    window.addEventListener(LIFE_HUB_PRESENCE_IMPORTED_EVENT, refreshFromDrive)
    return () => window.removeEventListener(LIFE_HUB_PRESENCE_IMPORTED_EVENT, refreshFromDrive)
  }, [])

  useEffect(() => {
    if (!running) return
    const updateRemaining = () => {
      const endAt = endAtRef.current
      if (!endAt) return
      setSeconds(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)))
    }
    updateRemaining()
    const timer = window.setInterval(updateRemaining, 500)
    document.addEventListener('visibilitychange', updateRemaining)
    window.addEventListener('focus', updateRemaining)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', updateRemaining)
      window.removeEventListener('focus', updateRemaining)
    }
  }, [running])

  useEffect(() => {
    const wakeNavigator = navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockHandle> } }
    const requestWakeLock = async () => {
      if (!active || !running || !keepAwake || document.visibilityState !== 'visible' || !wakeNavigator.wakeLock) return
      if (wakeLockRef.current && !wakeLockRef.current.released) return
      try { wakeLockRef.current = await wakeNavigator.wakeLock.request('screen') } catch { /* Android peut refuser en économie d'énergie */ }
    }
    const handleVisibility = () => { if (document.visibilityState === 'visible') void requestWakeLock() }
    void requestWakeLock()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      if (wakeLockRef.current && !wakeLockRef.current.released) void wakeLockRef.current.release()
      wakeLockRef.current = null
    }
  }, [active, running, keepAwake])

  useEffect(() => {
    if (seconds !== 0 || completedRef.current) return
    completedRef.current = true
    endAtRef.current = null
    setRunning(false)
    ;[voiceRef.current, relaxRef.current].forEach(audio => {
      if (!audio) return
      audio.pause()
      audio.currentTime = 0
    })
    if (ambienceRef.current) {
      void ambienceRef.current.close()
      ambienceRef.current = null
    }
    setBackgroundPlaying(false)
    if (sound) playGong()
    if ('vibrate' in navigator) navigator.vibrate([300, 150, 300])
    const item = { id: Date.now(), title: selected.title, minutes: selected.minutes, date: new Date().toISOString() }
    setHistory((current) => {
      const next = [item, ...current].slice(0, 20)
      savePresenceData({ history: next })
      return next
    })
  }, [seconds, selected, sound])

  const totalMinutes = useMemo(() => history.reduce((sum, item) => sum + item.minutes, 0), [history])
  const progress = 1 - seconds / (selected.minutes * 60)

  function begin(session = selected) {
    completedRef.current = false
    backgroundAllowedRef.current = true
    setSelected(session)
    setSeconds(session.minutes * 60)
    endAtRef.current = Date.now() + session.minutes * 60 * 1000
    setActive(true)
    setRunning(true)
    if (sound) playGong()
    stopBackground()
    voiceEndedRef.current = false
    ;[voiceRef.current, relaxRef.current].forEach(audio => {
      if (!audio) return
      audio.pause()
      audio.currentTime = 0
    })
    if (voiceRef.current && session.audio) void voiceRef.current.play().catch(() => undefined)
    if (!session.audio) startBackground(ambience)
  }

  function closeTimer() {
    setActive(false)
    setRunning(false)
    endAtRef.current = null
    setSeconds(selected.minutes * 60)
    ;[voiceRef.current, relaxRef.current].forEach(audio => {
      if (!audio) return
      audio.pause()
      audio.currentTime = 0
    })
    if (ambienceRef.current) {
      void ambienceRef.current.close()
      ambienceRef.current = null
    }
    setBackgroundPlaying(false)
  }

  function toggleTimer() {
    const next = !running
    if (next) {
      endAtRef.current = Date.now() + seconds * 1000
      if (selected.audio && !voiceEndedRef.current) void voiceRef.current?.play().catch(() => undefined)
      if (backgroundPlaying) {
        if (relaxRef.current) void relaxRef.current.play().catch(() => undefined)
        if (ambienceRef.current) void ambienceRef.current.resume()
      }
    } else {
      if (endAtRef.current) setSeconds(Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000)))
      endAtRef.current = null
      voiceRef.current?.pause()
      relaxRef.current?.pause()
      if (ambienceRef.current) void ambienceRef.current.suspend()
    }
    setRunning(next)
  }

  function choose(session: Session) {
    setSelected(session)
    setSeconds(session.minutes * 60)
  }

  function finishVoice() {
    voiceEndedRef.current = true
    if (running && backgroundAllowedRef.current) startBackground(ambience)
  }

  function startBackground(choice: BackgroundChoice = ambience) {
    relaxRef.current?.pause()
    if (ambienceRef.current) {
      void ambienceRef.current.close()
      ambienceRef.current = null
    }
    if (choice === 'custom' && relaxAudio && relaxRef.current) {
      relaxRef.current.volume = 0.38
      void relaxRef.current.play().catch(() => undefined)
      setBackgroundPlaying(true)
      return
    }
    ambienceRef.current = createAmbience(choice === 'custom' ? 'forest' : choice)
    setBackgroundPlaying(true)
  }

  function stopBackground() {
    relaxRef.current?.pause()
    if (ambienceRef.current) {
      void ambienceRef.current.close()
      ambienceRef.current = null
    }
    setBackgroundPlaying(false)
  }

  function toggleBackground() {
    if (backgroundPlaying) {
      backgroundAllowedRef.current = false
      stopBackground()
    } else {
      backgroundAllowedRef.current = true
      startBackground(ambience)
    }
  }

  function changeAmbience(choice: BackgroundChoice) {
    setAmbience(choice)
    localStorage.setItem('presence_ambience_v1', choice)
    backgroundAllowedRef.current = true
    startBackground(choice)
    if (!running) {
      relaxRef.current?.pause()
      if (ambienceRef.current) void ambienceRef.current.suspend()
    }
  }

  async function replaceAudio(slot: PresenceAudioSlot, file: File) {
    const saved = await savePresenceAudio(slot, file)
    if (slot === 'voice') setVoiceAudio(saved)
    else setRelaxAudio(saved)
  }

  async function resetAudio(slot: PresenceAudioSlot) {
    await removePresenceAudio(slot)
    if (slot === 'voice') setVoiceAudio(null)
    else {
      setRelaxAudio(null)
      if (ambience === 'custom') changeAmbience('forest')
    }
  }

  return (
    <div className="presence-root app-shell">
      <audio ref={voiceRef} src={voiceAudio?.url ?? `${import.meta.env.BASE_URL}meditation.m4a`} preload="auto" onEnded={finishVoice} />
      <audio ref={relaxRef} src={relaxAudio?.url} preload="auto" loop />
      <aside className="sidebar">
        <button className="brand" onClick={() => setPage('today')} aria-label="Accueil Présent">
          <span className="brand-mark"><i /><i /><i /></span><span>présent</span>
        </button>
        <nav aria-label="Navigation principale">
          {nav.map((item) => (
            <button key={item.id} className={page === item.id ? 'nav-item active' : 'nav-item'} onClick={() => setPage(item.id)}>
              <span className="nav-icon">{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-quote"><span>“</span><p>La paix vient de l'intérieur. Ne la cherchez pas à l'extérieur.</p><small>— Bouddha</small></div>
        <button className="profile" onClick={() => setPage('settings')}><span>R</span><span><b>Rémy</b><small>Mon espace</small></span><i>›</i></button>
      </aside>

      <main>
        <header className="mobile-header"><button className="brand" onClick={() => setPage('today')}><span className="brand-mark"><i /><i /><i /></span><span>présent</span></button><button onClick={() => setPage('settings')}>R</button></header>

        {page === 'today' && <Today selected={selected} history={history} totalMinutes={totalMinutes} onBegin={() => begin()} onChoose={choose} onPractice={() => setPage('practice')} />}
        {page === 'practice' && <Practice selected={selected} onChoose={choose} onBegin={begin} />}
        {page === 'journey' && <Journey history={history} totalMinutes={totalMinutes} />}
        {page === 'tips' && <Tips />}
        {page === 'settings' && <Settings sound={sound} breathing={breathing} voiceAudio={voiceAudio} relaxAudio={relaxAudio} setSound={setSound} setBreathing={setBreathing} onReplaceAudio={replaceAudio} onResetAudio={resetAudio} clearHistory={() => { setHistory([]); savePresenceData({ history: [] }) }} />}
      </main>

      <nav className="mobile-nav" aria-label="Navigation mobile">{nav.map((item) => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => setPage(item.id)}><span>{item.icon}</span><small>{item.label}</small></button>)}</nav>

      {active && <TimerModal session={selected} seconds={seconds} progress={progress} running={running} breathing={breathing} completed={seconds === 0} backgroundPlaying={backgroundPlaying} ambience={ambience} hasCustomBackground={Boolean(relaxAudio)} keepAwake={keepAwake} onToggle={toggleTimer} onToggleBackground={toggleBackground} onChangeAmbience={changeAmbience} onToggleKeepAwake={() => setKeepAwake(value => !value)} onClose={closeTimer} onRestart={() => begin(selected)} />}
    </div>
  )
}

function Today({ selected, history, totalMinutes, onBegin, onChoose, onPractice }: { selected: Session; history: HistoryItem[]; totalMinutes: number; onBegin: () => void; onChoose: (s: Session) => void; onPractice: () => void }) {
  const hour = new Date().getHours()
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Belle après-midi' : 'Bonsoir'
  return <div className="page today-page">
    <section className="welcome"><div><p className="eyebrow">{today}</p><h1>{greeting}, Rémy.</h1><p>Prenez un instant pour revenir à vous.</p></div><div className="streak"><span>✦</span><b>{history.length}</b><small>jours de présence</small></div></section>
    <section className="hero-card">
      <div className="hero-copy"><span className="pill">SÉANCE DU JOUR</span><h2>{selected.title}</h2><p>{selected.description}</p><div className="meta"><span>◷ {selected.minutes} min</span><span>♫ Fond sonore au choix</span></div><button className="primary" onClick={onBegin}><span>▶</span> Commencer la séance</button></div>
      <div className="hero-art" aria-hidden="true"><div className="sun" /><div className="hill hill-back" /><div className="hill hill-front" /><div className="meditator"><i className="head"/><i className="body"/><i className="legs"/></div><span className="leaf l1">⌁</span><span className="leaf l2">⌁</span></div>
    </section>
    <div className="section-heading"><div><p className="eyebrow">SELON VOTRE ENVIE</p><h2>De quoi avez-vous besoin ?</h2></div><button className="text-button" onClick={onPractice}>Tout explorer <span>→</span></button></div>
    <div className="session-grid">{sessions.slice(0, 4).map((s) => <button key={s.id} className={`session-card ${s.tone} ${selected.id === s.id ? 'selected' : ''}`} onClick={() => onChoose(s)}><span className="session-icon">{s.icon}</span><span><b>{s.title}</b><small>{s.subtitle}</small></span><em>♫ · {s.minutes} min</em></button>)}</div>
    <section className="insight"><div><span>◷</span><p><b>{totalMinutes || '—'} minutes</b><small>de méditation au total</small></p></div><div><span>✦</span><p><b>{history.length || 'Commencez'}</b><small>{history.length ? 'séances accomplies' : 'votre première séance'}</small></p></div><blockquote>“Il suffit parfois d'une respiration consciente pour changer la couleur d'une journée.”</blockquote></section>
  </div>
}

function Practice({ selected, onChoose, onBegin }: { selected: Session; onChoose: (s: Session) => void; onBegin: (s: Session) => void }) {
  return <div className="page practice-page"><p className="eyebrow">BIBLIOTHÈQUE</p><h1>Choisissez votre pratique.</h1><p className="lead">Sept séances guidées de 5 à 10 minutes, selon votre besoin du moment.</p><div className="library-grid">{sessions.map(s => <article key={s.id} className={`library-card ${s.tone} ${selected.id === s.id ? 'selected' : ''}`} onClick={() => onChoose(s)}><div className="large-icon">{s.icon}</div><div><p className="eyebrow">MÉDITATION GUIDÉE · {s.minutes} MIN</p><h2>{s.title}</h2><p>{s.description}</p><button className="round-play" aria-label={`Commencer ${s.title}`} onClick={(e) => { e.stopPropagation(); onBegin(s) }}>▶</button></div></article>)}</div></div>
}

function Journey({ history, totalMinutes }: { history: HistoryItem[]; totalMinutes: number }) {
  return <div className="page"><p className="eyebrow">VOTRE CHEMIN</p><h1>Chaque instant compte.</h1><p className="lead">Votre pratique prend forme, respiration après respiration.</p><div className="stat-grid"><div><span>◷</span><b>{totalMinutes}</b><small>minutes méditées</small></div><div><span>◉</span><b>{history.length}</b><small>séances terminées</small></div><div><span>✦</span><b>{history.length}</b><small>jours de présence</small></div></div><section className="history-card"><h2>Vos dernières séances</h2>{history.length === 0 ? <div className="empty"><span>◌</span><h3>Votre parcours commence ici</h3><p>Terminez une séance pour la voir apparaître.</p></div> : <div className="history-list">{history.map(item => <div key={item.id}><span>✓</span><p><b>{item.title}</b><small>{new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</small></p><em>{item.minutes} min</em></div>)}</div>}</section></div>
}

const tips = [
  { icon: '◌', title: 'Commencez petit', text: 'Cinq minutes régulières valent mieux qu’une longue séance occasionnelle.', tag: 'DÉBUTER' },
  { icon: '≈', title: 'Laissez venir les pensées', text: 'Ne cherchez pas à faire le vide. Remarquez la pensée, puis revenez doucement au souffle.', tag: 'ATTENTION' },
  { icon: '⌁', title: 'Trouvez votre posture', text: 'Dos droit sans rigidité, épaules relâchées et mains simplement posées.', tag: 'POSTURE' },
  { icon: '✦', title: 'Gardez un rendez-vous', text: 'Choisissez un moment stable : après le réveil, à la pause déjeuner ou avant de dormir.', tag: 'RÉGULARITÉ' },
  { icon: '☾', title: 'Pour mieux dormir', text: 'Baissez la lumière et privilégiez une expiration légèrement plus longue que l’inspiration.', tag: 'SOMMEIL' },
  { icon: '♡', title: 'Terminez en douceur', text: 'À la fin, prenez quelques secondes avant de bouger et observez simplement votre état.', tag: 'APRÈS' },
  { icon: '◎', title: 'Mâchoire et épaules', text: 'À chaque expiration, desserrez les dents et laissez les épaules descendre d’un millimètre.', tag: 'TENSIONS' },
  { icon: '↺', title: 'Quand l’esprit repart', text: 'Se rendre compte que vous êtes distrait est déjà le retour à la présence. Revenez sans vous juger.', tag: 'PENSÉES' },
  { icon: '◉', title: 'Les yeux peuvent rester ouverts', text: 'Gardez un regard doux vers le sol si fermer les yeux augmente l’agitation ou l’inconfort.', tag: 'CONFORT' },
  { icon: '⚓', title: 'Choisissez une ancre', text: 'Souffle, sons, contact des pieds ou poids des mains : gardez l’ancre la plus facile aujourd’hui.', tag: 'ANCRAGE' },
  { icon: '≈', title: 'Une minute suffit', text: 'Les jours chargés, faites seulement trois cycles lents. La régularité compte plus que la durée.', tag: 'ANTI-ÉCHEC' },
  { icon: '✧', title: 'Après une forte émotion', text: 'Commencez par sentir vos appuis et nommer trois choses visibles avant de ralentir la respiration.', tag: 'APAISER' },
]

const tipPaths = [
  { need: 'Mental agité', action: 'Pluie douce · 5 min', cue: 'Comptez cinq expirations, puis recommencez.' },
  { need: 'Tensions physiques', action: 'Méditation guidée · 5 min', cue: 'Relâchez mâchoire, épaules et mains.' },
  { need: 'Besoin de concentration', action: 'Ancrage · 7 min', cue: 'Revenez aux sons dès que l’esprit part.' },
  { need: 'Préparer le sommeil', action: 'Sommeil · 10 min', cue: 'Expirez un peu plus longtemps que vous inspirez.' },
]

function Tips() {
  return <div className="page tips-page"><p className="eyebrow">PETITS REPÈRES</p><h1>Méditer, simplement.</h1><p className="lead">Des conseils concrets, sans objectif de performance.</p><section className="featured-tip"><span>1 min</span><div><p className="eyebrow">LA PAUSE EXPRESS</p><h2>Trois respirations conscientes</h2><p>Inspirez lentement par le nez. Sentez l’air entrer. Expirez sans forcer. Répétez trois fois en laissant la mâchoire et les épaules descendre.</p></div><i>≈</i></section><section className="tip-paths"><div><p className="eyebrow">CHOISIR MA SÉANCE</p><h2>Selon votre état maintenant</h2></div>{tipPaths.map(path => <article key={path.need}><b>{path.need}</b><span>{path.action}</span><small>{path.cue}</small></article>)}</section><div className="tips-grid">{tips.map(tip => <article key={tip.title}><span className="tip-icon">{tip.icon}</span><p className="eyebrow">{tip.tag}</p><h2>{tip.title}</h2><p>{tip.text}</p></article>)}</div></div>
}

function Settings({ sound, breathing, voiceAudio, relaxAudio, setSound, setBreathing, onReplaceAudio, onResetAudio, clearHistory }: { sound: boolean; breathing: boolean; voiceAudio: AudioChoice; relaxAudio: AudioChoice; setSound: (v: boolean) => void; setBreathing: (v: boolean) => void; onReplaceAudio: (slot: PresenceAudioSlot, file: File) => Promise<void>; onResetAudio: (slot: PresenceAudioSlot) => Promise<void>; clearHistory: () => void }) {
  return <div className="page settings-page"><p className="eyebrow">VOTRE ESPACE</p><h1>Réglages</h1><p className="lead">Créez une expérience qui vous ressemble.</p><section className="settings-card"><h2>Pendant la pratique</h2><Setting label="Sons de début et de fin" detail="Un gong doux accompagne la séance" value={sound} onChange={setSound}/><Setting label="Guide de respiration" detail="Afficher le rythme inspirer / expirer" value={breathing} onChange={setBreathing}/></section><section className="settings-card audio-settings"><h2>Votre séance audio</h2><p className="audio-help">La voix personnalisée remplace la méditation intégrée. Votre bande relaxante apparaît comme choix « Mon audio » pendant chaque séance.</p><AudioFileRow slot="voice" label="Voix guidée" fileName={voiceAudio?.name ?? 'Méditation.m4a · fichier intégré'} custom={Boolean(voiceAudio)} onReplace={onReplaceAudio} onReset={onResetAudio}/><AudioFileRow slot="relax" label="Bande son relaxante" fileName={relaxAudio?.name ?? 'Aucune bande son sélectionnée'} custom={Boolean(relaxAudio)} onReplace={onReplaceAudio} onReset={onResetAudio}/><small className="audio-device-note">Les fichiers audio restent sur cet appareil pour préserver leur confidentialité. L’historique, lui, continue d’être synchronisé sur Drive.</small></section><section className="settings-card"><h2>Vos données</h2><div className="setting-row"><div><b>Historique Life Hub</b><small>Synchronisé avec les autres modules via Google Drive.</small></div><button className="danger" onClick={clearHistory}>Effacer</button></div></section><section className="about"><span className="brand-mark"><i/><i/><i/></span><h2>présent</h2><p>Prendre soin de son esprit, simplement.</p><small>Module Life Hub 1.2</small></section></div>
}

function AudioFileRow({ slot, label, fileName, custom, onReplace, onReset }: { slot: PresenceAudioSlot; label: string; fileName: string; custom: boolean; onReplace: (slot: PresenceAudioSlot, file: File) => Promise<void>; onReset: (slot: PresenceAudioSlot) => Promise<void> }) {
  return <div className="audio-file-row"><div><b>{label}</b><small title={fileName}>{fileName}</small></div><div className="audio-actions"><label className="audio-button">{custom ? 'Remplacer' : 'Choisir'}<input className="audio-picker" type="file" accept="audio/*,.m4a,.mp3,.wav,.ogg" onChange={event => { const file = event.target.files?.[0]; if (file) void onReplace(slot, file); event.target.value = '' }} /></label>{custom && <button className="audio-reset" onClick={() => void onReset(slot)}>Réinitialiser</button>}</div></div>
}

function Setting({ label, detail, value, onChange }: { label: string; detail: string; value: boolean; onChange: (v: boolean) => void }) { return <div className="setting-row"><div><b>{label}</b><small>{detail}</small></div><button role="switch" aria-checked={value} className={value ? 'switch on' : 'switch'} onClick={() => onChange(!value)}><span /></button></div> }

function TimerModal({ session, seconds, progress, running, breathing, completed, backgroundPlaying, ambience, hasCustomBackground, keepAwake, onToggle, onToggleBackground, onChangeAmbience, onToggleKeepAwake, onClose, onRestart }: { session: Session; seconds: number; progress: number; running: boolean; breathing: boolean; completed: boolean; backgroundPlaying: boolean; ambience: BackgroundChoice; hasCustomBackground: boolean; keepAwake: boolean; onToggle: () => void; onToggleBackground: () => void; onChangeAmbience: (choice: BackgroundChoice) => void; onToggleKeepAwake: () => void; onClose: () => void; onRestart: () => void }) {
  const radius = 134
  const circumference = 2 * Math.PI * radius
  const elapsed = session.minutes * 60 - seconds
  const guidance = [...session.guidance].reverse().find(step => elapsed >= step.at)?.text ?? session.description
  const choices = hasCustomBackground ? [...ambienceOptions, { id: 'custom' as const, label: 'Mon audio', icon: '♫' }] : ambienceOptions
  return <div className="timer-overlay"><button className="close" onClick={onClose} aria-label="Fermer">×</button><div className="timer-brand"><span className="brand-mark"><i/><i/><i/></span><span>présent</span></div>{completed ? <div className="complete"><span>✦</span><p className="eyebrow">SÉANCE TERMINÉE</p><h1>Merci d'avoir pris ce temps.</h1><p>Emportez ce calme avec vous.</p><div><button className="secondary" onClick={onRestart}>Recommencer</button><button className="primary" onClick={onClose}>Terminer</button></div></div> : <><div className={running && breathing ? 'timer-circle breathing' : 'timer-circle'}><svg viewBox="0 0 300 300"><circle className="track" cx="150" cy="150" r={radius}/><circle className="progress" cx="150" cy="150" r={radius} style={{ strokeDasharray: circumference, strokeDashoffset: circumference * (1 - progress) }}/></svg><div><small>{breathing ? (Math.floor(seconds / 4) % 2 ? 'EXPIRER' : 'INSPIRER') : session.title.toUpperCase()}</small><strong>{formatTime(seconds)}</strong><span>{session.title}</span></div></div><p className="timer-guidance">{guidance}</p><button className="pause" onClick={onToggle} aria-label={running ? 'Mettre en pause' : 'Reprendre'}>{running ? 'Ⅱ' : '▶'}</button><section className="background-panel" aria-label="Fond sonore"><div className="background-panel-heading"><div><small>FOND SONORE</small><b>{choices.find(choice => choice.id === ambience)?.label}</b></div><button className={backgroundPlaying ? 'active' : ''} onClick={onToggleBackground}><span>{backgroundPlaying ? 'Ⅱ' : '▶'}</span>{backgroundPlaying ? 'Mettre en pause' : 'Reprendre'}</button></div><div className="ambience-options">{choices.map(choice => <button key={choice.id} className={ambience === choice.id ? 'active' : ''} onClick={() => onChangeAmbience(choice.id)} aria-pressed={ambience === choice.id}><span>{choice.icon}</span>{choice.label}</button>)}</div></section><div className="session-audio-controls"><button className={keepAwake ? 'active' : ''} onClick={onToggleKeepAwake}><span>☀</span>{keepAwake ? 'Écran maintenu actif' : 'Autoriser le verrouillage'}</button></div><p className="timer-hint">{running ? 'Le temps reste fiable même si Android suspend l’application.' : 'Votre séance est en pause.'}</p></>}</div>
}

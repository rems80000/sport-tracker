import { useEffect, useMemo, useRef, useState } from 'react'
import { LIFE_HUB_PRESENCE_IMPORTED_EVENT, loadPresenceSnapshot, savePresenceData } from '../../cloud/moduleStorage'
import './presence.css'

type Page = 'today' | 'practice' | 'journey' | 'tips' | 'settings'
type Ambience = 'rain' | 'waves' | 'forest'
type Session = { id: string; title: string; subtitle: string; minutes: number; tone: string; icon: string; audio?: string; ambience?: Ambience }
type HistoryItem = { id: number; title: string; minutes: number; date: string }

const sessions: Session[] = [
  { id: 'calm', title: 'Méditation guidée', subtitle: 'Votre séance audio', minutes: 5, tone: 'sage', icon: '♫', audio: 'meditation.m4a' },
  { id: 'focus', title: 'Forêt calme', subtitle: 'Retrouver sa concentration', minutes: 15, tone: 'sand', icon: '✦', ambience: 'forest' },
  { id: 'sleep', title: 'Vagues du soir', subtitle: 'Préparer une nuit paisible', minutes: 20, tone: 'blue', icon: '☾', ambience: 'waves' },
  { id: 'breath', title: 'Pluie douce', subtitle: 'Une pause en pleine conscience', minutes: 5, tone: 'rose', icon: '≈', ambience: 'rain' },
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
    data[index] = kind === 'forest' ? brown * 3.2 : white
  }
  const source = context.createBufferSource()
  const filter = context.createBiquadFilter()
  const volume = context.createGain()
  source.buffer = buffer
  source.loop = true
  filter.type = kind === 'rain' ? 'highpass' : 'lowpass'
  filter.frequency.value = kind === 'rain' ? 1100 : kind === 'waves' ? 650 : 1250
  volume.gain.value = kind === 'rain' ? 0.045 : 0.075
  source.connect(filter).connect(volume).connect(context.destination)
  if (kind === 'waves') {
    const lfo = context.createOscillator()
    const depth = context.createGain()
    lfo.frequency.value = 0.09
    depth.gain.value = 0.05
    lfo.connect(depth).connect(volume.gain)
    lfo.start()
  }
  source.start()
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
  const completedRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const ambienceRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    const refreshFromDrive = () => setHistory(loadPresenceSnapshot().data.history as HistoryItem[])
    window.addEventListener(LIFE_HUB_PRESENCE_IMPORTED_EVENT, refreshFromDrive)
    return () => window.removeEventListener(LIFE_HUB_PRESENCE_IMPORTED_EVENT, refreshFromDrive)
  }, [])

  useEffect(() => {
    if (!running || seconds <= 0) return
    const timer = window.setInterval(() => setSeconds((s) => s - 1), 1000)
    return () => window.clearInterval(timer)
  }, [running, seconds])

  useEffect(() => {
    if (seconds !== 0 || completedRef.current) return
    completedRef.current = true
    setRunning(false)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    if (ambienceRef.current) {
      void ambienceRef.current.close()
      ambienceRef.current = null
    }
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
    setSelected(session)
    setSeconds(session.minutes * 60)
    setActive(true)
    setRunning(true)
    if (sound) playGong()
    if (ambienceRef.current) void ambienceRef.current.close()
    ambienceRef.current = sound && session.ambience ? createAmbience(session.ambience) : null
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      if (sound && session.audio) void audioRef.current.play().catch(() => undefined)
    }
  }

  function closeTimer() {
    setActive(false)
    setRunning(false)
    setSeconds(selected.minutes * 60)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    if (ambienceRef.current) {
      void ambienceRef.current.close()
      ambienceRef.current = null
    }
  }

  function toggleTimer() {
    setRunning((current) => {
      const next = !current
      if (audioRef.current && selected.audio && sound) {
        if (next) void audioRef.current.play().catch(() => undefined)
        else audioRef.current.pause()
      }
      if (ambienceRef.current) {
        if (next) void ambienceRef.current.resume()
        else void ambienceRef.current.suspend()
      }
      return next
    })
  }

  function choose(session: Session) {
    setSelected(session)
    setSeconds(session.minutes * 60)
  }

  return (
    <div className="presence-root app-shell">
      <audio ref={audioRef} src={`${import.meta.env.BASE_URL}meditation.m4a`} preload="auto" />
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
        {page === 'settings' && <Settings sound={sound} breathing={breathing} setSound={setSound} setBreathing={setBreathing} clearHistory={() => { setHistory([]); savePresenceData({ history: [] }) }} />}
      </main>

      <nav className="mobile-nav" aria-label="Navigation mobile">{nav.map((item) => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => setPage(item.id)}><span>{item.icon}</span><small>{item.label}</small></button>)}</nav>

      {active && <TimerModal session={selected} seconds={seconds} progress={progress} running={running} breathing={breathing} completed={seconds === 0} onToggle={toggleTimer} onClose={closeTimer} onRestart={() => begin(selected)} />}
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
      <div className="hero-copy"><span className="pill">SÉANCE DU JOUR</span><h2>{selected.title}</h2><p>{selected.audio ? 'Votre méditation audio, synchronisée avec cinq minutes de présence.' : "Une ambiance douce pour apaiser le mental et retrouver l'espace en soi."}</p><div className="meta"><span>◷ {selected.minutes} min</span><span>{selected.audio || selected.ambience ? '♫ Audio inclus' : '◌ Débutant'}</span></div><button className="primary" onClick={onBegin}><span>▶</span> Commencer la séance</button></div>
      <div className="hero-art" aria-hidden="true"><div className="sun" /><div className="hill hill-back" /><div className="hill hill-front" /><div className="meditator"><i className="head"/><i className="body"/><i className="legs"/></div><span className="leaf l1">⌁</span><span className="leaf l2">⌁</span></div>
    </section>
    <div className="section-heading"><div><p className="eyebrow">SELON VOTRE ENVIE</p><h2>De quoi avez-vous besoin ?</h2></div><button className="text-button" onClick={onPractice}>Tout explorer <span>→</span></button></div>
    <div className="session-grid">{sessions.map((s) => <button key={s.id} className={`session-card ${s.tone} ${selected.id === s.id ? 'selected' : ''}`} onClick={() => onChoose(s)}><span className="session-icon">{s.icon}</span><span><b>{s.title}</b><small>{s.subtitle}</small></span><em>{s.audio || s.ambience ? `♫ · ${s.minutes} min` : `${s.minutes} min`}</em></button>)}</div>
    <section className="insight"><div><span>◷</span><p><b>{totalMinutes || '—'} minutes</b><small>de méditation au total</small></p></div><div><span>✦</span><p><b>{history.length || 'Commencez'}</b><small>{history.length ? 'séances accomplies' : 'votre première séance'}</small></p></div><blockquote>“Il suffit parfois d'une respiration consciente pour changer la couleur d'une journée.”</blockquote></section>
  </div>
}

function Practice({ selected, onChoose, onBegin }: { selected: Session; onChoose: (s: Session) => void; onBegin: (s: Session) => void }) {
  const [duration, setDuration] = useState(selected.minutes)
  return <div className="page"><p className="eyebrow">BIBLIOTHÈQUE</p><h1>Choisissez votre pratique.</h1><p className="lead">Quelques minutes suffisent pour faire de la place.</p><div className="library-grid">{sessions.map(s => <article key={s.id} className={`library-card ${s.tone}`} onClick={() => { onChoose(s); setDuration(s.minutes) }}><div className="large-icon">{s.icon}</div><div><p className="eyebrow">MÉDITATION GUIDÉE</p><h2>{s.title}</h2><p>{s.subtitle}</p><div className="duration-row">{[5, 10, 15, 20].map(m => <button key={m} className={duration === m && selected.id === s.id ? 'active' : ''} onClick={(e) => { e.stopPropagation(); onChoose({ ...s, minutes: m }); setDuration(m) }}>{m} min</button>)}</div><button className="round-play" aria-label={`Commencer ${s.title}`} onClick={(e) => { e.stopPropagation(); onBegin({ ...s, minutes: selected.id === s.id ? duration : s.minutes }) }}>▶</button></div></article>)}</div></div>
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
]

function Tips() {
  return <div className="page tips-page"><p className="eyebrow">PETITS REPÈRES</p><h1>Méditer, simplement.</h1><p className="lead">Quelques conseils pour vous accompagner sans pression.</p><section className="featured-tip"><span>1 min</span><div><p className="eyebrow">LA PAUSE EXPRESS</p><h2>Trois respirations conscientes</h2><p>Inspirez lentement par le nez. Sentez l’air entrer. Expirez sans forcer. Répétez trois fois en laissant les épaules descendre.</p></div><i>≈</i></section><div className="tips-grid">{tips.map(tip => <article key={tip.title}><span className="tip-icon">{tip.icon}</span><p className="eyebrow">{tip.tag}</p><h2>{tip.title}</h2><p>{tip.text}</p></article>)}</div></div>
}

function Settings({ sound, breathing, setSound, setBreathing, clearHistory }: { sound: boolean; breathing: boolean; setSound: (v: boolean) => void; setBreathing: (v: boolean) => void; clearHistory: () => void }) {
  return <div className="page settings-page"><p className="eyebrow">VOTRE ESPACE</p><h1>Réglages</h1><p className="lead">Créez une expérience qui vous ressemble.</p><section className="settings-card"><h2>Pendant la pratique</h2><Setting label="Sons de début et de fin" detail="Un gong doux accompagne la séance" value={sound} onChange={setSound}/><Setting label="Guide de respiration" detail="Afficher le rythme inspirer / expirer" value={breathing} onChange={setBreathing}/></section><section className="settings-card"><h2>Vos données</h2><div className="setting-row"><div><b>Historique Life Hub</b><small>Synchronisé avec les autres modules via Google Drive.</small></div><button className="danger" onClick={clearHistory}>Effacer</button></div></section><section className="about"><span className="brand-mark"><i/><i/><i/></span><h2>présent</h2><p>Prendre soin de son esprit, simplement.</p><small>Module Life Hub 1.0</small></section></div>
}

function Setting({ label, detail, value, onChange }: { label: string; detail: string; value: boolean; onChange: (v: boolean) => void }) { return <div className="setting-row"><div><b>{label}</b><small>{detail}</small></div><button role="switch" aria-checked={value} className={value ? 'switch on' : 'switch'} onClick={() => onChange(!value)}><span /></button></div> }

function TimerModal({ session, seconds, progress, running, breathing, completed, onToggle, onClose, onRestart }: { session: Session; seconds: number; progress: number; running: boolean; breathing: boolean; completed: boolean; onToggle: () => void; onClose: () => void; onRestart: () => void }) {
  const radius = 134
  const circumference = 2 * Math.PI * radius
  return <div className="timer-overlay"><button className="close" onClick={onClose} aria-label="Fermer">×</button><div className="timer-brand"><span className="brand-mark"><i/><i/><i/></span><span>présent</span></div>{completed ? <div className="complete"><span>✦</span><p className="eyebrow">SÉANCE TERMINÉE</p><h1>Merci d'avoir pris ce temps.</h1><p>Emportez ce calme avec vous.</p><div><button className="secondary" onClick={onRestart}>Recommencer</button><button className="primary" onClick={onClose}>Terminer</button></div></div> : <><div className={running && breathing ? 'timer-circle breathing' : 'timer-circle'}><svg viewBox="0 0 300 300"><circle className="track" cx="150" cy="150" r={radius}/><circle className="progress" cx="150" cy="150" r={radius} style={{ strokeDasharray: circumference, strokeDashoffset: circumference * (1 - progress) }}/></svg><div><small>{breathing ? (Math.floor(seconds / 4) % 2 ? 'EXPIRER' : 'INSPIRER') : session.title.toUpperCase()}</small><strong>{formatTime(seconds)}</strong><span>{session.title}</span></div></div><button className="pause" onClick={onToggle} aria-label={running ? 'Mettre en pause' : 'Reprendre'}>{running ? 'Ⅱ' : '▶'}</button><p className="timer-hint">{running ? 'Laissez votre respiration trouver son rythme naturel.' : 'Votre séance est en pause.'}</p></>}</div>
}


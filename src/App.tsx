import { useState, useEffect, useMemo } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { StoreContext, useStore, useStoreReducer } from './store/useStore'
import { TimerProvider } from './store/timerContext'
import { DriveSyncProvider } from './store/driveSyncContext'
import { useTimer } from './store/timerContext'
import { Navigation } from './components/Navigation'
import { Sidebar } from './components/Sidebar'
import { TimerModal } from './components/TimerModal'
import { Dashboard } from './pages/Dashboard'
import { Program } from './pages/Program'
import { SessionStarter } from './pages/SessionStarter'
import { ActiveSession } from './pages/ActiveSession'
import { History } from './pages/History'
import { Progress } from './pages/Progress'
import { Settings } from './pages/Settings'
import { Vacances } from './pages/Vacances'
import { MOTIVATIONAL_QUOTES } from './data/program'
import { formatDuration } from './utils/storage'
import { Timer, Play, Pause, SkipForward } from 'lucide-react'

const FR_DAYS_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const FR_MONTHS_FULL = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function ClockBar() {
  const [now, setNow] = useState(() => new Date())
  const [showTimer, setShowTimer] = useState(false)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const p = (n: number) => String(n).padStart(2, '0')

  const location = useLocation()
  const { timerState, toggle, skip } = useTimer()
  const { remaining, running, finished, total } = timerState
  const isSessionPage = location.pathname.startsWith('/seance/')
  const timerIsActive = running || finished || remaining !== total

  const dateStr = `${FR_DAYS_FULL[now.getDay()]} ${String(now.getDate()).padStart(2, '0')} ${FR_MONTHS_FULL[now.getMonth()]} ${now.getFullYear()}`
  const quote = useMemo(() => {
    const idx = Math.floor(Date.now() / 86400000) % MOTIVATIONAL_QUOTES.length
    return MOTIVATIONAL_QUOTES[idx]
  }, [])

  return (
    <>
      <div className="flex-shrink-0 flex items-center justify-center bg-black/97 border-b border-red-900/25 relative"
        style={{ height: 'clamp(44px, 7vw, 108px)' }}>

        {/* Zone gauche : TRAINHARD + date + quote (ou timer compact pendant séance) */}
        <div className="absolute left-2 lg:left-5 flex flex-col justify-center" style={{ maxWidth: 'clamp(80px, 30vw, 340px)' }}>
          {isSessionPage && timerIsActive ? (
            <div className="flex items-center gap-1">
              <button onClick={toggle}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg border font-mono font-bold text-[10px] lg:text-xs tabular-nums ${
                  finished
                    ? 'bg-green-900/40 border-green-500/30 text-green-300'
                    : running
                    ? 'bg-orange-900/40 border-orange-500/30 text-orange-300'
                    : 'bg-indigo-900/40 border-indigo-500/30 text-indigo-300'
                }`}>
                {finished ? '✓ OK' : formatDuration(remaining)}
                {running ? <Pause size={8} /> : <Play size={8} />}
              </button>
              {!finished && (
                <button onClick={skip} className="p-1 rounded-lg bg-slate-800/70 border border-slate-700/30 text-slate-500 active:text-slate-300">
                  <SkipForward size={8} />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <a href="https://www.spoonradio.com/" target="_blank" rel="noopener noreferrer" className="hidden lg:block flex-shrink-0 active:scale-95 transition-transform" title="Spoon Radio">
                <img
                  src="/final-rems-flag.png"
                  alt="Rems Flag — Spoon Radio"
                  className="rounded-lg object-contain"
                  style={{ height: 'clamp(42px, 7.2vw, 104px)', width: 'auto', maxWidth: 'clamp(42px, 7.2vw, 104px)' }}
                />
              </a>
              <div className="flex flex-col justify-center">
                <span className="font-black leading-none select-none" style={{ fontSize: 'clamp(14px, 2.2vw, 32px)' }}>
                  <span className="text-white">TRAIN</span>
                  <span style={{ background: 'linear-gradient(90deg,#6366f1,#f43f5e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>HARD</span>
                </span>
                <span className="text-slate-400 font-semibold leading-tight select-none" style={{ fontSize: 'clamp(9px, 1.1vw, 15px)', marginTop: '3px' }}>{dateStr}</span>
                <span className="text-slate-500 font-medium italic leading-tight select-none hidden lg:block" style={{ fontSize: 'clamp(8px, 0.9vw, 12px)', marginTop: '2px' }}>{quote}</span>
              </div>
            </div>
          )}
        </div>

        {/* Horloge rouge LED — centrée */}
        <span className="font-mono tabular-nums font-black leading-none select-none"
          style={{
            fontSize: 'clamp(30px, 5.5vw, 82px)',
            color: '#ff2020',
            textShadow: '0 0 5px #ff0000, 0 0 16px rgba(255,20,20,0.75), 0 0 36px rgba(255,0,0,0.30), 0 0 1px #fff8',
            letterSpacing: '0.06em',
          }}>
          {p(now.getHours())}:{p(now.getMinutes())}:{p(now.getSeconds())}
        </span>

        {/* Bouton chronomètre — à droite, centré verticalement */}
        <button
          onClick={() => setShowTimer(true)}
          className="absolute right-3 lg:right-6 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center w-14 h-14 lg:w-16 lg:h-16 rounded-2xl active:scale-95 transition-transform"
          title="Timer repos"
          style={{
            position: 'absolute',
            background: timerIsActive ? 'rgba(99,102,241,0.15)' : 'rgba(30,41,59,0.7)',
            border: timerIsActive ? '1.5px solid rgba(99,102,241,0.5)' : '1.5px solid rgba(51,65,85,0.5)',
          }}
        >
          <Timer size={24} className={timerIsActive ? 'text-indigo-400' : 'text-slate-400'} />
          {timerIsActive && (
            <span className="text-indigo-300 font-mono font-bold tabular-nums" style={{ fontSize: '9px', position: 'relative' }}>
              {finished ? 'OK' : `${remaining}s`}
            </span>
          )}
          {timerIsActive && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-indigo-500 border-2 border-black animate-pulse" style={{ position: 'absolute' }} />
          )}
        </button>
      </div>

      {showTimer && <TimerModal onClose={() => setShowTimer(false)} />}
    </>
  )
}

function AppInner() {
  const { state } = useStore()
  return (
    <div className={`app-root flex flex-col min-h-dvh theme-${state.theme}`}>
      <ClockBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto lg:pl-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/programme" element={<Program />} />
            <Route path="/seance" element={<SessionStarter />} />
            <Route path="/seance/:sessionId" element={<ActiveSession />} />
            <Route path="/historique" element={<History />} />
            <Route path="/progression" element={<Progress />} />
            <Route path="/vacances" element={<Vacances />} />
            <Route path="/parametres" element={<Settings />} />
          </Routes>
        </main>
      </div>
      <Navigation />
    </div>
  )
}

function App() {
  const store = useStoreReducer()
  return (
    <StoreContext.Provider value={store}>
      <DriveSyncProvider>
        <TimerProvider>
          <BrowserRouter>
            <AppInner />
          </BrowserRouter>
        </TimerProvider>
      </DriveSyncProvider>
    </StoreContext.Provider>
  )
}

export default App

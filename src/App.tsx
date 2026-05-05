import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { StoreContext, useStore, useStoreReducer } from './store/useStore'
import { TimerProvider } from './store/timerContext'
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
import { formatDuration } from './utils/storage'
import { Timer, Play, Pause, SkipForward } from 'lucide-react'

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

  return (
    <>
      <div className="flex-shrink-0 flex items-center justify-center bg-black/97 border-b border-red-900/25 relative"
        style={{ height: 'clamp(44px, 7vw, 108px)' }}>

        {/* Compact timer indicator — uniquement pendant une séance active */}
        {isSessionPage && timerIsActive && (
          <div className="absolute left-2 lg:left-5 flex items-center gap-1">
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
        )}

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

        {/* Bouton chronomètre — à droite */}
        <button
          onClick={() => setShowTimer(true)}
          className="absolute right-2 lg:right-5 flex flex-col items-center justify-center w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-slate-800/60 border border-slate-700/40 active:scale-95 transition-transform relative"
          title="Timer repos"
        >
          <Timer size={18} className={timerIsActive ? 'text-indigo-400' : 'text-slate-500'} />
          {timerIsActive && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-black animate-pulse" />
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
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/programme" element={<Program />} />
            <Route path="/seance" element={<SessionStarter />} />
            <Route path="/seance/:sessionId" element={<ActiveSession />} />
            <Route path="/historique" element={<History />} />
            <Route path="/progression" element={<Progress />} />
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
      <TimerProvider>
        <BrowserRouter>
          <AppInner />
        </BrowserRouter>
      </TimerProvider>
    </StoreContext.Provider>
  )
}

export default App

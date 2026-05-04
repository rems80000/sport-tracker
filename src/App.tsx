import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { StoreContext, useStore, useStoreReducer } from './store/useStore'
import { TimerProvider } from './store/timerContext'
import { useTimer } from './store/timerContext'
import { Navigation } from './components/Navigation'
import { FloatingTimer } from './components/FloatingTimer'
import { Dashboard } from './pages/Dashboard'
import { Program } from './pages/Program'
import { SessionStarter } from './pages/SessionStarter'
import { ActiveSession } from './pages/ActiveSession'
import { History } from './pages/History'
import { Progress } from './pages/Progress'
import { Settings } from './pages/Settings'
import { formatDuration } from './utils/storage'
import { Play, Pause, SkipForward } from 'lucide-react'

function ClockBar() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const p = (n: number) => String(n).padStart(2, '0')

  const location = useLocation()
  const { timerState, start, toggle, skip } = useTimer()
  const { remaining, running, finished, total } = timerState
  const isSessionPage = location.pathname.startsWith('/seance/')
  const timerIsActive = running || finished || remaining !== total

  return (
    <div className="flex-shrink-0 flex items-center justify-center bg-black/97 border-b border-red-900/25 relative"
      style={{ height: 'clamp(44px, 7vw, 108px)' }}>

      {/* Compact rest timer — visible uniquement pendant une séance */}
      {isSessionPage && (
        <div className="absolute left-2 lg:left-5 flex items-center gap-1 lg:gap-1.5">
          {timerIsActive ? (
            <>
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
            </>
          ) : (
            <div className="flex gap-1">
              {([30, 60, 90, 120] as const).map(s => (
                <button key={s} onClick={() => start(s)}
                  className="px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-lg bg-slate-800/80 border border-slate-700/30 text-slate-400 text-[9px] lg:text-[10px] font-semibold active:bg-slate-700 active:text-white">
                  {s === 30 ? '30s' : s === 60 ? '1m' : s === 90 ? '1m30' : '2m'}
                </button>
              ))}
            </div>
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
    </div>
  )
}

function AppInner() {
  const { state } = useStore()
  return (
    <div className={`app-root flex flex-col min-h-dvh theme-${state.theme}`}>
      <ClockBar />
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
      <FloatingTimer />
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

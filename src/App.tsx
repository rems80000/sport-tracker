import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { StoreContext, useStore, useStoreReducer } from './store/useStore'
import { TimerProvider } from './store/timerContext'
import { Navigation } from './components/Navigation'
import { FloatingTimer } from './components/FloatingTimer'
import { Dashboard } from './pages/Dashboard'
import { Program } from './pages/Program'
import { SessionStarter } from './pages/SessionStarter'
import { ActiveSession } from './pages/ActiveSession'
import { History } from './pages/History'
import { Progress } from './pages/Progress'
import { Settings } from './pages/Settings'

function ClockBar() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    <div className="flex-shrink-0 flex items-center justify-between px-4 lg:px-8 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800/50"
      style={{ height: 'clamp(44px, 7vw, 108px)' }}>
      <span className="hidden lg:block font-black text-slate-700 uppercase tracking-[0.3em]"
        style={{ fontSize: 'clamp(10px, 1vw, 16px)' }}>Sport Tracker</span>
      <span className="font-mono tabular-nums font-black text-slate-100 leading-none ml-auto"
        style={{
          fontSize: 'clamp(28px, 5.5vw, 80px)',
          textShadow: '0 0 40px rgba(99,102,241,0.55), 0 0 80px rgba(99,102,241,0.18)',
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

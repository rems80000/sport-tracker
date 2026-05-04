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
    <div className="flex-shrink-0 flex items-center justify-center bg-black/95 backdrop-blur-sm border-b border-red-900/30"
      style={{ height: 'clamp(44px, 7vw, 108px)' }}>
      <span className="font-mono tabular-nums font-black leading-none select-none"
        style={{
          fontSize: 'clamp(30px, 5.5vw, 82px)',
          color: '#ff2222',
          textShadow: '0 0 6px #ff0000, 0 0 18px rgba(255,30,30,0.7), 0 0 40px rgba(255,0,0,0.35), 0 0 2px #fff',
          letterSpacing: '0.06em',
          fontVariantNumeric: 'tabular-nums',
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

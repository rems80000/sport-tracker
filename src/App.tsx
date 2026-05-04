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

function AppInner() {
  const { state } = useStore()
  return (
    <div className={`app-root flex flex-col min-h-dvh theme-${state.theme}`}>
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

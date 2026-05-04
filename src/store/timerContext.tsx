import { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react'

export interface TimerState {
  total: number
  remaining: number
  running: boolean
  finished: boolean
}

type TimerAction =
  | { type: 'START'; seconds: number }
  | { type: 'TICK' }
  | { type: 'TOGGLE' }
  | { type: 'SKIP' }
  | { type: 'ADJUST'; delta: number }
  | { type: 'RESET'; seconds?: number }

function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case 'START':
      return { total: action.seconds, remaining: action.seconds, running: true, finished: false }
    case 'TICK': {
      if (!state.running || state.remaining <= 0) return state
      const next = state.remaining - 1
      if (next <= 0) return { ...state, remaining: 0, running: false, finished: true }
      return { ...state, remaining: next }
    }
    case 'TOGGLE':
      if (state.finished) return { ...state, remaining: state.total, running: false, finished: false }
      return { ...state, running: !state.running }
    case 'SKIP':
      return { ...state, remaining: 0, running: false, finished: true }
    case 'ADJUST': {
      const next = Math.max(0, state.remaining + action.delta)
      const total = Math.max(0, state.total + action.delta)
      return { ...state, remaining: next, total, finished: false }
    }
    case 'RESET': {
      const t = action.seconds ?? state.total
      return { total: t, remaining: t, running: false, finished: false }
    }
    default:
      return state
  }
}

interface TimerContextValue {
  timerState: TimerState
  start: (seconds: number) => void
  toggle: () => void
  skip: () => void
  adjust: (delta: number) => void
  reset: (seconds?: number) => void
}

const TimerContext = createContext<TimerContextValue | null>(null)

const INITIAL: TimerState = { total: 90, remaining: 90, running: false, finished: false }

function playBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.7, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.9)
  } catch { /* not supported */ }
}

function vibrateDevice() {
  if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 400])
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [timerState, dispatch] = useReducer(timerReducer, INITIAL)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wasRunning = useRef(false)

  // Tick every second when running
  useEffect(() => {
    if (timerState.running) {
      intervalRef.current = setInterval(() => dispatch({ type: 'TICK' }), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [timerState.running])

  // Detect finish transition
  useEffect(() => {
    if (timerState.finished && !wasRunning.current) return
    if (timerState.finished) {
      playBeep()
      vibrateDevice()
    }
    wasRunning.current = timerState.running
  }, [timerState.finished])

  const start = useCallback((seconds: number) => dispatch({ type: 'START', seconds }), [])
  const toggle = useCallback(() => dispatch({ type: 'TOGGLE' }), [])
  const skip = useCallback(() => dispatch({ type: 'SKIP' }), [])
  const adjust = useCallback((delta: number) => dispatch({ type: 'ADJUST', delta }), [])
  const reset = useCallback((seconds?: number) => dispatch({ type: 'RESET', seconds }), [])

  return (
    <TimerContext.Provider value={{ timerState, start, toggle, skip, adjust, reset }}>
      {children}
    </TimerContext.Provider>
  )
}

export function useTimer() {
  const ctx = useContext(TimerContext)
  if (!ctx) throw new Error('useTimer must be used within TimerProvider')
  return ctx
}

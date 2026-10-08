import { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react'
import { playTimerBeep } from '../utils/timerSound'

import { timerReducer } from './timerReducer'
import type { TimerState } from './timerReducer'
export type { TimerState } from './timerReducer'

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
      playTimerBeep()
      vibrateDevice()
    }
    wasRunning.current = timerState.running
  }, [timerState.finished, timerState.running])

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

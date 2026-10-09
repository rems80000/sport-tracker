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

export function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case 'START':
      if (!Number.isSafeInteger(action.seconds) || action.seconds <= 0) return state
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
      return { ...state, remaining: next, total, running: state.running && next > 0, finished: next === 0 }
    }
    case 'RESET': {
      const t = action.seconds ?? state.total
      return { total: t, remaining: t, running: false, finished: false }
    }
    default:
      return state
  }
}


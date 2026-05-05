import { createContext, useContext, useReducer, useEffect } from 'react'
import type { Dispatch } from 'react'
import type { AppState, AppTheme, SessionLog, LoggedSet, ExerciseSessionOverride } from '../types'
import { loadState, saveState } from '../utils/storage'

type Action =
  | { type: 'START_SESSION'; payload: SessionLog }
  | { type: 'UPDATE_ACTIVE_SESSION'; payload: Partial<SessionLog> }
  | { type: 'LOG_SET'; payload: LoggedSet }
  | { type: 'SET_EXERCISE_OVERRIDE'; payload: { exerciseId: string; override: ExerciseSessionOverride } }
  | { type: 'COMPLETE_SESSION'; payload: Partial<SessionLog> }
  | { type: 'CANCEL_SESSION' }
  | { type: 'DELETE_SESSION'; payload: string }
  | { type: 'IMPORT_STATE'; payload: AppState }
  | { type: 'SET_THEME'; payload: AppTheme }
  | { type: 'SET_SIDEBAR_COMPACT'; payload: boolean }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'START_SESSION':
      return { ...state, activeSessionLog: action.payload }
    case 'UPDATE_ACTIVE_SESSION': {
      if (!state.activeSessionLog) return state
      return {
        ...state,
        activeSessionLog: { ...state.activeSessionLog, ...action.payload },
      }
    }
    case 'LOG_SET': {
      if (!state.activeSessionLog) return state
      const existing = state.activeSessionLog.sets.filter(
        s => !(s.exerciseId === action.payload.exerciseId && s.setIndex === action.payload.setIndex)
      )
      return {
        ...state,
        activeSessionLog: {
          ...state.activeSessionLog,
          sets: [...existing, action.payload],
        },
      }
    }
    case 'SET_EXERCISE_OVERRIDE': {
      if (!state.activeSessionLog) return state
      return {
        ...state,
        activeSessionLog: {
          ...state.activeSessionLog,
          exerciseOverrides: {
            ...state.activeSessionLog.exerciseOverrides,
            [action.payload.exerciseId]: action.payload.override,
          },
        },
      }
    }
    case 'COMPLETE_SESSION': {
      if (!state.activeSessionLog) return state
      const completed: SessionLog = {
        ...state.activeSessionLog,
        ...action.payload,
        endTime: new Date().toISOString(),
      }
      return {
        ...state,
        sessions: [completed, ...state.sessions],
        activeSessionLog: null,
      }
    }
    case 'CANCEL_SESSION':
      return { ...state, activeSessionLog: null }
    case 'DELETE_SESSION':
      return { ...state, sessions: state.sessions.filter(s => s.id !== action.payload) }
    case 'IMPORT_STATE':
      return action.payload
    case 'SET_THEME':
      return { ...state, theme: action.payload }
    case 'SET_SIDEBAR_COMPACT':
      return { ...state, sidebarCompact: action.payload }
    default:
      return state
  }
}

export const StoreContext = createContext<{ state: AppState; dispatch: Dispatch<Action> } | null>(null)

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

export function useStoreReducer() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  return { state, dispatch }
}

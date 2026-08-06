import { createContext, useContext, useReducer, useEffect, useRef } from 'react'
import type { Dispatch } from 'react'
import type { AppState, AppTheme, SessionLog, LoggedSet, ExerciseSessionOverride, WorkoutSession } from '../types'
import { loadState, saveState } from '../utils/storage'

type Action =
  | { type: 'START_SESSION'; payload: SessionLog }
  | { type: 'UPDATE_ACTIVE_SESSION'; payload: Partial<SessionLog> }
  | { type: 'LOG_SET'; payload: LoggedSet }
  | { type: 'SET_EXERCISE_OVERRIDE'; payload: { exerciseId: string; override: ExerciseSessionOverride } }
  | { type: 'COMPLETE_SESSION'; payload: Partial<SessionLog> }
  | { type: 'CANCEL_SESSION' }
  | { type: 'DELETE_SESSION'; payload: string }
  | { type: 'UPDATE_SESSION_LOG'; payload: SessionLog }
  | { type: 'IMPORT_STATE'; payload: AppState }
  | { type: 'SET_THEME'; payload: AppTheme }
  | { type: 'SET_SIDEBAR_COMPACT'; payload: boolean }
  | { type: 'SET_CUSTOM_PROGRAM'; payload: WorkoutSession[] }
  | { type: 'RESET_PROGRAM' }

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
    case 'UPDATE_SESSION_LOG':
      return { ...state, sessions: state.sessions.map(s => s.id === action.payload.id ? action.payload : s) }
    case 'IMPORT_STATE':
      return action.payload
    case 'SET_THEME':
      return { ...state, theme: action.payload }
    case 'SET_SIDEBAR_COMPACT':
      return { ...state, sidebarCompact: action.payload }
    case 'SET_CUSTOM_PROGRAM':
      return { ...state, customProgram: action.payload }
    case 'RESET_PROGRAM':
      return { ...state, customProgram: undefined }
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
  const mounted = useRef(false)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    saveState(state)
  }, [state])

  return { state, dispatch }
}

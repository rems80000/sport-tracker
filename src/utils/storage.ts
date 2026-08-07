import type { AppState, AppTheme, SessionLog } from '../types'

const STORAGE_KEY = 'sport_tracker_v1'
const LOCAL_UPDATED_AT_KEY = 'sport_tracker_updated_at_v1'
const VALID_THEMES: AppTheme[] = ['dark', 'tech', 'minimal']

const DEFAULT_STATE: AppState = {
  sessions: [],
  activeSessionLog: null,
  theme: 'dark',
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      if (!localStorage.getItem(LOCAL_UPDATED_AT_KEY)) setLocalUpdatedAt(new Date().toISOString())
      return DEFAULT_STATE
    }
    if (!localStorage.getItem(LOCAL_UPDATED_AT_KEY)) setLocalUpdatedAt(new Date().toISOString())
    const parsed = JSON.parse(raw)
    const theme: AppTheme = VALID_THEMES.includes(parsed.theme) ? parsed.theme : 'dark'
    return { ...DEFAULT_STATE, ...parsed, theme }
  } catch {
    return DEFAULT_STATE
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    setLocalUpdatedAt(new Date().toISOString())
  } catch {
    console.error('Failed to save state')
  }
}

export function getLocalUpdatedAt(): string {
  return localStorage.getItem(LOCAL_UPDATED_AT_KEY) ?? new Date(0).toISOString()
}

export function setLocalUpdatedAt(value: string): void {
  localStorage.setItem(LOCAL_UPDATED_AT_KEY, value)
}

export function exportJSON(state: AppState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sport-tracker-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importJSON(file: File): Promise<AppState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string) as AppState
        resolve({ ...DEFAULT_STATE, ...parsed })
      } catch {
        reject(new Error('Fichier JSON invalide'))
      }
    }
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'))
    reader.readAsText(file)
  })
}

export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function getWeekKey(date: Date): string {
  const year = date.getFullYear()
  const week = getWeekNumber(date)
  return `${year}-W${String(week).padStart(2, '0')}`
}

export function groupSessionsByWeek(sessions: SessionLog[]): Record<string, SessionLog[]> {
  const groups: Record<string, SessionLog[]> = {}
  for (const s of sessions) {
    const key = getWeekKey(new Date(s.date))
    if (!groups[key]) groups[key] = []
    groups[key].push(s)
  }
  return groups
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

export function getStartOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

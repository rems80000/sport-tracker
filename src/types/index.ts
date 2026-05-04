export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export type SessionStatus = 'todo' | 'in_progress' | 'done' | 'done_short' | 'missed'

export type Feeling = 'easy' | 'normal' | 'hard' | 'very_hard'

export type ExerciseType = 'reps' | 'duration' | 'cardio'

export type ExerciseCategory = 'weight' | 'bodyweight' | 'cardio' | 'plank' | 'mobility' | 'other'

export interface ExerciseSet {
  targetReps?: number
  targetDuration?: number // seconds
  restSeconds: number
}

export interface Exercise {
  id: string
  name: string
  type: ExerciseType
  category?: ExerciseCategory
  sets: ExerciseSet[]
  notes?: string
  description?: string
  hasWeight?: boolean
  // visual
  thumbnail?: string   // emoji fallback
  imageUrl?: string    // real image URL (optional, replaces thumbnail)
}

export interface WorkoutSession {
  id: string
  name: string
  day: DayOfWeek
  dayLabel: string
  shortDescription: string
  exercises: Exercise[]
  hasShortVersion?: boolean
  shortVersionDescription?: string
}

// Per-exercise overrides stored in the active session log
export interface ExerciseSessionOverride {
  numSets?: number
  targetReps?: number
  targetDuration?: number
  restSeconds?: number
}

// Logged data
export interface LoggedSet {
  exerciseId: string
  setIndex: number
  completed: boolean
  reps?: number
  weightKg?: number
  durationSeconds?: number
  comment?: string
  timestamp: string
}

export interface SessionLog {
  id: string
  sessionId: string
  date: string // ISO date string
  startTime: string
  endTime?: string
  status: SessionStatus
  feeling?: Feeling
  comment?: string
  sets: LoggedSet[]
  totalMinutes?: number
  exerciseOverrides?: Record<string, ExerciseSessionOverride>
}

export interface AppState {
  sessions: SessionLog[]
  activeSessionLog: SessionLog | null
  theme: 'dark' | 'light'
}

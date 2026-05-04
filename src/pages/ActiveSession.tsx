import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { SESSION_BY_ID } from '../data/program'
import { useTimer } from '../store/timerContext'
import { ExerciseImage } from '../components/ExerciseImage'
import type { Exercise, ExerciseSet, LoggedSet, Feeling, ExerciseSessionOverride } from '../types'
import { formatDuration } from '../utils/storage'
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp,
  ArrowLeft, X, Flag, Settings2, Plus, Minus,
} from 'lucide-react'

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ─── SetRow ────────────────────────────────────────────────────────────────────

interface SetRowProps {
  setIndex: number
  effectiveSet: ExerciseSet
  exercise: Exercise
  logged?: LoggedSet
  onLog: (data: Omit<LoggedSet, 'exerciseId' | 'setIndex' | 'timestamp'>) => void
  onStartTimer: (seconds: number) => void
}

function SetRow({ setIndex, effectiveSet, exercise, logged, onLog, onStartTimer }: SetRowProps) {
  const isCompleted = logged?.completed ?? false
  const [expanded, setExpanded] = useState(false)

  // Pre-fill with logged values, fallback to targets
  const [reps, setReps] = useState(
    logged?.reps?.toString() ?? (effectiveSet.targetReps ? String(effectiveSet.targetReps) : '')
  )
  const [weight, setWeight] = useState(logged?.weightKg?.toString() ?? '')
  const [duration, setDuration] = useState(
    logged?.durationSeconds?.toString() ?? (effectiveSet.targetDuration ? String(effectiveSet.targetDuration) : '')
  )
  const [comment, setComment] = useState(logged?.comment ?? '')

  const handleComplete = () => {
    onLog({
      completed: true,
      reps: reps ? parseInt(reps) : undefined,
      weightKg: weight ? parseFloat(weight) : undefined,
      durationSeconds: duration ? parseInt(duration) : undefined,
      comment: comment || undefined,
    })
    if (effectiveSet.restSeconds > 0) onStartTimer(effectiveSet.restSeconds)
  }

  const restLabel = effectiveSet.restSeconds > 0 ? ` → ${effectiveSet.restSeconds}s repos` : ''

  return (
    <div className={`rounded-xl border transition-colors ${isCompleted ? 'border-green-500/30 bg-green-500/5' : 'border-slate-700/50 bg-slate-800/40'}`}>
      {/* Row header */}
      <div className="flex items-center gap-3 p-3">
        <button onClick={isCompleted ? () => onLog({ completed: false }) : undefined} className="flex-shrink-0">
          {isCompleted
            ? <CheckCircle2 size={24} className="text-green-400" />
            : <Circle size={24} className="text-slate-600" />
          }
        </button>

        <div className="flex-1 min-w-0">
          <span className="text-slate-200 text-sm font-semibold">Série {setIndex + 1}</span>
          <span className="text-slate-500 text-xs ml-2">
            {exercise.type === 'reps'
              ? (effectiveSet.targetReps === 0 ? 'Max propre' : `${effectiveSet.targetReps} reps`)
              : effectiveSet.targetDuration ? formatDuration(effectiveSet.targetDuration) : '—'
            }
            {effectiveSet.restSeconds > 0 && ` · ${effectiveSet.restSeconds}s`}
          </span>
          {/* Logged summary */}
          {isCompleted && (
            <span className="text-green-400 text-xs ml-2">
              {logged?.reps && `${logged.reps} reps`}
              {logged?.weightKg && ` · ${logged.weightKg}kg`}
              {logged?.durationSeconds && ` · ${logged.durationSeconds}s`}
            </span>
          )}
        </div>

        <button onClick={() => setExpanded(e => !e)} className="p-1.5 text-slate-500 active:text-slate-300">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded detail form */}
      {expanded && (
        <div className="px-3 pb-3 flex flex-col gap-2.5 animate-slide-up">
          <div className="grid grid-cols-2 gap-2">
            {exercise.type === 'reps' && (
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400 font-medium">Reps réalisées</span>
                <input
                  type="number" inputMode="numeric"
                  value={reps} onChange={e => setReps(e.target.value)}
                  className="bg-slate-700 rounded-xl px-3 py-3 text-white text-base font-semibold w-full text-center"
                  placeholder="0"
                />
              </label>
            )}
            {(exercise.type === 'duration' || exercise.type === 'cardio') && (
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400 font-medium">Durée réelle (sec)</span>
                <input
                  type="number" inputMode="numeric"
                  value={duration} onChange={e => setDuration(e.target.value)}
                  className="bg-slate-700 rounded-xl px-3 py-3 text-white text-base font-semibold w-full text-center"
                  placeholder="0"
                />
              </label>
            )}
            {(exercise.hasWeight || exercise.category === 'weight') && (
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400 font-medium">Charge (kg)</span>
                <input
                  type="number" inputMode="decimal"
                  value={weight} onChange={e => setWeight(e.target.value)}
                  className="bg-slate-700 rounded-xl px-3 py-3 text-white text-base font-semibold w-full text-center"
                  placeholder="0"
                />
              </label>
            )}
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-medium">Note (optionnel)</span>
            <input
              type="text" value={comment} onChange={e => setComment(e.target.value)}
              className="bg-slate-700 rounded-xl px-3 py-2.5 text-white text-sm w-full"
              placeholder="Ressenti, technique..."
            />
          </label>

          {!isCompleted && (
            <button
              onClick={handleComplete}
              className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} />
              Valider{restLabel}
            </button>
          )}
        </div>
      )}

      {/* Quick validate button when collapsed and not done */}
      {!isCompleted && !expanded && (
        <div className="px-3 pb-3">
          <button
            onClick={handleComplete}
            className="w-full py-3 rounded-xl bg-indigo-600/80 text-white font-semibold text-sm active:scale-95 transition-transform"
          >
            ✓ Série {setIndex + 1} réalisée{restLabel}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── ExerciseBlock ─────────────────────────────────────────────────────────────

interface ExerciseBlockProps {
  exercise: Exercise
  logs: LoggedSet[]
  override?: ExerciseSessionOverride
  onLog: (exerciseId: string, setIndex: number, data: Omit<LoggedSet, 'exerciseId' | 'setIndex' | 'timestamp'>) => void
  onStartTimer: (seconds: number) => void
  onOverride: (exerciseId: string, override: ExerciseSessionOverride) => void
}

function ExerciseBlock({ exercise, logs, override, onLog, onStartTimer, onOverride }: ExerciseBlockProps) {
  const [open, setOpen] = useState(true)
  const [editMode, setEditMode] = useState(false)

  // Effective values = program defaults merged with session overrides
  const baseSet = exercise.sets[0]
  const eff: ExerciseSessionOverride = {
    numSets: override?.numSets ?? exercise.sets.length,
    targetReps: override?.targetReps ?? baseSet?.targetReps,
    targetDuration: override?.targetDuration ?? baseSet?.targetDuration,
    restSeconds: override?.restSeconds ?? baseSet?.restSeconds ?? 0,
  }

  // Build effective set list
  const effectiveSets: ExerciseSet[] = Array.from({ length: eff.numSets! }, () => ({
    targetReps: eff.targetReps,
    targetDuration: eff.targetDuration,
    restSeconds: eff.restSeconds!,
  }))

  const completedCount = logs.filter(l => l.exerciseId === exercise.id && l.completed).length
  const total = effectiveSets.length
  const allDone = completedCount >= total

  const update = (patch: Partial<ExerciseSessionOverride>) =>
    onOverride(exercise.id, { ...eff, ...patch })

  return (
    <div className={`rounded-2xl border overflow-hidden transition-colors ${allDone ? 'border-green-500/25 bg-green-500/5' : 'border-slate-700/40 bg-slate-800/20'}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <ExerciseImage exercise={exercise} size="sm" />

        <button onClick={() => setOpen(o => !o)} className="flex-1 min-w-0 text-left">
          <p className="text-white font-bold leading-tight">{exercise.name}</p>
          {exercise.notes && <p className="text-slate-500 text-xs mt-0.5 leading-tight">{exercise.notes}</p>}
        </button>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-sm font-bold tabular-nums ${allDone ? 'text-green-400' : 'text-slate-400'}`}>
            {completedCount}/{total}
          </span>
          {allDone && <CheckCircle2 size={15} className="text-green-400" />}
          <button
            onClick={() => { setEditMode(e => !e); setOpen(true) }}
            className={`p-1.5 rounded-lg transition-colors ${editMode ? 'bg-indigo-600/30 text-indigo-400' : 'text-slate-500 active:bg-slate-700'}`}
          >
            <Settings2 size={14} />
          </button>
          <button onClick={() => setOpen(o => !o)} className="p-1 text-slate-500">
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Description */}
      {open && exercise.description && !editMode && (
        <p className="text-slate-500 text-xs px-4 pb-2 leading-relaxed">{exercise.description}</p>
      )}

      {/* Edit mode: override parameters */}
      {open && editMode && (
        <div className="px-4 pb-3 pt-1 border-t border-slate-700/40 animate-slide-up">
          <p className="text-xs font-semibold text-indigo-400 mb-2">Ajuster pour cette séance</p>
          <div className="grid grid-cols-2 gap-2">
            {/* Num sets */}
            <div className="bg-slate-800 rounded-xl p-2">
              <p className="text-xs text-slate-400 mb-1.5">Séries</p>
              <div className="flex items-center gap-2">
                <button onClick={() => update({ numSets: Math.max(1, (eff.numSets ?? 1) - 1) })}
                  className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center active:scale-95">
                  <Minus size={13} className="text-slate-300" />
                </button>
                <span className="flex-1 text-center text-white font-bold text-lg">{eff.numSets}</span>
                <button onClick={() => update({ numSets: (eff.numSets ?? 1) + 1 })}
                  className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center active:scale-95">
                  <Plus size={13} className="text-slate-300" />
                </button>
              </div>
            </div>

            {/* Reps or Duration */}
            {exercise.type === 'reps' ? (
              <div className="bg-slate-800 rounded-xl p-2">
                <p className="text-xs text-slate-400 mb-1.5">Reps cibles</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => update({ targetReps: Math.max(0, (eff.targetReps ?? 0) - 1) })}
                    className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center active:scale-95">
                    <Minus size={13} className="text-slate-300" />
                  </button>
                  <span className="flex-1 text-center text-white font-bold text-lg">
                    {eff.targetReps === 0 ? 'Max' : eff.targetReps}
                  </span>
                  <button onClick={() => update({ targetReps: (eff.targetReps ?? 0) + 1 })}
                    className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center active:scale-95">
                    <Plus size={13} className="text-slate-300" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800 rounded-xl p-2">
                <p className="text-xs text-slate-400 mb-1.5">Durée (sec)</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => update({ targetDuration: Math.max(5, (eff.targetDuration ?? 30) - 5) })}
                    className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center active:scale-95">
                    <Minus size={13} className="text-slate-300" />
                  </button>
                  <span className="flex-1 text-center text-white font-bold text-base">{eff.targetDuration}s</span>
                  <button onClick={() => update({ targetDuration: (eff.targetDuration ?? 30) + 5 })}
                    className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center active:scale-95">
                    <Plus size={13} className="text-slate-300" />
                  </button>
                </div>
              </div>
            )}

            {/* Rest */}
            <div className="bg-slate-800 rounded-xl p-2 col-span-2">
              <p className="text-xs text-slate-400 mb-1.5">Temps de repos (sec)</p>
              <div className="flex items-center gap-2">
                <button onClick={() => update({ restSeconds: Math.max(0, (eff.restSeconds ?? 0) - 15) })}
                  className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center active:scale-95">
                  <Minus size={13} className="text-slate-300" />
                </button>
                <span className="flex-1 text-center text-white font-bold text-lg">{eff.restSeconds}s</span>
                <button onClick={() => update({ restSeconds: (eff.restSeconds ?? 0) + 15 })}
                  className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center active:scale-95">
                  <Plus size={13} className="text-slate-300" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sets list */}
      {open && (
        <div className="px-4 pb-4 flex flex-col gap-2">
          {effectiveSets.map((effSet, i) => {
            const logged = logs.find(l => l.exerciseId === exercise.id && l.setIndex === i)
            return (
              <SetRow
                key={i}
                setIndex={i}
                effectiveSet={effSet}
                exercise={exercise}
                logged={logged}
                onLog={data => onLog(exercise.id, i, data)}
                onStartTimer={onStartTimer}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Feeling selector ─────────────────────────────────────────────────────────

const FEELING_OPTIONS: { value: Feeling; label: string; emoji: string }[] = [
  { value: 'easy',      label: 'Facile',        emoji: '😊' },
  { value: 'normal',    label: 'Normal',         emoji: '😐' },
  { value: 'hard',      label: 'Difficile',      emoji: '😤' },
  { value: 'very_hard', label: 'Très difficile', emoji: '🥵' },
]

// ─── ActiveSession page ───────────────────────────────────────────────────────

export function ActiveSession() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  const { start: startTimer } = useTimer()
  const session = sessionId ? SESSION_BY_ID[sessionId] : null

  const [showFinish, setShowFinish] = useState(false)
  const [feeling, setFeeling] = useState<Feeling>('normal')
  const [sessionComment, setSessionComment] = useState('')
  const startTimeRef = useRef(new Date().toISOString())

  useEffect(() => {
    if (!session) return
    if (!state.activeSessionLog || state.activeSessionLog.sessionId !== session.id) {
      dispatch({
        type: 'START_SESSION',
        payload: {
          id: generateId(),
          sessionId: session.id,
          date: new Date().toISOString().split('T')[0],
          startTime: startTimeRef.current,
          status: 'in_progress',
          sets: [],
        },
      })
    }
  }, [session?.id])

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 gap-4">
        <p className="text-slate-400">Séance introuvable.</p>
        <button onClick={() => navigate('/')} className="text-indigo-400">Retour</button>
      </div>
    )
  }

  const logs = state.activeSessionLog?.sets ?? []
  const overrides = state.activeSessionLog?.exerciseOverrides ?? {}

  // Compute total sets accounting for overrides
  const totalSets = session.exercises.reduce((acc, ex) => {
    const numSets = overrides[ex.id]?.numSets ?? ex.sets.length
    return acc + numSets
  }, 0)
  const completedSets = logs.filter(l => l.completed).length
  const progress = totalSets > 0 ? completedSets / totalSets : 0

  const handleLog = (exerciseId: string, setIndex: number, data: Omit<LoggedSet, 'exerciseId' | 'setIndex' | 'timestamp'>) => {
    dispatch({ type: 'LOG_SET', payload: { exerciseId, setIndex, timestamp: new Date().toISOString(), ...data } })
  }

  const handleOverride = (exerciseId: string, override: ExerciseSessionOverride) => {
    dispatch({ type: 'SET_EXERCISE_OVERRIDE', payload: { exerciseId, override } })
  }

  const handleTimerStart = (seconds: number) => {
    startTimer(seconds)
  }

  const handleFinish = (isShort = false) => {
    const totalMinutes = Math.round((Date.now() - new Date(startTimeRef.current).getTime()) / 60000)
    dispatch({
      type: 'COMPLETE_SESSION',
      payload: { status: isShort ? 'done_short' : 'done', feeling, comment: sessionComment, totalMinutes },
    })
    navigate('/')
  }

  const handleCancel = () => {
    dispatch({ type: 'CANCEL_SESSION' })
    navigate('/')
  }

  return (
    <div className="flex flex-col pb-36 max-w-2xl mx-auto w-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur border-b border-slate-700/50 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-2.5">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl text-slate-400 active:bg-slate-800 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500">{session.dayLabel}</p>
            <h2 className="text-base font-bold text-white leading-tight truncate">{session.name}</h2>
          </div>
          <button onClick={handleCancel} className="p-2 rounded-xl text-slate-600 active:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-slate-800 rounded-full">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className="text-xs text-slate-600 text-center mt-1.5">{completedSets} / {totalSets} séries</p>
      </div>

      {/* Exercises */}
      <div className="flex flex-col gap-4 px-4 pt-4">
        {session.exercises.map(ex => (
          <ExerciseBlock
            key={ex.id}
            exercise={ex}
            logs={logs}
            override={overrides[ex.id]}
            onLog={handleLog}
            onStartTimer={handleTimerStart}
            onOverride={handleOverride}
          />
        ))}

        {/* Finish actions */}
        <div className="flex flex-col gap-3 mt-2">
          <button
            onClick={() => setShowFinish(true)}
            className="w-full py-4 rounded-2xl bg-green-600 text-white font-bold text-base active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <Flag size={18} />
            Terminer la séance
          </button>
          {session.hasShortVersion && (
            <button
              onClick={() => handleFinish(true)}
              className="w-full py-3 rounded-2xl bg-teal-600/70 text-white font-semibold text-sm active:scale-95 transition-transform"
            >
              Valider séance courte (≥ 10 min)
            </button>
          )}
          <button
            onClick={handleCancel}
            className="w-full py-3 rounded-2xl bg-slate-800/60 text-slate-400 font-semibold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <X size={15} /> Abandonner
          </button>
        </div>
      </div>

      {/* Finish modal */}
      {showFinish && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-800 rounded-3xl w-full max-w-md p-6 animate-bounce-in">
            <h3 className="text-xl font-bold text-white mb-1">Terminer la séance</h3>
            <p className="text-slate-400 text-sm mb-5">{completedSets} / {totalSets} séries réalisées</p>

            <p className="text-sm font-semibold text-slate-300 mb-3">Comment tu te sens ?</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {FEELING_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFeeling(opt.value)}
                  className={`py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${feeling === opt.value ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                >
                  <span>{opt.emoji}</span>{opt.label}
                </button>
              ))}
            </div>

            <label className="flex flex-col gap-1 mb-5">
              <span className="text-sm font-semibold text-slate-300">Commentaire (optionnel)</span>
              <textarea
                value={sessionComment}
                onChange={e => setSessionComment(e.target.value)}
                rows={2}
                className="bg-slate-700 rounded-xl px-3 py-2 text-white text-sm resize-none"
                placeholder="Notes sur la séance..."
              />
            </label>

            <div className="flex gap-3">
              <button onClick={() => setShowFinish(false)}
                className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-semibold active:scale-95 transition-transform">
                Retour
              </button>
              <button onClick={() => handleFinish(false)}
                className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold active:scale-95 transition-transform">
                Valider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

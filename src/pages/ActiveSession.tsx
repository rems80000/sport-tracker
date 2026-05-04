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
  ArrowLeft, X, Flag, Plus, Minus, Pencil, ImageOff,
} from 'lucide-react'

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ─── ParamStepper ──────────────────────────────────────────────────────────────

interface ParamStepperProps {
  label: string
  display: string
  onDec: () => void
  onInc: () => void
}

function ParamStepper({ label, display, onDec, onInc }: ParamStepperProps) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={onDec}
          className="w-7 h-7 rounded-lg bg-slate-700/70 flex items-center justify-center active:scale-90 transition-transform"
        >
          <Minus size={10} className="text-slate-300" />
        </button>
        <span className="text-white text-sm font-bold min-w-[34px] text-center tabular-nums">{display}</span>
        <button
          onClick={onInc}
          className="w-7 h-7 rounded-lg bg-slate-700/70 flex items-center justify-center active:scale-90 transition-transform"
        >
          <Plus size={10} className="text-slate-300" />
        </button>
      </div>
    </div>
  )
}

// ─── PostureSection ────────────────────────────────────────────────────────────

function PostureImg({ src, label }: { src: string; label: string }) {
  const [err, setErr] = useState(false)
  if (err) {
    return (
      <div className="flex flex-col items-center justify-center bg-slate-800/60 rounded-xl h-28 gap-1.5">
        <ImageOff size={18} className="text-slate-600" />
        <span className="text-slate-600 text-xs text-center px-2">Image posture à ajouter</span>
      </div>
    )
  }
  return (
    <div className="relative">
      <img
        src={src}
        alt={label}
        onError={() => setErr(true)}
        className="w-full rounded-xl object-cover max-h-44"
      />
      <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-md font-medium">
        {label}
      </span>
    </div>
  )
}

function PostureSection({ exercise }: { exercise: Pick<Exercise, 'imageStart' | 'imageEnd' | 'imageGuide' | 'name'> }) {
  const [open, setOpen] = useState(false)
  const hasImages = exercise.imageStart || exercise.imageEnd || exercise.imageGuide

  return (
    <div className="border-t border-slate-700/30">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm active:bg-slate-800/30 transition-colors"
      >
        <span className="text-slate-500 font-medium text-xs">Voir la posture</span>
        {open ? <ChevronUp size={13} className="text-slate-600" /> : <ChevronDown size={13} className="text-slate-600" />}
      </button>
      {open && (
        <div className="px-4 pb-3 animate-slide-up">
          {hasImages ? (
            <div className="grid grid-cols-2 gap-2">
              {exercise.imageStart && <PostureImg src={exercise.imageStart} label="Départ" />}
              {exercise.imageEnd && <PostureImg src={exercise.imageEnd} label="Arrivée" />}
              {exercise.imageGuide && (
                <div className="col-span-2">
                  <PostureImg src={exercise.imageGuide} label="Guide technique" />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center bg-slate-800/40 rounded-xl h-24 gap-2">
              <ImageOff size={20} className="text-slate-700" />
              <span className="text-slate-600 text-xs">Image posture à ajouter</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── SetRow ────────────────────────────────────────────────────────────────────

interface SetRowProps {
  setIndex: number
  effectiveSet: ExerciseSet
  effectiveWeight: number | undefined
  exercise: Exercise
  logged?: LoggedSet
  onLog: (data: Omit<LoggedSet, 'exerciseId' | 'setIndex' | 'timestamp'>) => void
  onStartTimer: (seconds: number) => void
}

function SetRow({ setIndex, effectiveSet, effectiveWeight, exercise, logged, onLog, onStartTimer }: SetRowProps) {
  const isCompleted = logged?.completed ?? false
  const [editing, setEditing] = useState(false)

  const [reps, setReps] = useState(
    logged?.reps?.toString() ?? (effectiveSet.targetReps ? String(effectiveSet.targetReps) : '')
  )
  const [weight, setWeight] = useState(
    logged?.weightKg?.toString() ?? effectiveWeight?.toString() ?? ''
  )
  const [duration, setDuration] = useState(
    logged?.durationSeconds?.toString() ?? (effectiveSet.targetDuration ? String(effectiveSet.targetDuration) : '')
  )

  const showWeight = exercise.hasWeight || exercise.category === 'weight'

  const handleQuickValidate = () => {
    onLog({
      completed: true,
      reps: effectiveSet.targetReps || undefined,
      weightKg: effectiveWeight || undefined,
      durationSeconds: effectiveSet.targetDuration || undefined,
    })
    if (effectiveSet.restSeconds > 0) onStartTimer(effectiveSet.restSeconds)
  }

  const handleSaveEdit = () => {
    onLog({
      completed: true,
      reps: reps ? parseInt(reps) : undefined,
      weightKg: weight ? parseFloat(weight) : undefined,
      durationSeconds: duration ? parseInt(duration) : undefined,
    })
    setEditing(false)
    if (!isCompleted && effectiveSet.restSeconds > 0) onStartTimer(effectiveSet.restSeconds)
  }

  const restNote = effectiveSet.restSeconds > 0 ? ` +${effectiveSet.restSeconds}s` : ''

  // Editing form
  if (editing) {
    return (
      <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 animate-slide-up">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-sm font-bold text-indigo-400">Série {setIndex + 1}</span>
          <button onClick={() => setEditing(false)} className="ml-auto text-slate-500 p-1">
            <X size={13} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2.5">
          {exercise.type === 'reps' && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Reps réelles</span>
              <input
                type="number" inputMode="numeric"
                value={reps} onChange={e => setReps(e.target.value)}
                className="bg-slate-700 rounded-xl px-3 py-2.5 text-white text-base font-semibold text-center"
                placeholder="0"
              />
            </label>
          )}
          {showWeight && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Charge (kg)</span>
              <input
                type="number" inputMode="decimal"
                value={weight} onChange={e => setWeight(e.target.value)}
                className="bg-slate-700 rounded-xl px-3 py-2.5 text-white text-base font-semibold text-center"
                placeholder="0"
              />
            </label>
          )}
          {(exercise.type === 'duration' || exercise.type === 'cardio') && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Durée (sec)</span>
              <input
                type="number" inputMode="numeric"
                value={duration} onChange={e => setDuration(e.target.value)}
                className="bg-slate-700 rounded-xl px-3 py-2.5 text-white text-base font-semibold text-center"
                placeholder="0"
              />
            </label>
          )}
        </div>
        <button
          onClick={handleSaveEdit}
          className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold active:scale-95 transition-transform"
        >
          Enregistrer
        </button>
      </div>
    )
  }

  // Completed row
  if (isCompleted) {
    return (
      <div className="flex items-center gap-3 py-1.5 px-1">
        <button onClick={() => onLog({ completed: false })} className="flex-shrink-0">
          <CheckCircle2 size={20} className="text-green-400" />
        </button>
        <span className="text-green-400 text-sm font-semibold">Série {setIndex + 1}</span>
        <span className="text-green-600 text-xs">
          {logged?.reps != null && `${logged.reps} reps`}
          {logged?.weightKg != null && ` · ${logged.weightKg}kg`}
          {logged?.durationSeconds != null && ` · ${logged.durationSeconds}s`}
        </span>
        <button
          onClick={() => {
            setReps(logged?.reps?.toString() ?? '')
            setWeight(logged?.weightKg?.toString() ?? effectiveWeight?.toString() ?? '')
            setDuration(logged?.durationSeconds?.toString() ?? '')
            setEditing(true)
          }}
          className="ml-auto p-1.5 text-slate-600 active:text-slate-400 transition-colors"
        >
          <Pencil size={12} />
        </button>
      </div>
    )
  }

  // Not completed — quick validate
  return (
    <div className="flex items-center gap-3 py-1.5 px-1">
      <Circle size={20} className="text-slate-700 flex-shrink-0" />
      <span className="text-slate-500 text-sm">Série {setIndex + 1}</span>
      {effectiveSet.targetReps != null && effectiveSet.targetReps > 0 && (
        <span className="text-slate-700 text-xs">{effectiveSet.targetReps}r</span>
      )}
      {effectiveSet.targetDuration != null && (
        <span className="text-slate-700 text-xs">{formatDuration(effectiveSet.targetDuration)}</span>
      )}
      <button
        onClick={handleQuickValidate}
        className="ml-auto px-3 py-2 rounded-xl bg-indigo-600/80 text-white text-sm font-semibold active:scale-95 transition-transform"
      >
        ✓{restNote}
      </button>
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

  const baseSet = exercise.sets[0]
  const eff: ExerciseSessionOverride = {
    numSets: override?.numSets ?? exercise.sets.length,
    targetReps: override?.targetReps ?? baseSet?.targetReps,
    targetDuration: override?.targetDuration ?? baseSet?.targetDuration,
    restSeconds: override?.restSeconds ?? baseSet?.restSeconds ?? 0,
    weightKg: override?.weightKg,
  }

  const effectiveSets: ExerciseSet[] = Array.from({ length: eff.numSets! }, () => ({
    targetReps: eff.targetReps,
    targetDuration: eff.targetDuration,
    restSeconds: eff.restSeconds!,
  }))

  const completedCount = logs.filter(l => l.exerciseId === exercise.id && l.completed).length
  const total = effectiveSets.length
  const allDone = completedCount >= total
  const showWeight = exercise.hasWeight || exercise.category === 'weight'

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
          <button onClick={() => setOpen(o => !o)} className="p-1 text-slate-500">
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {open && (
        <>
          {/* Description */}
          {exercise.description && (
            <p className="text-slate-500 text-xs px-4 pb-2 leading-relaxed">{exercise.description}</p>
          )}

          {/* Params — always editable inline */}
          <div className="px-4 pt-2 pb-3 border-t border-slate-700/30 flex flex-wrap justify-around gap-x-3 gap-y-2">
            <ParamStepper
              label="Séries"
              display={String(eff.numSets)}
              onDec={() => update({ numSets: Math.max(1, eff.numSets! - 1) })}
              onInc={() => update({ numSets: eff.numSets! + 1 })}
            />

            {exercise.type === 'reps' && (
              <ParamStepper
                label="Reps"
                display={eff.targetReps === 0 ? 'Max' : String(eff.targetReps ?? '—')}
                onDec={() => update({ targetReps: Math.max(0, (eff.targetReps ?? 0) - 1) })}
                onInc={() => update({ targetReps: (eff.targetReps ?? 0) + 1 })}
              />
            )}

            {(exercise.type === 'duration' || exercise.type === 'cardio') && (
              <ParamStepper
                label="Durée"
                display={`${eff.targetDuration ?? 30}s`}
                onDec={() => update({ targetDuration: Math.max(5, (eff.targetDuration ?? 30) - 5) })}
                onInc={() => update({ targetDuration: (eff.targetDuration ?? 30) + 5 })}
              />
            )}

            {showWeight && (
              <ParamStepper
                label="Charge"
                display={eff.weightKg ? `${eff.weightKg}kg` : '—'}
                onDec={() => update({ weightKg: Math.max(0, Math.round(((eff.weightKg ?? 0) - 2.5) * 10) / 10) })}
                onInc={() => update({ weightKg: Math.round(((eff.weightKg ?? 0) + 2.5) * 10) / 10 })}
              />
            )}

            <ParamStepper
              label="Repos"
              display={`${eff.restSeconds ?? 0}s`}
              onDec={() => update({ restSeconds: Math.max(0, (eff.restSeconds ?? 0) - 15) })}
              onInc={() => update({ restSeconds: (eff.restSeconds ?? 0) + 15 })}
            />
          </div>

          {/* Compact set rows */}
          <div className="px-4 pb-3 flex flex-col border-t border-slate-700/30 pt-1">
            {effectiveSets.map((effSet, i) => {
              const logged = logs.find(l => l.exerciseId === exercise.id && l.setIndex === i)
              return (
                <SetRow
                  key={i}
                  setIndex={i}
                  effectiveSet={effSet}
                  effectiveWeight={eff.weightKg}
                  exercise={exercise}
                  logged={logged}
                  onLog={data => onLog(exercise.id, i, data)}
                  onStartTimer={onStartTimer}
                />
              )
            })}
          </div>

          {/* Posture accordion */}
          <PostureSection exercise={exercise} />
        </>
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
    <div className="flex flex-col pb-56 max-w-2xl mx-auto w-full">
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
            onStartTimer={startTimer}
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

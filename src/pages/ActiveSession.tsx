import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { SESSION_BY_ID } from '../data/program'
import { useTimer } from '../store/timerContext'
import { ExerciseImage } from '../components/ExerciseImage'
import type { Exercise, ExerciseSet, LoggedSet, Feeling, ExerciseSessionOverride } from '../types'
import { formatDuration } from '../utils/storage'
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp,
  ArrowLeft, X, Flag, Plus, Minus, Pencil, ImageOff, RotateCcw,
} from 'lucide-react'

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const WEIGHT_PRESETS = [4, 6, 8, 10, 12, 14, 16, 18, 20]

// ─── ParamStepper ─────────────────────────────────────────────────────────────
function ParamStepper({ label, display, onDec, onInc }: { label: string; display: string; onDec: () => void; onInc: () => void }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[9px] text-slate-500 uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-0.5">
        <button onClick={onDec} className="w-6 h-6 rounded-md bg-slate-700/70 flex items-center justify-center active:scale-90 transition-transform">
          <Minus size={9} className="text-slate-300" />
        </button>
        <span className="text-white text-xs font-bold min-w-[30px] text-center tabular-nums">{display}</span>
        <button onClick={onInc} className="w-6 h-6 rounded-md bg-slate-700/70 flex items-center justify-center active:scale-90 transition-transform">
          <Plus size={9} className="text-slate-300" />
        </button>
      </div>
    </div>
  )
}

// ─── PostureSection ────────────────────────────────────────────────────────────
function PostureSection({ exercise }: { exercise: Pick<Exercise, 'imageStart' | 'imageEnd' | 'imageGuide' | 'name'> }) {
  const [open, setOpen] = useState(false)
  const hasImages = exercise.imageStart || exercise.imageEnd || exercise.imageGuide
  return (
    <div className="border-t border-slate-700/25">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-3 py-1.5 active:bg-slate-800/30 transition-colors">
        <span className="text-slate-600 font-medium text-[10px]">Posture</span>
        {open ? <ChevronUp size={11} className="text-slate-700" /> : <ChevronDown size={11} className="text-slate-700" />}
      </button>
      {open && (
        <div className="px-3 pb-2 animate-slide-up">
          {hasImages ? (
            <div className="grid grid-cols-2 gap-1.5">
              {exercise.imageStart && <PostureImg src={exercise.imageStart} label="Départ" />}
              {exercise.imageEnd && <PostureImg src={exercise.imageEnd} label="Arrivée" />}
              {exercise.imageGuide && <div className="col-span-2"><PostureImg src={exercise.imageGuide} label="Guide" /></div>}
            </div>
          ) : (
            <div className="flex items-center justify-center bg-slate-800/40 rounded-lg h-16 gap-2">
              <ImageOff size={14} className="text-slate-700" />
              <span className="text-slate-700 text-[10px]">/public/exercises/</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PostureImg({ src, label }: { src: string; label: string }) {
  const [err, setErr] = useState(false)
  if (err) return (
    <div className="flex items-center justify-center bg-slate-800/50 rounded-lg h-20">
      <ImageOff size={14} className="text-slate-700" />
    </div>
  )
  return (
    <div className="relative">
      <img src={src} alt={label} onError={() => setErr(true)} className="w-full rounded-lg object-cover max-h-32" />
      <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">{label}</span>
    </div>
  )
}

// ─── SetRow ────────────────────────────────────────────────────────────────────
interface SetRowProps {
  setIndex: number; effectiveSet: ExerciseSet; effectiveWeight: number | undefined
  exercise: Exercise; logged?: LoggedSet
  onLog: (data: Omit<LoggedSet, 'exerciseId' | 'setIndex' | 'timestamp'>) => void
  onStartTimer: (seconds: number) => void
}
function SetRow({ setIndex, effectiveSet, effectiveWeight, exercise, logged, onLog, onStartTimer }: SetRowProps) {
  const isCompleted = logged?.completed ?? false
  const [editing, setEditing] = useState(false)
  const [reps, setReps] = useState(logged?.reps?.toString() ?? (effectiveSet.targetReps ? String(effectiveSet.targetReps) : ''))
  const [weight, setWeight] = useState(logged?.weightKg?.toString() ?? effectiveWeight?.toString() ?? '')
  const [duration, setDuration] = useState(logged?.durationSeconds?.toString() ?? (effectiveSet.targetDuration ? String(effectiveSet.targetDuration) : ''))
  const showWeight = exercise.hasWeight || exercise.category === 'weight'

  const handleQuickValidate = () => {
    onLog({ completed: true, reps: effectiveSet.targetReps || undefined, weightKg: effectiveWeight || undefined, durationSeconds: effectiveSet.targetDuration || undefined })
    if (effectiveSet.restSeconds > 0) onStartTimer(effectiveSet.restSeconds)
  }

  if (editing) return (
    <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-2.5 animate-slide-up">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-indigo-400">Série {setIndex + 1}</span>
        <button onClick={() => setEditing(false)} className="ml-auto text-slate-500 p-1"><X size={12} /></button>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        {exercise.type === 'reps' && (
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-400">Reps</span>
            <input type="number" inputMode="numeric" value={reps} onChange={e => setReps(e.target.value)}
              className="bg-slate-700 rounded-lg px-2 py-2 text-white text-sm font-semibold text-center" placeholder="0" />
          </label>
        )}
        {showWeight && (
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-400">Charge (kg)</span>
            <input type="number" inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)}
              className="bg-slate-700 rounded-lg px-2 py-2 text-white text-sm font-semibold text-center" placeholder="0" />
          </label>
        )}
        {(exercise.type === 'duration' || exercise.type === 'cardio') && (
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-400">Durée (s)</span>
            <input type="number" inputMode="numeric" value={duration} onChange={e => setDuration(e.target.value)}
              className="bg-slate-700 rounded-lg px-2 py-2 text-white text-sm font-semibold text-center" placeholder="0" />
          </label>
        )}
      </div>
      <button onClick={() => { onLog({ completed: true, reps: reps ? parseInt(reps) : undefined, weightKg: weight ? parseFloat(weight) : undefined, durationSeconds: duration ? parseInt(duration) : undefined }); setEditing(false) }}
        className="w-full py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold active:scale-95 transition-transform">
        Enregistrer
      </button>
    </div>
  )

  if (isCompleted) return (
    <div className="flex items-center gap-2 py-1 px-0.5">
      <button onClick={() => onLog({ completed: false })}><CheckCircle2 size={16} className="text-green-400" /></button>
      <span className="text-green-400 text-xs font-semibold">S{setIndex + 1}</span>
      <span className="text-green-700 text-[10px]">
        {logged?.reps != null && `${logged.reps}r`}
        {logged?.weightKg != null && ` ${logged.weightKg}kg`}
        {logged?.durationSeconds != null && ` ${logged.durationSeconds}s`}
      </span>
      <button onClick={() => { setReps(logged?.reps?.toString() ?? ''); setWeight(logged?.weightKg?.toString() ?? effectiveWeight?.toString() ?? ''); setDuration(logged?.durationSeconds?.toString() ?? ''); setEditing(true) }}
        className="ml-auto p-1 text-slate-700 active:text-slate-400"><Pencil size={10} /></button>
    </div>
  )

  return (
    <div className="flex items-center gap-2 py-1 px-0.5">
      <Circle size={16} className="text-slate-700 flex-shrink-0" />
      <span className="text-slate-500 text-xs">S{setIndex + 1}</span>
      {effectiveSet.targetReps != null && effectiveSet.targetReps > 0 && <span className="text-slate-700 text-[10px]">{effectiveSet.targetReps}r</span>}
      {effectiveSet.targetDuration != null && <span className="text-slate-700 text-[10px]">{formatDuration(effectiveSet.targetDuration)}</span>}
      <button onClick={handleQuickValidate} className="ml-auto px-2.5 py-1 rounded-lg bg-indigo-600/80 text-white text-xs font-semibold active:scale-95 transition-transform">
        ✓{effectiveSet.restSeconds > 0 ? ` ${effectiveSet.restSeconds}s` : ''}
      </button>
    </div>
  )
}

// ─── ExerciseBlock ─────────────────────────────────────────────────────────────
interface ExerciseBlockProps {
  exercise: Exercise; logs: LoggedSet[]; override?: ExerciseSessionOverride; lastWeight?: number
  onLog: (exerciseId: string, setIndex: number, data: Omit<LoggedSet, 'exerciseId' | 'setIndex' | 'timestamp'>) => void
  onStartTimer: (seconds: number) => void
  onOverride: (exerciseId: string, override: ExerciseSessionOverride) => void
  className?: string
}

function ExerciseBlock({ exercise, logs, override, lastWeight, onLog, onStartTimer, onOverride, className = '' }: ExerciseBlockProps) {
  const [open, setOpen] = useState(true)
  const [showDetails, setShowDetails] = useState(false)
  const isCardio = exercise.type === 'cardio' || exercise.category === 'cardio'

  const baseSet = exercise.sets[0]
  const eff: ExerciseSessionOverride = {
    numSets: override?.numSets ?? exercise.sets.length,
    targetReps: override?.targetReps ?? baseSet?.targetReps,
    targetDuration: override?.targetDuration ?? baseSet?.targetDuration,
    restSeconds: override?.restSeconds ?? baseSet?.restSeconds ?? 0,
    weightKg: override?.weightKg,
  }
  const effectiveWeight = eff.weightKg ?? lastWeight
  const effectiveSets: ExerciseSet[] = Array.from({ length: eff.numSets! }, () => ({
    targetReps: eff.targetReps, targetDuration: eff.targetDuration, restSeconds: eff.restSeconds!,
  }))

  const completedCount = logs.filter(l => l.exerciseId === exercise.id && l.completed).length
  const total = effectiveSets.length
  const allDone = completedCount >= total
  const showWeight = exercise.hasWeight || exercise.category === 'weight'
  const update = (patch: Partial<ExerciseSessionOverride>) => onOverride(exercise.id, { ...eff, ...patch })
  const bulkLogData = { completed: true, reps: eff.targetReps || undefined, weightKg: effectiveWeight || undefined, durationSeconds: eff.targetDuration || undefined }

  const handleValidateExercise = () => {
    for (let i = 0; i < total; i++) {
      const logged = logs.find(l => l.exerciseId === exercise.id && l.setIndex === i)
      if (!logged?.completed) onLog(exercise.id, i, bulkLogData)
    }
    if (eff.restSeconds && eff.restSeconds > 0) onStartTimer(eff.restSeconds)
  }

  const handleResetAll = () => {
    for (let i = 0; i < total; i++) {
      const logged = logs.find(l => l.exerciseId === exercise.id && l.setIndex === i)
      if (logged?.completed) onLog(exercise.id, i, { completed: false })
    }
  }

  const borderClass = allDone ? 'border-green-500/20 bg-green-500/4' : 'border-slate-700/40 bg-slate-800/20'

  return (
    <div className={`rounded-xl border overflow-hidden transition-colors ${borderClass} ${className}`}>
      {/* ── Cardio : layout horizontal compact sur PC ─────────────────────── */}
      {isCardio && (
        <div className="hidden lg:flex items-center gap-3 px-3 py-2">
          <ExerciseImage exercise={exercise} size="sm" className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">{exercise.name}</p>
            {exercise.notes && <p className="text-slate-600 text-[10px]">{exercise.notes}</p>}
          </div>
          <ParamStepper label="Durée" display={`${eff.targetDuration ?? 30}s`}
            onDec={() => update({ targetDuration: Math.max(5, (eff.targetDuration ?? 30) - 15) })}
            onInc={() => update({ targetDuration: (eff.targetDuration ?? 30) + 15 })} />
          <span className={`text-xs font-bold tabular-nums ${allDone ? 'text-green-400' : 'text-slate-500'}`}>{completedCount}/{total}</span>
          {!allDone ? (
            <button onClick={handleValidateExercise}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs active:scale-95 transition-transform">
              <CheckCircle2 size={13} /> Valider
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-green-400 text-xs font-medium">✓ OK</span>
              <button onClick={handleResetAll} className="w-7 h-7 rounded-lg bg-slate-700/40 flex items-center justify-center text-slate-500">
                <RotateCcw size={11} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Mobile header (tous) + PC header pour non-cardio ─────────────── */}
      <div className={`flex items-center gap-2 px-3 py-2 ${isCardio ? 'lg:hidden' : ''}`}>
        <ExerciseImage exercise={exercise} size="sm" />
        <button onClick={() => setOpen(o => !o)} className="flex-1 min-w-0 text-left">
          <p className="text-white font-bold text-sm leading-tight">{exercise.name}</p>
          {exercise.notes && <p className="text-slate-600 text-[10px] mt-0.5 leading-tight">{exercise.notes}</p>}
        </button>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-xs font-bold tabular-nums ${allDone ? 'text-green-400' : 'text-slate-400'}`}>{completedCount}/{total}</span>
          {allDone && <CheckCircle2 size={13} className="text-green-400" />}
          <button onClick={() => setOpen(o => !o)} className="p-0.5 text-slate-600">
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* ── Corps de la carte (mobile always, PC si non-cardio) ───────────── */}
      {open && (
        <div className={isCardio ? 'lg:hidden' : ''}>
          {/* Params */}
          <div className="px-3 pt-1.5 pb-2 border-t border-slate-700/25 flex flex-wrap justify-around gap-x-2 gap-y-1.5">
            <ParamStepper label="Séries" display={String(eff.numSets)}
              onDec={() => update({ numSets: Math.max(1, eff.numSets! - 1) })}
              onInc={() => update({ numSets: eff.numSets! + 1 })} />
            {exercise.type === 'reps' && (
              <ParamStepper label="Reps" display={eff.targetReps === 0 ? 'Max' : String(eff.targetReps ?? '—')}
                onDec={() => update({ targetReps: Math.max(0, (eff.targetReps ?? 0) - 1) })}
                onInc={() => update({ targetReps: (eff.targetReps ?? 0) + 1 })} />
            )}
            {(exercise.type === 'duration' || exercise.type === 'cardio') && (
              <ParamStepper label="Durée" display={`${eff.targetDuration ?? 30}s`}
                onDec={() => update({ targetDuration: Math.max(5, (eff.targetDuration ?? 30) - 5) })}
                onInc={() => update({ targetDuration: (eff.targetDuration ?? 30) + 5 })} />
            )}
            {showWeight && (
              <ParamStepper label="Charge" display={effectiveWeight ? `${effectiveWeight}kg` : '—'}
                onDec={() => update({ weightKg: Math.max(0, Math.round(((effectiveWeight ?? 0) - 2.5) * 10) / 10) })}
                onInc={() => update({ weightKg: Math.round(((effectiveWeight ?? 0) + 2.5) * 10) / 10 })} />
            )}
            <ParamStepper label="Repos" display={`${eff.restSeconds ?? 0}s`}
              onDec={() => update({ restSeconds: Math.max(0, (eff.restSeconds ?? 0) - 15) })}
              onInc={() => update({ restSeconds: (eff.restSeconds ?? 0) + 15 })} />
          </div>

          {/* Poids rapides */}
          {showWeight && (
            <div className="px-3 pb-2 border-t border-slate-700/20 pt-1.5">
              <div className="flex gap-1 overflow-x-auto pb-0.5">
                {WEIGHT_PRESETS.map(kg => (
                  <button key={kg} onClick={() => update({ weightKg: kg })}
                    className={`flex-shrink-0 w-9 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                      effectiveWeight === kg ? 'bg-indigo-600 text-white'
                      : !eff.weightKg && lastWeight === kg ? 'bg-indigo-900/50 text-indigo-300 ring-1 ring-indigo-500/30'
                      : 'bg-slate-700/70 text-slate-400 active:bg-slate-600'}`}>
                    {kg}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bouton valider */}
          <div className="px-3 pb-2 pt-1 border-t border-slate-700/25">
            {!allDone ? (
              <button onClick={handleValidateExercise}
                className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm active:scale-95 transition-transform flex items-center justify-center gap-1.5">
                <CheckCircle2 size={14} />
                Valider l'exercice
                <span className="text-indigo-300 text-[10px] font-normal">({total - completedCount} s.)</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex-1 text-center text-green-400 text-xs font-medium">Terminé ✓</span>
                <button onClick={handleResetAll} className="w-8 h-8 rounded-xl bg-slate-700/40 flex items-center justify-center text-slate-500 active:scale-95">
                  <RotateCcw size={11} />
                </button>
              </div>
            )}
          </div>

          {/* Détails séries */}
          <div className="border-t border-slate-700/20">
            <button onClick={() => setShowDetails(d => !d)}
              className="w-full flex items-center justify-between px-3 py-1 active:bg-slate-800/20 transition-colors">
              <span className="text-slate-700 text-[10px]">Modifier série par série</span>
              {showDetails ? <ChevronUp size={10} className="text-slate-700" /> : <ChevronDown size={10} className="text-slate-700" />}
            </button>
            {showDetails && (
              <div className="px-3 pb-2 flex flex-col border-t border-slate-700/20 pt-1 animate-slide-up">
                {effectiveSets.map((effSet, i) => {
                  const logged = logs.find(l => l.exerciseId === exercise.id && l.setIndex === i)
                  return (
                    <SetRow key={i} setIndex={i} effectiveSet={effSet} effectiveWeight={effectiveWeight}
                      exercise={exercise} logged={logged}
                      onLog={data => onLog(exercise.id, i, data)} onStartTimer={onStartTimer} />
                  )
                })}
              </div>
            )}
          </div>

          <PostureSection exercise={exercise} />
        </div>
      )}
    </div>
  )
}

// ─── Feeling selector ─────────────────────────────────────────────────────────
const FEELING_OPTIONS: { value: Feeling; label: string; emoji: string }[] = [
  { value: 'easy', label: 'Facile', emoji: '😊' },
  { value: 'normal', label: 'Normal', emoji: '😐' },
  { value: 'hard', label: 'Difficile', emoji: '😤' },
  { value: 'very_hard', label: 'Très difficile', emoji: '🥵' },
]

// ─── ActiveSession ────────────────────────────────────────────────────────────
export function ActiveSession() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  const { start: startTimer, timerState } = useTimer()
  const session = sessionId ? SESSION_BY_ID[sessionId] : null

  const [showFinish, setShowFinish] = useState(false)
  const [feeling, setFeeling] = useState<Feeling>('normal')
  const [sessionComment, setSessionComment] = useState('')
  const startTimeRef = useRef(new Date().toISOString())

  // Terminer button fixed : au-dessus de la nav uniquement (plus d'idle timer en bas)
  const timerIsActive = timerState.running || timerState.finished || timerState.remaining !== timerState.total

  const lastWeightByExercise = useMemo(() => {
    const result: Record<string, number> = {}
    for (const s of state.sessions) {
      for (const set of s.sets) {
        if (set.weightKg && set.completed && !(set.exerciseId in result)) {
          result[set.exerciseId] = set.weightKg
        }
      }
    }
    return result
  }, [state.sessions])

  useEffect(() => {
    if (!session) return
    if (!state.activeSessionLog || state.activeSessionLog.sessionId !== session.id) {
      dispatch({
        type: 'START_SESSION',
        payload: { id: generateId(), sessionId: session.id, date: new Date().toISOString().split('T')[0], startTime: startTimeRef.current, status: 'in_progress', sets: [] },
      })
    }
  }, [session?.id])

  if (!session) return (
    <div className="flex flex-col items-center justify-center h-full p-8 gap-4">
      <p className="text-slate-400">Séance introuvable.</p>
      <button onClick={() => navigate('/')} className="text-indigo-400">Retour</button>
    </div>
  )

  const logs = state.activeSessionLog?.sets ?? []
  const overrides = state.activeSessionLog?.exerciseOverrides ?? {}
  const totalSets = session.exercises.reduce((acc, ex) => acc + (overrides[ex.id]?.numSets ?? ex.sets.length), 0)
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
    dispatch({ type: 'COMPLETE_SESSION', payload: { status: isShort ? 'done_short' : 'done', feeling, comment: sessionComment, totalMinutes } })
    navigate('/')
  }
  const handleCancel = () => { dispatch({ type: 'CANCEL_SESSION' }); navigate('/') }

  // Hauteur du footer fixe : nav(60) + bouton Terminer(~52) = 112px ; si timer actif, monte d'autant
  const terminateBottom = timerIsActive ? 262 : 62

  return (
    <div className="flex flex-col pb-[280px] max-w-5xl mx-auto w-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-slate-950/97 backdrop-blur border-b border-slate-700/50 px-3 pt-2.5 pb-2">
        <div className="flex items-center gap-2 mb-1.5">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl text-slate-400 active:bg-slate-800 transition-colors flex-shrink-0">
            <ArrowLeft size={17} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-500">{session.dayLabel}</p>
            <h2 className="text-sm font-bold text-white leading-tight truncate">{session.name}</h2>
          </div>
          <button onClick={() => setShowFinish(true)}
            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-green-600 text-white font-bold text-xs active:scale-95 transition-transform">
            <Flag size={12} /> Terminer
          </button>
          <button onClick={handleCancel} className="p-1.5 rounded-xl text-slate-600 active:bg-slate-800 transition-colors flex-shrink-0">
            <X size={15} />
          </button>
        </div>
        <div className="h-1 bg-slate-800/80 rounded-full">
          <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="text-[10px] text-slate-600 text-center mt-0.5">{completedSets} / {totalSets} séries</p>
      </div>

      {/* Grille exercices — 2 colonnes sur PC, cardio pleine largeur */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 px-3 pt-3">
        {session.exercises.map(ex => {
          const isCardio = ex.type === 'cardio' || ex.category === 'cardio'
          return (
            <ExerciseBlock key={ex.id} exercise={ex} logs={logs} override={overrides[ex.id]}
              lastWeight={lastWeightByExercise[ex.id]}
              onLog={handleLog} onStartTimer={startTimer} onOverride={handleOverride}
              className={isCardio ? 'lg:col-span-2' : ''} />
          )
        })}
      </div>

      {/* Bouton Terminer en bas du scroll (jamais masqué) */}
      <div className="px-3 pt-3 pb-2 flex flex-col gap-2">
        <button onClick={() => setShowFinish(true)}
          className="w-full py-3.5 rounded-2xl bg-green-600 text-white font-bold text-base active:scale-95 transition-transform flex items-center justify-center gap-2">
          <Flag size={17} /> Terminer la séance
        </button>
        {session.hasShortVersion && (
          <button onClick={() => handleFinish(true)}
            className="w-full py-2.5 rounded-2xl bg-teal-600/70 text-white font-semibold text-sm active:scale-95 transition-transform">
            Valider séance courte (≥ 10 min)
          </button>
        )}
        <button onClick={handleCancel}
          className="w-full py-2.5 rounded-2xl bg-slate-800/60 text-slate-400 font-semibold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2">
          <X size={14} /> Abandonner
        </button>
      </div>

      {/* Bouton Terminer fixe — au-dessus de la nav, décale si timer actif */}
      <div className="fixed left-0 right-0 z-[45] px-4"
        style={{ bottom: `${terminateBottom}px` }}>
        <button onClick={() => setShowFinish(true)}
          className="w-full max-w-5xl mx-auto flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-700/90 backdrop-blur text-white font-bold text-sm active:scale-95 transition-transform border border-green-500/30">
          <Flag size={15} /> Terminer la séance
        </button>
      </div>

      {/* Modale fin de séance */}
      {showFinish && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowFinish(false) }}>
          <div className="bg-slate-800 rounded-3xl w-full max-w-md flex flex-col animate-bounce-in"
            style={{ maxHeight: 'min(85dvh, 600px)' }}>
            <div className="overflow-y-auto flex-1 px-6 pt-6 pb-2">
              <div className="flex items-start justify-between mb-1">
                <h3 className="text-xl font-bold text-white">Terminer la séance</h3>
                <button onClick={() => setShowFinish(false)} className="p-1 text-slate-500"><X size={18} /></button>
              </div>
              <p className="text-slate-400 text-sm mb-5">{completedSets} / {totalSets} séries réalisées</p>
              <p className="text-sm font-semibold text-slate-300 mb-3">Comment tu te sens ?</p>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {FEELING_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setFeeling(opt.value)}
                    className={`py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${feeling === opt.value ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                    <span>{opt.emoji}</span>{opt.label}
                  </button>
                ))}
              </div>
              <label className="flex flex-col gap-1 mb-3">
                <span className="text-sm font-semibold text-slate-300">Commentaire (optionnel)</span>
                <textarea value={sessionComment} onChange={e => setSessionComment(e.target.value)} rows={2}
                  className="bg-slate-700 rounded-xl px-3 py-2 text-white text-sm resize-none" placeholder="Notes sur la séance..." />
              </label>
            </div>
            <div className="px-6 py-4 border-t border-slate-700/50 flex gap-3 flex-shrink-0">
              <button onClick={() => setShowFinish(false)}
                className="flex-1 py-3.5 rounded-xl bg-slate-700 text-slate-300 font-semibold active:scale-95 transition-transform">
                Retour
              </button>
              <button onClick={() => handleFinish(false)}
                className="flex-1 py-3.5 rounded-xl bg-green-600 text-white font-bold active:scale-95 transition-transform">
                Valider ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { buildSessionById } from '../data/program'
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

const WEIGHT_PRESETS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]

// ─── NumericStepper ────────────────────────────────────────────────────────────
function NumericStepper({ label, value, onChange, unit = '', min = 0, max, step = 1, displayValue }: {
  label: string; value: number; onChange: (v: number) => void
  unit?: string; min?: number; max?: number; step?: number
  displayValue?: string // if provided, show static text (for "Max" etc.) instead of input
}) {
  const dec = () => onChange(Math.max(min, value - step))
  const inc = () => onChange(max !== undefined ? Math.min(max, value + step) : value + step)
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">{label}</span>
      <div className="flex items-center gap-1">
        <button onClick={dec} className="w-7 h-7 rounded-md bg-slate-700/70 flex items-center justify-center active:scale-90 transition-transform">
          <Minus size={10} className="text-slate-300" />
        </button>
        {displayValue !== undefined
          ? <span className="text-white text-sm font-bold min-w-[36px] text-center tabular-nums">{displayValue}</span>
          : (
            <div className="flex items-center">
              <input
                type="number" inputMode="numeric" value={value}
                onChange={e => {
                  const v = Number(e.target.value)
                  if (!isNaN(v)) onChange(max !== undefined ? Math.min(max, Math.max(min, v)) : Math.max(min, v))
                }}
                className="w-12 text-center bg-slate-700/60 border border-slate-600/30 rounded text-white text-sm font-bold tabular-nums px-1 py-0.5 focus:outline-none focus:border-indigo-500/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              {unit && <span className="text-slate-400 text-[11px] ml-0.5">{unit}</span>}
            </div>
          )
        }
        <button onClick={inc} className="w-7 h-7 rounded-md bg-slate-700/70 flex items-center justify-center active:scale-90 transition-transform">
          <Plus size={10} className="text-slate-300" />
        </button>
      </div>
    </div>
  )
}

// ─── PostureLightbox ──────────────────────────────────────────────────────────
function PostureLightbox({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative max-w-[90vw] max-h-[85dvh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm font-bold px-3 py-1 bg-slate-800/80 rounded-lg"
        >
          ✕ Fermer
        </button>
        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
          <img src={src} alt={name} className="max-w-[88vw] max-h-[78dvh] object-contain" />
        </div>
        <p className="mt-2 text-slate-400 text-sm font-medium">{name}</p>
      </div>
    </div>
  )
}

// ─── PostureMiniature ─────────────────────────────────────────────────────────
function PostureMiniature({ exercise }: { exercise: Pick<Exercise, 'imageGuide' | 'imageUrl' | 'name'> }) {
  const [err, setErr] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const src = exercise.imageGuide ?? exercise.imageUrl
  if (!src || err) return (
    <div className="flex-shrink-0 rounded-xl border border-slate-600/50 bg-slate-800/70 flex flex-col items-center justify-center gap-1"
      style={{ width: 'clamp(64px,7.5vw,88px)', height: 'clamp(50px,6vw,70px)', minWidth: 64 }}>
      <ImageOff size={13} className="text-slate-600" />
      <span className="text-slate-600 text-[8px] text-center leading-tight px-1">Image manquante</span>
    </div>
  )
  return (
    <>
      <button
        onClick={() => setLightbox(true)}
        className="flex-shrink-0 rounded-xl border-2 border-slate-500/50 overflow-hidden bg-white shadow-sm active:scale-95 transition-transform cursor-zoom-in"
        style={{ width: 'clamp(64px,7.5vw,88px)', height: 'clamp(50px,6vw,70px)', minWidth: 64 }}
        title="Voir en grand"
      >
        <img src={src} alt={`Posture ${exercise.name}`} onError={() => setErr(true)}
          className="w-full h-full object-contain" />
      </button>
      {lightbox && <PostureLightbox src={src} name={exercise.name} onClose={() => setLightbox(false)} />}
    </>
  )
}

// ─── PostureSection ────────────────────────────────────────────────────────────
function PostureSection({ exercise }: { exercise: Pick<Exercise, 'imageStart' | 'imageEnd' | 'imageGuide' | 'name'> }) {
  const [open, setOpen] = useState(false)
  const hasImages = exercise.imageStart || exercise.imageEnd || exercise.imageGuide
  return (
    <div className="border-t border-slate-700/25">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-3 py-2 active:bg-slate-800/30 transition-colors">
        <span className="text-slate-500 font-medium text-xs">Posture</span>
        {open ? <ChevronUp size={12} className="text-slate-600" /> : <ChevronDown size={12} className="text-slate-600" />}
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
              <span className="text-slate-700 text-xs">/public/exercises/</span>
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
  const isCardio = exercise.type === 'cardio' || exercise.category === 'cardio'
  const [reps, setReps] = useState(logged?.reps?.toString() ?? (effectiveSet.targetReps ? String(effectiveSet.targetReps) : ''))
  const [weight, setWeight] = useState(logged?.weightKg?.toString() ?? effectiveWeight?.toString() ?? '')
  const [duration, setDuration] = useState(logged?.durationSeconds?.toString() ?? (effectiveSet.targetDuration ? String(effectiveSet.targetDuration) : ''))
  const [distance, setDistance] = useState(logged?.distanceMeters?.toString() ?? '')
  const [strokes, setStrokes] = useState(logged?.strokesCount?.toString() ?? '')
  const [intensity, setIntensity] = useState(logged?.intensity?.toString() ?? '')
  const showWeight = exercise.hasWeight || exercise.category === 'weight'

  const handleQuickValidate = () => {
    onLog({ completed: true, reps: effectiveSet.targetReps || undefined, weightKg: effectiveWeight || undefined, durationSeconds: effectiveSet.targetDuration || undefined })
    if (effectiveSet.restSeconds > 0) onStartTimer(effectiveSet.restSeconds)
  }

  if (editing) return (
    <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 animate-slide-up">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-sm font-bold text-indigo-400">Série {setIndex + 1}</span>
        <button onClick={() => setEditing(false)} className="ml-auto text-slate-500 p-1"><X size={12} /></button>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {exercise.type === 'reps' && (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-medium">Reps</span>
            <input type="number" inputMode="numeric" value={reps} onChange={e => setReps(e.target.value)}
              className="bg-slate-700 rounded-lg px-2 py-2.5 text-white text-sm font-semibold text-center" placeholder="0" />
          </label>
        )}
        {isCardio && (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-medium">Répétitions / intervalles</span>
            <input type="number" inputMode="numeric" value={reps} onChange={e => setReps(e.target.value)}
              className="bg-slate-700 rounded-lg px-2 py-2.5 text-white text-sm font-semibold text-center" placeholder="0" />
          </label>
        )}
        {showWeight && (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-medium">Charge (kg)</span>
            <input type="number" inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)}
              className="bg-slate-700 rounded-lg px-2 py-2.5 text-white text-sm font-semibold text-center" placeholder="0" />
          </label>
        )}
        {(exercise.type === 'duration' || isCardio) && (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-medium">Durée (s)</span>
            <input type="number" inputMode="numeric" value={duration} onChange={e => setDuration(e.target.value)}
              className="bg-slate-700 rounded-lg px-2 py-2.5 text-white text-sm font-semibold text-center" placeholder="0" />
          </label>
        )}
        {isCardio && (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400 font-medium">Distance (m)</span>
              <input type="number" inputMode="numeric" value={distance} onChange={e => setDistance(e.target.value)}
                className="bg-slate-700 rounded-lg px-2 py-2.5 text-white text-sm font-semibold text-center" placeholder="ex. 150" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400 font-medium">Coups / mouvements</span>
              <input type="number" inputMode="numeric" value={strokes} onChange={e => setStrokes(e.target.value)}
                className="bg-slate-700 rounded-lg px-2 py-2.5 text-white text-sm font-semibold text-center" placeholder="0" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400 font-medium">Intensité (1-10)</span>
              <input type="number" inputMode="numeric" value={intensity} onChange={e => setIntensity(e.target.value)}
                min={1} max={10}
                className="bg-slate-700 rounded-lg px-2 py-2.5 text-white text-sm font-semibold text-center" placeholder="5" />
            </label>
          </>
        )}
      </div>
      <button onClick={() => {
        onLog({
          completed: true,
          reps: reps ? parseInt(reps) : undefined,
          weightKg: weight ? parseFloat(weight) : undefined,
          durationSeconds: duration ? parseInt(duration) : undefined,
          distanceMeters: distance ? parseInt(distance) : undefined,
          strokesCount: strokes ? parseInt(strokes) : undefined,
          intensity: intensity ? Math.min(10, Math.max(1, parseInt(intensity))) : undefined,
        })
        setEditing(false)
      }}
        className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold active:scale-95 transition-transform">
        Enregistrer
      </button>
    </div>
  )

  if (isCompleted) return (
    <div className="flex items-center gap-2 py-1.5 px-0.5">
      <button onClick={() => onLog({ completed: false })}><CheckCircle2 size={17} className="text-green-400" /></button>
      <span className="text-green-400 text-sm font-semibold">S{setIndex + 1}</span>
      <span className="text-green-700 text-xs">
        {logged?.reps != null && `${logged.reps}r`}
        {logged?.weightKg != null && ` ${logged.weightKg}kg`}
        {logged?.durationSeconds != null && ` ${logged.durationSeconds}s`}
        {logged?.distanceMeters != null && ` ${logged.distanceMeters}m`}
        {logged?.strokesCount != null && ` ${logged.strokesCount}coups`}
        {logged?.intensity != null && ` i${logged.intensity}`}
      </span>
      <button onClick={() => {
        setReps(logged?.reps?.toString() ?? '')
        setWeight(logged?.weightKg?.toString() ?? effectiveWeight?.toString() ?? '')
        setDuration(logged?.durationSeconds?.toString() ?? '')
        setDistance(logged?.distanceMeters?.toString() ?? '')
        setStrokes(logged?.strokesCount?.toString() ?? '')
        setIntensity(logged?.intensity?.toString() ?? '')
        setEditing(true)
      }}
        className="ml-auto p-1 text-slate-700 active:text-slate-400"><Pencil size={11} /></button>
    </div>
  )

  return (
    <div className="flex items-center gap-2 py-1.5 px-0.5">
      <Circle size={17} className="text-slate-700 flex-shrink-0" />
      <span className="text-slate-400 text-sm">S{setIndex + 1}</span>
      {effectiveSet.targetReps != null && effectiveSet.targetReps > 0 && <span className="text-slate-600 text-xs">{effectiveSet.targetReps}r</span>}
      {effectiveSet.targetDuration != null && <span className="text-slate-600 text-xs">{formatDuration(effectiveSet.targetDuration)}</span>}
      <button onClick={handleQuickValidate} className="ml-auto px-3 py-1.5 rounded-lg bg-indigo-600/80 text-white text-xs font-semibold active:scale-95 transition-transform">
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
    intensity: override?.intensity ?? (isCardio ? 5 : undefined),
    targetStrokes: override?.targetStrokes ?? 0,
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

  const borderClass = allDone
    ? 'border-green-400/50 bg-green-500/5 shadow-[0_0_14px_rgba(74,222,128,0.10)]'
    : 'border-indigo-500/35 bg-slate-800/40 shadow-[0_2px_16px_rgba(0,0,0,0.35)]'

  return (
    <div className={`rounded-xl border overflow-hidden transition-colors ${borderClass} ${className}`}>
      {/* Cardio : layout sur PC — image + nom + params + actions */}
      {isCardio && (
        <div className="hidden lg:block px-3 py-2.5">
          <div className="flex items-center gap-3">
            <ExerciseImage exercise={exercise} size="sm" className="flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-base leading-tight">{exercise.name}</p>
              {exercise.notes && <p className="text-slate-500 text-xs mt-0.5">{exercise.notes}</p>}
            </div>
            <span className={`text-sm font-bold tabular-nums ${allDone ? 'text-green-400' : 'text-slate-500'}`}>{completedCount}/{total}</span>
            {!allDone ? (
              <button onClick={handleValidateExercise}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm active:scale-95 transition-transform">
                <CheckCircle2 size={14} /> Valider
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-sm font-medium">✓ OK</span>
                <button onClick={handleResetAll} className="w-8 h-8 rounded-lg bg-slate-700/40 flex items-center justify-center text-slate-500">
                  <RotateCcw size={12} />
                </button>
              </div>
            )}
          </div>
          {/* Params row */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 pt-2 border-t border-slate-700/20">
            <NumericStepper label="Séries" value={eff.numSets!} onChange={v => update({ numSets: v })} min={1} step={1} />
            <NumericStepper label="Durée" value={eff.targetDuration ?? 30} onChange={v => update({ targetDuration: v })} min={5} step={15} unit="s" />
            <NumericStepper label="Intensité" value={eff.intensity ?? 5} onChange={v => update({ intensity: v })} min={1} max={10} step={1} />
            <NumericStepper label="Coups" value={eff.targetStrokes ?? 0} onChange={v => update({ targetStrokes: v })} min={0} step={5} />
            <NumericStepper label="Repos" value={eff.restSeconds ?? 0} onChange={v => update({ restSeconds: v })} min={0} step={15} unit="s" />
          </div>
        </div>
      )}

      {/* Mobile header (tous) + PC header pour non-cardio */}
      <div className={`flex items-center gap-2.5 px-3 py-2.5 ${isCardio ? 'lg:hidden' : ''}`}>
        <PostureMiniature exercise={exercise} />
        <button onClick={() => setOpen(o => !o)} className="flex-1 min-w-0 text-left">
          <p className="text-white font-bold text-lg leading-tight">{exercise.name}</p>
          {exercise.notes && <p className="text-slate-400 text-sm mt-0.5 leading-tight">{exercise.notes}</p>}
        </button>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-sm font-bold tabular-nums ${allDone ? 'text-green-400' : 'text-slate-400'}`}>{completedCount}/{total}</span>
          {allDone && <CheckCircle2 size={14} className="text-green-400" />}
          <button onClick={() => setOpen(o => !o)} className="p-0.5 text-slate-600">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Corps de la carte */}
      {open && (
        <div className={isCardio ? 'lg:hidden' : ''}>
          {/* Params */}
          <div className="px-3 pt-2 pb-2.5 border-t border-slate-700/25 flex flex-wrap justify-around gap-x-3 gap-y-2">
            <NumericStepper label="Séries" value={eff.numSets!} onChange={v => update({ numSets: v })} min={1} step={1} />
            {exercise.type === 'reps' && (
              <NumericStepper label="Reps" value={eff.targetReps ?? 0} onChange={v => update({ targetReps: v })} min={0} step={1}
                displayValue={eff.targetReps === 0 ? 'Max' : undefined} />
            )}
            {(exercise.type === 'duration' || isCardio) && (
              <NumericStepper label="Durée" value={eff.targetDuration ?? 30} onChange={v => update({ targetDuration: v })} min={5} step={5} unit="s" />
            )}
            {isCardio && (
              <>
                <NumericStepper label="Intensité" value={eff.intensity ?? 5} onChange={v => update({ intensity: v })} min={1} max={10} step={1} />
                <NumericStepper label="Coups" value={eff.targetStrokes ?? 0} onChange={v => update({ targetStrokes: v })} min={0} step={5} />
              </>
            )}
            {showWeight && (
              <NumericStepper label="Charge" value={effectiveWeight ?? 0} onChange={v => update({ weightKg: v })} min={0} step={2}
                displayValue={!effectiveWeight ? '—' : undefined} unit={effectiveWeight ? 'kg' : ''} />
            )}
            <NumericStepper label="Repos" value={eff.restSeconds ?? 0} onChange={v => update({ restSeconds: v })} min={0} step={15} unit="s" />
          </div>

          {/* Poids rapides */}
          {showWeight && (
            <div className="px-3 pb-2.5 border-t border-slate-700/20 pt-2">
              <div className="flex gap-1 overflow-x-auto pb-0.5">
                {WEIGHT_PRESETS.map(kg => (
                  <button key={kg} onClick={() => update({ weightKg: kg })}
                    className={`flex-shrink-0 w-10 py-1.5 rounded-lg text-xs font-bold transition-colors ${
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
          <div className="px-3 pb-2.5 pt-1.5 border-t border-slate-700/25">
            {!allDone ? (
              <button onClick={handleValidateExercise}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2">
                <CheckCircle2 size={15} />
                Valider l'exercice
                <span className="text-indigo-300 text-xs font-normal">({total - completedCount} s.)</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex-1 text-center text-green-400 text-sm font-medium">Terminé ✓</span>
                <button onClick={handleResetAll} className="w-8 h-8 rounded-xl bg-slate-700/40 flex items-center justify-center text-slate-500 active:scale-95">
                  <RotateCcw size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Détails séries */}
          <div className="border-t border-slate-700/20">
            <button onClick={() => setShowDetails(d => !d)}
              className="w-full flex items-center justify-between px-3 py-1.5 active:bg-slate-800/20 transition-colors">
              <span className="text-slate-600 text-xs">Modifier série par série</span>
              {showDetails ? <ChevronUp size={11} className="text-slate-700" /> : <ChevronDown size={11} className="text-slate-700" />}
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
  const { start: startTimer } = useTimer()
  const sessionById = useMemo(() => buildSessionById(state.customProgram), [state.customProgram])
  const session = sessionId ? sessionById[sessionId] : null

  const [showFinish, setShowFinish] = useState(false)
  const [feeling, setFeeling] = useState<Feeling>('normal')
  const [sessionComment, setSessionComment] = useState('')
  const startTimeRef = useRef(new Date().toISOString())

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

  return (
    <div className="flex flex-col pb-[80px] lg:pb-8 max-w-[1600px] mx-auto w-full px-0 lg:px-8">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-slate-950/97 backdrop-blur border-b border-slate-700/50 px-3 pt-2.5 pb-2">
        <div className="flex items-center gap-2 mb-1.5">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl text-slate-400 active:bg-slate-800 transition-colors flex-shrink-0">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500">{session.dayLabel}</p>
            <h2 className="text-base font-bold text-white leading-tight truncate">{session.name}</h2>
          </div>
          <button onClick={() => setShowFinish(true)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600 text-white font-bold text-sm active:scale-95 transition-transform">
            <Flag size={13} /> Terminer
          </button>
          <button onClick={handleCancel} className="p-1.5 rounded-xl text-slate-600 active:bg-slate-800 transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>
        <div className="h-1.5 bg-slate-800/80 rounded-full">
          <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="text-xs text-slate-500 text-center mt-0.5">{completedSets} / {totalSets} séries</p>
      </div>

      {/* Grille exercices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 px-3 pt-3">
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

      {/* Bouton Terminer in-flow */}
      <div className="px-3 pt-4 pb-2">
        <button onClick={() => setShowFinish(true)}
          className="w-full py-4 rounded-2xl bg-green-600 text-white font-bold text-base active:scale-95 transition-transform shadow-lg shadow-green-900/30 flex items-center justify-center gap-2">
          <Flag size={18} /> Terminer la séance
        </button>
      </div>

      {/* Actions secondaires */}
      <div className="px-3 pb-3 flex flex-col gap-2">
        {session.hasShortVersion && (
          <button onClick={() => handleFinish(true)}
            className="w-full py-3 rounded-2xl bg-teal-600/70 text-white font-semibold text-sm active:scale-95 transition-transform">
            Valider séance courte (≥ 10 min)
          </button>
        )}
        <button onClick={handleCancel}
          className="w-full py-3 rounded-2xl bg-slate-800/60 text-slate-400 font-semibold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2">
          <X size={14} /> Abandonner
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
                className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-semibold text-sm">
                Continuer
              </button>
              <button onClick={() => handleFinish(false)}
                className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold text-sm active:scale-95 transition-transform">
                Terminer ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

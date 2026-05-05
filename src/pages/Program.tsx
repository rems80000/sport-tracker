import { useState, useCallback } from 'react'
import { useStore } from '../store/useStore'
import { PROGRAM } from '../data/program'
import { ChevronDown, ChevronUp, Dumbbell, Clock, Repeat, Pencil, Trash2, Plus, X, RotateCcw, Check } from 'lucide-react'
import type { Exercise, ExerciseType, ExerciseCategory, WorkoutSession, DayOfWeek } from '../types'
import { formatDuration } from '../utils/storage'

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Lundi', tuesday: 'Mardi', wednesday: 'Mercredi',
  thursday: 'Jeudi', friday: 'Vendredi', saturday: 'Samedi', sunday: 'Dimanche',
}
const DAY_OPTIONS = Object.entries(DAY_LABELS) as [DayOfWeek, string][]

const EX_TYPES: { value: ExerciseType; label: string }[] = [
  { value: 'reps', label: 'Répétitions' },
  { value: 'duration', label: 'Durée' },
  { value: 'cardio', label: 'Cardio' },
]
const EX_CATS: { value: ExerciseCategory; label: string }[] = [
  { value: 'weight', label: 'Haltères / Poids' },
  { value: 'bodyweight', label: 'Poids du corps' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'plank', label: 'Gainage / Planche' },
  { value: 'mobility', label: 'Mobilité' },
  { value: 'other', label: 'Autre' },
]

function uid() { return `ex_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}` }

// ─── ExerciseEditRow ──────────────────────────────────────────────────────────
interface ExerciseEditRowProps {
  ex: Exercise
  editing: boolean
  onToggleEdit: () => void
  onSave: (ex: Exercise) => void
  onDelete: () => void
}
function ExerciseEditRow({ ex, editing, onToggleEdit, onSave, onDelete }: ExerciseEditRowProps) {
  const [draft, setDraft] = useState<Exercise>(() => JSON.parse(JSON.stringify(ex)))
  const firstSet = ex.sets[0] ?? { restSeconds: 60 }
  const p = (f: Partial<Exercise>) => setDraft(d => ({ ...d, ...f }))

  const numSets = draft.sets.length || 1
  const targetReps = draft.sets[0]?.targetReps ?? 10
  const targetDuration = draft.sets[0]?.targetDuration ?? 30
  const restSeconds = draft.sets[0]?.restSeconds ?? 60

  const rebuildSets = (overrides: { numSets?: number; targetReps?: number; targetDuration?: number; restSeconds?: number }) => {
    const n = overrides.numSets ?? numSets
    const reps = overrides.targetReps ?? targetReps
    const dur = overrides.targetDuration ?? targetDuration
    const rest = overrides.restSeconds ?? restSeconds
    const type = draft.type
    setDraft(d => ({
      ...d,
      sets: Array.from({ length: n }, () => ({
        ...(type === 'reps' ? { targetReps: reps } : {}),
        ...(type === 'duration' || type === 'cardio' ? { targetDuration: dur } : {}),
        restSeconds: rest,
      })),
    }))
  }

  const saveAndClose = () => { onSave(draft); onToggleEdit() }

  if (!editing) {
    const target = ex.type === 'reps'
      ? firstSet.targetReps === 0 ? 'Max' : `${firstSet.targetReps} reps`
      : ex.type === 'duration' ? formatDuration(firstSet.targetDuration ?? 0)
      : firstSet.targetDuration ? formatDuration(firstSet.targetDuration) : '—'
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 border border-slate-700/40 rounded-xl bg-slate-800/30">
        <span className="text-base leading-none flex-shrink-0">{ex.thumbnail ?? '•'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{ex.name}</p>
          <p className="text-slate-500 text-xs">
            {ex.type === 'cardio' ? target : `${ex.sets.length} × ${target}`}
            {firstSet.restSeconds > 0 && ` · repos ${firstSet.restSeconds}s`}
          </p>
        </div>
        <button onClick={onToggleEdit} className="p-1.5 text-slate-500 hover:text-indigo-400 transition-colors">
          <Pencil size={14} />
        </button>
        <button onClick={onDelete} className="p-1.5 text-slate-600 hover:text-red-400 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    )
  }

  return (
    <div className="border border-indigo-500/40 rounded-xl bg-indigo-500/5 p-3 flex flex-col gap-2.5">
      <div className="flex gap-2">
        <input value={draft.thumbnail ?? ''} onChange={e => p({ thumbnail: e.target.value })}
          className="w-12 bg-slate-700/60 border border-slate-600/40 rounded-lg text-center text-lg px-1 py-1.5 focus:outline-none focus:border-indigo-500/60"
          placeholder="💪" maxLength={2} />
        <input value={draft.name} onChange={e => p({ name: e.target.value })}
          className="flex-1 bg-slate-700/60 border border-slate-600/40 rounded-lg px-3 py-1.5 text-white text-sm font-semibold focus:outline-none focus:border-indigo-500/60"
          placeholder="Nom de l'exercice" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Type</span>
          <select value={draft.type}
            onChange={e => { p({ type: e.target.value as ExerciseType }); rebuildSets({}) }}
            className="bg-slate-700/60 border border-slate-600/40 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500/60">
            {EX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Catégorie</span>
          <select value={draft.category ?? 'other'}
            onChange={e => p({ category: e.target.value as ExerciseCategory })}
            className="bg-slate-700/60 border border-slate-600/40 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500/60">
            {EX_CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Séries</span>
          <input type="number" inputMode="numeric" value={numSets}
            onChange={e => rebuildSets({ numSets: Math.max(1, parseInt(e.target.value) || 1) })}
            className="bg-slate-700/60 border border-slate-600/40 rounded-lg px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:border-indigo-500/60" />
        </div>
        {draft.type === 'reps' && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Reps</span>
            <input type="number" inputMode="numeric" value={targetReps}
              onChange={e => rebuildSets({ targetReps: Math.max(0, parseInt(e.target.value) || 0) })}
              className="bg-slate-700/60 border border-slate-600/40 rounded-lg px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:border-indigo-500/60" />
          </div>
        )}
        {(draft.type === 'duration' || draft.type === 'cardio') && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Durée (s)</span>
            <input type="number" inputMode="numeric" value={targetDuration}
              onChange={e => rebuildSets({ targetDuration: Math.max(5, parseInt(e.target.value) || 30) })}
              className="bg-slate-700/60 border border-slate-600/40 rounded-lg px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:border-indigo-500/60" />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Repos (s)</span>
          <input type="number" inputMode="numeric" value={restSeconds}
            onChange={e => rebuildSets({ restSeconds: Math.max(0, parseInt(e.target.value) || 0) })}
            className="bg-slate-700/60 border border-slate-600/40 rounded-lg px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:border-indigo-500/60" />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={!!draft.hasWeight} onChange={e => p({ hasWeight: e.target.checked })}
          className="w-4 h-4 rounded accent-indigo-500" />
        <span className="text-slate-300 text-sm">Avec charge / haltère</span>
      </label>
      <input value={draft.notes ?? ''} onChange={e => p({ notes: e.target.value })}
        className="w-full bg-slate-700/60 border border-slate-600/40 rounded-lg px-3 py-1.5 text-slate-300 text-xs focus:outline-none focus:border-indigo-500/60"
        placeholder="Notes (optionnel)" />
      <div className="flex gap-2 pt-1">
        <button onClick={onToggleEdit} className="flex-1 py-2 rounded-lg bg-slate-700/60 text-slate-400 text-xs font-semibold">
          Annuler
        </button>
        <button onClick={saveAndClose} className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold active:scale-95 transition-transform flex items-center justify-center gap-1">
          <Check size={12} /> OK
        </button>
      </div>
    </div>
  )
}

// ─── SessionEditModal ─────────────────────────────────────────────────────────
interface SessionEditModalProps {
  session: WorkoutSession
  onSave: (s: WorkoutSession) => void
  onClose: () => void
}
function SessionEditModal({ session, onSave, onClose }: SessionEditModalProps) {
  const [draft, setDraft] = useState<WorkoutSession>(() => JSON.parse(JSON.stringify(session)))
  const [editingExId, setEditingExId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const updateSession = (f: Partial<WorkoutSession>) => setDraft(d => ({ ...d, ...f }))

  const saveExercise = useCallback((ex: Exercise) => {
    setDraft(d => ({ ...d, exercises: d.exercises.map(e => e.id === ex.id ? ex : e) }))
  }, [])

  const deleteExercise = (id: string) => {
    setDraft(d => ({ ...d, exercises: d.exercises.filter(e => e.id !== id) }))
    setDeleteConfirmId(null)
  }

  const addExercise = () => {
    const newEx: Exercise = {
      id: uid(), name: 'Nouvel exercice', type: 'reps',
      category: 'bodyweight', hasWeight: false, thumbnail: '💪',
      sets: [{ targetReps: 10, restSeconds: 60 }], notes: '',
    }
    setDraft(d => ({ ...d, exercises: [...d.exercises, newEx] }))
    setEditingExId(newEx.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-slate-900 border border-slate-700/60 rounded-3xl w-full max-w-lg flex flex-col"
        style={{ maxHeight: 'min(90dvh, 750px)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-700/40 flex-shrink-0">
          <h3 className="text-white font-bold text-base">Modifier la séance</h3>
          <button onClick={onClose} className="p-1 text-slate-500"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
          {/* Session info */}
          <div className="flex flex-col gap-2">
            <input value={draft.name} onChange={e => updateSession({ name: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-3 py-2.5 text-white font-semibold focus:outline-none focus:border-indigo-500/60"
              placeholder="Nom de la séance" />
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Jour</span>
                <select value={draft.day}
                  onChange={e => {
                    const day = e.target.value as DayOfWeek
                    updateSession({ day, dayLabel: DAY_LABELS[day] })
                  }}
                  className="bg-slate-800 border border-slate-700/50 rounded-xl px-2 py-2 text-white text-sm focus:outline-none focus:border-indigo-500/60">
                  {DAY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Description courte</span>
                <input value={draft.shortDescription} onChange={e => updateSession({ shortDescription: e.target.value })}
                  className="bg-slate-800 border border-slate-700/50 rounded-xl px-2 py-2 text-slate-300 text-sm focus:outline-none focus:border-indigo-500/60"
                  placeholder="ex. Force — Squat · Pompes" />
              </div>
            </div>
          </div>

          {/* Exercices */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Exercices</span>
              <button onClick={addExercise}
                className="flex items-center gap-1 text-indigo-400 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-indigo-500/10 transition-colors">
                <Plus size={13} /> Ajouter
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {draft.exercises.length === 0 && (
                <p className="text-slate-600 text-sm text-center py-4">Aucun exercice — cliquer sur Ajouter</p>
              )}
              {draft.exercises.map(ex => (
                <div key={ex.id}>
                  {deleteConfirmId === ex.id ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 border border-red-500/30 rounded-xl bg-red-500/5">
                      <p className="flex-1 text-red-300 text-sm">Supprimer "{ex.name}" ?</p>
                      <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-1 rounded-lg bg-slate-700 text-slate-300 text-xs">Non</button>
                      <button onClick={() => deleteExercise(ex.id)} className="px-2 py-1 rounded-lg bg-red-600 text-white text-xs font-bold">Oui</button>
                    </div>
                  ) : (
                    <ExerciseEditRow
                      ex={ex}
                      editing={editingExId === ex.id}
                      onToggleEdit={() => setEditingExId(id => id === ex.id ? null : ex.id)}
                      onSave={saveExercise}
                      onDelete={() => setDeleteConfirmId(ex.id)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-700/40 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm">
            Annuler
          </button>
          <button onClick={() => onSave(draft)}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm active:scale-95 transition-transform">
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Program ──────────────────────────────────────────────────────────────────
export function Program() {
  const { state, dispatch } = useStore()
  const [openSession, setOpenSession] = useState<string | null>(null)
  const [editingSession, setEditingSession] = useState<WorkoutSession | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const effectiveProgram = state.customProgram ?? PROGRAM
  const isCustom = !!state.customProgram

  const saveSession = (s: WorkoutSession) => {
    const exists = effectiveProgram.some(p => p.id === s.id)
    const newProg = exists
      ? effectiveProgram.map(p => p.id === s.id ? s : p)
      : [...effectiveProgram, s]
    dispatch({ type: 'SET_CUSTOM_PROGRAM', payload: newProg })
    setEditingSession(null)
  }

  const deleteSession = (id: string) => {
    dispatch({ type: 'SET_CUSTOM_PROGRAM', payload: effectiveProgram.filter(s => s.id !== id) })
    setDeleteConfirmId(null)
    if (openSession === id) setOpenSession(null)
  }

  const addSession = () => {
    const newS: WorkoutSession = {
      id: `session_${Date.now()}`,
      name: 'Nouvelle séance',
      day: 'monday',
      dayLabel: 'Lundi',
      shortDescription: 'Description',
      exercises: [],
    }
    // Will be added when saved
    setEditingSession(newS)
  }

  const DAY_COLORS: Record<string, string> = {
    monday: 'border-indigo-500/30 bg-indigo-600/10',
    tuesday: 'border-purple-500/30 bg-purple-600/10',
    thursday: 'border-teal-500/30 bg-teal-600/10',
    friday: 'border-amber-500/30 bg-amber-600/10',
  }

  return (
    <div className="flex flex-col gap-4 pb-[130px] pt-4 px-6 lg:px-8 max-w-[1400px] mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Programme</h1>
          <p className="text-slate-400 text-sm mt-1">Lundi · Mardi · Jeudi · Vendredi optionnel</p>
        </div>
        <div className="flex gap-2">
          {isCustom && (
            <button onClick={() => dispatch({ type: 'RESET_PROGRAM' })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700/50 text-slate-400 text-xs font-semibold active:scale-95 transition-transform">
              <RotateCcw size={12} /> Restaurer
            </button>
          )}
          <button onClick={addSession}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-xs font-semibold active:scale-95 transition-transform">
            <Plus size={13} /> Séance
          </button>
        </div>
      </div>

      <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-4">
        <p className="text-indigo-300 text-sm font-semibold mb-2 flex items-center gap-2">
          <Repeat size={14} />
          Règle de progression (1 par semaine)
        </p>
        <ul className="text-slate-300 text-sm space-y-1">
          <li>+1 répétition par série</li>
          <li>ou +2 kg sur les haltères</li>
          <li>ou +5 sec de gainage</li>
        </ul>
      </div>

      {effectiveProgram.map(session => {
        const isOpen = openSession === session.id
        const borderColor = DAY_COLORS[session.day] ?? 'border-slate-700/50 bg-slate-800/30'

        return (
          <div key={session.id}>
            {deleteConfirmId === session.id ? (
              <div className="flex items-center gap-2 p-4 border border-red-500/30 rounded-2xl bg-red-500/5">
                <p className="flex-1 text-red-300 text-sm">Supprimer "{session.name}" ?</p>
                <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1.5 rounded-xl bg-slate-700 text-slate-300 text-sm">Non</button>
                <button onClick={() => deleteSession(session.id)} className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-sm font-bold">Supprimer</button>
              </div>
            ) : (
              <div className={`rounded-2xl border overflow-hidden ${borderColor}`}>
                <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                  <button
                    onClick={() => setOpenSession(isOpen ? null : session.id)}
                    className="flex-1 text-left">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{session.dayLabel}</p>
                    <p className="text-white font-bold mt-0.5">{session.name}</p>
                    <p className="text-slate-400 text-sm mt-0.5">{session.shortDescription}</p>
                  </button>
                  <button onClick={() => setEditingSession(JSON.parse(JSON.stringify(session)))}
                    className="p-2 text-slate-500 hover:text-indigo-400 transition-colors">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => setDeleteConfirmId(session.id)}
                    className="p-2 text-slate-600 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                  <button onClick={() => setOpenSession(isOpen ? null : session.id)} className="p-1 text-slate-500">
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>

                {isOpen && (
                  <div className="px-4 pb-4 flex flex-col gap-2 animate-slide-up">
                    {session.exercises.map(ex => {
                      const firstSet = ex.sets[0] ?? { restSeconds: 0 }
                      const target = ex.type === 'reps'
                        ? firstSet.targetReps === 0 ? 'Max propre' : `${firstSet.targetReps} reps`
                        : ex.type === 'duration' ? formatDuration(firstSet.targetDuration ?? 0)
                        : firstSet.targetDuration ? formatDuration(firstSet.targetDuration) : '—'
                      const rest = firstSet.restSeconds
                      return (
                        <div key={ex.id} className="border border-slate-700/50 rounded-xl overflow-hidden">
                          <div className="flex items-center gap-3 p-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
                              {ex.type === 'cardio' || ex.type === 'duration'
                                ? <Clock size={14} className="text-indigo-400" />
                                : <Dumbbell size={14} className="text-indigo-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-semibold text-sm">{ex.name}</p>
                              <p className="text-slate-400 text-xs mt-0.5">
                                {ex.type === 'cardio' ? target : `${ex.sets.length} × ${target}`}
                                {rest > 0 && <span className="text-slate-500"> · repos {rest}s</span>}
                                {ex.hasWeight && <span className="text-amber-400/70"> · poids</span>}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {session.exercises.length === 0 && (
                      <p className="text-slate-600 text-sm text-center py-3">Aucun exercice — cliquer sur ✏️ pour modifier</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {editingSession && (
        <SessionEditModal
          session={editingSession}
          onSave={saveSession}
          onClose={() => setEditingSession(null)}
        />
      )}
    </div>
  )
}

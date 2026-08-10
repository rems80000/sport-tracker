import { useStore } from '../store/useStore'
import { useDriveSync } from '../store/driveSyncContext'
import { buildSessionById } from '../data/program'
import { CheckCircle, Clock, Trash2, ChevronDown, ChevronUp, Zap, Pencil, X, Check, Cloud, RefreshCw } from 'lucide-react'
import type { SessionStatus, Feeling, SessionLog, LoggedSet } from '../types'
import type { WorkoutSession } from '../types'
import { groupSessionsByWeek } from '../utils/storage'
import { useState, useMemo } from 'react'

const BODYWEIGHT_KG = 70

const STATUS_OPTIONS: { value: SessionStatus; label: string }[] = [
  { value: 'done', label: 'Validée' },
  { value: 'done_short', label: 'Courte' },
  { value: 'missed', label: 'Ratée' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'todo', label: 'À faire' },
]
const STATUS_LABEL: Record<SessionStatus, { label: string; color: string }> = {
  todo:        { label: 'À faire',  color: 'text-slate-400' },
  in_progress: { label: 'En cours', color: 'text-indigo-400' },
  done:        { label: 'Validée',  color: 'text-green-400' },
  done_short:  { label: 'Courte',   color: 'text-teal-400' },
  missed:      { label: 'Ratée',    color: 'text-red-400' },
}
const FEELING_OPTIONS: { value: Feeling; label: string }[] = [
  { value: 'easy', label: '😊 Facile' },
  { value: 'normal', label: '😐 Normal' },
  { value: 'hard', label: '😤 Difficile' },
  { value: 'very_hard', label: '🥵 Très difficile' },
]
const FEELING_LABEL: Record<Feeling, string> = {
  easy: '😊 Facile', normal: '😐 Normal', hard: '😤 Difficile', very_hard: '🥵 Très difficile',
}

// ─── Tonnage ──────────────────────────────────────────────────────────────────

interface ExerciseTonnage {
  exerciseId: string; name: string; sets: number; reps: number; weightKg: number; tonnageKg: number
}

function calcTonnage(log: SessionLog, session: WorkoutSession | undefined): { byExercise: ExerciseTonnage[]; totalKg: number } {
  const grouped: Record<string, { name: string; sets: number; totalReps: number; totalWeight: number; hasWeight: boolean; isBodyweight: boolean }> = {}
  for (const set of log.sets.filter(s => s.completed)) {
    const ex = session?.exercises.find(e => e.id === set.exerciseId)
    if (!ex || !set.reps || set.reps <= 0) continue
    if (!grouped[set.exerciseId]) {
      grouped[set.exerciseId] = {
        name: ex.name, sets: 0, totalReps: 0, totalWeight: 0,
        hasWeight: !!(ex.hasWeight || ex.category === 'weight'),
        isBodyweight: ex.category === 'bodyweight' && !ex.hasWeight,
      }
    }
    const g = grouped[set.exerciseId]
    g.sets++; g.totalReps += set.reps
    const w = set.weightKg ?? (g.hasWeight ? 0 : BODYWEIGHT_KG)
    g.totalWeight += w * set.reps
  }
  const byExercise: ExerciseTonnage[] = []
  let totalKg = 0
  for (const [id, g] of Object.entries(grouped)) {
    if (g.totalWeight === 0) continue
    const avgWeight = g.sets > 0 ? Math.round(g.totalWeight / g.totalReps) : 0
    byExercise.push({ exerciseId: id, name: g.name, sets: g.sets, reps: g.totalReps, weightKg: avgWeight, tonnageKg: Math.round(g.totalWeight) })
    totalKg += g.totalWeight
  }
  return { byExercise, totalKg: Math.round(totalKg) }
}

function fmtTonnage(kg: number): string {
  if (kg <= 0) return '—'
  if (kg >= 1000) return `${(kg / 1000).toFixed(2).replace('.', ',')} t`
  return `${kg} kg`
}

// ─── SetEditRow ────────────────────────────────────────────────────────────────

function SetEditRow({ set, exName, onChange }: {
  set: LoggedSet; exName: string
  onChange: (s: LoggedSet) => void
}) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-slate-500 text-xs min-w-[90px] truncate">{exName} S{set.setIndex + 1}</span>
      {set.reps != null && (
        <input type="number" value={set.reps} onChange={e => onChange({ ...set, reps: parseInt(e.target.value) || 0 })}
          className="w-14 bg-slate-700/60 border border-slate-600/40 rounded-lg px-1.5 py-1 text-white text-xs text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
      )}
      {set.weightKg != null && (
        <input type="number" value={set.weightKg} onChange={e => onChange({ ...set, weightKg: parseFloat(e.target.value) || 0 })}
          className="w-14 bg-slate-700/60 border border-slate-600/40 rounded-lg px-1.5 py-1 text-white text-xs text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
      )}
      {set.durationSeconds != null && (
        <input type="number" value={set.durationSeconds} onChange={e => onChange({ ...set, durationSeconds: parseInt(e.target.value) || 0 })}
          className="w-14 bg-slate-700/60 border border-slate-600/40 rounded-lg px-1.5 py-1 text-white text-xs text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
      )}
    </div>
  )
}

// ─── History ──────────────────────────────────────────────────────────────────

export function History() {
  const { state, dispatch } = useStore()
  const drive = useDriveSync()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftLog, setDraftLog] = useState<SessionLog | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const sessionById = useMemo(() => buildSessionById(state.customProgram), [state.customProgram])
  const grouped = groupSessionsByWeek(state.sessions)
  const weeks = Object.keys(grouped).sort().reverse()

  const openEdit = (log: SessionLog) => {
    setDraftLog(JSON.parse(JSON.stringify(log)))
    setEditingId(log.id)
  }
  const cancelEdit = () => { setEditingId(null); setDraftLog(null) }
  const saveEdit = () => {
    if (draftLog) dispatch({ type: 'UPDATE_SESSION_LOG', payload: draftLog })
    cancelEdit()
  }

  if (state.sessions.length === 0) {
    const driveBusy = drive.status === 'connecting' || drive.status === 'syncing'
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4">
        <Clock size={48} className="text-slate-600" />
        <p className="text-slate-300 font-bold text-center">L’historique local est vide.</p>
        <p className="max-w-md text-slate-500 text-sm text-center">La récupération cherche aussi les versions précédentes de <code>remy-life-hub.json</code> sans écraser les séances retrouvées.</p>
        <button onClick={() => void drive.syncNow()} disabled={driveBusy}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
          {driveBusy ? <RefreshCw size={17} className="animate-spin" /> : <Cloud size={17} />}
          {driveBusy ? 'Recherche en cours…' : 'Restaurer depuis Google Drive'}
        </button>
        {drive.error && <p className="max-w-md text-center text-xs text-red-400">{drive.error}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-[160px] pt-4 px-6 lg:px-8 max-w-[1400px] mx-auto w-full">
      <h1 className="text-2xl font-bold text-white">Historique</h1>

      {weeks.map(week => {
        const sessions = grouped[week].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        const [year, weekNum] = week.split('-W')
        return (
          <section key={week}>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Semaine {weekNum} · {year}</h2>
              <div className="flex-1 h-px bg-slate-700/50" />
              <span className="text-xs text-slate-500">
                {sessions.filter(s => s.status === 'done' || s.status === 'done_short').length} validée(s)
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {sessions.map(log => {
                const session = sessionById[log.sessionId]
                const isOpen = expandedId === log.id
                const isEditing = editingId === log.id
                const { label, color } = STATUS_LABEL[log.status]
                const date = new Date(log.date)
                const completedSets = log.sets.filter(s => s.completed).length
                const { byExercise, totalKg } = calcTonnage(log, session)

                return (
                  <div key={log.id} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                    {/* Row header */}
                    <button onClick={() => { setExpandedId(isOpen ? null : log.id); if (isEditing) cancelEdit() }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className={`text-xs font-semibold ${color}`}>{label}</span>
                          <span className="text-slate-600 text-xs">·</span>
                          <span className="text-slate-500 text-xs">
                            {date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                          {totalKg > 0 && (
                            <>
                              <span className="text-slate-600 text-xs">·</span>
                              <span className="flex items-center gap-0.5 text-amber-400/80 text-xs font-semibold">
                                <Zap size={10} />{fmtTonnage(totalKg)}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-white font-semibold text-sm truncate">{session?.name ?? log.sessionId}</p>
                        <p className="text-slate-500 text-xs mt-0.5">
                          {completedSets} séries · {log.totalMinutes ? `${log.totalMinutes} min` : '—'}
                          {log.feeling && ` · ${FEELING_LABEL[log.feeling]}`}
                        </p>
                      </div>
                      {isOpen ? <ChevronUp size={16} className="text-slate-500 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-500 flex-shrink-0" />}
                    </button>

                    {/* Expanded */}
                    {isOpen && !isEditing && (
                      <div className="px-4 pb-4 flex flex-col gap-3 border-t border-slate-700/50 pt-3">
                        {log.comment && (
                          <div className="bg-slate-700/50 rounded-xl p-3">
                            <p className="text-slate-300 text-sm">{log.comment}</p>
                          </div>
                        )}
                        {byExercise.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-slate-400">Tonnage porté</p>
                              <span className="flex items-center gap-1 text-amber-400 text-sm font-black">
                                <Zap size={12} />{fmtTonnage(totalKg)}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1.5 bg-slate-900/40 rounded-xl p-3">
                              {byExercise.map(ex => (
                                <div key={ex.exerciseId} className="flex items-center gap-2 text-xs">
                                  <span className="text-slate-300 flex-1 truncate">{ex.name}</span>
                                  <span className="text-slate-600">{ex.sets}×{Math.round(ex.reps / ex.sets)}r</span>
                                  <span className="text-slate-600">@{ex.weightKg}kg</span>
                                  <span className="text-amber-400/80 font-semibold min-w-[52px] text-right">{fmtTonnage(ex.tonnageKg)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {log.sets.filter(s => s.completed).length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-400 mb-2">Séries réalisées</p>
                            <div className="flex flex-col gap-1">
                              {log.sets.filter(s => s.completed).map((s, i) => {
                                const ex = session?.exercises.find(e => e.id === s.exerciseId)
                                return (
                                  <div key={i} className="flex items-center gap-2 text-xs">
                                    <CheckCircle size={12} className="text-green-400 flex-shrink-0" />
                                    <span className="text-slate-400 truncate">{ex?.name ?? s.exerciseId} S{s.setIndex + 1}</span>
                                    {s.reps != null && <span className="text-slate-500">{s.reps}r</span>}
                                    {s.weightKg != null && <span className="text-slate-500">{s.weightKg}kg</span>}
                                    {s.durationSeconds != null && <span className="text-slate-500">{s.durationSeconds}s</span>}
                                    {s.distanceMeters != null && <span className="text-slate-500">{s.distanceMeters}m</span>}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => openEdit(log)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-700/60 text-slate-300 text-sm font-semibold active:scale-95 transition-transform">
                            <Pencil size={13} /> Modifier
                          </button>
                          {deleteConfirmId === log.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-red-300 text-xs flex-1">Supprimer ?</span>
                              <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs">Non</button>
                              <button onClick={() => { dispatch({ type: 'DELETE_SESSION', payload: log.id }); setDeleteConfirmId(null) }}
                                className="px-2 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold">Oui</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirmId(log.id)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-400 text-sm active:bg-red-500/10 transition-colors">
                              <Trash2 size={13} /> Supprimer
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Edit mode */}
                    {isOpen && isEditing && draftLog && (
                      <div className="px-4 pb-4 flex flex-col gap-3 border-t border-slate-700/50 pt-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">Statut</span>
                            <select value={draftLog.status}
                              onChange={e => setDraftLog(d => d ? { ...d, status: e.target.value as SessionStatus } : d)}
                              className="bg-slate-700/60 border border-slate-600/40 rounded-xl px-2 py-2 text-white text-sm focus:outline-none focus:border-indigo-500/60">
                              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">Ressenti</span>
                            <select value={draftLog.feeling ?? 'normal'}
                              onChange={e => setDraftLog(d => d ? { ...d, feeling: e.target.value as Feeling } : d)}
                              className="bg-slate-700/60 border border-slate-600/40 rounded-xl px-2 py-2 text-white text-sm focus:outline-none focus:border-indigo-500/60">
                              {FEELING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Commentaire</span>
                          <textarea value={draftLog.comment ?? ''} rows={2}
                            onChange={e => setDraftLog(d => d ? { ...d, comment: e.target.value } : d)}
                            className="bg-slate-700/60 border border-slate-600/40 rounded-xl px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-indigo-500/60"
                            placeholder="Notes sur la séance..." />
                        </div>
                        {/* Édition des séries */}
                        {draftLog.sets.filter(s => s.completed).length > 0 && (
                          <div>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase mb-2">Séries</p>
                            <div className="bg-slate-900/40 rounded-xl p-3 flex flex-col gap-0.5">
                              {draftLog.sets.filter(s => s.completed).map((s, i) => {
                                const ex = session?.exercises.find(e => e.id === s.exerciseId)
                                return (
                                  <SetEditRow key={i} set={s} exName={ex?.name ?? s.exerciseId}
                                    onChange={updated => setDraftLog(d => d ? {
                                      ...d,
                                      sets: d.sets.map(existing =>
                                        existing.exerciseId === s.exerciseId && existing.setIndex === s.setIndex ? updated : existing
                                      )
                                    } : d)} />
                                )
                              })}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <button onClick={cancelEdit}
                            className="flex items-center gap-1.5 flex-1 py-2.5 rounded-xl bg-slate-700 text-slate-300 text-sm font-semibold justify-center">
                            <X size={13} /> Annuler
                          </button>
                          <button onClick={saveEdit}
                            className="flex items-center gap-1.5 flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold justify-center active:scale-95 transition-transform">
                            <Check size={13} /> Enregistrer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

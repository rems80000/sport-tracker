import { useStore } from '../store/useStore'
import { SESSION_BY_ID } from '../data/program'
import { CheckCircle, Clock, Trash2, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import type { SessionStatus, Feeling, SessionLog } from '../types'
import type { WorkoutSession } from '../types'
import { groupSessionsByWeek } from '../utils/storage'
import { useState } from 'react'

const BODYWEIGHT_KG = 70 // poids du corps pour calcul tonnage

const STATUS_LABEL: Record<SessionStatus, { label: string; color: string }> = {
  todo:        { label: 'À faire',  color: 'text-slate-400' },
  in_progress: { label: 'En cours', color: 'text-indigo-400' },
  done:        { label: 'Validée',  color: 'text-green-400' },
  done_short:  { label: 'Courte',   color: 'text-teal-400' },
  missed:      { label: 'Ratée',    color: 'text-red-400' },
}

const FEELING_LABEL: Record<Feeling, string> = {
  easy:      '😊 Facile',
  normal:    '😐 Normal',
  hard:      '😤 Difficile',
  very_hard: '🥵 Très difficile',
}

// ─── Tonnage ──────────────────────────────────────────────────────────────────

interface ExerciseTonnage {
  exerciseId: string
  name: string
  sets: number
  reps: number
  weightKg: number
  tonnageKg: number
}

function calcTonnage(log: SessionLog, session: WorkoutSession | undefined): { byExercise: ExerciseTonnage[]; totalKg: number } {
  const grouped: Record<string, { name: string; sets: number; totalReps: number; totalWeight: number; hasWeight: boolean; isBodyweight: boolean; hasReps: boolean }> = {}

  for (const set of log.sets.filter(s => s.completed)) {
    const ex = session?.exercises.find(e => e.id === set.exerciseId)
    if (!ex) continue
    if (!set.reps || set.reps <= 0) continue // durée seule → pas de tonnage

    if (!grouped[set.exerciseId]) {
      grouped[set.exerciseId] = {
        name: ex.name,
        sets: 0,
        totalReps: 0,
        totalWeight: 0,
        hasWeight: !!(ex.hasWeight || ex.category === 'weight'),
        isBodyweight: ex.category === 'bodyweight' && !ex.hasWeight,
        hasReps: true,
      }
    }
    const g = grouped[set.exerciseId]
    g.sets++
    g.totalReps += set.reps
    const w = set.weightKg ?? (g.hasWeight ? 0 : BODYWEIGHT_KG)
    g.totalWeight += w * set.reps
  }

  const byExercise: ExerciseTonnage[] = []
  let totalKg = 0

  for (const [id, g] of Object.entries(grouped)) {
    if (g.totalWeight === 0) continue
    const avgWeight = g.sets > 0 ? Math.round(g.totalWeight / g.totalReps) : 0
    byExercise.push({
      exerciseId: id,
      name: g.name,
      sets: g.sets,
      reps: g.totalReps,
      weightKg: avgWeight,
      tonnageKg: Math.round(g.totalWeight),
    })
    totalKg += g.totalWeight
  }

  return { byExercise, totalKg: Math.round(totalKg) }
}

function fmtTonnage(kg: number): string {
  if (kg <= 0) return '—'
  if (kg >= 1000) return `${(kg / 1000).toFixed(2).replace('.', ',')} t`
  return `${kg} kg`
}

// ─── History ──────────────────────────────────────────────────────────────────

export function History() {
  const { state, dispatch } = useStore()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const grouped = groupSessionsByWeek(state.sessions)
  const weeks = Object.keys(grouped).sort().reverse()

  if (state.sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4">
        <Clock size={48} className="text-slate-600" />
        <p className="text-slate-400 text-center">Aucune séance enregistrée.<br />Commencez votre première séance !</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-[160px] pt-4 px-4 max-w-[1400px] mx-auto w-full">
      <h1 className="text-2xl font-bold text-white">Historique</h1>

      {weeks.map(week => {
        const sessions = grouped[week].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        const [year, weekNum] = week.split('-W')
        return (
          <section key={week}>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Semaine {weekNum} · {year}
              </h2>
              <div className="flex-1 h-px bg-slate-700/50" />
              <span className="text-xs text-slate-500">
                {sessions.filter(s => s.status === 'done' || s.status === 'done_short').length} validée(s)
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {sessions.map(log => {
                const session = SESSION_BY_ID[log.sessionId]
                const isOpen = expandedId === log.id
                const { label, color } = STATUS_LABEL[log.status]
                const date = new Date(log.date)
                const completedSets = log.sets.filter(s => s.completed).length
                const { byExercise, totalKg } = calcTonnage(log, session)

                return (
                  <div key={log.id} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setExpandedId(isOpen ? null : log.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    >
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
                        <p className="text-white font-semibold text-sm truncate">
                          {session?.name ?? log.sessionId}
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5">
                          {completedSets} séries · {log.totalMinutes ? `${log.totalMinutes} min` : '—'}
                          {log.feeling && ` · ${FEELING_LABEL[log.feeling]}`}
                        </p>
                      </div>
                      {isOpen ? <ChevronUp size={16} className="text-slate-500 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-500 flex-shrink-0" />}
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 flex flex-col gap-3 animate-slide-up border-t border-slate-700/50 pt-3">
                        {log.comment && (
                          <div className="bg-slate-700/50 rounded-xl p-3">
                            <p className="text-slate-300 text-sm">{log.comment}</p>
                          </div>
                        )}

                        {/* Tonnage par exercice */}
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

                        {/* Séries individuelles */}
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
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => dispatch({ type: 'DELETE_SESSION', payload: log.id })}
                          className="flex items-center gap-2 text-red-400 text-sm py-2"
                        >
                          <Trash2 size={14} />
                          Supprimer cette séance
                        </button>
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

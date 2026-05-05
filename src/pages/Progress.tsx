import { useStore } from '../store/useStore'
import { SESSION_BY_ID } from '../data/program'
import { groupSessionsByWeek } from '../utils/storage'
import { TrendingUp, Award, Target, Zap } from 'lucide-react'
import { useMemo } from 'react'

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string
  value: string | number
  sub?: string
  icon: typeof TrendingUp
  color: string
}) {
  return (
    <div className={`bg-slate-800/50 border border-slate-700/40 rounded-2xl p-4 flex items-start gap-3`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-slate-400 text-xs">{label}</p>
        <p className="text-white text-xl font-bold">{value}</p>
        {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function WeekBar({ week, count, max }: { week: string; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  const [, weekNum] = week.split('-W')
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-white font-bold">{count}</span>
      <div className="w-8 bg-slate-700 rounded-full" style={{ height: 60 }}>
        <div
          className="w-full bg-indigo-500 rounded-full transition-all"
          style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-500">S{weekNum}</span>
    </div>
  )
}

export function Progress() {
  const { state } = useStore()

  const stats = useMemo(() => {
    const done = state.sessions.filter(s => s.status === 'done' || s.status === 'done_short')
    const total = state.sessions.length
    const grouped = groupSessionsByWeek(done)
    const weeks = Object.keys(grouped).sort()

    // Best push-up count
    let bestPushups = 0
    let bestPlank = 0
    const lastWeights: Record<string, number> = {}

    for (const log of state.sessions) {
      for (const set of log.sets) {
        if (!set.completed) continue
        // Push-ups (various IDs)
        if (set.exerciseId.includes('pompe') && set.reps) {
          bestPushups = Math.max(bestPushups, set.reps)
        }
        // Plank
        if ((set.exerciseId.includes('gainage') || set.exerciseId.includes('planche')) && set.durationSeconds) {
          bestPlank = Math.max(bestPlank, set.durationSeconds)
        }
        // Last weights per exercise
        if (set.weightKg) {
          lastWeights[set.exerciseId] = set.weightKg
        }
      }
    }

    // Weekly counts for last 8 weeks
    const last8 = weeks.slice(-8)
    const weeklyCounts = last8.map(w => ({ week: w, count: grouped[w]?.length ?? 0 }))
    const maxCount = Math.max(...weeklyCounts.map(w => w.count), 1)

    // Regularity rate (done sessions / total weeks)
    const totalWeeks = Math.max(weeks.length, 1)
    const avgPerWeek = done.length / totalWeeks

    return { done, total, grouped, weeks, bestPushups, bestPlank, lastWeights, weeklyCounts, maxCount, avgPerWeek }
  }, [state.sessions])

  return (
    <div className="flex flex-col gap-6 pb-[130px] pt-4 px-4 max-w-[1400px] mx-auto w-full">
      <h1 className="text-2xl font-bold text-white">Progression</h1>

      {state.sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <TrendingUp size={48} className="text-slate-600" />
          <p className="text-slate-400 text-center">Commencez vos séances pour voir vos progrès !</p>
        </div>
      ) : (
        <>
          {/* Global stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Séances validées"
              value={stats.done.length}
              sub={`sur ${stats.total} démarrées`}
              icon={Award}
              color="bg-green-500/20 text-green-400"
            />
            <StatCard
              label="Moy. / semaine"
              value={stats.avgPerWeek.toFixed(1)}
              sub="séances"
              icon={TrendingUp}
              color="bg-indigo-500/20 text-indigo-400"
            />
            {stats.bestPushups > 0 && (
              <StatCard
                label="Record pompes"
                value={`${stats.bestPushups} reps`}
                icon={Zap}
                color="bg-orange-500/20 text-orange-400"
              />
            )}
            {stats.bestPlank > 0 && (
              <StatCard
                label="Meilleur gainage"
                value={`${stats.bestPlank}s`}
                icon={Target}
                color="bg-teal-500/20 text-teal-400"
              />
            )}
          </div>

          {/* Weekly activity */}
          {stats.weeklyCounts.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl p-4">
              <p className="text-sm font-semibold text-slate-300 mb-4">Activité par semaine</p>
              <div className="flex items-end justify-around">
                {stats.weeklyCounts.map(({ week, count }) => (
                  <WeekBar key={week} week={week} count={count} max={stats.maxCount} />
                ))}
              </div>
            </div>
          )}

          {/* Last weights */}
          {Object.keys(stats.lastWeights).length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl p-4">
              <p className="text-sm font-semibold text-slate-300 mb-3">Dernières charges utilisées</p>
              <div className="flex flex-col gap-2">
                {Object.entries(stats.lastWeights).map(([exId, kg]) => {
                  const exName = Object.values(SESSION_BY_ID)
                    .flatMap(s => s.exercises)
                    .find(e => e.id === exId)?.name ?? exId
                  return (
                    <div key={exId} className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">{exName}</span>
                      <span className="text-white font-bold text-sm">{kg} kg</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Progression rule reminder */}
          <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-4">
            <p className="text-indigo-300 text-sm font-semibold mb-2">Règle de progression</p>
            <p className="text-slate-400 text-sm">Chaque semaine, choisissez <strong className="text-white">une seule</strong> progression :</p>
            <ul className="text-slate-300 text-sm mt-2 space-y-1">
              <li>+1 répétition par série</li>
              <li>+2 kg sur les haltères</li>
              <li>+5 sec de gainage</li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

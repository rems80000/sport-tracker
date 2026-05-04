import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { PROGRAM, MOTIVATIONAL_QUOTES } from '../data/program'
import { SessionCard } from '../components/SessionCard'
import type { SessionStatus } from '../types'
import { getStartOfWeek } from '../utils/storage'
import { Flame, Calendar } from 'lucide-react'
import { useMemo } from 'react'

const DAY_ORDER = ['monday', 'tuesday', 'thursday', 'friday']

function getWeekSessions(sessions: ReturnType<typeof useStore>['state']['sessions']) {
  const now = new Date()
  const weekStart = getStartOfWeek(now)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)
  return sessions.filter(s => {
    const d = new Date(s.date)
    return d >= weekStart && d < weekEnd
  })
}

function getSessionStatus(
  sessionId: string,
  weekLogs: ReturnType<typeof useStore>['state']['sessions'],
  activeLog: ReturnType<typeof useStore>['state']['activeSessionLog']
): SessionStatus {
  if (activeLog?.sessionId === sessionId) return 'in_progress'
  const log = weekLogs.find(s => s.sessionId === sessionId)
  return log?.status ?? 'todo'
}

export function Dashboard() {
  const { state } = useStore()
  const navigate = useNavigate()
  const today = new Date()
  const weekLogs = useMemo(() => getWeekSessions(state.sessions), [state.sessions])

  const quote = useMemo(() => {
    const idx = Math.floor(Date.now() / 86400000) % MOTIVATIONAL_QUOTES.length
    return MOTIVATIONAL_QUOTES[idx]
  }, [])

  const completedThisWeek = weekLogs.filter(s => s.status === 'done' || s.status === 'done_short').length
  const totalScheduled = 3 // lundi, mardi, jeudi (vendredi optionnel)
  const streak = useMemo(() => {
    let count = 0
    const sorted = [...state.sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const seen = new Set<string>()
    for (const s of sorted) {
      const key = s.date.split('T')[0]
      if (!seen.has(key) && (s.status === 'done' || s.status === 'done_short')) {
        seen.add(key)
        count++
      } else if (seen.size > 0) break
    }
    return count
  }, [state.sessions])

  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

  const handleStart = (sessionId: string) => {
    navigate(`/seance/${sessionId}`)
  }

  const todayProgram = PROGRAM.filter(s => {
    const dayMap: Record<string, number> = { sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6 }
    return dayMap[s.day] === today.getDay()
  })

  return (
    <div className="flex flex-col gap-6 pb-24 pt-4 px-4 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">{dayNames[today.getDay()]} {today.getDate()} {today.toLocaleString('fr-FR', { month: 'long' })}</p>
          <h1 className="text-2xl font-bold text-white">Tableau de bord</h1>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 bg-orange-500/20 border border-orange-500/30 rounded-xl px-3 py-2">
            <Flame size={18} className="text-orange-400" />
            <span className="text-orange-400 font-bold text-sm">{streak}</span>
          </div>
        )}
      </div>

      {/* Progress this week */}
      <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Calendar size={15} className="text-indigo-400" />
            Cette semaine
          </span>
          <span className="text-sm font-bold text-white">{completedThisWeek}/{totalScheduled}</span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: totalScheduled }).map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-colors ${i < completedThisWeek ? 'bg-indigo-500' : 'bg-slate-700'}`}
            />
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3 italic">{quote}</p>
      </div>

      {/* Active session resume */}
      {state.activeSessionLog && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4">
          <p className="text-orange-400 text-xs font-semibold uppercase tracking-wider mb-1">Séance en cours</p>
          <p className="text-white font-bold mb-3">
            {PROGRAM.find(s => s.id === state.activeSessionLog?.sessionId)?.name}
          </p>
          <button
            onClick={() => navigate(`/seance/${state.activeSessionLog?.sessionId}`)}
            className="w-full py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm active:scale-95 transition-transform"
          >
            Reprendre la séance
          </button>
        </div>
      )}

      {/* Today */}
      {todayProgram.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Aujourd'hui</h2>
          <div className="flex flex-col gap-3">
            {todayProgram.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                status={getSessionStatus(session.id, weekLogs, state.activeSessionLog)}
                onStart={() => handleStart(session.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Week program */}
      <section>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Programme de la semaine</h2>
        <div className="flex flex-col gap-3">
          {DAY_ORDER.map(day => {
            const session = PROGRAM.find(s => s.day === day)!
            const status = getSessionStatus(session.id, weekLogs, state.activeSessionLog)
            return (
              <SessionCard
                key={session.id}
                session={session}
                status={status}
                onStart={() => handleStart(session.id)}
              />
            )
          })}
        </div>
      </section>
    </div>
  )
}

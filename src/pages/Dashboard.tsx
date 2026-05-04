import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { PROGRAM, MOTIVATIONAL_QUOTES } from '../data/program'
import { SessionCard } from '../components/SessionCard'
import type { SessionStatus } from '../types'
import { getStartOfWeek } from '../utils/storage'
import { Flame, Calendar, Zap, PlayCircle } from 'lucide-react'
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
  const totalScheduled = 3
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

  const MONTHS = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc']
  const DAYS = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam']

  const handleStart = (sessionId: string) => navigate(`/seance/${sessionId}`)

  const todayProgram = PROGRAM.filter(s => {
    const dayMap: Record<string, number> = { sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6 }
    return dayMap[s.day] === today.getDay()
  })

  const progressPct = totalScheduled > 0 ? (completedThisWeek / totalScheduled) * 100 : 0

  return (
    <div className="pb-[200px] lg:pb-[140px] pt-3 px-4 max-w-5xl mx-auto w-full">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">
            {DAYS[today.getDay()]} {today.getDate()} {MONTHS[today.getMonth()]}
          </p>
          <h1 className="text-2xl lg:text-4xl font-black text-white tracking-tight leading-none mt-0.5">
            TRAINING<span className="text-indigo-400 ml-1">_</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <div className="flex items-center gap-1.5 bg-orange-500/15 border border-orange-500/30 rounded-xl px-3 py-2">
              <Flame size={18} className="text-orange-400" />
              <span className="text-orange-400 font-black text-lg leading-none">{streak}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Active session resume ───────────────────────────────────────── */}
      {state.activeSessionLog && (
        <div className="mb-3 bg-orange-500/10 border border-orange-500/40 rounded-2xl p-3 flex items-center gap-3">
          <Zap size={18} className="text-orange-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-orange-400 text-xs font-bold uppercase tracking-wider">En cours</p>
            <p className="text-white font-bold text-sm truncate">
              {PROGRAM.find(s => s.id === state.activeSessionLog?.sessionId)?.name}
            </p>
          </div>
          <button
            onClick={() => navigate(`/seance/${state.activeSessionLog?.sessionId}`)}
            className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-sm active:scale-95 transition-transform flex items-center gap-1.5"
          >
            <PlayCircle size={15} /> Reprendre
          </button>
        </div>
      )}

      {/* ── Main 2-col layout (PC) ─────────────────────────────────────── */}
      <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-5 flex flex-col gap-4">

        {/* LEFT: sessions ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">

          {/* Today hero */}
          {todayProgram.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <p className="text-indigo-400 text-xs font-black uppercase tracking-widest">Aujourd'hui</p>
              </div>
              <div className="flex flex-col gap-2">
                {todayProgram.map(session => (
                  <SessionCard key={session.id} session={session}
                    status={getSessionStatus(session.id, weekLogs, state.activeSessionLog)}
                    onStart={() => handleStart(session.id)} />
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-4 text-center">
              <p className="text-slate-600 text-sm">Pas de séance prévue aujourd'hui — récupération active 💪</p>
            </div>
          )}

          {/* Week sessions compact grid */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={12} className="text-slate-500" />
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Programme semaine</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DAY_ORDER.map(day => {
                const session = PROGRAM.find(s => s.day === day)!
                const status = getSessionStatus(session.id, weekLogs, state.activeSessionLog)
                return (
                  <div key={session.id} onClick={() => handleStart(session.id)} className="cursor-pointer active:scale-95 transition-transform">
                    <SessionCard session={session} status={status} onStart={() => handleStart(session.id)} compact />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: stats ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">

          {/* Week progress */}
          <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Semaine</span>
              <span className="font-black text-white text-2xl leading-none">
                {completedThisWeek}<span className="text-slate-600 text-base font-bold">/{totalScheduled}</span>
              </span>
            </div>
            <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden mb-2">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%`, background: 'linear-gradient(to right, #6366f1, #8b5cf6)' }} />
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: totalScheduled }).map((_, i) => (
                <div key={i} className={`h-2 flex-1 rounded-full transition-all duration-500 ${i < completedThisWeek ? 'bg-indigo-500' : 'bg-slate-700/60'}`} />
              ))}
            </div>
          </div>

          {/* Quote */}
          <div className="bg-slate-800/30 border border-slate-700/20 rounded-xl p-3.5">
            <p className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-1">Motivation</p>
            <p className="text-slate-300 text-sm italic leading-snug">"{quote}"</p>
          </div>

          {/* Total sessions stat */}
          {state.sessions.length > 0 && (
            <div className="bg-indigo-600/8 border border-indigo-500/20 rounded-xl p-3.5 flex items-center justify-between">
              <span className="text-slate-400 text-sm">Séances totales</span>
              <span className="text-indigo-400 font-black text-2xl">{state.sessions.filter(s => s.status === 'done' || s.status === 'done_short').length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

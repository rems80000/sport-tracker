import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { PROGRAM, MOTIVATIONAL_QUOTES } from '../data/program'
import { SessionCard } from '../components/SessionCard'
import type { SessionStatus } from '../types'
import { getStartOfWeek } from '../utils/storage'
import { Flame, Zap, PlayCircle, Radio } from 'lucide-react'
import { useMemo } from 'react'

// ── Configurer l'URL de la radio ici ──────────────────────────────────────────
const SPOON_RADIO_URL = 'https://www.spoon.radio'

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
  const totalDone = state.sessions.filter(s => s.status === 'done' || s.status === 'done_short').length

  return (
    <div className="pb-[160px] lg:pb-[130px] pt-6 px-5 max-w-5xl mx-auto w-full">

      {/* ── Header rock ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5 gap-3">
        <div>
          <p className="text-slate-600 text-xs uppercase tracking-[0.2em] font-bold">
            {DAYS[today.getDay()]} {today.getDate()} {MONTHS[today.getMonth()]}
          </p>
          <h1 className="font-black text-white leading-none tracking-tight mt-0.5"
            style={{ fontSize: 'clamp(28px, 4vw, 52px)' }}>
            TRAIN
            <span style={{
              background: 'linear-gradient(90deg, #6366f1, #f43f5e)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>HARD</span>
          </h1>
          <p className="text-slate-600 text-xs mt-0.5 italic">{quote}</p>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {streak > 0 && (
            <div className="flex items-center gap-1.5 bg-orange-500/15 border border-orange-500/30 rounded-xl px-3 py-1.5">
              <Flame size={16} className="text-orange-400" />
              <span className="text-orange-400 font-black text-lg leading-none">{streak}</span>
            </div>
          )}
          {/* Spoon Radio */}
          <a href={SPOON_RADIO_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-rose-600/15 border border-rose-500/30 rounded-xl px-3 py-1.5 active:scale-95 transition-transform">
            <Radio size={13} className="text-rose-400" />
            <span className="text-rose-400 font-bold text-xs">Spoon Radio</span>
          </a>
        </div>
      </div>

      {/* ── Session en cours ──────────────────────────────────────────────── */}
      {state.activeSessionLog && (
        <div className="mb-3 bg-orange-500/10 border border-orange-500/40 rounded-2xl p-3 flex items-center gap-3">
          <Zap size={18} className="text-orange-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-orange-400 text-[10px] font-bold uppercase tracking-wider">En cours</p>
            <p className="text-white font-bold text-sm truncate">
              {PROGRAM.find(s => s.id === state.activeSessionLog?.sessionId)?.name}
            </p>
          </div>
          <button onClick={() => navigate(`/seance/${state.activeSessionLog?.sessionId}`)}
            className="flex-shrink-0 px-3 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs active:scale-95 transition-transform flex items-center gap-1">
            <PlayCircle size={14} /> Reprendre
          </button>
        </div>
      )}

      {/* ── Layout 2 colonnes PC ──────────────────────────────────────────── */}
      <div className="lg:grid lg:grid-cols-[1fr_270px] lg:gap-6 flex flex-col gap-4">

        {/* Colonne gauche : sessions ───────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Aujourd'hui */}
          {todayProgram.length > 0 ? (
            <div className="rounded-2xl border border-indigo-500/30 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(244,63,94,0.06) 100%)' }}>
              <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse flex-shrink-0" />
                <p className="text-indigo-400 text-xs font-black uppercase tracking-widest">AUJOURD'HUI</p>
              </div>
              <div className="px-3 pb-3 flex flex-col gap-2">
                {todayProgram.map(session => (
                  <SessionCard key={session.id} session={session}
                    status={getSessionStatus(session.id, weekLogs, state.activeSessionLog)}
                    onStart={() => handleStart(session.id)} />
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/20 border border-slate-700/20 rounded-2xl p-4 text-center">
              <p className="text-slate-600 text-sm">Pas de séance aujourd'hui — récupération 💪</p>
            </div>
          )}

          {/* Programme semaine en grille 2×2 */}
          <div>
            <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest mb-2 px-1">Programme semaine</p>
            <div className="grid grid-cols-2 gap-2">
              {DAY_ORDER.map(day => {
                const session = PROGRAM.find(s => s.day === day)!
                const status = getSessionStatus(session.id, weekLogs, state.activeSessionLog)
                return (
                  <button key={session.id} onClick={() => handleStart(session.id)}
                    className="text-left active:scale-95 transition-transform">
                    <SessionCard session={session} status={status} compact />
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Colonne droite : stats ──────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Progression semaine */}
          <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-4"
            style={{ background: 'linear-gradient(135deg, rgba(15,15,25,0.9) 0%, rgba(30,27,75,0.4) 100%)' }}>
            <div className="flex items-end justify-between mb-3">
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Semaine</span>
              <div className="text-right">
                <span className="font-black text-white leading-none" style={{ fontSize: 'clamp(28px, 3vw, 42px)' }}>
                  {completedThisWeek}
                </span>
                <span className="text-slate-600 text-lg font-bold">/{totalScheduled}</span>
              </div>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #6366f1, #f43f5e)' }} />
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: totalScheduled }).map((_, i) => (
                <div key={i} className={`h-2 flex-1 rounded-full transition-all duration-500 ${i < completedThisWeek ? 'bg-indigo-500' : 'bg-slate-800'}`} />
              ))}
            </div>
          </div>

          {/* Total séances */}
          {totalDone > 0 && (
            <div className="flex items-center justify-between bg-slate-800/40 border border-slate-700/30 rounded-xl px-4 py-3">
              <span className="text-slate-500 text-sm">Total séances</span>
              <span className="font-black text-indigo-400 text-2xl">{totalDone}</span>
            </div>
          )}

          {/* Spoon Radio (version grande sur PC) */}
          <a href={SPOON_RADIO_URL} target="_blank" rel="noopener noreferrer"
            className="hidden lg:flex items-center gap-3 bg-rose-950/40 border border-rose-700/30 rounded-2xl px-4 py-3 active:scale-95 transition-transform hover:border-rose-600/50">
            <div className="w-9 h-9 rounded-xl bg-rose-600/20 flex items-center justify-center flex-shrink-0">
              <Radio size={18} className="text-rose-400" />
            </div>
            <div>
              <p className="text-rose-300 font-bold text-sm">Spoon Radio</p>
              <p className="text-rose-600 text-xs">Ouvrir dans un nouvel onglet →</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PROGRAM } from '../data/program'
import { useStore } from '../store/useStore'
import { ArrowRight, Clock3, Dumbbell, Play, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react'

const DAY_ACCENTS: Record<string, { border: string; badge: string; glow: string; number: string }> = {
  monday: { border: 'border-indigo-500/30', badge: 'bg-indigo-500/15 text-indigo-300', glow: 'from-indigo-500/20', number: '01' },
  tuesday: { border: 'border-fuchsia-500/30', badge: 'bg-fuchsia-500/15 text-fuchsia-300', glow: 'from-fuchsia-500/20', number: '02' },
  thursday: { border: 'border-cyan-500/30', badge: 'bg-cyan-500/15 text-cyan-300', glow: 'from-cyan-500/20', number: '03' },
  friday: { border: 'border-amber-500/30', badge: 'bg-amber-500/15 text-amber-300', glow: 'from-amber-500/20', number: '04' },
}

function estimateMinutes(session: (typeof PROGRAM)[number]) {
  const seconds = session.exercises.reduce((total, exercise) => total + exercise.sets.reduce((sum, set) => sum + (set.targetDuration ?? 35) + set.restSeconds, 0), 0)
  return Math.max(10, Math.round(seconds / 60))
}

export function SessionStarter() {
  const navigate = useNavigate()
  const { state } = useStore()
  const sessions = useMemo(() => state.customProgram ?? PROGRAM, [state.customProgram])
  const activeSession = state.activeSessionLog ? sessions.find(session => session.id === state.activeSessionLog?.sessionId) : undefined
  const todayIndex = new Date().getDay()
  const dayNumbers: Record<string, number> = { monday: 1, tuesday: 2, thursday: 4, friday: 5 }
  const recommended = sessions.find(session => dayNumbers[session.day] === todayIndex) ?? sessions.find(session => session.day !== 'friday') ?? sessions[0]

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 pb-[130px] pt-5 lg:px-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-400">Mode entraînement</p>
          <h1 className="mt-1 text-3xl font-black text-white sm:text-4xl">Choisis. Lance. Avance.</h1>
          <p className="mt-2 text-sm text-slate-500">Les réglages restent modifiables pendant la séance.</p>
        </div>
        <span className="flex items-center gap-2 self-start rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-300"><ShieldCheck size={14} /> 10 minutes suffisent</span>
      </header>

      {activeSession && (
        <button onClick={() => navigate(`/seance/${activeSession.id}`)} className="group flex items-center gap-4 rounded-3xl border border-orange-400/35 bg-gradient-to-r from-orange-500/20 to-slate-900 p-4 text-left shadow-xl shadow-orange-950/20 sm:p-5">
          <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-orange-500 text-white"><RotateCcw size={22} /></span>
          <span className="min-w-0 flex-1"><span className="block text-[10px] font-black uppercase tracking-widest text-orange-300">Séance en cours</span><span className="mt-1 block truncate text-lg font-black text-white">{activeSession.name}</span></span>
          <span className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-xs font-black text-white">Reprendre <ArrowRight size={16} /></span>
        </button>
      )}

      {!activeSession && recommended && (
        <button onClick={() => navigate(`/seance/${recommended.id}`)} className="group relative overflow-hidden rounded-3xl border border-indigo-400/30 bg-[radial-gradient(circle_at_90%_0%,rgba(236,72,153,0.22),transparent_36%),linear-gradient(135deg,rgba(79,70,229,0.34),rgba(15,23,42,0.96))] p-5 text-left shadow-2xl sm:p-6">
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="grid h-14 w-14 flex-none place-items-center rounded-2xl bg-white text-indigo-700 shadow-xl"><Sparkles size={25} /></span>
            <span className="min-w-0 flex-1"><span className="block text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Séance conseillée</span><span className="mt-1 block text-xl font-black text-white sm:text-2xl">{recommended.name}</span><span className="mt-2 block text-sm text-slate-400">{recommended.shortDescription}</span></span>
            <span className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-slate-950">Démarrer <Play size={16} fill="currentColor" /></span>
          </div>
        </button>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {sessions.map(session => {
          const accent = DAY_ACCENTS[session.day] ?? { border: 'border-slate-700', badge: 'bg-slate-800 text-slate-300', glow: 'from-slate-700/20', number: '•' }
          const setCount = session.exercises.reduce((total, exercise) => total + exercise.sets.length, 0)
          const minutes = estimateMinutes(session)
          return (
            <button key={session.id} onClick={() => navigate(`/seance/${session.id}`)} className={`group relative overflow-hidden rounded-3xl border ${accent.border} bg-gradient-to-br ${accent.glow} to-slate-950 p-5 text-left shadow-xl transition-transform hover:-translate-y-0.5 active:scale-[0.98]`}>
              <div className="flex items-start gap-4">
                <span className={`grid h-11 w-11 flex-none place-items-center rounded-2xl text-sm font-black ${accent.badge}`}>{accent.number}</span>
                <span className="min-w-0 flex-1"><span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">{session.dayLabel}{session.day === 'friday' ? ' · optionnel' : ''}</span><span className="mt-1 block text-lg font-black leading-tight text-white">{session.name.replace(/^Séance \d+ — /, '')}</span></span>
                <ArrowRight size={18} className="mt-2 text-slate-600 transition-transform group-hover:translate-x-1" />
              </div>
              <p className="mt-4 text-sm text-slate-400">{session.shortDescription}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-slate-400">
                <span className="flex items-center gap-1.5 rounded-full bg-black/20 px-2.5 py-1.5"><Clock3 size={12} /> ≈ {minutes} min</span>
                <span className="flex items-center gap-1.5 rounded-full bg-black/20 px-2.5 py-1.5"><Dumbbell size={12} /> {session.exercises.length} exercices · {setCount} séries</span>
                {session.hasShortVersion && <span className="rounded-full bg-emerald-500/10 px-2.5 py-1.5 text-emerald-300">Version courte</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { PROGRAM } from '../data/program'
import { useStore } from '../store/useStore'
import { PlayCircle, Dumbbell } from 'lucide-react'

export function SessionStarter() {
  const navigate = useNavigate()
  const { state } = useStore()

  const DAY_COLORS: Record<string, string> = {
    monday:   'border-indigo-500/30 bg-indigo-600/10',
    tuesday:  'border-purple-500/30 bg-purple-600/10',
    thursday: 'border-teal-500/30 bg-teal-600/10',
    friday:   'border-amber-500/30 bg-amber-600/10',
  }

  return (
    <div className="flex flex-col gap-6 pb-24 pt-4 px-4 max-w-2xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-white">Lancer une séance</h1>
        <p className="text-slate-400 text-sm mt-1">Choisissez votre séance du jour</p>
      </div>

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
            Reprendre
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {PROGRAM.map(session => {
          const colorClass = DAY_COLORS[session.day] ?? 'border-slate-700/50 bg-slate-800/30'
          const exCount = session.exercises.length
          const setCount = session.exercises.reduce((a, e) => a + e.sets.length, 0)

          return (
            <button
              key={session.id}
              onClick={() => navigate(`/seance/${session.id}`)}
              className={`flex items-center gap-4 p-4 rounded-2xl border text-left active:scale-[0.98] transition-transform ${colorClass}`}
            >
              <div className="w-12 h-12 rounded-xl bg-slate-700/50 flex items-center justify-center flex-shrink-0">
                <Dumbbell size={22} className="text-slate-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{session.dayLabel}</p>
                <p className="text-white font-bold leading-tight">{session.name}</p>
                <p className="text-slate-400 text-xs mt-0.5">{exCount} exercices · {setCount} séries</p>
                {session.hasShortVersion && (
                  <p className="text-xs text-amber-400 mt-0.5">Version courte disponible</p>
                )}
              </div>
              <PlayCircle size={24} className="text-indigo-400 flex-shrink-0" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

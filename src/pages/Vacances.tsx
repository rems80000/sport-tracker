import { useNavigate } from 'react-router-dom'
import { VACATION_SESSIONS } from '../data/vacances'
import { Sun, Play } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  reps: 'répétitions',
  duration: 'durée',
  cardio: 'cardio',
}

export function Vacances() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-6 pb-[130px] pt-4 px-6 lg:px-8 max-w-[1400px] mx-auto w-full">
      <div className="flex items-center gap-3">
        <Sun size={22} className="text-amber-400 flex-shrink-0" />
        <div>
          <h1 className="text-2xl font-bold text-white">Vacances</h1>
          <p className="text-slate-500 text-sm">Séances sans matériel — adaptées aux déplacements</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {VACATION_SESSIONS.map((session, idx) => (
          <div
            key={session.id}
            className="bg-slate-800/50 border border-slate-700/40 rounded-2xl overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-400 font-bold text-sm">{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-white font-bold text-base leading-tight">{session.name}</h2>
                  <p className="text-slate-400 text-sm mt-0.5">{session.shortDescription}</p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 mb-4">
                {session.exercises.map(ex => (
                  <div key={ex.id} className="flex items-center gap-2">
                    <span className="text-base leading-none">{ex.thumbnail ?? '•'}</span>
                    <span className="text-slate-300 text-sm font-medium">{ex.name}</span>
                    <span className="text-slate-600 text-xs ml-auto">
                      {ex.sets.length}×{' '}
                      {ex.sets[0]?.targetReps
                        ? `${ex.sets[0].targetReps} reps`
                        : ex.sets[0]?.targetDuration
                        ? `${ex.sets[0].targetDuration}s`
                        : TYPE_LABELS[ex.type] ?? ex.type}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate(`/seance/${session.id}`)}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Play size={15} />
                Commencer
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-4">
        <p className="text-slate-400 text-sm">
          Ces séances sont conçues pour être réalisées sans équipement, dans une chambre d'hôtel ou un appartement de vacances.
          Modifie les séries et durées directement dans l'interface de séance.
        </p>
      </div>
    </div>
  )
}

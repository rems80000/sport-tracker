import { useState } from 'react'
import { PROGRAM } from '../data/program'
import { ChevronDown, ChevronUp, Dumbbell, Clock, Repeat } from 'lucide-react'
import type { Exercise } from '../types'
import { formatDuration } from '../utils/storage'

function ExerciseRow({ ex }: { ex: Exercise }) {
  const [open, setOpen] = useState(false)
  const setCount = ex.sets.length
  const firstSet = ex.sets[0]
  const target = ex.type === 'reps'
    ? firstSet.targetReps === 0 ? 'Max propre' : `${firstSet.targetReps} reps`
    : ex.type === 'duration'
    ? formatDuration(firstSet.targetDuration ?? 0)
    : firstSet.targetDuration ? formatDuration(firstSet.targetDuration) : '—'
  const rest = firstSet.restSeconds

  return (
    <div className="border border-slate-700/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 text-left active:bg-slate-700/30 transition-colors"
      >
        <div className="w-9 h-9 rounded-lg bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
          {ex.type === 'cardio' ? <Clock size={16} className="text-indigo-400" /> :
           ex.type === 'duration' ? <Clock size={16} className="text-teal-400" /> :
           <Dumbbell size={16} className="text-indigo-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">{ex.name}</p>
          <p className="text-slate-400 text-xs mt-0.5">
            {ex.type === 'cardio' ? target :
             `${setCount} × ${target}`}
            {rest > 0 && <span className="text-slate-500"> · repos {rest}s</span>}
          </p>
        </div>
        {ex.notes && (open ? <ChevronUp size={16} className="text-slate-500 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-500 flex-shrink-0" />)}
      </button>
      {open && ex.notes && (
        <div className="px-4 pb-4 pt-0">
          <div className="bg-slate-800/60 rounded-lg p-3">
            <p className="text-slate-300 text-sm">{ex.notes}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export function Program() {
  const [openSession, setOpenSession] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-4 pb-24 pt-4 px-4 max-w-2xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-white">Programme</h1>
        <p className="text-slate-400 text-sm mt-1">Lundi · Mardi · Jeudi · Vendredi optionnel</p>
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

      {PROGRAM.map(session => {
        const isOpen = openSession === session.id
        const DAY_COLORS: Record<string, string> = {
          monday: 'border-indigo-500/30 bg-indigo-600/10',
          tuesday: 'border-purple-500/30 bg-purple-600/10',
          thursday: 'border-teal-500/30 bg-teal-600/10',
          friday: 'border-amber-500/30 bg-amber-600/10',
        }
        const borderColor = DAY_COLORS[session.day] ?? 'border-slate-700/50 bg-slate-800/30'

        return (
          <div key={session.id} className={`rounded-2xl border overflow-hidden ${borderColor}`}>
            <button
              onClick={() => setOpenSession(isOpen ? null : session.id)}
              className="w-full flex items-center gap-3 p-4 text-left active:bg-white/5 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{session.dayLabel}</p>
                <p className="text-white font-bold mt-0.5">{session.name}</p>
                <p className="text-slate-400 text-sm mt-0.5">{session.shortDescription}</p>
                {session.hasShortVersion && (
                  <p className="text-xs text-amber-400 mt-1">Version courte : {session.shortVersionDescription}</p>
                )}
              </div>
              {isOpen ? <ChevronUp size={18} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={18} className="text-slate-400 flex-shrink-0" />}
            </button>

            {isOpen && (
              <div className="px-4 pb-4 flex flex-col gap-2 animate-slide-up">
                {session.exercises.map(ex => (
                  <ExerciseRow key={ex.id} ex={ex} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

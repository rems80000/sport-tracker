import type { WorkoutSession, SessionStatus } from '../types'
import { CheckCircle, Clock, XCircle, AlertCircle, PlayCircle } from 'lucide-react'

interface SessionCardProps {
  session: WorkoutSession
  status: SessionStatus
  onStart?: () => void
  compact?: boolean
}

const STATUS_CONFIG: Record<SessionStatus, { label: string; color: string; Icon: typeof CheckCircle }> = {
  todo:       { label: 'À faire',               color: 'text-slate-400',  Icon: Clock },
  in_progress:{ label: 'En cours',              color: 'text-indigo-400', Icon: PlayCircle },
  done:       { label: 'Validée',               color: 'text-green-400',  Icon: CheckCircle },
  done_short: { label: 'Séance courte validée', color: 'text-teal-400',   Icon: CheckCircle },
  missed:     { label: 'Ratée',                 color: 'text-red-400',    Icon: XCircle },
}

const DAY_BG: Record<string, string> = {
  monday:    'bg-indigo-600/20 border-indigo-500/30',
  tuesday:   'bg-purple-600/20 border-purple-500/30',
  thursday:  'bg-teal-600/20 border-teal-500/30',
  friday:    'bg-amber-600/20 border-amber-500/30',
}

export function SessionCard({ session, status, onStart, compact = false }: SessionCardProps) {
  const { label, color, Icon } = STATUS_CONFIG[status]
  const bgClass = DAY_BG[session.day] ?? 'bg-slate-700/20 border-slate-600/30'

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-xl border ${bgClass}`}>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{session.dayLabel}</p>
          <p className="text-xs text-slate-400 truncate">{session.shortDescription}</p>
        </div>
        <Icon size={18} className={color} />
      </div>
    )
  }

  return (
    <div className={`p-4 rounded-2xl border ${bgClass} flex flex-col gap-3`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{session.dayLabel}</span>
            <span className={`flex items-center gap-1 text-xs font-semibold ${color}`}>
              <Icon size={13} />
              {label}
            </span>
          </div>
          <h3 className="text-base font-bold text-white leading-tight">{session.name}</h3>
          <p className="text-sm text-slate-400 mt-0.5">{session.shortDescription}</p>
        </div>
      </div>

      {onStart && (status === 'todo' || status === 'missed') && (
        <button
          onClick={onStart}
          className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          <PlayCircle size={18} />
          Lancer la séance
        </button>
      )}
      {onStart && status === 'in_progress' && (
        <button
          onClick={onStart}
          className="w-full py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          <PlayCircle size={18} />
          Reprendre la séance
        </button>
      )}
      {(status === 'done' || status === 'done_short') && (
        <div className="flex items-center gap-2 text-sm">
          <AlertCircle size={14} className="text-slate-500 flex-shrink-0" />
          <span className="text-slate-500">Déjà validée cette semaine</span>
        </div>
      )}
    </div>
  )
}

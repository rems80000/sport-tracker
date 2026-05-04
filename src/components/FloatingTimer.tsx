import { useState } from 'react'
import { Play, Pause, SkipForward, RotateCcw, Plus, Minus, Timer } from 'lucide-react'
import { useTimer } from '../store/timerContext'
import { formatDuration } from '../utils/storage'

const PRESETS = [30, 45, 60, 90, 120]

export function FloatingTimer() {
  const { timerState, start, toggle, skip, adjust, reset } = useTimer()
  const { remaining, running, finished, total } = timerState
  const [expanded, setExpanded] = useState(false)

  const isActive = running || finished || remaining !== total
  const progress = total > 0 ? (total - remaining) / total : 0

  const timeColor = finished
    ? 'text-green-400'
    : remaining <= 10 && running
    ? 'text-orange-400'
    : 'text-white'

  const bgClass = running
    ? 'bg-indigo-900/95'
    : finished
    ? 'bg-green-900/90'
    : 'bg-slate-900/95'

  return (
    <div
      className={`fixed bottom-[60px] left-0 right-0 z-40 border-t transition-colors ${
        running ? 'border-indigo-500/40' : finished ? 'border-green-500/30' : 'border-slate-700/50'
      } ${bgClass} backdrop-blur-md pb-safe`}
    >
      {/* Progress bar */}
      {(running || (isActive && !finished)) && (
        <div className="h-0.5 bg-slate-800">
          <div
            className="h-full bg-indigo-500 transition-all duration-1000"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      <div className="max-w-2xl mx-auto px-3 py-2">
        {/* Main row */}
        <div className="flex items-center gap-2">
          {/* Timer icon + time display */}
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-2 min-w-0"
          >
            <Timer size={15} className={running ? 'text-indigo-400' : 'text-slate-500'} />
            <span className={`font-mono text-xl font-bold tabular-nums leading-none ${timeColor} ${finished ? 'animate-flash' : ''}`}>
              {finished ? '✓ OK' : formatDuration(remaining)}
            </span>
          </button>

          {/* Presets — shown when not running */}
          {!running && !finished && (
            <div className="flex gap-1 overflow-x-auto scrollbar-hide flex-1">
              {PRESETS.map(s => (
                <button
                  key={s}
                  onClick={() => start(s)}
                  className={`flex-shrink-0 px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    total === s && isActive
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700/80 text-slate-300 active:bg-slate-600'
                  }`}
                >
                  {s < 60 ? `${s}s` : s === 90 ? '1m30' : `${s / 60}m`}
                </button>
              ))}
            </div>
          )}

          {/* Controls when running or finished */}
          {(running || finished || isActive) && (
            <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
              {running && (
                <button
                  onClick={() => adjust(-15)}
                  className="w-8 h-8 rounded-lg bg-slate-700/80 flex items-center justify-center active:scale-95 transition-transform text-slate-300"
                >
                  <Minus size={14} />
                </button>
              )}

              <button
                onClick={finished ? () => reset() : toggle}
                className={`w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform ${
                  finished ? 'bg-green-600' : running ? 'bg-orange-500' : 'bg-indigo-600'
                }`}
              >
                {finished
                  ? <RotateCcw size={16} className="text-white" />
                  : running
                  ? <Pause size={16} className="text-white" />
                  : <Play size={16} className="text-white" />
                }
              </button>

              {running && (
                <button
                  onClick={() => adjust(15)}
                  className="w-8 h-8 rounded-lg bg-slate-700/80 flex items-center justify-center active:scale-95 transition-transform text-slate-300"
                >
                  <Plus size={14} />
                </button>
              )}

              {!finished && (
                <button
                  onClick={skip}
                  className="w-8 h-8 rounded-lg bg-slate-700/60 flex items-center justify-center active:scale-95 transition-transform text-slate-400"
                >
                  <SkipForward size={14} />
                </button>
              )}

              {!running && isActive && (
                <button
                  onClick={() => reset()}
                  className="w-8 h-8 rounded-lg bg-slate-700/60 flex items-center justify-center active:scale-95 transition-transform text-slate-400"
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>
          )}

          {/* Expand toggle when idle */}
          {!running && !finished && !isActive && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="ml-auto w-8 h-8 rounded-lg bg-slate-700/60 flex items-center justify-center text-slate-500"
            >
              {expanded ? '▲' : '▼'}
            </button>
          )}
        </div>

        {/* Expanded: adjust time when paused */}
        {expanded && !running && isActive && !finished && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-700/40 animate-slide-up">
            <span className="text-xs text-slate-400 flex-1">Ajuster :</span>
            {PRESETS.map(s => (
              <button
                key={s}
                onClick={() => { reset(s) }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  total === s ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {s < 60 ? `${s}s` : s === 90 ? '1m30' : `${s / 60}m`}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

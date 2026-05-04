import { Play, Pause, SkipForward, RotateCcw, Plus, Minus, Timer } from 'lucide-react'
import { useTimer } from '../store/timerContext'
import { formatDuration } from '../utils/storage'

const PRESETS = [30, 45, 60, 90, 120]

function presetLabel(s: number) {
  if (s < 60) return `${s}s`
  if (s === 90) return '1m30'
  return `${s / 60}m`
}

export function FloatingTimer() {
  const { timerState, start, toggle, skip, adjust, reset } = useTimer()
  const { remaining, running, finished, total } = timerState

  const isActive = running || finished || remaining !== total

  // ── Idle: compact preset bar ──────────────────────────────────────────────
  if (!isActive) {
    return (
      <div className="fixed bottom-[60px] left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-700/40 pb-safe">
        <div className="max-w-2xl mx-auto px-3 py-2.5 flex items-center gap-2">
          <Timer size={14} className="text-slate-600 flex-shrink-0" />
          <span className="text-slate-600 text-xs font-medium mr-1">Repos</span>
          <div className="flex gap-1.5 flex-1 overflow-x-auto">
            {PRESETS.map(s => (
              <button
                key={s}
                onClick={() => start(s)}
                className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-700/80 text-slate-300 active:bg-indigo-600 active:text-white transition-colors"
              >
                {presetLabel(s)}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Active: large premium card ────────────────────────────────────────────
  const progress = total > 0 ? (total - remaining) / total : 0

  const timeColor = finished ? '#4ade80' : remaining <= 10 && running ? '#fb923c' : '#ffffff'
  const glowColor = finished
    ? 'rgba(74,222,128,0.55)'
    : remaining <= 10 && running
    ? 'rgba(251,146,60,0.55)'
    : 'rgba(99,102,241,0.55)'
  const glowColorDim = glowColor.replace('0.55', '0.25')
  const accentColor = finished ? '#16a34a' : running ? '#ea580c' : '#4f46e5'
  const accentGlow = finished
    ? 'rgba(22,163,74,0.45)'
    : running
    ? 'rgba(234,88,12,0.45)'
    : 'rgba(79,70,229,0.45)'
  const borderColor = finished
    ? 'rgba(74,222,128,0.30)'
    : running
    ? 'rgba(99,102,241,0.40)'
    : 'rgba(51,65,85,0.50)'

  return (
    <div
      className="fixed bottom-[60px] left-0 right-0 z-40 backdrop-blur-xl pb-safe"
      style={{
        background: `linear-gradient(to top, ${glowColor.replace('0.55', '0.07')}, transparent 60%), rgba(6,9,18,0.97)`,
        borderTop: `1px solid ${borderColor}`,
        boxShadow: `0 -6px 32px ${glowColor.replace('0.55', '0.12')}`,
      }}
    >
      {/* Progress bar */}
      <div className="h-0.5 bg-slate-800/60">
        <div
          className="h-full transition-all duration-1000"
          style={{
            width: `${progress * 100}%`,
            background: finished
              ? '#4ade80'
              : `linear-gradient(to right, #6366f1, #8b5cf6)`,
          }}
        />
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-3 pb-2">
        {/* Big time display */}
        <div className="flex items-center justify-center mb-3">
          <span
            className={`font-mono font-black tabular-nums tracking-tight leading-none select-none ${finished ? 'animate-flash' : ''}`}
            style={{
              fontSize: '54px',
              color: timeColor,
              textShadow: `0 0 18px ${glowColor}, 0 0 36px ${glowColorDim}`,
            }}
          >
            {finished ? '✓ Repos!' : formatDuration(remaining)}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2.5">
          {/* −15s */}
          <button
            onClick={() => adjust(-15)}
            className="w-11 h-11 rounded-xl bg-slate-700/60 flex flex-col items-center justify-center active:scale-95 transition-transform gap-0"
            aria-label="-15s"
          >
            <Minus size={13} className="text-slate-300" />
            <span className="text-slate-500 text-[9px] leading-none mt-0.5">15s</span>
          </button>

          {/* Play / Pause / Reset */}
          <button
            onClick={finished ? () => reset() : toggle}
            className="w-14 h-14 rounded-2xl flex items-center justify-center active:scale-95 transition-all"
            style={{
              background: accentColor,
              boxShadow: `0 4px 20px ${accentGlow}`,
            }}
            aria-label={finished ? 'Réinitialiser' : running ? 'Pause' : 'Reprendre'}
          >
            {finished
              ? <RotateCcw size={22} className="text-white" />
              : running
              ? <Pause size={22} className="text-white" />
              : <Play size={22} className="text-white" />
            }
          </button>

          {/* +15s */}
          <button
            onClick={() => adjust(15)}
            className="w-11 h-11 rounded-xl bg-slate-700/60 flex flex-col items-center justify-center active:scale-95 transition-transform"
            aria-label="+15s"
          >
            <Plus size={13} className="text-slate-300" />
            <span className="text-slate-500 text-[9px] leading-none mt-0.5">15s</span>
          </button>

          {/* Skip */}
          {!finished && (
            <button
              onClick={skip}
              className="w-11 h-11 rounded-xl bg-slate-700/40 flex flex-col items-center justify-center active:scale-95 transition-transform"
              aria-label="Passer"
            >
              <SkipForward size={14} className="text-slate-400" />
              <span className="text-slate-600 text-[9px] leading-none mt-0.5">Skip</span>
            </button>
          )}

          {/* Reset (when paused) */}
          {!running && !finished && (
            <button
              onClick={() => reset()}
              className="w-11 h-11 rounded-xl bg-slate-700/40 flex flex-col items-center justify-center active:scale-95 transition-transform"
              aria-label="Réinitialiser"
            >
              <RotateCcw size={14} className="text-slate-400" />
              <span className="text-slate-600 text-[9px] leading-none mt-0.5">Reset</span>
            </button>
          )}
        </div>

        {/* Preset pills */}
        <div className="flex justify-center gap-1.5 mt-2.5">
          {PRESETS.map(s => (
            <button
              key={s}
              onClick={() => start(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                total === s && !finished
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700/60 text-slate-500 active:bg-slate-600 active:text-white'
              }`}
            >
              {presetLabel(s)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

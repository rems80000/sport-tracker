import { useState } from 'react'
import { X, Play, Pause, RotateCcw, Plus, Minus, SkipForward } from 'lucide-react'
import { useTimer } from '../store/timerContext'
import { formatDuration } from '../utils/storage'

const PRESETS = [30, 45, 60, 90, 120]
function presetLabel(s: number) {
  if (s < 60) return `${s}s`
  if (s === 90) return '1m30'
  return `${s / 60}m`
}

export function TimerModal({ onClose }: { onClose: () => void }) {
  const { timerState, start, toggle, skip, adjust, reset } = useTimer()
  const { remaining, running, finished, total } = timerState
  const [custom, setCustom] = useState('')

  const progress = total > 0 ? (total - remaining) / total : 0
  const timeColor = finished ? '#4ade80' : remaining <= 10 && running ? '#fb923c' : '#ffffff'
  const btnBg = finished ? '#16a34a' : running ? '#ea580c' : '#4f46e5'

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-slate-900 border border-slate-700/50 rounded-3xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-slate-300 text-sm font-bold uppercase tracking-wider">Timer repos</p>
          <button onClick={onClose} className="p-1 text-slate-500 active:text-slate-300"><X size={16} /></button>
        </div>

        <div className="h-1.5 bg-slate-800 rounded-full mb-4 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${progress * 100}%`, background: finished ? '#4ade80' : 'linear-gradient(to right,#6366f1,#8b5cf6)' }} />
        </div>

        <div className="text-center mb-4">
          <span className={`font-mono font-black tabular-nums leading-none ${finished ? 'animate-flash' : ''}`}
            style={{ fontSize: '64px', color: timeColor }}>
            {finished ? '✓' : formatDuration(remaining)}
          </span>
          {finished && <p className="text-green-400 font-bold text-base mt-1">Repos terminé !</p>}
        </div>

        <div className="flex justify-center gap-1.5 mb-4">
          {PRESETS.map(s => (
            <button key={s} onClick={() => start(s)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                total === s && !finished ? 'bg-indigo-600 text-white' : 'bg-slate-700/80 text-slate-400 active:bg-indigo-700 active:text-white'
              }`}>
              {presetLabel(s)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <input
            type="number" inputMode="numeric" value={custom}
            onChange={e => setCustom(e.target.value)}
            placeholder="Durée perso (s)"
            className="flex-1 bg-slate-800 rounded-xl px-3 py-2 text-white text-sm text-center placeholder:text-slate-600"
          />
          <button
            onClick={() => { if (custom) { start(parseInt(custom)); setCustom('') } }}
            className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold active:scale-95 transition-transform"
          >
            Go
          </button>
        </div>

        <div className="flex items-center justify-center gap-2.5">
          <button onClick={() => adjust(-15)}
            className="w-11 h-11 rounded-xl bg-slate-700/60 flex flex-col items-center justify-center active:scale-95 transition-transform">
            <Minus size={13} className="text-slate-300" />
            <span className="text-slate-500 text-[9px] mt-0.5">15s</span>
          </button>
          <button onClick={finished ? () => reset() : toggle}
            className="w-14 h-14 rounded-2xl flex items-center justify-center active:scale-95 transition-all"
            style={{ background: btnBg }}>
            {finished ? <RotateCcw size={22} className="text-white" /> : running ? <Pause size={22} className="text-white" /> : <Play size={22} className="text-white" />}
          </button>
          <button onClick={() => adjust(15)}
            className="w-11 h-11 rounded-xl bg-slate-700/60 flex flex-col items-center justify-center active:scale-95 transition-transform">
            <Plus size={13} className="text-slate-300" />
            <span className="text-slate-500 text-[9px] mt-0.5">15s</span>
          </button>
          {!finished && (
            <button onClick={skip}
              className="w-11 h-11 rounded-xl bg-slate-700/40 flex flex-col items-center justify-center active:scale-95 transition-transform">
              <SkipForward size={14} className="text-slate-400" />
              <span className="text-slate-600 text-[9px] mt-0.5">Skip</span>
            </button>
          )}
          {!running && !finished && (
            <button onClick={() => reset()}
              className="w-11 h-11 rounded-xl bg-slate-700/40 flex flex-col items-center justify-center active:scale-95 transition-transform">
              <RotateCcw size={14} className="text-slate-400" />
              <span className="text-slate-600 text-[9px] mt-0.5">Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

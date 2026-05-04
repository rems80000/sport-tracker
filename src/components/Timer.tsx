import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, RotateCcw, SkipForward, Plus, Minus } from 'lucide-react'
import { formatDuration } from '../utils/storage'

interface TimerProps {
  initialSeconds?: number
  autoStart?: boolean
  onComplete?: () => void
  compact?: boolean
}

const PRESETS = [30, 45, 60, 90, 120]

export function Timer({ initialSeconds = 90, autoStart = false, onComplete, compact = false }: TimerProps) {
  const [total, setTotal] = useState(initialSeconds)
  const [remaining, setRemaining] = useState(initialSeconds)
  const [running, setRunning] = useState(autoStart)
  const [finished, setFinished] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<AudioContext | null>(null)

  const playBeep = useCallback(() => {
    try {
      const ctx = new AudioContext()
      audioRef.current = ctx
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.frequency.value = 880
      oscillator.type = 'sine'
      gainNode.gain.setValueAtTime(0.8, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.8)
    } catch {
      // AudioContext not supported
    }
  }, [])

  const vibrateDevice = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 400])
    }
  }, [])

  const handleComplete = useCallback(() => {
    setRunning(false)
    setFinished(true)
    playBeep()
    vibrateDevice()
    onComplete?.()
  }, [playBeep, vibrateDevice, onComplete])

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!)
            handleComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running, handleComplete])

  const reset = useCallback((newTotal?: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    const t = newTotal ?? total
    setTotal(t)
    setRemaining(t)
    setRunning(false)
    setFinished(false)
  }, [total])

  const toggle = () => {
    if (finished) { reset(); return }
    setRunning(r => !r)
  }

  const skip = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRemaining(0)
    setRunning(false)
    setFinished(true)
    onComplete?.()
  }

  const adjust = (delta: number) => {
    setRemaining(prev => Math.max(0, prev + delta))
    setTotal(prev => Math.max(0, prev + delta))
    if (delta > 0) setFinished(false)
  }

  const progress = total > 0 ? (total - remaining) / total : 0
  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = circumference * (1 - progress)

  if (compact) {
    return (
      <div className={`flex items-center gap-3 bg-slate-800 rounded-2xl px-4 py-3 ${finished ? 'animate-flash' : ''}`}>
        <span className={`font-mono text-2xl font-bold tabular-nums ${finished ? 'text-green-400' : remaining <= 10 ? 'text-orange-400' : 'text-white'}`}>
          {formatDuration(remaining)}
        </span>
        <button onClick={toggle} className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center active:scale-95 transition-transform">
          {running ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button onClick={() => reset()} className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center active:scale-95 transition-transform">
          <RotateCcw size={16} />
        </button>
        <button onClick={skip} className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center active:scale-95 transition-transform">
          <SkipForward size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Circular progress */}
      <div className={`relative ${finished ? 'animate-flash' : ''}`}>
        <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
          <circle cx="70" cy="70" r="54" fill="none" stroke="#1e293b" strokeWidth="10" />
          <circle
            cx="70" cy="70" r="54" fill="none"
            stroke={finished ? '#22c55e' : remaining <= 10 ? '#f97316' : '#6366f1'}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-mono text-4xl font-bold tabular-nums ${finished ? 'text-green-400' : remaining <= 10 ? 'text-orange-400' : 'text-white'}`}>
            {formatDuration(remaining)}
          </span>
          {finished && <span className="text-green-400 text-xs font-semibold mt-1">TERMINÉ</span>}
        </div>
      </div>

      {/* Preset buttons */}
      <div className="flex gap-2">
        {PRESETS.map(s => (
          <button
            key={s}
            onClick={() => reset(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${total === s && !finished ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 active:bg-slate-600'}`}
          >
            {s < 60 ? `${s}s` : `${s / 60}m`}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button onClick={() => adjust(-15)} className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center active:scale-95 transition-transform text-slate-300">
          <Minus size={18} />
        </button>

        <button
          onClick={toggle}
          className={`w-20 h-20 rounded-2xl flex items-center justify-center active:scale-95 transition-all font-semibold text-lg shadow-lg ${running ? 'bg-orange-500' : 'bg-indigo-600'}`}
        >
          {running ? <Pause size={28} /> : finished ? <RotateCcw size={28} /> : <Play size={28} />}
        </button>

        <button onClick={() => adjust(15)} className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center active:scale-95 transition-transform text-slate-300">
          <Plus size={18} />
        </button>
      </div>

      <div className="flex gap-3">
        <button onClick={() => reset()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 text-slate-300 text-sm active:scale-95 transition-transform">
          <RotateCcw size={15} /> Réinit.
        </button>
        <button onClick={skip} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 text-slate-300 text-sm active:scale-95 transition-transform">
          <SkipForward size={15} /> Passer
        </button>
      </div>
    </div>
  )
}

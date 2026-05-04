import type { Exercise, ExerciseCategory } from '../types'

const CATEGORY_STYLE: Record<ExerciseCategory, { bg: string; ring: string }> = {
  weight:     { bg: 'bg-indigo-600/25', ring: 'ring-indigo-500/30' },
  bodyweight: { bg: 'bg-purple-600/25', ring: 'ring-purple-500/30' },
  cardio:     { bg: 'bg-blue-600/25',   ring: 'ring-blue-500/30'   },
  plank:      { bg: 'bg-teal-600/25',   ring: 'ring-teal-500/30'   },
  mobility:   { bg: 'bg-amber-600/25',  ring: 'ring-amber-500/30'  },
  other:      { bg: 'bg-slate-600/25',  ring: 'ring-slate-500/30'  },
}

const DEFAULT_STYLE = { bg: 'bg-slate-700/40', ring: 'ring-slate-600/30' }

const SIZE: Record<'sm' | 'md' | 'lg', { box: string; emoji: string; img: string }> = {
  sm: { box: 'w-10 h-10', emoji: 'text-xl',   img: 'w-10 h-10' },
  md: { box: 'w-14 h-14', emoji: 'text-2xl',  img: 'w-14 h-14' },
  lg: { box: 'w-20 h-20', emoji: 'text-4xl',  img: 'w-20 h-20' },
}

interface ExerciseImageProps {
  exercise: Pick<Exercise, 'name' | 'thumbnail' | 'imageUrl' | 'category'>
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ExerciseImage({ exercise, size = 'md', className = '' }: ExerciseImageProps) {
  const s = SIZE[size]
  const style = exercise.category ? CATEGORY_STYLE[exercise.category] : DEFAULT_STYLE

  if (exercise.imageUrl) {
    return (
      <img
        src={exercise.imageUrl}
        alt={exercise.name}
        className={`${s.img} object-cover rounded-xl ring-1 ${style.ring} flex-shrink-0 ${className}`}
      />
    )
  }

  const emoji = exercise.thumbnail ?? '💪'

  return (
    <div
      className={`${s.box} ${style.bg} ring-1 ${style.ring} rounded-xl flex items-center justify-center flex-shrink-0 ${className}`}
      title={exercise.name}
    >
      <span className={s.emoji} role="img" aria-label={exercise.name}>{emoji}</span>
    </div>
  )
}

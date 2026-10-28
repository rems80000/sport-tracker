import type { SessionLog } from '../types'

export function getLatestWeights(sessions: SessionLog[]): Record<string, number> {
  const weights: Record<string, number> = {}
  const chronological = [...sessions].sort((a, b) => Date.parse(a.date) - Date.parse(b.date))

  for (const session of chronological) {
    for (const set of session.sets) {
      if (set.completed && set.weightKg) weights[set.exerciseId] = set.weightKg
    }
  }

  return weights
}

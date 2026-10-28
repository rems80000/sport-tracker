import test from 'node:test'
import assert from 'node:assert/strict'
import { getLatestWeights } from '../src/utils/progress.ts'

const set = (exerciseId, weightKg, completed = true) => ({ exerciseId, weightKg, completed })

test('latest weights follow session dates regardless of input order without changing the history', () => {
  const older = { date: '2026-10-20T12:00:00Z', sets: [set('squat', 8), set('row', 6)] }
  const newer = { date: '2026-10-27T12:00:00Z', sets: [set('squat', 12)] }
  for (const sessions of [[newer, older], [older, newer]]) {
    const before = structuredClone(sessions)
    assert.deepEqual(getLatestWeights(sessions), { squat: 12, row: 6 })
    assert.deepEqual(sessions, before)
  }
})

test('latest weights use the last completed weighted set and ignore unfinished or unweighted sets', () => {
  assert.deepEqual(getLatestWeights([
    { date: '2026-10-20T12:00:00Z', sets: [set('squat', 8)] },
    { date: '2026-10-27T12:00:00Z', sets: [
      set('squat', 10), set('squat', 12), set('squat', 14, false),
      set('squat', undefined), set('row', 6, false),
    ] },
  ]), { squat: 12 })
  assert.deepEqual(getLatestWeights([]), {})
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { getWeekKey, groupSessionsByWeek } from '../src/utils/storage.ts'

test('week keys use the ISO week year at both ends of calendar years', () => {
  for (const [year, month, day, expected] of [
    [2020, 11, 28, '2020-W53'],
    [2021, 0, 1, '2020-W53'],
    [2021, 0, 3, '2020-W53'],
    [2021, 0, 4, '2021-W01'],
    [2024, 11, 30, '2025-W01'],
    [2025, 0, 5, '2025-W01'],
    [2026, 9, 16, '2026-W42'],
  ]) {
    const date = new Date(year, month, day, 12)
    const timestamp = date.getTime()
    assert.equal(getWeekKey(date), expected)
    assert.equal(date.getTime(), timestamp)
  }
})

test('sessions in one week stay together across New Year', () => {
  const sessions = [
    { id: 'december', date: new Date(2024, 11, 30, 12).toISOString() },
    { id: 'january', date: new Date(2025, 0, 5, 12).toISOString() },
    { id: 'next-week', date: new Date(2025, 0, 6, 12).toISOString() },
  ]
  assert.deepEqual(groupSessionsByWeek(sessions), {
    '2025-W01': sessions.slice(0, 2),
    '2025-W02': sessions.slice(2),
  })
})
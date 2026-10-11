import { test } from 'node:test'
import assert from 'node:assert/strict'
import { countPresenceDays } from '../src/modules/presence/practiceDays.ts'

function session(year, month, day, hour = 12, minute = 0) {
  return { date: new Date(year, month - 1, day, hour, minute).toISOString() }
}

test('several sessions on the same local date count as one day', () => {
  assert.equal(countPresenceDays([
    session(2026, 10, 11, 8), session(2026, 10, 11, 20), session(2026, 10, 10),
  ]), 2)
})

test('presence days follow local midnight and distinguish months and years', () => {
  assert.equal(countPresenceDays([
    session(2026, 10, 10, 23, 59), session(2026, 10, 11, 0, 1),
    session(2026, 9, 11), session(2025, 10, 11),
  ]), 4)
})

test('an empty history or invalid dates do not add practice days', () => {
  assert.equal(countPresenceDays([]), 0)
  assert.equal(countPresenceDays([{ date: 'invalid' }, session(2026, 10, 11)]), 1)
})

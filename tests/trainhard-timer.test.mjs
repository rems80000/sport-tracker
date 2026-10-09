import test from 'node:test'
import assert from 'node:assert/strict'
import { timerReducer } from '../src/store/timerReducer.ts'

test('reducing a running rest to zero finishes it instead of leaving it stuck', () => {
  const initial = { total: 90, remaining: 10, running: true, finished: false }
  for (const delta of [-10, -15]) {
    const ended = timerReducer(initial, { type: 'ADJUST', delta })
    assert.equal(ended.remaining, 0)
    assert.equal(ended.running, false)
    assert.equal(ended.finished, true)
    assert.equal(timerReducer(ended, { type: 'TICK' }), ended)
  }
})

test('adjustments preserve running or paused state while time remains', () => {
  for (const running of [true, false]) {
    const initial = { total: 90, remaining: 30, running, finished: false }
    const shorter = timerReducer(initial, { type: 'ADJUST', delta: -15 })
    assert.deepEqual(shorter, { total: 75, remaining: 15, running, finished: false })
    const longer = timerReducer(shorter, { type: 'ADJUST', delta: 15 })
    assert.deepEqual(longer, initial)
  }
})

test('paused zero and extended completed rests remain stopped', () => {
  const paused = { total: 90, remaining: 5, running: false, finished: false }
  const ended = timerReducer(paused, { type: 'ADJUST', delta: -15 })
  assert.equal(ended.finished, true)
  assert.equal(ended.running, false)
  const longer = timerReducer(ended, { type: 'ADJUST', delta: 15 })
  assert.equal(longer.remaining, 15)
  assert.equal(longer.finished, false)
  assert.equal(longer.running, false)
})

test('normal ticking, pause, resume and reset remain consistent', () => {
  const started = timerReducer({ total: 90, remaining: 90, running: false, finished: false }, { type: 'START', seconds: 2 })
  const paused = timerReducer(started, { type: 'TOGGLE' })
  assert.equal(timerReducer(paused, { type: 'TICK' }), paused)
  const resumed = timerReducer(paused, { type: 'TOGGLE' })
  const ended = timerReducer(timerReducer(resumed, { type: 'TICK' }), { type: 'TICK' })
  assert.deepEqual(ended, { total: 2, remaining: 0, running: false, finished: true })
  assert.deepEqual(timerReducer(ended, { type: 'RESET', seconds: 60 }), { total: 60, remaining: 60, running: false, finished: false })
})


test('invalid custom durations preserve the current rest', () => {
  for (const running of [true, false]) {
    const current = { total: 90, remaining: 30, running, finished: false }
    for (const seconds of [0, -15, 1.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      assert.equal(timerReducer(current, { type: 'START', seconds }), current)
    }
    assert.deepEqual(timerReducer(current, { type: 'START', seconds: 45 }), { total: 45, remaining: 45, running: true, finished: false })
  }
})

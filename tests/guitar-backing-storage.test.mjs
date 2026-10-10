import test from 'node:test'
import assert from 'node:assert/strict'
import { loadBackings, saveBackings } from '../src/modules/guitar/backingStorage.ts'

const track = { id: 'audio-1', title: 'Blues', key: 'La', file: { id: 'audio-1', kind: 'audio' } }
function storage(t, raw) {
  const previous = globalThis.localStorage
  const saved = { raw, writes: 0 }
  globalThis.localStorage = {
    getItem(key) { assert.equal(key, 'life_hub_guitar_backings_v1'); return saved.raw },
    setItem(key, value) { assert.equal(key, 'life_hub_guitar_backings_v1'); saved.raw = value; saved.writes++ },
  }
  t.after(() => { globalThis.localStorage = previous })
  return saved
}

test('invalid JSON and invalid list entries remain untouched during a write', t => {
  const saved = storage(t, null)
  for (const raw of ['{broken', JSON.stringify([track, null]), JSON.stringify([{ ...track, file: { id: 'audio-1', kind: 'image' } }])]) {
    saved.raw = raw
    assert.ok(loadBackings().error)
    assert.throws(() => saveBackings([track]))
    assert.equal(saved.raw, raw)
    assert.equal(saved.writes, 0)
  }
})

test('an unavailable read blocks writing even when writes are allowed', t => {
  const saved = storage(t, JSON.stringify([track]))
  globalThis.localStorage.getItem = () => { throw new Error('Storage unavailable') }
  assert.throws(() => saveBackings([]))
  assert.equal(saved.writes, 0)
  assert.equal(saved.raw, JSON.stringify([track]))
})

test('storage that becomes unreadable after loading is checked again before writing', t => {
  const saved = storage(t, JSON.stringify([track]))
  assert.deepEqual(loadBackings().tracks, [track])
  saved.raw = '{broken later'
  assert.throws(() => saveBackings([]))
  assert.equal(saved.raw, '{broken later')
  assert.equal(saved.writes, 0)
})

test('an empty or readable list can still be saved and loaded', t => {
  const saved = storage(t, null)
  assert.deepEqual(loadBackings(), { tracks: [], error: '' })
  saveBackings([track])
  assert.deepEqual(loadBackings(), { tracks: [track], error: '' })
  saveBackings([])
  assert.deepEqual(loadBackings(), { tracks: [], error: '' })
  assert.equal(saved.writes, 2)
})

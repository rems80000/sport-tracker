import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEMO, initialLibrary, saveSongLibrary } from '../src/modules/guitar/songStorage.ts'

const libraryKey = 'life_hub_guitar_songs_v1'
function storage(raw) {
  let value = raw
  let writes = 0
  globalThis.localStorage = {
    getItem(key) { assert.equal(key, libraryKey); return value },
    setItem(key, next) { assert.equal(key, libraryKey); value = next; writes++ },
  }
  return { value: () => value, writes: () => writes, change: next => { value = next } }
}

test('saving preserves unreadable song libraries without writing', () => {
  for (const raw of ['{broken', '[null]', JSON.stringify([{ ...DEMO, speed: 'fast' }])]) {
    const saved = storage(raw)
    assert.ok(initialLibrary().error)
    assert.throws(() => saveSongLibrary([DEMO]), /Bibliothèque illisible/)
    assert.equal(saved.value(), raw)
    assert.equal(saved.writes(), 0)
  }
})

test('an unavailable or newly unreadable library blocks saving', () => {
  let writes = 0
  globalThis.localStorage = { getItem() { throw new Error('blocked') }, setItem() { writes++ } }
  assert.throws(() => saveSongLibrary([DEMO]), /stockage indisponible/)
  assert.equal(writes, 0)
  const saved = storage(JSON.stringify([DEMO]))
  assert.equal(initialLibrary().error, '')
  saved.change('{became unreadable')
  assert.throws(() => saveSongLibrary([DEMO]), /Bibliothèque illisible/)
  assert.equal(saved.writes(), 0)
})

test('empty and readable song libraries can still be saved with existing media references', () => {
  for (const raw of [null, '[]', JSON.stringify([DEMO])]) {
    const saved = storage(raw)
    const song = { ...DEMO, title: 'Mon morceau', tabFile: { id: 'local-tab', name: 'tab.pdf', kind: 'pdf' } }
    saveSongLibrary([song])
    assert.deepEqual(initialLibrary(), { songs: [song], error: '' })
    assert.equal(saved.writes(), 1)
  }
})

test('a full storage rejects saving and leaves the current library untouched', () => {
  const raw = JSON.stringify([DEMO])
  globalThis.localStorage = { getItem: () => raw, setItem() { throw new Error('full') } }
  assert.throws(() => saveSongLibrary([{ ...DEMO, title: 'Change' }]), /Sauvegarde impossible/)
  assert.deepEqual(initialLibrary().songs, [DEMO])
})

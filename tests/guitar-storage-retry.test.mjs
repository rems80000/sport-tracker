import test from 'node:test'
import assert from 'node:assert/strict'
import { loadMedia } from '../src/modules/guitar/mediaStore.ts'

test('storage retries after unavailable IndexedDB and a synchronous opening failure', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
  const blob = new Blob(['tablature'])
  let openings = 0
  const db = { close() {}, transaction() {
    const tx = { objectStore() { return { get() { return { result: blob } } } } }
    queueMicrotask(() => tx.oncomplete())
    return tx
  } }
  try {
    globalThis.indexedDB = undefined
    await assert.rejects(loadMedia('score'), /stockage.*indisponible/)
    globalThis.indexedDB = { open() { openings++; throw new Error('Temporary storage failure') } }
    await assert.rejects(loadMedia('score'), /Temporary storage failure/)
    assert.equal(openings, 1)
    globalThis.indexedDB = { open() {
      openings++
      const request = {}
      queueMicrotask(() => { request.result = db; request.onsuccess() })
      return request
    } }
    assert.equal(await loadMedia('score'), blob)
    assert.equal(await loadMedia('score'), blob)
    assert.equal(openings, 2, 'the recovered connection remains cached')
  } finally {
    db.onversionchange?.()
    if (descriptor) Object.defineProperty(globalThis, 'indexedDB', descriptor)
    else delete globalThis.indexedDB
  }
})

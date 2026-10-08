import test from 'node:test'
import assert from 'node:assert/strict'
import { loadMedia } from '../src/modules/guitar/mediaStore.ts'

test('a blocked opening that succeeds later closes its unused connection and permits retry', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
  const requests = []
  globalThis.indexedDB = { open() { const request = {}; requests.push(request); return request } }
  let abandonedCloses = 0
  let activeCloses = 0
  const blob = new Blob(['score'])
  const active = { close() { activeCloses++ }, transaction() {
    const tx = { objectStore() { return { get() { return { result: blob } } } } }
    queueMicrotask(() => tx.oncomplete())
    return tx
  } }
  try {
    const first = loadMedia('score')
    const rejection = assert.rejects(first, /Fermez les autres onglets/)
    requests[0].onblocked()
    await rejection
    const retry = loadMedia('score')
    assert.equal(requests.length, 2)
    requests[0].result = { close() { abandonedCloses++ } }
    requests[0].onsuccess()
    assert.equal(abandonedCloses, 1)
    requests[1].result = active
    requests[1].onsuccess()
    assert.equal(await retry, blob)
    assert.equal(await loadMedia('score'), blob)
    assert.equal(requests.length, 2)
    assert.equal(activeCloses, 0)
  } finally {
    active.onversionchange?.()
    if (descriptor) Object.defineProperty(globalThis, 'indexedDB', descriptor)
    else delete globalThis.indexedDB
  }
})

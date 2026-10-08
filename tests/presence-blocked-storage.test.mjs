import test from 'node:test'
import assert from 'node:assert/strict'
import { savePresenceAudio, loadPresenceAudio } from '../src/modules/presence/presenceAudio.ts'

test('a blocked audio import rejects promptly, closes a late connection and permits retry', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
  const requests = []
  globalThis.indexedDB = { open() { const request = {}; requests.push(request); return request } }
  let closed = 0, transactions = 0
  const db = { close() { closed++ }, transaction() {
    transactions++
    const tx = { objectStore() { return { get() { return { result: undefined } } } } }
    queueMicrotask(() => tx.oncomplete())
    return tx
  } }
  try {
    const importing = savePresenceAudio('voice', new File(['guide'], 'guide.mp3'))
    const rejected = assert.rejects(importing, /Fermez les autres onglets Life Hub/)
    requests[0].onblocked()
    await rejected
    requests[0].result = db
    requests[0].onsuccess()
    assert.equal(closed, 1)
    assert.equal(transactions, 0, 'an abandoned import must never write')
    const retry = loadPresenceAudio('voice')
    requests[1].result = db
    requests[1].onsuccess()
    assert.equal(await retry, null)
    assert.equal(closed, 2)
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'indexedDB', descriptor)
    else delete globalThis.indexedDB
  }
})

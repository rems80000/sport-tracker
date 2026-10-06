import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadMedia } from '../src/modules/guitar/mediaStore.ts'

test('guitar file reads wait for completion and report interrupted transactions', async () => {
  const transactions = []
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
  const db = { transaction() {
    const request = { result: undefined }
    const tx = { objectStore() { return { get() { return request } } } }
    transactions.push({ tx, request })
    return tx
  }, close() {} }
  globalThis.indexedDB = { open() {
    const request = {}
    queueMicrotask(() => { request.result = db; request.onsuccess() })
    return request
  } }
  const tick = () => new Promise(resolve => setImmediate(resolve))
  try {
    let settled = false
    const reading = loadMedia('tab').then(blob => { settled = true; return blob })
    await tick()
    const first = transactions[0]
    const blob = new Blob(['tablature'], { type: 'application/pdf' })
    first.request.result = blob
    first.request.onsuccess?.()
    await tick()
    assert.equal(settled, false)
    first.tx.oncomplete()
    assert.equal(await reading, blob)

    const interrupted = loadMedia('backing')
    const rejected = assert.rejects(interrupted, /Lecture du fichier impossible/)
    await tick()
    transactions[1].tx.onabort()
    await rejected

    const failed = loadMedia('failed')
    const failure = assert.rejects(failed, /Lecture du fichier impossible/)
    await tick()
    transactions[2].tx.onerror()
    await failure

    const missing = loadMedia('missing')
    const absent = assert.rejects(missing, /Fichier introuvable/)
    await tick()
    transactions[3].tx.oncomplete()
    await absent
  } finally {
    db.onversionchange?.()
    if (descriptor) Object.defineProperty(globalThis, 'indexedDB', descriptor)
    else delete globalThis.indexedDB
  }
})

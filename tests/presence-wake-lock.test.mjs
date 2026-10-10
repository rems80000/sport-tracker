import test from 'node:test'
import assert from 'node:assert/strict'
import { createScreenWakeLock } from '../src/modules/presence/screenWakeLock.ts'

function lock() {
  return { released: false, releases: 0, async release() { this.releases++; this.released = true } }
}

test('a wake lock acquired after pause or unmount is released immediately', async () => {
  let resolve
  const handle = lock()
  const screen = createScreenWakeLock(() => new Promise(done => { resolve = done }))
  const pending = screen.request()
  screen.dispose()
  resolve(handle)
  await pending
  assert.equal(handle.releases, 1)
  await screen.request()
  assert.equal(handle.releases, 1)
})

test('visibility events cannot create duplicate pending or active locks', async () => {
  let resolve
  let requests = 0
  const handle = lock()
  const screen = createScreenWakeLock(() => { requests++; return new Promise(done => { resolve = done }) })
  const pending = screen.request()
  await screen.request()
  assert.equal(requests, 1)
  resolve(handle)
  await pending
  await screen.request()
  assert.equal(requests, 1)
  screen.dispose()
  screen.dispose()
  assert.equal(handle.releases, 1)
})

test('a refused or browser-released lock can be requested again', async () => {
  const handle = lock()
  let requests = 0
  const screen = createScreenWakeLock(async () => {
    requests++
    if (requests === 1) throw new Error('Battery saver')
    return handle
  })
  await screen.request()
  await screen.request()
  assert.equal(requests, 2)
  handle.released = true
  await screen.request()
  assert.equal(requests, 3)
  screen.dispose()
})

test('a failed release does not interrupt cleanup', async () => {
  const screen = createScreenWakeLock(async () => ({ released: false, release: async () => { throw new Error('Already released') } }))
  await screen.request()
  assert.doesNotThrow(() => screen.dispose())
  await new Promise(resolve => setImmediate(resolve))
})

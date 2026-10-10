export type WakeLockHandle = { released: boolean; release: () => Promise<void> }

export function createScreenWakeLock(acquire: () => Promise<WakeLockHandle>) {
  let handle: WakeLockHandle | null = null
  let pending = false
  let disposed = false
  function release(lock: WakeLockHandle | null) {
    if (!lock || lock.released) return
    try { void lock.release().catch(() => {}) } catch { /* Le navigateur peut avoir déjà libéré le verrou. */ }
  }
  return {
    async request() {
      if (disposed || pending || (handle && !handle.released)) return
      pending = true
      try {
        const acquired = await acquire()
        if (disposed) release(acquired)
        else handle = acquired
      } catch { /* Android peut refuser en économie d'énergie. */ }
      finally { pending = false }
    },
    dispose() {
      disposed = true
      release(handle)
      handle = null
    },
  }
}

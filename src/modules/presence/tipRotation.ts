const KEY = 'presence_tip_rotation_v1'
let fallbackIndex = -1

// Read only during initialization; persist after rendering, including in StrictMode.
export function nextTipIndex(length: number): number {
  if (length <= 0) return 0
  let previous = fallbackIndex
  try {
    const raw = localStorage.getItem(KEY)
    const saved = raw === null ? -1 : Number(raw)
    if (Number.isInteger(saved) && saved >= -1 && saved < length) previous = saved
  } catch { /* Rotation remains available when storage is blocked. */ }
  return (previous + 1) % length
}

export function rememberTip(index: number) {
  fallbackIndex = index
  try { localStorage.setItem(KEY, String(index)) } catch { /* In-memory fallback. */ }
}

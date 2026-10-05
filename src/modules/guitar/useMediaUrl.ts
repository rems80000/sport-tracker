import { useEffect, useState } from 'react'
import { loadMedia } from './mediaStore'

export function useMediaUrl(id?: string) {
  const [result, setResult] = useState<{ id?: string; url: string; error: string }>({ url: '', error: '' })
  useEffect(() => {
    if (!id) return
    let disposed = false, url = ''
    void loadMedia(id).then(blob => {
      if (disposed) return
      url = URL.createObjectURL(blob); setResult({ id, url, error: '' })
    }).catch(error => { if (!disposed) setResult({ id, url: '', error: error.message }) })
    return () => { disposed = true; if (url) URL.revokeObjectURL(url) }
  }, [id])
  return result.id === id ? result : { url: '', error: '' }
}

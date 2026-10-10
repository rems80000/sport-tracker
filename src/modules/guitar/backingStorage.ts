import type { StoredMediaRef } from './mediaStore'

export interface PersonalBacking { id: string; title: string; key: string; file: StoredMediaRef }
const STORAGE_KEY = 'life_hub_guitar_backings_v1'
export function loadBackings(): { tracks: PersonalBacking[]; error: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { tracks: [], error: '' }
    const tracks = JSON.parse(raw)
    if (!Array.isArray(tracks) || !tracks.every(t => typeof t.id === 'string' && typeof t.title === 'string' && typeof t.key === 'string' && typeof t.file?.id === 'string' && t.file.kind === 'audio')) throw Error()
    return { tracks, error: '' }
  } catch { return { tracks: [], error: 'La liste des pistes personnelles n’a pas pu être lue. Aucun fichier n’a été effacé.' } }
}

export function saveBackings(tracks: PersonalBacking[]) {
  const current = loadBackings()
  if (current.error) throw new Error(current.error)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks))
}

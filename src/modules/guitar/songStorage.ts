import type { StoredMediaRef } from './mediaStore'

export type Source = 'none' | 'spoon' | 'spotify' | 'audio'
export interface Song { id: string; title: string; artist: string; tab: string; source: Source; audioUrl: string; stationId: string; speed: number; tabFile?: StoredMediaRef }
const LIBRARY_KEY = 'life_hub_guitar_songs_v1'
export const DEMO: Song = { id: 'exercice-cordes', title: 'Cordes à vide', artist: 'Exercice Life Hub', source: 'none', audioUrl: '', stationId: 'acoustic', speed: 18,
  tab: ['Exercice original · lentement, une note par clic', '', ...Array.from({ length: 8 }, (_, i) => `Passage ${i + 1}\ne|--------------------0---|\nB|----------------0-------|\nG|------------0-----------|\nD|--------0---------------|\nA|----0-------------------|\nE|0-----------------------|\n`)].join('\n') }
export function initialLibrary(): { songs: Song[]; error: string } {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY)
    if (raw === null) return { songs: [DEMO], error: '' }
    const songs: unknown = JSON.parse(raw)
    if (!Array.isArray(songs) || !songs.every(s => s && typeof s.id === 'string' && typeof s.title === 'string' && typeof s.artist === 'string' && typeof s.tab === 'string' && ['none', 'spoon', 'spotify', 'audio'].includes(s.source) && typeof s.audioUrl === 'string' && typeof s.stationId === 'string' && Number.isFinite(s.speed) && s.speed >= 5 && s.speed <= 80 && (!s.tabFile || typeof s.tabFile.id === 'string' && typeof s.tabFile.name === 'string' && ['pdf', 'image'].includes(s.tabFile.kind)))) throw Error('Invalid library')
    return { songs, error: '' }
  } catch { return { songs: [], error: 'Bibliothèque illisible ou stockage indisponible. Aucune donnée existante n’a été écrasée.' } }
}
export function saveSongLibrary(songs: Song[]) {
  const current = initialLibrary()
  if (current.error) throw new Error(current.error)
  try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(songs)) } catch {
    throw new Error('Sauvegarde impossible : espace insuffisant ou stockage bloqué. Gardez cette page ouverte et copiez votre tablature.')
  }
}

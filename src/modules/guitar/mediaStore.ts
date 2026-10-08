export interface StoredMediaRef { id: string; name: string; kind: 'audio' | 'pdf' | 'image' }
const STORE = 'files'
let database: Promise<IDBDatabase> | undefined
function open(): Promise<IDBDatabase> {
  if (!database) {
    database = new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) { reject(new Error('Le stockage des fichiers est indisponible sur cet appareil.')); return }
      let blocked = false
      const request = indexedDB.open('life_hub_guitar_media_v1', 1)
      request.onupgradeneeded = () => request.result.createObjectStore(STORE)
      request.onerror = () => { database = undefined; reject(new Error('Impossible d’ouvrir le stockage des fichiers.')) }
      request.onblocked = () => { blocked = true; database = undefined; reject(new Error('Fermez les autres onglets Life Hub puis réessayez.')) }
      request.onsuccess = () => { if (blocked) { request.result.close(); return }; request.result.onversionchange = () => { request.result.close(); database = undefined }; resolve(request.result) }
      })
    const opening = database
    void opening.catch(() => { if (database === opening) database = undefined })
  }
  return database
}
export function mediaKind(file: Pick<File, 'name' | 'type' | 'size'>): StoredMediaRef['kind'] {
  const extension = file.name.toLowerCase().split('.').pop()
  if (!file.size) throw new Error('Ce fichier est vide.')
  if (file.size > 40 * 1024 * 1024) throw new Error('Choisissez un fichier de moins de 40 Mo.')
  if (extension === 'pdf' && (!file.type || file.type === 'application/pdf')) return 'pdf'
  if (['png', 'jpg', 'jpeg', 'webp'].includes(extension || '') && (!file.type || /^image\/(png|jpeg|webp)$/.test(file.type))) return 'image'
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm'].includes(extension || '') && (!file.type || file.type.startsWith('audio/') || file.type === 'video/mp4' || file.type === 'video/webm')) return 'audio'
  throw new Error('Format non accepté : audio MP3/WAV/OGG/M4A/AAC/FLAC/WEBM, PDF ou image PNG/JPG/WEBP.')
}
export async function saveMedia(file: File, expected: 'audio' | 'document'): Promise<StoredMediaRef> {
  const kind = mediaKind(file)
  if (expected === 'audio' ? kind !== 'audio' : kind === 'audio') throw new Error('Ce fichier ne correspond pas au type attendu.')
  const db = await open(), id = crypto.randomUUID()
  const mime = file.type || (kind === 'pdf' ? 'application/pdf' : kind === 'image' ? file.name.toLowerCase().endsWith('.webp') ? 'image/webp' : /\.jpe?g$/i.test(file.name) ? 'image/jpeg' : 'image/png' : 'application/octet-stream')
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(new Blob([file], { type: mime }), id)
    tx.oncomplete = () => resolve()
    tx.onabort = tx.onerror = () => reject(new Error('Enregistrement impossible : stockage plein ou bloqué.'))
  })
  return { id, name: file.name, kind }
}
export async function loadMedia(id: string): Promise<Blob> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const request = tx.objectStore(STORE).get(id)
    tx.oncomplete = () => request.result instanceof Blob ? resolve(request.result) : reject(new Error('Fichier introuvable sur cet appareil. Importez-le à nouveau.'))
    tx.onabort = tx.onerror = () => reject(new Error('Lecture du fichier impossible. Réessayez.'))
  })
}
export async function deleteMedia(id: string): Promise<void> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onabort = tx.onerror = () => reject(new Error('Suppression du fichier impossible.'))
  })
}

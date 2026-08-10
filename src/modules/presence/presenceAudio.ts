export type PresenceAudioSlot = 'voice' | 'relax'

const DATABASE_NAME = 'remy-life-hub-audio'
const STORE_NAME = 'presence-files'

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function runRequest<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase()
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode)
      const request = action(transaction.objectStore(STORE_NAME))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally {
    database.close()
  }
}

export async function loadPresenceAudio(slot: PresenceAudioSlot) {
  const file = await runRequest<File | undefined>('readonly', store => store.get(slot))
  if (!file) return null
  return { name: file.name, url: URL.createObjectURL(file) }
}

export async function savePresenceAudio(slot: PresenceAudioSlot, file: File) {
  await runRequest('readwrite', store => store.put(file, slot))
  return { name: file.name, url: URL.createObjectURL(file) }
}

export async function removePresenceAudio(slot: PresenceAudioSlot) {
  await runRequest('readwrite', store => store.delete(slot))
}

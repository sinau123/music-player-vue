import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

const DB_NAME = 'MusicPlayerDB'
const DB_VERSION = 7 // ⬅️ bump version when schema changes

export interface TrackMeta {
  id: string
  name: string
  type: string
  duration: number
  createdAt: number
  order: number
}

export interface TrackBlob {
  id: string
  blob: Blob
}

export type Track = TrackMeta & TrackBlob

interface MusicPlayerDB extends DBSchema {
  tracks_meta: {
    key: string
    value: TrackMeta
    indexes: { 'by-name': string }
  }
  tracks_blob: {
    key: string
    value: TrackBlob
  }
}

let dbPromise: Promise<IDBPDatabase<MusicPlayerDB>> | null = null

export function getDB() {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB can only be used in the browser')
  }

  if (!dbPromise) {
    dbPromise = openDB<MusicPlayerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('tracks_meta')) {
          const meta = db.createObjectStore('tracks_meta', {
            keyPath: 'id',
          })
          meta.createIndex('by-name', 'name')
        }

        if (!db.objectStoreNames.contains('tracks_blob')) {
          db.createObjectStore('tracks_blob', {
            keyPath: 'id',
          })
        }
      },
    })
  }

  return dbPromise
}

export async function saveTrack(input: {
  id: string
  name: string
  type: string
  duration: number
  blob: Blob
  order: number
}) {
  const db = await getDB()

  const tx = db.transaction(['tracks_meta', 'tracks_blob'], 'readwrite')

  await Promise.all([
    tx.objectStore('tracks_meta').put({
      id: input.id,
      name: input.name,
      type: input.type,
      duration: input.duration,
      createdAt: Date.now(),
      order: input.order,
    }),
    tx.objectStore('tracks_blob').put({
      id: input.id,
      blob: input.blob,
    }),
  ])

  await tx.done
}

export async function bulkSaveTracksMeta(tracks: TrackMeta[]) {
  if (!tracks.length) return

  const db = await getDB()
  const tx = db.transaction('tracks_meta', 'readwrite')
  const store = tx.objectStore('tracks_meta')

  for (const track of tracks) {
    store.put(track)
  }

  await tx.done
}

export async function getAllTracksMeta() {
  const db = await getDB()
  return (await db.getAll('tracks_meta')).sort((a, b) => a.order - b.order)
}

export async function getTrackBlob(id: string) {
  const db = await getDB()
  return db.get('tracks_blob', id)
}

export async function deleteTrack(id: string) {
  const db = await getDB()
  const tx = db.transaction(['tracks_meta', 'tracks_blob'], 'readwrite')

  await Promise.all([
    tx.objectStore('tracks_meta').delete(id),
    tx.objectStore('tracks_blob').delete(id),
  ])

  await tx.done
}

export async function clearTracks() {
  const db = await getDB()
  const tx = db.transaction(['tracks_meta', 'tracks_blob'], 'readwrite')

  await Promise.all([tx.objectStore('tracks_meta').clear(), tx.objectStore('tracks_blob').clear()])

  await tx.done
}

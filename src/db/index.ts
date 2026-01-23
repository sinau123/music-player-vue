import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

const DB_NAME = 'MusicPlayerDB'
const DB_VERSION = 4
const STORE_NAME = 'tracks'

export interface Track {
  id: string
  name: string
  data: string
  type: string
  duration: number
}

interface MusicPlayerDB extends DBSchema {
  tracks: {
    key: string
    value: Track
    indexes: { 'by-name': string }
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
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
          })
          store.createIndex('by-name', 'name')
        }
      },
    })
  }

  return dbPromise
}

export async function saveTrack(track: Track) {
  const db = await getDB()
  return db.put(STORE_NAME, track)
}

/* READ by ID */
export async function getTrack(id: string) {
  const db = await getDB()
  return db.get(STORE_NAME, id)
}

/* READ ALL */
export async function getAllTracks() {
  const db = await getDB()
  return db.getAll(STORE_NAME)
}

/* READ by index */
export async function getTracksByName(name: string) {
  const db = await getDB()
  return db.getAllFromIndex(STORE_NAME, 'by-name', name)
}

/* DELETE */
export async function deleteTrack(id: string) {
  const db = await getDB()
  return db.delete(STORE_NAME, id)
}

/* CLEAR ALL */
export async function clearTracks() {
  const db = await getDB()
  return db.clear(STORE_NAME)
}

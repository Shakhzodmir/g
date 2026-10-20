import { db } from '../../store/db'
import { useProfileStore } from '../../store/profile'
import { clearAllLocalState, clearProfileLocalState } from '../profileState'

/** Every key this app writes starts with this prefix (device, tokens, timer, exercises, schedule UI, game levels, PIN …). */
export const STORAGE_PREFIX = 'gapimiz.'

/** Removes every `gapimiz.*` key from a Storage (also keys added by future features). Returns the removed keys. */
export function clearGapimizKeys(storage: Pick<Storage, 'length' | 'key' | 'removeItem'>): string[] {
  const keys: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i)
    if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k)
  }
  for (const k of keys) storage.removeItem(k)
  return keys
}

/** Names of the IndexedDB databases that belong to this app. */
async function appDatabases(): Promise<string[]> {
  const names = new Set<string>(['gapimiz'])
  try {
    const list = await indexedDB.databases?.()
    for (const d of list ?? []) if (d.name && d.name.startsWith('gapimiz')) names.add(d.name)
  } catch {
    /* not supported: the default name is enough */
  }
  return [...names]
}

async function deleteIndexedDb(name: string): Promise<void> {
  await new Promise<void>((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(name)
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
      req.onblocked = () => resolve()
    } catch {
      resolve()
    }
  })
}

/**
 * Deletes EVERYTHING this app stored on the device: all IndexedDB data and every `gapimiz.*` localStorage /
 * sessionStorage key (device store, PIN, tokens, timer, exercises, schedule UI, game levels …). The caller
 * reloads the page afterwards, so the next start is a clean first run. localStorage is swept last, so a store
 * that is still alive cannot write its key back in between.
 */
export async function wipeAllData(): Promise<void> {
  const known = useProfileStore.getState().profiles.map((p) => p.id)
  await db
    .transaction('rw', [db.profiles, db.cards, db.recordings, db.events, db.schedules, db.stickers, db.checks], async () => {
      await Promise.all([db.profiles, db.cards, db.recordings, db.events, db.schedules, db.stickers, db.checks].map((t) => t.clear()))
    })
    .catch(() => undefined)
  db.close()
  for (const name of await appDatabases()) await deleteIndexedDb(name)
  try {
    clearAllLocalState(known)
  } catch {
    /* the prefix sweep below still removes the keys */
  }
  for (const s of [() => localStorage, () => sessionStorage]) {
    try {
      clearGapimizKeys(s())
    } catch {
      /* storage blocked: nothing persisted anyway */
    }
  }
}

/** Forgets the device-side state (token board, timer, game levels …) of a deleted profile. */
export async function clearProfileDeviceState(profileId: string): Promise<void> {
  try {
    clearProfileLocalState(profileId)
  } catch {
    /* best effort */
  }
}

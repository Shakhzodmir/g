import { db, dbAvailable, type EventRow, type EventType } from './db'
import { getProfile } from './profile'

export type { EventType }

/**
 * The last events of this session, newest last. Only used to answer `recentEvents` when IndexedDB is unavailable
 * (private mode, blocked storage): the app then runs in memory and "continue where we stopped" still works until reload.
 */
const MEMORY_LIMIT = 200
const memory: EventRow[] = []

/** Fire-and-forget usage log for progress views. Never throws, never blocks the UI. */
export function logEvent(type: EventType, ref: string, meta?: Record<string, unknown>): void {
  const row: EventRow = { profileId: getProfile().id, type, ref, ts: Date.now(), meta }
  memory.push(row)
  if (memory.length > MEMORY_LIMIT) memory.splice(0, memory.length - MEMORY_LIMIT)
  void dbAvailable().then((ok) => (ok ? db.events.add({ ...row }).catch(() => undefined) : undefined))
}

export async function queryEvents(profileId: string, sinceTs: number): Promise<EventRow[]> {
  if (!(await dbAvailable())) return []
  try {
    return await db.events
      .where('[profileId+ts]')
      .between([profileId, sinceTs], [profileId, Number.MAX_SAFE_INTEGER])
      .toArray()
  } catch {
    return []
  }
}

/** The newest `limit` events of a profile, newest first (the log is read from the end, never as a whole). */
export async function recentEvents(profileId: string, limit = 100): Promise<EventRow[]> {
  const fromMemory = () =>
    memory
      .filter((e) => e.profileId === profileId)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, limit)
  if (!(await dbAvailable())) return fromMemory()
  try {
    return await db.events
      .where('[profileId+ts]')
      .between([profileId, 0], [profileId, Number.MAX_SAFE_INTEGER])
      .reverse()
      .limit(limit)
      .toArray()
  } catch {
    return fromMemory()
  }
}

/** For tests only. */
export function resetEventMemory(): void {
  memory.length = 0
}

import { db, dbAvailable, type EventRow, type EventType } from './db'
import { getProfile } from './profile'

export type { EventType }

/** Fire-and-forget usage log for progress views. Never throws, never blocks the UI. */
export function logEvent(type: EventType, ref: string, meta?: Record<string, unknown>): void {
  const row: EventRow = { profileId: getProfile().id, type, ref, ts: Date.now(), meta }
  void dbAvailable().then((ok) => (ok ? db.events.add(row).catch(() => undefined) : undefined))
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

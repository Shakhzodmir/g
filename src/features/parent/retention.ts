import { db as defaultDb, dbAvailable, type GapimizDB } from '../../store/db'

/** Usage events older than this are deleted (the progress views only show 5 weeks; this keeps the log small). */
export const EVENT_RETENTION_DAYS = 180
const DAY = 86_400_000

/** Deletes events older than 180 days. Safe to call often and without IndexedDB; returns how many rows were removed. */
export async function pruneOldEvents(now = Date.now(), database: GapimizDB = defaultDb): Promise<number> {
  try {
    if (database === defaultDb && !(await dbAvailable())) return 0
    return await database.events.where('ts').below(now - EVENT_RETENTION_DAYS * DAY).delete()
  } catch {
    return 0
  }
}

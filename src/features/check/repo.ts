import { db as defaultDb, dbAvailable, type GapimizDB } from '../../store/db'
import { sanitizeRow } from './model'
import type { CheckKind, CheckRow } from './types'

/*
 * IndexedDB access for the checks table. Everything here is best effort: when IndexedDB is unavailable (private mode,
 * blocked storage) the callers keep the data in memory, like the rest of the app.
 */

/** All rows of one profile, rebuilt through the sanitiser so a damaged row can never break a screen. */
export async function loadRows(profileId: string, database: GapimizDB = defaultDb): Promise<CheckRow[]> {
  const raw = await database.checks.where('profileId').equals(profileId).toArray()
  return raw.map((r) => sanitizeRow(r, profileId)).filter((r): r is CheckRow => r !== null)
}

export async function putRow(row: CheckRow, database: GapimizDB = defaultDb): Promise<void> {
  await database.checks.put(row)
}

/** Removes one screening of a profile, or all of them. */
export async function deleteRows(profileId: string, kind?: CheckKind, database: GapimizDB = defaultDb): Promise<void> {
  if (kind) await database.checks.delete(`${profileId}:${kind}`)
  else await database.checks.where('profileId').equals(profileId).delete()
}

export { dbAvailable }

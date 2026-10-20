import { create } from 'zustand'
import { addResult, emptyRow, toggleTick } from './model'
import { dbAvailable, deleteRows, loadRows, putRow } from './repo'
import { rowId, type CheckKind, type CheckResult, type CheckRow } from './types'

/*
 * The single source of truth the screens read. Rows live here in memory (so the app also works when IndexedDB is
 * unavailable) and are written through to the `checks` table. All disk work runs through one queue, so a screen that
 * loads right after a save always reads the saved row.
 */

interface CheckState {
  rows: Record<string, CheckRow>
  /** Loads the rows of one profile from IndexedDB (replaces the in-memory copy of that profile when the DB is available). */
  hydrate: (profileId: string) => Promise<void>
  saveResult: (profileId: string, kind: CheckKind, result: CheckResult) => Promise<CheckRow>
  tick: (profileId: string, kind: CheckKind, day: string, taskId: string) => Promise<void>
  /** Deletes one screening of a profile (memory and disk). */
  removeKind: (profileId: string, kind: CheckKind) => Promise<void>
  /** Memory only: forget one profile (or all) — the disk rows are removed by the caller (profile deletion, wipe). */
  forget: (profileId?: string) => void
}

let queue: Promise<unknown> = Promise.resolve()
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const next = queue.then(job, job)
  queue = next.catch(() => undefined)
  return next
}

async function persist(row: CheckRow): Promise<void> {
  if (!(await dbAvailable())) return
  try {
    await putRow(row)
  } catch {
    /* the in-memory copy stays; nothing else to do */
  }
}

export const useCheckStore = create<CheckState>()((set, get) => ({
  rows: {},

  hydrate: (profileId) =>
    enqueue(async () => {
      if (!(await dbAvailable())) return
      let loaded: CheckRow[]
      try {
        loaded = await loadRows(profileId)
      } catch {
        return
      }
      set((st) => {
        const rows: Record<string, CheckRow> = {}
        for (const [k, v] of Object.entries(st.rows)) if (v.profileId !== profileId) rows[k] = v
        for (const r of loaded) rows[r.id] = r
        return { rows }
      })
    }),

  saveResult: (profileId, kind, result) =>
    enqueue(async () => {
      const id = rowId(profileId, kind)
      const row = addResult(get().rows[id] ?? emptyRow(profileId, kind, result.ts), result)
      set((st) => ({ rows: { ...st.rows, [id]: row } }))
      await persist(row)
      return row
    }),

  tick: (profileId, kind, day, taskId) =>
    enqueue(async () => {
      const id = rowId(profileId, kind)
      const now = Date.now()
      const row = toggleTick(get().rows[id] ?? emptyRow(profileId, kind, now), day, taskId, now)
      set((st) => ({ rows: { ...st.rows, [id]: row } }))
      await persist(row)
    }),

  removeKind: (profileId, kind) =>
    enqueue(async () => {
      const id = rowId(profileId, kind)
      set((st) => {
        const rows = { ...st.rows }
        delete rows[id]
        return { rows }
      })
      if (!(await dbAvailable())) return
      try {
        await deleteRows(profileId, kind)
      } catch {
        /* best effort */
      }
    }),

  forget: (profileId) =>
    set((st) => {
      if (!profileId) return { rows: {} }
      const rows: Record<string, CheckRow> = {}
      for (const [k, v] of Object.entries(st.rows)) if (v.profileId !== profileId) rows[k] = v
      return { rows }
    }),
}))

/** Row of the profile and kind, if any. */
export const selectRow = (rows: Record<string, CheckRow>, profileId: string, kind: CheckKind): CheckRow | undefined => rows[rowId(profileId, kind)]

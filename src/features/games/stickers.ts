import { useLiveQuery } from 'dexie-react-hooks'
import { create } from 'zustand'
import { db, dbAvailable, type StickerRow } from '../../store/db'
import { useProfileStore } from '../../store/profile'

/*
 * Stickers live in IndexedDB. When it is unavailable (private mode, blocked storage, quota) they live in
 * memory for this session instead, exactly like the schedule: the child still sees the sticker just earned
 * and finds it in the album. The child never sees a warning (calm); adults are told elsewhere.
 */

export interface MemoryRow extends StickerRow {
  /** True once the row is safely in IndexedDB (then the database copy is the one shown). */
  persisted: boolean
}

interface StickerMemory {
  rows: MemoryRow[]
  add: (row: MemoryRow) => void
  markPersisted: (row: MemoryRow) => void
  clear: (profileId?: string) => void
}

export const useStickerMemory = create<StickerMemory>()((set) => ({
  rows: [],
  add: (row) => set((s) => ({ rows: [...s.rows, row] })),
  markPersisted: (row) => set((s) => ({ rows: s.rows.map((r) => (r === row ? { ...r, persisted: true } : r)) })),
  clear: (profileId) => set((s) => ({ rows: profileId ? s.rows.filter((r) => r.profileId !== profileId) : [] })),
}))

/** Stickers a profile owns, from the database and from memory (rows the database could not take). */
export async function ownedStickerIds(profileId: string): Promise<Set<string>> {
  const owned = new Set<string>()
  if (await dbAvailable()) {
    try {
      for (const r of await db.stickers.where('profileId').equals(profileId).toArray()) owned.add(r.stickerId)
    } catch {
      /* memory only */
    }
  }
  for (const r of useStickerMemory.getState().rows) if (r.profileId === profileId) owned.add(r.stickerId)
  return owned
}

/** Records a sticker: always in memory first (so it shows at once), then in IndexedDB when that works. */
export async function recordSticker(profileId: string, stickerId: string): Promise<void> {
  const row: MemoryRow = { profileId, stickerId, ts: Date.now(), persisted: false }
  useStickerMemory.getState().add(row)
  if (!(await dbAvailable())) return
  try {
    await db.stickers.add({ profileId, stickerId, ts: row.ts })
    useStickerMemory.getState().markPersisted(row)
  } catch {
    /* stays in memory */
  }
}

/** Database rows plus the in-memory rows the database does not hold, newest first. */
export function mergeStickers(live: StickerRow[], memory: MemoryRow[], profileId: string): Array<{ stickerId: string; ts: number }> {
  const rows: StickerRow[] = [...live, ...memory.filter((m) => m.profileId === profileId && !m.persisted)]
  return rows.sort((a, b) => b.ts - a.ts).map((r) => ({ stickerId: r.stickerId, ts: r.ts }))
}

/** Stickers of the active profile, newest first (database + in-memory fallback). */
export function useStickers(): Array<{ stickerId: string; ts: number }> {
  const profileId = useProfileStore((s) => s.profile.id)
  const memory = useStickerMemory((s) => s.rows)
  const live =
    useLiveQuery(
      async () => {
        try {
          return await db.stickers.where('profileId').equals(profileId).toArray()
        } catch {
          return []
        }
      },
      [profileId],
    ) ?? []
  return mergeStickers(live, memory, profileId)
}

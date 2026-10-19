import { useCallback, useEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { SCHEDULE_TEMPLATES } from '../../content/schedules'
import { db, dbAvailable, type ScheduleItem, type ScheduleRow } from '../../store/db'
import { useProfileStore } from '../../store/profile'
import { safeLocalStorage } from '../../store/safeStorage'
import { DEFAULT_FIRST_THEN, freshForToday, itemsFrom, normalizeFirstThen, scheduleRowId, type ScheduleKind } from './logic'

/** Per-device UI memory: which view the child saw last (predictable return). */
interface ScheduleUi {
  mode: ScheduleKind
  setMode: (m: ScheduleKind) => void
}

export const useScheduleUi = create<ScheduleUi>()(
  persist((set) => ({ mode: 'day', setMode: (mode) => set({ mode }) }), {
    name: 'gapimiz.schedule.ui',
    version: 1,
    storage: createJSONStorage(safeLocalStorage),
  }),
)

// When IndexedDB is unavailable the schedule lives in memory for this session.
const memory = new Map<string, ScheduleRow>()

function defaultRow(profileId: string, kind: ScheduleKind, now: number): ScheduleRow {
  const tpl = SCHEDULE_TEMPLATES[0]
  return {
    id: scheduleRowId(profileId, kind),
    profileId,
    kind,
    name: kind === 'day' ? tpl.id : 'first-then',
    items: kind === 'day' ? itemsFrom(tpl.items) : itemsFrom(DEFAULT_FIRST_THEN),
    updatedAt: now,
  }
}

async function loadRow(profileId: string, kind: ScheduleKind): Promise<ScheduleRow> {
  const id = scheduleRowId(profileId, kind)
  const now = Date.now()
  let row: ScheduleRow | undefined = memory.get(id)
  if (!row && (await dbAvailable())) {
    try {
      row = await db.schedules.get(id)
    } catch {
      row = undefined
    }
  }
  row = freshForToday(row ?? defaultRow(profileId, kind, now), now)
  if (kind === 'first-then') row = { ...row, items: normalizeFirstThen(row.items) }
  return row
}

async function saveRow(row: ScheduleRow): Promise<void> {
  memory.set(row.id, row)
  if (!(await dbAvailable())) return
  try {
    await db.schedules.put(row)
  } catch {
    /* stays in memory */
  }
}

/** Loads and persists one schedule (per profile and kind) in db.schedules. */
export function useSchedule(kind: ScheduleKind) {
  const profileId = useProfileStore((s) => s.profile.id)
  const [row, setRow] = useState<ScheduleRow | null>(null)
  const rowRef = useRef<ScheduleRow | null>(null)

  useEffect(() => {
    let alive = true
    rowRef.current = null
    setRow(null)
    void loadRow(profileId, kind).then((r) => {
      if (!alive) return
      rowRef.current = r
      setRow(r)
    })
    return () => {
      alive = false
    }
  }, [profileId, kind])

  const update = useCallback((fn: (items: ScheduleItem[]) => ScheduleItem[], name?: string) => {
    const prev = rowRef.current
    if (!prev) return
    const items = fn(prev.items)
    if (items === prev.items && name === undefined) return
    const next: ScheduleRow = { ...prev, items, name: name ?? prev.name, updatedAt: Date.now() }
    rowRef.current = next
    setRow(next)
    void saveRow(next)
  }, [])

  return { row, update }
}

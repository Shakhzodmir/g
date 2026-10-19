import type { ScheduleItem, ScheduleRow } from '../../store/db'

/* Pure schedule operations (no React, no DB) so they can be unit-tested. Every function returns new arrays. */

export type ScheduleKind = ScheduleRow['kind']

export const DEFAULT_FIRST_THEN: [string, string] = ['lesson', 'play_time']

export function scheduleRowId(profileId: string, kind: ScheduleKind): string {
  return `${profileId}:${kind}`
}

export function itemsFrom(refs: string[]): ScheduleItem[] {
  return refs.map((ref) => ({ ref, done: false }))
}

/** Index of the item that is happening now: the first one not done, or -1 when everything is done. */
export function currentIndex(items: ScheduleItem[]): number {
  return items.findIndex((i) => !i.done)
}

export function allDone(items: ScheduleItem[]): boolean {
  return items.length > 0 && items.every((i) => i.done)
}

export function setDone(items: ScheduleItem[], index: number, done = true): ScheduleItem[] {
  if (index < 0 || index >= items.length) return items
  return items.map((it, i) => (i === index ? { ...it, done } : it))
}

/** Marks the current item done; returns the same array when nothing is left. */
export function markCurrentDone(items: ScheduleItem[]): ScheduleItem[] {
  return setDone(items, currentIndex(items), true)
}

export function resetDone(items: ScheduleItem[]): ScheduleItem[] {
  return items.map((it) => (it.done ? { ...it, done: false } : it))
}

/** Moves an item one step up (-1) or down (+1). Out-of-range moves are ignored. */
export function moveItem(items: ScheduleItem[], index: number, dir: -1 | 1): ScheduleItem[] {
  const to = index + dir
  if (index < 0 || index >= items.length || to < 0 || to >= items.length) return items
  const next = items.slice()
  ;[next[index], next[to]] = [next[to], next[index]]
  return next
}

export function removeItem(items: ScheduleItem[], index: number): ScheduleItem[] {
  if (index < 0 || index >= items.length) return items
  return items.filter((_, i) => i !== index)
}

export function addItem(items: ScheduleItem[], ref: string): ScheduleItem[] {
  return [...items, { ref, done: false }]
}

export function replaceItem(items: ScheduleItem[], index: number, ref: string): ScheduleItem[] {
  if (index < 0 || index >= items.length) return items
  return items.map((it, i) => (i === index ? { ref, done: false } : it))
}

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/** A new day starts with a clean schedule: "done" marks from an earlier calendar day are cleared. */
export function freshForToday<T extends Pick<ScheduleRow, 'items' | 'updatedAt'>>(row: T, now: number): T {
  if (!row.items.some((i) => i.done) || dayKey(row.updatedAt) === dayKey(now)) return row
  return { ...row, items: resetDone(row.items), updatedAt: now }
}

/** First → Then always has exactly two slots. */
export function normalizeFirstThen(items: ScheduleItem[]): ScheduleItem[] {
  const a = items[0] ?? { ref: DEFAULT_FIRST_THEN[0], done: false }
  const b = items[1] ?? { ref: DEFAULT_FIRST_THEN[1], done: false }
  return [a, b]
}

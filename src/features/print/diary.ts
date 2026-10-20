/*
 * Practice diary: one row per day, split over A4 pages. Pure functions, so the page split and the calendar are testable
 * without rendering anything. Dates are plain calendar dates (year, month, day), computed in UTC so a daylight-saving
 * change can never skip or repeat a day.
 */

export type DiaryDays = 7 | 14 | 30
export const DIARY_DAYS: readonly DiaryDays[] = [7, 14, 30]

/** Rows that fit on one page with room to write: a week fills it comfortably, 14 days fit, 30 days take two pages. */
export const DIARY_ROWS_PER_PAGE = 15

export interface DiaryDate {
  y: number
  /** 1–12 */
  m: number
  d: number
  /** 0 = Monday … 6 = Sunday (the order of the weekday strings). */
  dow: number
}

export interface DiaryRow {
  /** 1-based day number. */
  n: number
  date: DiaryDate | null
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/

function toDate(ms: number): DiaryDate {
  const t = new Date(ms)
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), dow: (t.getUTCDay() + 6) % 7 }
}

/** `YYYY-MM-DD` (what an `<input type="date">` gives) → a calendar date, or null when it is not a real day. */
export function parseIsoDate(text: string | null | undefined): DiaryDate | null {
  const m = ISO.exec((text ?? '').trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (y < 1900 || y > 2200) return null
  const ms = Date.UTC(y, mo - 1, d)
  const back = toDate(ms)
  return back.y === y && back.m === mo && back.d === d ? back : null
}

export function addDays(date: DiaryDate, n: number): DiaryDate {
  return toDate(Date.UTC(date.y, date.m - 1, date.d) + n * 86_400_000)
}

/** `05.03` — day and month, as the rest of the adult area writes dates. */
export function formatDayMonth(d: DiaryDate): string {
  return `${String(d.d).padStart(2, '0')}.${String(d.m).padStart(2, '0')}`
}

/** `05.03.2026` */
export function formatFullDate(d: DiaryDate): string {
  return `${formatDayMonth(d)}.${d.y}`
}

/**
 * The diary as pages of rows. With a valid start date every row carries its date and weekday; without one the date cell
 * stays empty for writing by hand.
 */
export function buildDiary(days: DiaryDays, start: string | null | undefined, perPage = DIARY_ROWS_PER_PAGE): DiaryRow[][] {
  const first = parseIsoDate(start)
  const rows: DiaryRow[] = Array.from({ length: days }, (_, i) => ({ n: i + 1, date: first ? addDays(first, i) : null }))
  return balancedPages(rows, Math.max(1, Math.floor(perPage)))
}

/** Splits a list into the fewest pages that respect `perPage`, as evenly as possible (30 days → 15 + 15, never 15 + 14 + 1). */
export function balancedPages<T>(items: T[], perPage: number): T[][] {
  if (!items.length) return []
  const count = Math.ceil(items.length / perPage)
  const base = Math.floor(items.length / count)
  const extra = items.length % count
  const out: T[][] = []
  let at = 0
  for (let p = 0; p < count; p++) {
    const size = base + (p < extra ? 1 : 0)
    out.push(items.slice(at, at + size))
    at += size
  }
  return out
}

/*
 * Calendar days in the device's local time. A "day" is a whole number (days since 1970-01-01 of the LOCAL date),
 * so differences between days are exact across daylight-saving changes and "today" flips at local midnight.
 */

const MS_DAY = 86_400_000

/** Local calendar day of a timestamp as a whole number. */
export function dayNumber(ts: number): number {
  const d = new Date(ts)
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS_DAY)
}

const p2 = (n: number) => String(n).padStart(2, '0')

/** `YYYY-MM-DD` of a day number. */
export function dayKeyOfNumber(day: number): string {
  const d = new Date(day * MS_DAY)
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`
}

/** `YYYY-MM-DD` of a timestamp (local date). */
export function dayKey(ts: number): string {
  return dayKeyOfNumber(dayNumber(ts))
}

const KEY = /^(\d{4})-(\d{2})-(\d{2})$/

/** Day number of `YYYY-MM-DD`, or null when it is not a real date. */
export function dayNumberOfKey(key: string): number | null {
  const m = KEY.exec(key)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const t = Date.UTC(y, mo - 1, d)
  const back = new Date(t)
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null
  return Math.round(t / MS_DAY)
}

/** `dd.mm.yyyy` of a day number (the same numeric form the rest of the adult area uses). */
export function formatDay(day: number): string {
  const d = new Date(day * MS_DAY)
  return `${p2(d.getUTCDate())}.${p2(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`
}

/** `dd.mm` of a day number. */
export function formatDayShort(day: number): string {
  return formatDay(day).slice(0, 5)
}

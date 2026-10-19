import type { EventRow } from '../../store/db'

/*
 * Progress aggregation for the adult area. Pure functions over the local event log (no streaks, no scores):
 * active days, time spent, most-used words, new words, games/exercises done and feelings chosen.
 */

export const DAY_MS = 86_400_000
/** Two events further apart than this belong to different sessions. */
export const SESSION_GAP_MS = 10 * 60 * 1000
export const WINDOW_WEEKS = 5

/** Local calendar day id, YYYY-MM-DD. */
export function dayKey(ts: number): string {
  const d = new Date(ts)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Monday 00:00 (local time) of the week containing `ts`. */
export function startOfWeek(ts: number): number {
  const d = new Date(startOfDay(ts))
  const offset = (d.getDay() + 6) % 7 // Monday = 0
  d.setDate(d.getDate() - offset)
  return d.getTime()
}

/** Adds whole calendar days (DST-safe). */
export function addDays(ts: number, days: number): number {
  const d = new Date(ts)
  d.setDate(d.getDate() + days)
  return d.getTime()
}

/** First moment of the progress window: Monday of the week `weeks - 1` weeks before the current one. */
export function windowStart(now: number, weeks = WINDOW_WEEKS): number {
  return addDays(startOfWeek(now), -7 * (weeks - 1))
}

export interface CalendarDay {
  key: string
  ts: number
  /** Day of month. */
  date: number
  month: number
  count: number
  isToday: boolean
  inFuture: boolean
}

/** `weeks` rows of 7 days (Monday first), oldest week first. */
export function calendar(events: EventRow[], now: number, weeks = WINDOW_WEEKS): CalendarDay[][] {
  const counts = new Map<string, number>()
  for (const e of events) counts.set(dayKey(e.ts), (counts.get(dayKey(e.ts)) ?? 0) + 1)
  const today = dayKey(now)
  const todayStart = startOfDay(now)
  const first = windowStart(now, weeks)
  const rows: CalendarDay[][] = []
  for (let w = 0; w < weeks; w++) {
    const row: CalendarDay[] = []
    for (let d = 0; d < 7; d++) {
      const ts = addDays(first, w * 7 + d)
      const key = dayKey(ts)
      const date = new Date(ts)
      row.push({ key, ts, date: date.getDate(), month: date.getMonth() + 1, count: counts.get(key) ?? 0, isToday: key === today, inFuture: ts > todayStart })
    }
    rows.push(row)
  }
  return rows
}

export interface Session {
  start: number
  end: number
  count: number
}

/** Groups events into sessions separated by quiet gaps longer than `gapMs`. */
export function sessions(events: EventRow[], gapMs = SESSION_GAP_MS): Session[] {
  const sorted = events.map((e) => e.ts).sort((a, b) => a - b)
  const out: Session[] = []
  for (const ts of sorted) {
    const last = out[out.length - 1]
    if (last && ts - last.end <= gapMs) {
      last.end = ts
      last.count++
    } else out.push({ start: ts, end: ts, count: 1 })
  }
  return out
}

/** Minutes credited to a session: its span, at least one minute. */
export function sessionMinutes(s: Session): number {
  return Math.max(1, Math.round((s.end - s.start) / 60_000))
}

export interface Counted {
  ref: string
  count: number
}

/** Counts events by key, most frequent first (ties: alphabetical, so the order is stable). */
export function countBy(events: EventRow[], key: (e: EventRow) => string | null): Counted[] {
  const m = new Map<string, number>()
  for (const e of events) {
    const k = key(e)
    if (k) m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m.entries()].map(([ref, count]) => ({ ref, count })).sort((a, b) => b.count - a.count || a.ref.localeCompare(b.ref))
}

/** A word the person chose on the communicator themselves (not an adult modelling it). */
export function isOwnWord(e: EventRow): boolean {
  return e.type === 'aac_word' && e.meta?.modeling !== true && e.meta?.model !== true
}

/**
 * Feeling id when the event records a chosen feeling. Accepts a dedicated `feeling` type, refs `f.<id>` /
 * `feeling:<id>` and `meta.feeling`, so it works with whichever convention the feelings screen logs.
 */
export function feelingOf(e: EventRow): string | null {
  if (typeof e.meta?.feeling === 'string') return e.meta.feeling
  if (e.ref.startsWith('f.')) return e.ref.slice(2)
  if (e.ref.startsWith('feeling:')) return e.ref.slice(8)
  if ((e.type as string) === 'feeling') return e.ref
  return null
}

export interface WeekStat {
  start: number
  activeDays: number
  minutes: number
  sessions: number
}

export interface ProgressSummary {
  empty: boolean
  weeks: WeekStat[]
  thisWeek: WeekStat & { words: number; spoken: number; exercises: number; feelings: number }
  activeDays: number
  topWords: Counted[]
  topWordThisWeek: Counted | null
  /** Words chosen this week that were not used earlier in the window, in first-use order. */
  newWords: string[]
  games: Counted[]
  exercises: Counted[]
  feelings: Counted[]
}

function weekStat(events: EventRow[], start: number): WeekStat {
  const s = sessions(events)
  return {
    start,
    activeDays: new Set(events.map((e) => dayKey(e.ts))).size,
    minutes: s.reduce((sum, x) => sum + sessionMinutes(x), 0),
    sessions: s.length,
  }
}

export function summarize(all: EventRow[], now: number, weeks = WINDOW_WEEKS): ProgressSummary {
  const from = windowStart(now, weeks)
  const events = all.filter((e) => e.ts >= from && e.ts <= now + DAY_MS)
  const weekStarts = Array.from({ length: weeks }, (_, i) => addDays(from, i * 7))
  const thisStart = weekStarts[weeks - 1]
  const weekStats = weekStarts.map((start, i) => {
    const end = i + 1 < weeks ? weekStarts[i + 1] : Number.POSITIVE_INFINITY
    return weekStat(events.filter((e) => e.ts >= start && e.ts < end), start)
  })
  const current = events.filter((e) => e.ts >= thisStart)
  const earlier = events.filter((e) => e.ts < thisStart)

  const ownWords = events.filter(isOwnWord)
  const ownThisWeek = current.filter(isOwnWord)
  const seenBefore = new Set(earlier.filter(isOwnWord).map((e) => e.ref))
  const newWords: string[] = []
  for (const e of [...ownThisWeek].sort((a, b) => a.ts - b.ts)) {
    if (!seenBefore.has(e.ref) && !newWords.includes(e.ref)) newWords.push(e.ref)
  }
  const topThisWeek = countBy(ownThisWeek, (e) => e.ref)[0] ?? null

  return {
    empty: events.length === 0,
    weeks: weekStats,
    thisWeek: {
      ...weekStats[weeks - 1],
      words: ownThisWeek.length,
      spoken: current.filter((e) => e.type === 'aac_speak').length,
      exercises: current.filter((e) => e.type === 'exercise').length,
      feelings: current.filter((e) => feelingOf(e) !== null).length,
    },
    activeDays: new Set(events.map((e) => dayKey(e.ts))).size,
    topWords: countBy(ownWords, (e) => e.ref).slice(0, 10),
    topWordThisWeek: topThisWeek,
    newWords,
    games: countBy(events, (e) => (e.type === 'game_round' ? e.ref : null)),
    exercises: countBy(events, (e) => (e.type === 'exercise' ? e.ref : null)),
    feelings: countBy(events, feelingOf),
  }
}

export type SupportLineId = 'topWord' | 'newWords' | 'days' | 'spoken' | 'feelings' | 'exercises' | 'gentle'

export interface SupportLine {
  id: SupportLineId
  n: number
  /** Word ref for `topWord`, word refs for `newWords`. */
  refs: string[]
}

/** Calm, encouraging sentences about this week; never compares, never counts what was missed. */
export function supportLines(s: ProgressSummary): SupportLine[] {
  if (s.empty) return []
  const out: SupportLine[] = []
  const w = s.thisWeek
  if (w.activeDays === 0) return [{ id: 'gentle', n: 0, refs: [] }]
  if (s.topWordThisWeek && s.topWordThisWeek.count >= 2) out.push({ id: 'topWord', n: s.topWordThisWeek.count, refs: [s.topWordThisWeek.ref] })
  if (s.newWords.length) out.push({ id: 'newWords', n: s.newWords.length, refs: s.newWords.slice(0, 5) })
  if (w.spoken > 0) out.push({ id: 'spoken', n: w.spoken, refs: [] })
  if (w.feelings > 0) out.push({ id: 'feelings', n: w.feelings, refs: [] })
  if (w.exercises > 0) out.push({ id: 'exercises', n: w.exercises, refs: [] })
  out.push({ id: 'days', n: w.activeDays, refs: [] })
  return out
}

/** Russian plural form: 1 раз, 2 раза, 5 раз. */
export function pluralRu(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

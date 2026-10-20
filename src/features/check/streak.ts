import { dayNumberOfKey } from './days'

export interface StreakInfo {
  /** Consecutive days with at least one ticked task, ending today (or yesterday while today is still open). */
  current: number
  best: number
  /** Days with at least one tick, in total. */
  days: number
  todayDone: boolean
}

/**
 * "Done today" ticks -> streak. A day counts when at least one task was ticked. The streak is not broken while today is
 * still open: it continues from yesterday until the day ends. Days in the future (a clock set back) are ignored.
 */
export function streakOf(ticks: Readonly<Record<string, readonly string[]>>, today: number): StreakInfo {
  const done = new Set<number>()
  for (const [key, ids] of Object.entries(ticks)) {
    const d = dayNumberOfKey(key)
    if (d !== null && d <= today && ids.length > 0) done.add(d)
  }
  const sorted = [...done].sort((a, b) => a - b)
  let best = 0
  let run = 0
  let prev = -Infinity
  for (const d of sorted) {
    run = d === prev + 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  const todayDone = done.has(today)
  let current = 0
  for (let d = todayDone ? today : today - 1; done.has(d); d--) current++
  return { current, best, days: done.size, todayDone }
}

/** Days with a tick in the last `n` days up to and including today (for the report: "practised 9 of the last 14 days"). */
export function activeDaysIn(ticks: Readonly<Record<string, readonly string[]>>, today: number, n: number): number {
  let c = 0
  for (const [key, ids] of Object.entries(ticks)) {
    const d = dayNumberOfKey(key)
    if (d !== null && d <= today && d > today - n && ids.length > 0) c++
  }
  return c
}

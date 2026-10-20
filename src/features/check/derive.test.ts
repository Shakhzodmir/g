import { describe, expect, it } from 'vitest'
import { deriveKind, recommendedKind } from './derive'
import { addResult, emptyRow, toggleTick } from './model'
import { buildResult } from './scoring'
import { adultQuestions } from './questions'
import { dayKey } from './days'
import type { Answer } from './types'

const DAY = 86_400_000
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime()
const result = (ts: number, a: Answer, retest: boolean) => {
  const qs = adultQuestions()
  return buildResult({ ts, stage: 'full', age: null, concerns: [], retest, questions: qs, answers: Object.fromEntries(qs.map((q) => [q.id, a])) })
}

describe('deriveKind', () => {
  it('has nothing for a profile that never took the check', () => {
    const v = deriveKind('adult', undefined, at(2026, 10, 20))
    expect(v.latest).toBeUndefined()
    expect(v.tasks).toEqual([])
    expect(v.milestones).toEqual([])
    expect(v.due).toBeUndefined()
    expect(v.streak.current).toBe(0)
  })

  it('gives today a plan from the focus domains and reads the ticks of today only', () => {
    const t0 = at(2026, 10, 1)
    let row = addResult(emptyRow('p', 'adult'), result(t0, 0, false))
    const now = at(2026, 10, 3)
    const v1 = deriveKind('adult', row, now)
    expect(v1.tasks.length).toBeGreaterThan(2)
    expect(v1.todayKey).toBe(dayKey(now))
    row = toggleTick(row, dayKey(now), v1.tasks[0].id, now)
    row = toggleTick(row, dayKey(now - DAY), 'old.task', now)
    const v2 = deriveKind('adult', row, now)
    expect([...v2.doneToday]).toEqual([v1.tasks[0].id])
    expect(v2.streak).toMatchObject({ current: 2, todayDone: true })
  })

  it('shows the retest as due from day 7 and "improved" after a better repeat check', () => {
    const t0 = at(2026, 10, 1)
    let row = addResult(emptyRow('p', 'adult'), result(t0, 0, false))
    expect(deriveKind('adult', row, at(2026, 10, 7)).due).toBeUndefined()
    expect(deriveKind('adult', row, at(2026, 10, 8)).due?.offset).toBe(7)
    row = addResult(row, result(at(2026, 10, 9), 2, true))
    const v = deriveKind('adult', row, at(2026, 10, 9))
    expect(v.due).toBeUndefined()
    expect(v.outcome).toEqual({ kind: 'improved', reason: 'clear' })
  })

  it('points to a specialist when a repeat check did not improve, and never for a fresh start', () => {
    const t0 = at(2026, 10, 1)
    let row = addResult(emptyRow('p', 'adult'), result(t0, 0, false))
    row = addResult(row, result(at(2026, 10, 9), 0, true))
    expect(deriveKind('adult', row, at(2026, 10, 9)).outcome).toEqual({ kind: 'specialist' })
    row = addResult(row, result(at(2026, 10, 10), 0, false))
    expect(deriveKind('adult', row, at(2026, 10, 10)).outcome).toEqual({ kind: 'first' })
  })

  it('ends the cycle after the 30 day retest', () => {
    const t0 = at(2026, 10, 1)
    let row = addResult(emptyRow('p', 'adult'), result(t0, 0, false))
    for (const d of [8, 15, 31]) row = addResult(row, result(t0 + d * DAY, 1, true))
    const v = deriveKind('adult', row, t0 + 32 * DAY)
    expect(v.cycleDone).toBe(true)
    expect(v.due).toBeUndefined()
  })

  it('recommends the screening that suits the profile', () => {
    expect(recommendedKind('adult')).toBe('adult')
    expect(recommendedKind('child')).toBe('child')
  })
})

import { describe, expect, it } from 'vitest'
import { dayKey, dayKeyOfNumber, dayNumber, dayNumberOfKey, formatDay } from './days'
import { dayPlan, totalMinutes, candidates, routeOf } from './plan'
import { cycleComplete, dueMilestone, milestonesOf, nextMilestone } from './schedule'
import { activeDaysIn, streakOf } from './streak'
import { CHECK_CONFIG } from './config'
import type { CheckPlan, CheckResult } from './types'

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h, 0, 0).getTime()

describe('days', () => {
  it('uses local calendar days and round-trips keys', () => {
    expect(dayKey(at(2026, 10, 20, 0))).toBe('2026-10-20')
    expect(dayKey(at(2026, 10, 20, 23))).toBe('2026-10-20')
    expect(dayNumber(at(2026, 10, 21, 0)) - dayNumber(at(2026, 10, 20, 23))).toBe(1)
    const n = dayNumber(at(2026, 3, 29))
    expect(dayNumberOfKey(dayKeyOfNumber(n))).toBe(n)
    expect(formatDay(dayNumber(at(2026, 1, 5)))).toBe('05.01.2026')
  })
  it('rejects impossible dates', () => {
    expect(dayNumberOfKey('2026-02-30')).toBeNull()
    expect(dayNumberOfKey('2026-13-01')).toBeNull()
    expect(dayNumberOfKey('nope')).toBeNull()
    expect(dayNumberOfKey('2026-1-1')).toBeNull()
  })
  it('differences are exact across a daylight-saving change', () => {
    expect(dayNumber(at(2026, 10, 26)) - dayNumber(at(2026, 10, 24))).toBe(2)
    expect(dayNumber(at(2026, 4, 1)) - dayNumber(at(2026, 3, 1))).toBe(31)
  })
})

describe('streak', () => {
  const today = dayNumber(at(2026, 10, 20))
  const k = (back: number) => dayKeyOfNumber(today - back)
  it('is zero without ticks', () => {
    expect(streakOf({}, today)).toEqual({ current: 0, best: 0, days: 0, todayDone: false })
  })
  it('counts consecutive days ending today', () => {
    const s = streakOf({ [k(0)]: ['a'], [k(1)]: ['a'], [k(2)]: ['b'] }, today)
    expect(s).toMatchObject({ current: 3, best: 3, days: 3, todayDone: true })
  })
  it('does not break while today is still open', () => {
    expect(streakOf({ [k(1)]: ['a'], [k(2)]: ['a'] }, today)).toMatchObject({ current: 2, todayDone: false })
  })
  it('breaks after a missed day, but remembers the best run', () => {
    const s = streakOf({ [k(0)]: ['a'], [k(2)]: ['a'], [k(3)]: ['a'], [k(4)]: ['a'] }, today)
    expect(s.current).toBe(1)
    expect(s.best).toBe(3)
  })
  it('is zero when the last tick was before yesterday', () => {
    expect(streakOf({ [k(2)]: ['a'] }, today).current).toBe(0)
  })
  it('ignores empty days, bad keys and days in the future', () => {
    const s = streakOf({ [k(0)]: [], 'bad-key': ['a'], [dayKeyOfNumber(today + 3)]: ['a'] }, today)
    expect(s).toMatchObject({ current: 0, days: 0 })
  })
  it('counts active days in a window', () => {
    expect(activeDaysIn({ [k(0)]: ['a'], [k(5)]: ['a'], [k(14)]: ['a'], [k(20)]: ['a'] }, today, 14)).toBe(2)
  })
})

describe('retest schedule 7 / 14 / 30', () => {
  const start = at(2026, 10, 1)
  const plan: CheckPlan = { startedTs: start, baselineResultId: 'r0', focus: ['vocab'] }
  const startDay = dayNumber(start)
  const retest = (day: number, id = `r${day}`): CheckResult => ({ id, ts: at(2026, 10, 1 + day, 9), stage: 'full', age: '3-4', concerns: [], retest: true, answers: {}, fr: {}, bands: { vocab: 'watch' }, overall: 'watch', cfg: 1 })
  const base: CheckResult = { ...retest(0, 'r0'), retest: false }
  const states = (day: number, rs: CheckResult[] = []) => milestonesOf(plan, [base, ...rs], startDay + day).map((m) => m.state)

  it('has no milestones without a plan', () => {
    expect(milestonesOf(null, [], 100)).toEqual([])
  })
  it('lists due days 7, 14 and 30 after the start', () => {
    expect(milestonesOf(plan, [base], startDay).map((m) => m.dueDay - startDay)).toEqual([7, 14, 30])
    expect(CHECK_CONFIG.retestDays).toEqual([7, 14, 30])
  })
  it('is quiet before day 7, due on day 7', () => {
    expect(states(0)).toEqual(['upcoming', 'upcoming', 'upcoming'])
    expect(states(6)).toEqual(['upcoming', 'upcoming', 'upcoming'])
    expect(states(7)).toEqual(['due', 'upcoming', 'upcoming'])
    expect(dueMilestone(milestonesOf(plan, [base], startDay + 7))?.offset).toBe(7)
  })
  it('stays due until it is done (the banner never expires)', () => {
    expect(states(12)).toEqual(['due', 'upcoming', 'upcoming'])
    expect(states(40)).toEqual(['due', 'due', 'due'])
  })
  it('a retest on or after the due day completes that mark', () => {
    expect(states(8, [retest(7)])).toEqual(['done', 'upcoming', 'upcoming'])
    expect(states(14, [retest(7)])).toEqual(['done', 'due', 'upcoming'])
  })
  it('a retest two days early still counts, five days early does not', () => {
    expect(states(5, [retest(5)])).toEqual(['done', 'upcoming', 'upcoming'])
    expect(states(4, [retest(4)])).toEqual(['upcoming', 'upcoming', 'upcoming'])
  })
  it('one late retest closes every mark it covers and does not nag at once', () => {
    expect(states(21, [retest(20)])).toEqual(['done', 'done', 'upcoming'])
    expect(states(31, [retest(20)])).toEqual(['done', 'done', 'due'])
  })
  it('finishes the cycle after the day-30 retest', () => {
    const ms = milestonesOf(plan, [base, retest(7), retest(14), retest(30)], startDay + 31)
    expect(cycleComplete(ms)).toBe(true)
    expect(nextMilestone(ms)).toBeUndefined()
  })
  it('ignores a fresh (non-retest) check and results before the plan', () => {
    const fresh: CheckResult = { ...retest(9), retest: false }
    expect(states(10, [fresh])).toEqual(['due', 'upcoming', 'upcoming'])
    expect(milestonesOf(plan, [{ ...retest(9), ts: start - 1000 }], startDay + 10).map((m) => m.state)).toEqual(['due', 'upcoming', 'upcoming'])
  })
  it('fakes dates the way the e2e does: a plan 8 days old is due', () => {
    const old: CheckPlan = { ...plan, startedTs: Date.now() - 8 * 86_400_000 }
    expect(milestonesOf(old, [], dayNumber(Date.now()))[0].state).toBe('due')
  })
})

describe('daily plan', () => {
  it('fits in 15 minutes and uses every focus domain, weakest first', () => {
    for (const kind of ['child', 'asd', 'adult'] as const) {
      const focus = kind === 'child' ? (['fluency', 'sounds', 'vocab'] as const) : kind === 'asd' ? (['pointing', 'joint', 'name'] as const) : (['words', 'clarity', 'memory'] as const)
      for (let day = 0; day < 8; day++) {
        const plan = dayPlan(kind, focus, day)
        expect(totalMinutes(plan)).toBeLessThanOrEqual(CHECK_CONFIG.plan.minutes)
        expect(totalMinutes(plan)).toBeGreaterThanOrEqual(12)
        expect(new Set(plan.map((t) => t.domain))).toEqual(new Set(focus))
        expect(plan.map((t) => t.domain)[0]).toBe(focus[0])
        expect(new Set(plan.map((t) => t.id)).size).toBe(plan.length)
      }
    }
  })
  it('is deterministic for a day and rotates between days', () => {
    expect(dayPlan('child', ['fluency'], 5).map((t) => t.id)).toEqual(dayPlan('child', ['fluency'], 5).map((t) => t.id))
    const ids = new Set<string>()
    for (let d = 0; d < 6; d++) for (const t of dayPlan('child', ['fluency'], d)) ids.add(t.id)
    expect(ids.size).toBeGreaterThan(3)
  })
  it('mixes screen-free tips with app activities', () => {
    const plan = dayPlan('child', ['sounds', 'vocab'], 3)
    expect(plan.some((t) => t.type === 'tip')).toBe(true)
    expect(plan.some((t) => t.type === 'app')).toBe(true)
  })
  it('a single focus domain still fills most of the time', () => {
    expect(totalMinutes(dayPlan('adult', ['words'], 0))).toBeGreaterThanOrEqual(12)
  })
  it('has no plan without a focus', () => {
    expect(dayPlan('child', [], 0)).toEqual([])
  })
  it('candidates alternate tip and app, and routes are real paths', () => {
    const c = candidates('child', 'articulation')
    expect(c.length).toBe(6)
    expect(c.map((t) => t.type).slice(0, 2)).toEqual(['tip', 'app'])
    expect(routeOf({ type: 'game', id: 'find' })).toBe('/games/find')
    expect(routeOf({ type: 'feature', id: 'exercises', sub: '/mirror' })).toBe('/exercises/mirror')
    expect(routeOf({ type: 'feature', id: 'schedule' })).toBe('/day')
    expect(routeOf({ type: 'feature', id: 'aac', sub: '?mode=keyboard' })).toBe('/talk?mode=keyboard')
  })
})

describe('daily plan mixes tips and app activities', () => {
  it('every day of two weeks has both kinds when there are at least two focus domains', () => {
    for (const [kind, focus] of [['child', ['vocab', 'sounds']], ['asd', ['joint', 'name', 'play']], ['adult', ['words', 'memory']]] as const) {
      for (let day = 0; day < 14; day++) {
        const types = new Set(dayPlan(kind, focus, day).map((t) => t.type))
        expect(types, `${kind} day ${day}`).toEqual(new Set(['tip', 'app']))
      }
    }
  })
})

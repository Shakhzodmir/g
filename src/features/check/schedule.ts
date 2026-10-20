import { CHECK_CONFIG } from './config'
import { dayNumber } from './days'
import type { CheckPlan, CheckResult } from './types'

export type MilestoneState = 'done' | 'due' | 'upcoming'

export interface Milestone {
  /** Days after the start of the plan: 7, 14, 30. */
  offset: number
  /** Local day number when it is due. */
  dueDay: number
  state: MilestoneState
  /** The repeat check that satisfied it. */
  resultId?: string
}

/**
 * The retest schedule of a plan: 7, 14 and 30 days after it started.
 *
 * A repeat check satisfies EVERY not-yet-done milestone that is due on its day or at most `retestEarlyGraceDays`
 * later (so one retest on day 20 closes the 7 and the 14 day marks and does not nag again at once; a retest on day 5
 * is early for day 7 and does not count). A milestone is "due" from its day until it is satisfied: it is a calm
 * in-app banner, never a notification, and it does not expire.
 */
export function milestonesOf(plan: CheckPlan | null | undefined, results: readonly CheckResult[], today: number): Milestone[] {
  if (!plan) return []
  const start = dayNumber(plan.startedTs)
  const retests = results.filter((r) => r.retest && r.ts > plan.startedTs).sort((a, b) => a.ts - b.ts)
  const out: Milestone[] = CHECK_CONFIG.retestDays.map((offset) => ({ offset, dueDay: start + offset, state: 'upcoming' as MilestoneState }))
  for (const r of retests) {
    const day = dayNumber(r.ts)
    for (const m of out) {
      if (m.state !== 'done' && day >= m.dueDay - CHECK_CONFIG.retestEarlyGraceDays) {
        m.state = 'done'
        m.resultId = r.id
      }
    }
  }
  for (const m of out) if (m.state !== 'done' && today >= m.dueDay) m.state = 'due'
  return out
}

/** The first milestone that is due now (what the banner is about), if any. */
export function dueMilestone(ms: readonly Milestone[]): Milestone | undefined {
  return ms.find((m) => m.state === 'due')
}

/** All three marks are done: the cycle is finished and a fresh check starts a new one. */
export const cycleComplete = (ms: readonly Milestone[]): boolean => ms.length > 0 && ms.every((m) => m.state === 'done')

/** The first mark that is not done yet (due or upcoming). */
export function nextMilestone(ms: readonly Milestone[]): Milestone | undefined {
  return ms.find((m) => m.state !== 'done')
}

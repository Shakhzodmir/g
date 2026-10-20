import { dayKey, dayNumber } from './days'
import { dayPlan, type PlanTask } from './plan'
import { cycleComplete, dueMilestone, milestonesOf, type Milestone } from './schedule'
import { evaluate, type Outcome } from './scoring'
import { streakOf, type StreakInfo } from './streak'
import type { CheckKind, CheckResult, CheckRow } from './types'

/** Everything a screen shows about one screening of one profile, computed from the stored row and the current time. */
export interface KindView {
  latest?: CheckResult
  /** The result before the latest one. */
  previous?: CheckResult
  /** How the latest repeat check compares with the one before; `first` for a first or fresh check. */
  outcome: Outcome
  milestones: Milestone[]
  due?: Milestone
  cycleDone: boolean
  streak: StreakInfo
  today: number
  todayKey: string
  tasks: PlanTask[]
  doneToday: ReadonlySet<string>
}

export function deriveKind(kind: CheckKind, row: CheckRow | undefined, now: number): KindView {
  const results = row?.results ?? []
  const latest = results[results.length - 1]
  const previous = results.length > 1 ? results[results.length - 2] : undefined
  const today = dayNumber(now)
  const todayKey = dayKey(now)
  const milestones = milestonesOf(row?.plan, results, today)
  const cycleDone = cycleComplete(milestones)
  return {
    latest,
    previous,
    outcome: latest && latest.retest ? evaluate(previous, latest) : { kind: 'first' },
    milestones,
    due: cycleDone ? undefined : dueMilestone(milestones),
    cycleDone,
    streak: streakOf(row?.ticks ?? {}, today),
    today,
    todayKey,
    tasks: row?.plan ? dayPlan(kind, row.plan.focus, today) : [],
    doneToday: new Set(row?.ticks[todayKey] ?? []),
  }
}

/** Which screening suits a profile best (shown as a hint, never forced). */
export function recommendedKind(profileKind: 'child' | 'adult'): CheckKind {
  return profileKind === 'adult' ? 'adult' : 'child'
}

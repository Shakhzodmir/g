import { FEATURES, featureAllowed, featureTitle } from '../../app/features'
import type { Bi } from '../../i18n/types'
import { GAMES } from '../games/registry'
import { CHECK_CONFIG } from './config'
import { appTasksFor, tipsFor } from './tips'
import type { AppTarget, CheckKind, DomainId, TipDef } from './types'

/*
 * The daily plan: 15 minutes built from the weakest domains. Pure and deterministic for a given (kind, focus, day):
 * the same day always shows the same tasks, the next day rotates to others so the plan does not become a chore.
 */

export interface PlanTask {
  /** Stable id (the id of the tip or app activity); this is what a "done today" tick stores. */
  id: string
  type: 'app' | 'tip'
  domain: DomainId
  minutes: number
  target?: AppTarget
  tip?: TipDef
}

/** Route of an app target (a hash-router path such as `/games/find` or `/exercises/blow`). */
export function routeOf(target: AppTarget): string {
  if (target.type === 'game') return `/games/${target.id}`
  return `${FEATURES[target.id].path}${target.sub ?? ''}`
}

/** Every candidate task of a domain, alternating a screen-free tip and an app activity. */
export function candidates(kind: CheckKind, domain: DomainId): PlanTask[] {
  const tips: PlanTask[] = tipsFor(kind, domain).map((tip) => ({ id: tip.id, type: 'tip', domain, minutes: tip.minutes, tip }))
  const apps: PlanTask[] = appTasksFor(kind, domain).map((a) => ({ id: a.id, type: 'app', domain, minutes: a.minutes, target: a.target }))
  const out: PlanTask[] = []
  for (let i = 0; i < Math.max(tips.length, apps.length); i++) {
    if (tips[i]) out.push(tips[i])
    if (apps[i]) out.push(apps[i])
  }
  return out
}

function rotate<T>(list: T[], by: number): T[] {
  if (!list.length) return list
  const n = ((by % list.length) + list.length) % list.length
  return [...list.slice(n), ...list.slice(0, n)]
}

export const totalMinutes = (tasks: readonly PlanTask[]): number => tasks.reduce((s, t) => s + t.minutes, 0)

/**
 * Tasks for one day, at most `CHECK_CONFIG.plan.minutes` long, grouped by domain in the order of `focus`.
 * Round-robin over the focus domains, so every focus domain gets a task before any gets a second one.
 */
export function dayPlan(kind: CheckKind, focus: readonly DomainId[], day: number, budget: number = CHECK_CONFIG.plan.minutes): PlanTask[] {
  // Rotate by the day, then lead with a screen-free tip or an app activity (alternating by domain and day), so a day mixes both.
  const pools = focus.map((d, i) => {
    const pool = rotate(candidates(kind, d), day)
    const want: PlanTask['type'] = (day + i) % 2 === 0 ? 'tip' : 'app'
    const at = pool.findIndex((c) => c.type === want)
    if (at > 0) pool.unshift(...pool.splice(at, 1))
    return pool
  })
  const picked: PlanTask[] = []
  let total = 0
  let progress = true
  while (progress && total < budget) {
    progress = false
    for (const pool of pools) {
      while (pool.length) {
        const c = pool.shift()!
        if (total + c.minutes <= budget) {
          picked.push(c)
          total += c.minutes
          progress = true
          break
        }
      }
      if (total >= budget) break
    }
  }
  return focus.flatMap((d) => picked.filter((t) => t.domain === d))
}

const EXERCISE_BI: Record<string, Bi> = {
  '/blow': { uz: 'Puflash', ru: 'Подуй' },
  '/voice': { uz: 'Ovoz mashqlari', ru: 'Упражнения для голоса' },
  '/mirror': { uz: 'Koʻzgu', ru: 'Зеркальце' },
}

/** Title of an app activity, in the wording the profile of that audience sees on its own screens. */
export function appTaskTitle(target: AppTarget, audience: 'child' | 'adult'): Bi {
  if (target.type === 'game') {
    const g = GAMES.find((x) => x.id === target.id)
    return g ? (audience === 'adult' && g.titleAdult ? g.titleAdult : g.title) : { uz: target.id, ru: target.id }
  }
  if (target.id === 'exercises' && target.sub && EXERCISE_BI[target.sub]) return EXERCISE_BI[target.sub]
  if (target.id === 'aac' && target.sub) return { uz: 'Klaviatura', ru: 'Клавиатура' }
  return featureTitle(FEATURES[target.id], audience)
}

export function appTaskSymbol(target: AppTarget): string {
  if (target.type === 'game') return GAMES.find((x) => x.id === target.id)?.symbol ?? 'puzzle'
  if (target.id === 'exercises' && target.sub === '/mirror') return 'mirror'
  return FEATURES[target.id].symbol
}

/** Whether the ACTIVE profile may open the target (an adult profile has no children's games and the other way round). */
export function canOpen(target: AppTarget, profileKind: 'child' | 'adult'): boolean {
  if (target.type === 'game') {
    const g = GAMES.find((x) => x.id === target.id)
    return !!g && (g.audience === 'both' || g.audience === profileKind)
  }
  return featureAllowed(FEATURES[target.id], profileKind)
}

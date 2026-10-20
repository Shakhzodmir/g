import { ROUTINES_3, ROUTINES_4, STEP_PART } from '../../../content/gamedata'
import { sample, shuffle } from '../../../lib/random'
import type { Level } from './rounds'

/**
 * Level 1: two steps are shown, pick the third (2 cards).
 * Level 2: the first step is shown, tap the other two in order (2 right cards + 1 that does not belong).
 * Level 3: nothing is shown, tap all four steps of a longer routine in order.
 */
export interface RoutineItem {
  /** Whole routine, in order. */
  steps: string[]
  /** Steps already placed when the item starts. */
  shown: string[]
  /** Steps the child taps, in this order. */
  answers: string[]
  /** All cards on the table, shuffled. */
  options: string[]
}

/** A card that cannot be mistaken for a step of this routine: another part of the day. */
export function distractorFor(steps: readonly string[], all: readonly string[], rand: () => number): string | undefined {
  const parts = new Set(steps.map((s) => STEP_PART[s]).filter((p) => p && p !== 'any'))
  const pool = all.filter((id) => !steps.includes(id) && STEP_PART[id] && STEP_PART[id] !== 'any' && !parts.has(STEP_PART[id]))
  return pool.length ? sample(pool, 1, rand)[0] : undefined
}

function notInOrder(cards: string[], order: readonly string[], rand: () => number): string[] {
  let out = shuffle(cards, rand)
  for (let i = 0; i < 8 && out.length > 1 && out.join() === order.join(); i++) out = shuffle(cards, rand)
  return out
}

export function makeRoutineRound(level: Level, has: (wordId: string) => boolean, rand: () => number = Math.random, size = 5, previous?: string): RoutineItem[] {
  const source = (level === 3 ? ROUTINES_4 : ROUTINES_3).filter((r) => r.every(has))
  if (!source.length) return []
  const all = Object.keys(STEP_PART).filter(has)
  const order: string[][] = []
  const fresh = shuffle(source, rand).filter((r) => r.join() !== previous)
  for (let i = 0; i < size; i++) order.push((fresh.length ? fresh : source)[i % (fresh.length || source.length)])
  return order.map((steps): RoutineItem => {
    if (level === 1) {
      const answers = [steps[2]]
      const d = distractorFor(steps, all, rand)
      return { steps, shown: steps.slice(0, 2), answers, options: shuffle(d ? [...answers, d] : answers, rand) }
    }
    if (level === 2) {
      const answers = steps.slice(1)
      const d = distractorFor(steps, all, rand)
      return { steps, shown: steps.slice(0, 1), answers, options: notInOrder(d ? [...answers, d] : answers, answers, rand) }
    }
    return { steps, shown: [], answers: steps, options: notInOrder(steps, steps, rand) }
  })
}

/** Validates one tap: the card must be the next expected answer. */
export function isNextStep(item: RoutineItem, progress: number, card: string): boolean {
  return item.answers[progress] === card
}

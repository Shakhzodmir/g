import type { SpeechLang } from '../../i18n/types'

/* Pure token-board model: goal 3–10 stars, a reward card shown when the board is full. */

export const MIN_GOAL = 3
export const MAX_GOAL = 10

export interface TokenBoard {
  goal: number
  count: number
  /** Reward card ref (word id, `st.<sticker>`, `c.<custom card>`). */
  rewardRef: string | null
}

export function clampGoal(n: number): number {
  if (!Number.isFinite(n)) return 5
  return Math.min(MAX_GOAL, Math.max(MIN_GOAL, Math.round(n)))
}

export function createBoard(goal = 5, rewardRef: string | null = null): TokenBoard {
  return { goal: clampGoal(goal), count: 0, rewardRef }
}

export function remaining(b: TokenBoard): number {
  return Math.max(0, b.goal - b.count)
}

export function isComplete(b: TokenBoard): boolean {
  return b.count >= b.goal
}

/** Adds one token; a full board stays full (returns the same object). */
export function addToken(b: TokenBoard): TokenBoard {
  if (isComplete(b)) return b
  return { ...b, count: b.count + 1 }
}

export function resetBoard(b: TokenBoard): TokenBoard {
  return b.count === 0 ? b : { ...b, count: 0 }
}

/** Changing the goal keeps earned stars, never more than the new goal. */
export function setGoal(b: TokenBoard, goal: number): TokenBoard {
  const g = clampGoal(goal)
  return { ...b, goal: g, count: Math.min(b.count, g) }
}

export function setReward(b: TokenBoard, rewardRef: string | null): TokenBoard {
  return { ...b, rewardRef }
}

/**
 * Voice-line ids to speak after a token is added ("Yana 3 ta yulduzcha" / "Ещё три звёздочки").
 * Russian picks the plural form; numbers are `n.<k>` clips.
 */
export function remainingSpeechIds(left: number, lang: SpeechLang): string[] {
  if (left <= 0) return ['v.tok_full', 'v.tok_reward']
  if (left === 1) return ['v.tok_one_more']
  const n = Math.min(MAX_GOAL, left)
  if (lang === 'uz') return ['v.tok_more', `n.${n}`, 'v.tok_star_count']
  const plural = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'v.tok_star_few' : 'v.tok_star_many'
  return ['v.tok_more', `n.${n}`, plural]
}

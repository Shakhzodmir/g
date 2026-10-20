import { LISTEN_SENTENCES, LISTEN_TASKS, type GameLine } from '../../../content/gamedata'
import type { Word } from '../../../content/types'
import { sample, shuffle } from '../../../lib/random'
import type { Level } from './rounds'

/** Level 1: a sentence, 2 pictures. Level 2: a sentence, 3 pictures. Level 3: two things to show in order, 4 pictures. */
export const POINT_OPTIONS: Record<Level, number> = { 1: 2, 2: 3, 3: 4 }

export interface PointItem {
  line: GameLine
  /** Picture words to tap, in this order (one for a sentence, two for a task). */
  answers: string[]
  options: string[]
}

export const POINT_TOPICS = ['food', 'drinks', 'animals', 'toys', 'clothes', 'school']

/** Picture words offered as wrong cards: concrete things, one per picture. */
export function distractorPool(words: readonly Word[]): Word[] {
  const seen = new Set<string>()
  return words.filter((w) => {
    if (w.fitz !== 'thing' || !POINT_TOPICS.includes(w.topic) || seen.has(w.symbol)) return false
    seen.add(w.symbol)
    return true
  })
}

export function makePointRound(words: readonly Word[], level: Level, rand: () => number = Math.random, size = 5, previous?: string): PointItem[] {
  const byId = new Map(words.map((w) => [w.id, w]))
  const pool = distractorPool(words)
  const n = POINT_OPTIONS[level]
  const bank = level === 3
    ? LISTEN_TASKS.filter((t) => t.targets.every((id) => byId.has(id))).map((t) => ({ line: t as GameLine, answers: [...t.targets], avoid: [] as string[] }))
    : LISTEN_SENTENCES.filter((s) => byId.has(s.target)).map((s) => ({ line: s as GameLine, answers: [s.target], avoid: s.avoid ?? [] }))
  const fresh = shuffle(bank, rand).filter((b) => b.line.key !== previous)
  const order = (fresh.length ? fresh : bank).slice(0, size)
  return order.map(({ line, answers, avoid }): PointItem => {
    const symbols = new Set(answers.map((id) => byId.get(id)?.symbol))
    const wrong = sample(
      pool.filter((w) => !answers.includes(w.id) && !avoid.includes(w.id) && !symbols.has(w.symbol)),
      n - answers.length,
      rand,
    ).map((w) => w.id)
    return { line, answers, options: shuffle([...answers, ...wrong], rand) }
  })
}

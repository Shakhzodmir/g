import { pluralizeForms } from '../../i18n/plural'
import type { GameCount } from './counts'
import type { GameDef } from './registry'
import type { S } from './strings'

type Key = keyof typeof S.uz
/** The translator of the games dictionary (`useStrings(S)`), or any function with the same shape. */
export type Translate = (key: Key, vars?: Record<string, string | number>) => string

const COUNT_KEY = {
  word: 'nWord',
  picture: 'nPicture',
  task: 'nTask',
  pair: 'nPair',
  category: 'nCategory',
  number: 'nNumber',
} as const satisfies Record<GameCount['unit'], Key>

export interface GameChips {
  /** "3–6 yosh" / "3–6 лет"; null where an age makes no sense (adult profiles, adult-only games). */
  age: string | null
  /** "40 ta soʻz" / "40 слов". */
  count: string
  /** Both, for the accessible name and tests: "3–6 yosh · 40 ta soʻz". */
  text: string
}

/**
 * The labels of a hub tile. Both numbers come from data: the age from the game's registry entry, the count from
 * counts.ts. Russian plural forms ("слово|слова|слов") are picked by the number shown.
 */
export function gameChips(game: Pick<GameDef, 'ages' | 'audience'>, count: GameCount, kind: 'child' | 'adult', t: Translate): GameChips {
  const [from, to] = game.ages
  const showAge = kind === 'child' && game.audience !== 'adult'
  const age = showAge ? pluralizeForms(t('ageRange', { from, to }), to) : null
  const n = pluralizeForms(t(COUNT_KEY[count.unit], { n: count.n }), count.n)
  return { age, count: n, text: [age, n].filter(Boolean).join(' · ') }
}

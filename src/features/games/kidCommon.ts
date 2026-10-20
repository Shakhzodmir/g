import type { SpeakItem } from '../../audio/speech'
import { GAME_LINES, type GameLine } from '../../content/gamedata'
import type { Word } from '../../content/types'
import { wordById, wordsForKind } from '../../content/vocab'
import { NUMBER_LINES } from '../../content/voiceLines'
import type { Bi } from '../../i18n/types'
import { item } from './session'

/*
 * Helpers shared by the children's games: words are looked up by id (a missing word simply drops out of a round),
 * and every spoken thing is an audio key that scripts/audio-manifest.ts knows (w.<id>, g.find.<id>, g.<game>.*).
 */

const KIDS = new Set(wordsForKind('child').map((w) => w.id))

/** True when the word exists and children may meet it. */
export const hasWord = (id: string): boolean => KIDS.has(id) && !!wordById(id)

export const kidWord = (id: string): Word | undefined => (hasWord(id) ? wordById(id) : undefined)

export const kidWords = (): Word[] => wordsForKind('child')

/** "Qani qizil?" — the same question line as the "Topchi!" game, so its clip is reused. */
export const askBi = (w: Word): Bi => ({ uz: `Qani ${w.uz}?`, ru: `Где ${w.ru}?` })
export const askItem = (w: Word): SpeakItem => item(`g.find.${w.id}`, askBi(w))

/** The word itself (clip `w.<id>`). */
export const wordItem = (w: Word): SpeakItem => item(`w.${w.id}`, { uz: w.uz, ru: w.ru })

const LINES = new Map<string, GameLine>(GAME_LINES.map((l) => [l.key, l]))

/** A fixed game line by key (throws early in tests when a key is misspelled). */
export function gameLine(key: string): GameLine {
  const l = LINES.get(key)
  if (!l) throw new Error(`unknown game line ${key}`)
  return l
}

export const lineBi = (l: GameLine): Bi => ({ uz: l.uz, ru: l.ru })
export const lineItem = (l: GameLine): SpeakItem => item(l.key, lineBi(l))
export const lineItemByKey = (key: string): SpeakItem => lineItem(gameLine(key))

/** Number words come from the vocabulary (`number_<n>`); the old voice lines are the fallback. */
export function numberItem(n: number): SpeakItem {
  const w = kidWord(`number_${n}`)
  if (w) return wordItem(w)
  const v = NUMBER_LINES.find((l) => l.id === `num_${n}`)
  return item(`n.${n}`, v ? { uz: v.uz, ru: v.ru } : { uz: String(n), ru: String(n) })
}

/** The last target of the previous round of a game, so a new round never opens with the same picture. */
const lastTargets = new Map<string, string>()
export const lastTarget = (game: string): string | undefined => lastTargets.get(game)
export const setLastTarget = (game: string, id: string | undefined): void => {
  if (id !== undefined) lastTargets.set(game, id)
}

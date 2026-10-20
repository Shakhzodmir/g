import { SOUND_MAKERS } from '../../content/animals'
import { adultItems, SITUATIONS, usableCats, catItems } from '../../content/adultgamedata'
import { LISTEN_SENTENCES, LISTEN_TASKS, ODD_CATEGORIES, ROUTINES_3, ROUTINES_4 } from '../../content/gamedata'
import { wordById, wordsForKind, WORDS } from '../../content/vocab'
import type { SpeechLang } from '../../i18n/types'
import { CATEGORY_LEVELS } from './adult/logic/category'
import { listenTaskCount } from './adult/logic/listening'
import { namingPool } from './adult/logic/naming'
import { ODD_OPTIONS } from './adult/logic/oddone'
import { sentencePool } from './adult/logic/sentence'
import { buildWords } from './logic/buildword'
import { COUNT_MAX } from './logic/count'
import { colorPool } from './logic/colors'
import { members } from './logic/oddone'
import { oppPairs } from './logic/opposite'
import { adultMemoryItems, FIND_TOPICS, memoryWords, pictureWords, poolWordsFor } from './logic/pools'
import type { Level } from './logic/rounds'
import { shapePool } from './logic/shapes'
import { soundGroups } from './logic/sound'
import { syllableWords } from './logic/syllables'

/*
 * "How much is in this game": the number on the games hub ("40 ta soʻz"). It is never typed by hand: each game has a
 * function here that counts the SAME pool its rounds draw from, for the profile kind and the speech language, and
 * the hub label is built from that number. counts.test.ts checks that every registered game has such a function, that
 * the number is above zero for its audience, and that the label shown is exactly this number.
 */

export type CountUnit = 'word' | 'picture' | 'task' | 'pair' | 'category' | 'number'

export interface GameCount {
  n: number
  unit: CountUnit
}

type Kind = 'child' | 'adult'
type Counter = (kind: Kind, lang: SpeechLang) => GameCount

const LEVELS: Level[] = [1, 2, 3]

const word = (n: number): GameCount => ({ n, unit: 'word' })
const picture = (n: number): GameCount => ({ n, unit: 'picture' })
const task = (n: number): GameCount => ({ n, unit: 'task' })

/** Words a child profile may meet (the same filter the children's games use). */
const kidIds = (): Set<string> => new Set(wordsForKind('child').map((w) => w.id))
const hasKidWord = (): ((id: string) => boolean) => {
  const kids = kidIds()
  return (id) => kids.has(id) && !!wordById(id)
}

const distinct = (ids: Iterable<string>): number => new Set(ids).size

/** Pictures an adult game can show from the categories that have enough members (distinct items). */
function itemsOfCats(min: number): number {
  return distinct(usableCats(min).flatMap((c) => catItems(c.id).map((i) => i.id)))
}

/** The pool of every game, by game id. A game without an entry here fails the test. */
export const COUNTERS: Record<string, Counter> = {
  // ----- children's games (and the child side of the shared ones)
  animals: () => picture(SOUND_MAKERS.length),
  find: (kind) => {
    if (kind === 'adult') return picture(itemsOfCats(6))
    return word(distinct(FIND_TOPICS.flatMap((t) => pictureWords(WORDS, t).map((w) => w.id))))
  },
  memory: (kind) => picture(kind === 'adult' ? adultMemoryItems().length : distinct(memoryWords(WORDS).map((w) => w.id))),
  syllables: (kind, lang) => word(distinct(LEVELS.flatMap((l) => syllableWords(poolWordsFor(kind === 'adult' ? 'adult' : 'child'), l, lang).map((w) => w.id)))),
  colors: () => word(colorPool(2, hasKidWord()).length),
  shapes: () => word(shapePool(2, hasKidWord()).length),
  count: () => ({ n: COUNT_MAX[3], unit: 'number' }),
  odd: () => {
    const symbols = new Map(wordsForKind('child').map((w) => [w.id, w.symbol]))
    const symbolOf = (id: string) => symbols.get(id)
    return picture(distinct(Object.keys(ODD_CATEGORIES).flatMap((cat) => members(cat, symbolOf))))
  },
  routine: () => {
    const has = hasKidWord()
    return task(distinct([...ROUTINES_3, ...ROUTINES_4].filter((r) => r.every(has)).map((r) => r.join('>'))))
  },
  opposite: () => ({ n: oppPairs(3, hasKidWord()).length, unit: 'pair' }),
  sound: (_kind, lang) => word([...soundGroups(wordsForKind('child'), lang).values()].reduce((sum, g) => sum + g.length, 0)),
  point: () => {
    const has = hasKidWord()
    const sentences = LISTEN_SENTENCES.filter((s) => has(s.target)).length
    const tasks = LISTEN_TASKS.filter((t) => t.targets.every(has)).length
    return task(sentences + tasks)
  },
  build: (_kind, lang) => word(distinct(LEVELS.flatMap((l) => buildWords(wordsForKind('child'), l, lang).map((w) => w.id)))),

  // ----- adult training games
  naming: (_kind, lang) => picture(distinct(LEVELS.flatMap((l) => namingPool(l, lang).map((i) => i.id)))),
  sentence: () => task(distinct(LEVELS.flatMap((l) => sentencePool(l).map((s) => s.key)))),
  category: () => ({ n: usableCats(CATEGORY_LEVELS[1].targets[1] + 1).length, unit: 'category' }),
  wordpic: () => picture(distinct(adultItems().map((i) => i.symbol))),
  oddone: () => picture(itemsOfCats(ODD_OPTIONS[1] - 1)),
  listen: () => task(listenTaskCount()),
  situations: () => task(SITUATIONS.length),
}

/** The count of a game for a profile kind and speech language; zero when the game has no pool defined. */
export function gameCount(id: string, kind: Kind, lang: SpeechLang): GameCount {
  return COUNTERS[id]?.(kind, lang) ?? { n: 0, unit: 'word' }
}

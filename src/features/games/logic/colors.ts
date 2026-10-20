import { BASIC_COLORS, COLORS, COLOR_OBJECTS, type ColorId } from '../../../content/gamedata'
import { sample, shuffle } from '../../../lib/random'
import { makeRound, type Level } from './rounds'

/** Options per item: 2 swatches, 4 swatches, 4 real things. */
export const COLOR_OPTIONS: Record<Level, number> = { 1: 2, 2: 4, 3: 4 }

/** Colours that look alike: never offered together (a fair choice needs a clear difference). */
const SIMILAR: Array<[ColorId, ColorId]> = [
  ['blue', 'light_blue'],
  ['gray', 'black'],
  ['gray', 'white'],
  ['red', 'pink'],
  ['orange', 'yellow'],
  ['purple', 'pink'],
]

export function similar(a: ColorId, b: ColorId): boolean {
  return SIMILAR.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
}

export interface ColorOption {
  color: ColorId
  /** Level 3 only: a real thing of this colour. */
  symbol?: string
}

export interface ColorItem {
  target: ColorId
  options: ColorOption[]
}

export const wordOfColor = (id: ColorId): string => COLORS.find((c) => c.id === id)!.word

/** Colours of a level whose name word exists in the vocabulary. */
export function colorPool(level: Level, hasWord: (wordId: string) => boolean): ColorId[] {
  const base: ColorId[] = level === 1 ? BASIC_COLORS : level === 2 ? COLORS.map((c) => c.id) : (Object.keys(COLOR_OBJECTS) as ColorId[])
  return base.filter((id) => hasWord(wordOfColor(id)))
}

export function makeColorRound(level: Level, hasWord: (wordId: string) => boolean, rand: () => number = Math.random, previous?: ColorId): ColorItem[] {
  const pool = colorPool(level, hasWord)
  const targets = makeRound(pool, { options: 1, rand, previous })
  const n = Math.min(COLOR_OPTIONS[level], pool.length)
  return targets.map(({ target }) => {
    const picked: ColorId[] = [target]
    for (const c of shuffle(pool.filter((p) => p !== target), rand)) {
      if (picked.length >= n) break
      if (picked.every((p) => !similar(p, c))) picked.push(c)
    }
    const options: ColorOption[] = shuffle(picked, rand).map((color) => {
      if (level !== 3) return { color }
      return { color, symbol: sample(COLOR_OBJECTS[color] ?? [], 1, rand)[0] }
    })
    return { target, options }
  })
}

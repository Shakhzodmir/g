import { BASIC_SHAPES, SHAPES, SHAPE_OBJECTS, type ShapeId } from '../../../content/gamedata'
import { sample, shuffle } from '../../../lib/random'
import { makeRound, type Level } from './rounds'

export const SHAPE_OPTIONS: Record<Level, number> = { 1: 2, 2: 4, 3: 4 }

const SIMILAR: Array<[ShapeId, ShapeId]> = [
  ['square', 'rectangle'],
  ['circle', 'oval'],
  ['square', 'diamond'],
  ['diamond', 'rectangle'],
]

export function similarShapes(a: ShapeId, b: ShapeId): boolean {
  return SIMILAR.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
}

export interface ShapeOption {
  shape: ShapeId
  /** Level 3: a real object with this shape. */
  symbol?: string
}

export interface ShapeItem {
  target: ShapeId
  options: ShapeOption[]
}

export const wordOfShape = (id: ShapeId): string => SHAPES.find((s) => s.id === id)!.word

export function shapePool(level: Level, hasWord: (wordId: string) => boolean): ShapeId[] {
  const base: ShapeId[] = level === 1 ? BASIC_SHAPES : SHAPES.map((s) => s.id)
  return base.filter((id) => hasWord(wordOfShape(id)))
}

export function makeShapeRound(level: Level, hasWord: (wordId: string) => boolean, rand: () => number = Math.random, previous?: ShapeId): ShapeItem[] {
  const pool = shapePool(level, hasWord)
  const targets = makeRound(pool, { options: 1, rand, previous })
  const n = Math.min(SHAPE_OPTIONS[level], pool.length)
  return targets.map(({ target }) => {
    const picked: ShapeId[] = [target]
    for (const c of shuffle(pool.filter((p) => p !== target), rand)) {
      if (picked.length >= n) break
      if (picked.every((p) => !similarShapes(p, c))) picked.push(c)
    }
    const options = shuffle(picked, rand).map((shape): ShapeOption => (level === 3 ? { shape, symbol: sample(SHAPE_OBJECTS[shape], 1, rand)[0] } : { shape }))
    return { target, options }
  })
}

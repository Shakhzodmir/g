import { adultItems, CAT_BY_ID, catItems, usableCats, type CatDef, type CatId, type GItem } from '../../../../content/adultgamedata'
import type { Level } from '../../logic/rounds'
import { ADULT_ROUND, pickDistinct, shuffle, type Rand } from './common'

/** Cards on the table and how many of them belong to the category, by level. */
export const CATEGORY_LEVELS: Record<Level, { cards: number; targets: [min: number, max: number]; near: boolean }> = {
  1: { cards: 6, targets: [2, 3], near: false },
  2: { cards: 8, targets: [3, 4], near: false },
  3: { cards: 9, targets: [4, 4], near: true },
}

export interface CategoryRound {
  cat: CatDef
  cards: GItem[]
  /** Ids of the cards that belong to the category. */
  targets: string[]
}

const inCat = (it: GItem, cat: CatId) => it.cats.includes(cat)

/** Distractor candidates: members of neighbouring categories (hard) or of unrelated ones (easy), never of `cat` itself. */
function distractorPool(cat: CatDef, near: boolean): GItem[] {
  const nearIds = new Set<CatId>(cat.near)
  // A category's neighbours are symmetric for this purpose.
  for (const c of usableCats()) if (c.near.includes(cat.id)) nearIds.add(c.id)
  const all = adultItems().filter((i) => !inCat(i, cat.id))
  const isNear = (i: GItem) => i.cats.some((c) => nearIds.has(c))
  const pool = near ? all.filter(isNear) : all.filter((i) => !isNear(i))
  return pool.length >= 4 ? pool : all
}

export function makeCategoryRound(level: Level, rand: Rand = Math.random, only?: CatId): CategoryRound | null {
  const p = CATEGORY_LEVELS[level]
  const cats = usableCats(p.targets[1] + 1).filter((c) => !only || c.id === only)
  if (!cats.length) return null
  const cat = shuffle(cats, rand)[0]
  const want = p.targets[0] + Math.floor(rand() * (p.targets[1] - p.targets[0] + 1))
  const targets = pickDistinct(shuffle(catItems(cat.id), rand), want, [])
  const others = pickDistinct(shuffle(distractorPool(cat, p.near), rand), p.cards - targets.length, targets)
  const cards = shuffle([...targets, ...others], rand)
  return { cat, cards, targets: targets.map((t) => t.id) }
}

/** A round of category finds: the same category never comes twice in a row. */
export function categoryRounds(level: Level, rand: Rand = Math.random, size = ADULT_ROUND): CategoryRound[] {
  const out: CategoryRound[] = []
  let prev: CatId | undefined
  const order = shuffle(usableCats(CATEGORY_LEVELS[level].targets[1] + 1), rand)
  for (let i = 0; i < size; i++) {
    let c = order[i % order.length]
    if (c.id === prev) c = order[(i + 1) % order.length]
    const r = makeCategoryRound(level, rand, c.id)
    if (!r) continue
    out.push(r)
    prev = c.id
  }
  return out
}

/** "Say as many as you can" categories (rich ones only), in a shuffled order. */
export function namingCategories(rand: Rand = Math.random, size = ADULT_ROUND): CatDef[] {
  const rich = usableCats(8)
  const order = shuffle(rich, rand)
  return Array.from({ length: size }, (_, i) => order[i % order.length])
}

export { CAT_BY_ID }

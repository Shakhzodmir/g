import { CAT_BY_ID, catItems, usableCats, type CatDef, type CatId, type GItem } from '../../../../content/adultgamedata'
import type { Level } from '../../logic/rounds'
import { ADULT_ROUND, pickDistinct, shuffle, type Rand } from './common'

/** Pictures on the table by level: all but one belong together. */
export const ODD_OPTIONS: Record<Level, number> = { 1: 4, 2: 5, 3: 6 }

export interface OddItem {
  cat: CatDef
  /** The pictures to choose from (the odd one among them). */
  options: GItem[]
  odd: GItem
}

export function makeOddItem(level: Level, rand: Rand = Math.random, only?: CatId): OddItem | null {
  const total = ODD_OPTIONS[level]
  const cats = usableCats(total - 1).filter((c) => !only || c.id === only)
  if (!cats.length) return null
  const cat = shuffle(cats, rand)[0]
  const group = pickDistinct(shuffle(catItems(cat.id), rand), total - 1, [])
  if (group.length < total - 1) return null
  // Level 3 takes the intruder from a neighbouring category (hard: fruit among vegetables), the others from anywhere else.
  const nearIds = new Set<CatId>(cat.near)
  for (const c of usableCats()) if (c.near.includes(cat.id)) nearIds.add(c.id)
  const outside = (c: CatDef) => c.id !== cat.id
  const wanted = usableCats(1)
    .filter(outside)
    .filter((c) => (level === 3 ? nearIds.has(c.id) : !nearIds.has(c.id)))
  const candidates = shuffle(
    (wanted.length ? wanted : usableCats(1).filter(outside)).flatMap((c) => catItems(c.id)),
    rand,
  ).filter((i) => !i.cats.includes(cat.id))
  const odd = pickDistinct(candidates, 1, group)[0]
  if (!odd) return null
  return { cat, options: shuffle([...group, odd], rand), odd }
}

export function oddRound(level: Level, rand: Rand = Math.random, size = ADULT_ROUND): OddItem[] {
  const out: OddItem[] = []
  let prev: CatId | undefined
  for (let tries = 0; out.length < size && tries < size * 6; tries++) {
    const it = makeOddItem(level, rand)
    if (!it || it.cat.id === prev) continue
    out.push(it)
    prev = it.cat.id
  }
  return out
}

export { CAT_BY_ID }

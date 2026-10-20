import { ODD_CATEGORIES, ODD_FAR, ODD_NEAR } from '../../../content/gamedata'
import { sample, shuffle } from '../../../lib/random'
import type { Level } from './rounds'

/** Pictures on the table: 3 (two alike + one), then 4 (three alike + one), then 4 with closer categories. */
export const ODD_COUNT: Record<Level, number> = { 1: 3, 2: 4, 3: 4 }

export interface OddItem {
  /** Category of the pictures that belong together, and the category of the odd one. */
  group: string
  oddGroup: string
  odd: string
  options: string[]
}

/** Category members that exist as words, with no two sharing a picture. */
export function members(cat: string, symbolOf: (wordId: string) => string | undefined): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of ODD_CATEGORIES[cat] ?? []) {
    const s = symbolOf(id)
    if (!s || seen.has(s)) continue
    seen.add(s)
    out.push(id)
  }
  return out
}

export function makeOddRound(level: Level, symbolOf: (wordId: string) => string | undefined, rand: () => number = Math.random, size = 5): OddItem[] {
  const same = ODD_COUNT[level] - 1
  const pairs: Array<[string, string]> = []
  if (level === 3) {
    for (const [a, b] of ODD_NEAR) pairs.push([a, b], [b, a])
  } else {
    for (const a of ODD_FAR) for (const b of ODD_FAR) if (a !== b) pairs.push([a, b])
  }
  const usable = shuffle(
    pairs.filter(([a, b]) => members(a, symbolOf).length >= same && members(b, symbolOf).length >= 1),
    rand,
  )
  const build = ([group, oddGroup]: [string, string]): OddItem => {
    const majority = sample(members(group, symbolOf), same, rand)
    const odd = sample(members(oddGroup, symbolOf), 1, rand)[0]
    return { group, oddGroup, odd, options: shuffle([...majority, odd], rand) }
  }
  const items: OddItem[] = []
  const usedGroups = new Set<string>()
  // A different majority category for every item first, then fill up.
  for (const p of usable) {
    if (items.length >= size) break
    if (usedGroups.has(p[0])) continue
    usedGroups.add(p[0])
    items.push(build(p))
  }
  for (let i = 0; items.length < size && usable.length; i++) items.push(build(usable[i % usable.length]))
  return items
}

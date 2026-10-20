import type { GItem } from '../../../../content/adultgamedata'
import { normalizeUz, uzCyrlToLatn } from '../../../../i18n/orthography'
import { sample, shuffle } from '../../../../lib/random'

/** Items in one round of the adult training games (8–10 is the clinical norm; 8 keeps a round short). */
export const ADULT_ROUND = 8

export type Lang = 'uz' | 'ru'
export type Rand = () => number

/** Text of an item in a speech language (data form, not for display). */
export const textOf = (item: Pick<GItem, 'uz' | 'ru'>, lang: Lang): string => (lang === 'ru' ? item.ru : item.uz)

/** Lower case, no apostrophe-like marks, no spaces, ё = е, Uzbek Cyrillic folded to Latin: for comparing typed answers. */
export function foldText(s: string): string {
  const latin = /[ўқғҳ]/i.test(s) ? uzCyrlToLatn(s) : s
  return normalizeUz(latin)
    .toLowerCase()
    .replace(/[ʻʼ‘’'`´ ]/g, '')
    .replace(/ё/g, 'е')
    .replace(/[^a-zЀ-ӿ0-9]/g, '')
}

/** Two items may share a screen only when picture and name both differ. */
export function clashes(a: Pick<GItem, 'symbol' | 'uz' | 'ru'>, b: Pick<GItem, 'symbol' | 'uz' | 'ru'>): boolean {
  return a.symbol === b.symbol || foldText(a.uz) === foldText(b.uz) || foldText(a.ru) === foldText(b.ru)
}

/**
 * Picks up to `n` items from `candidates` (in the preferred order) that do not clash with `avoid` or with each other.
 */
export function pickDistinct(candidates: readonly GItem[], n: number, avoid: readonly GItem[]): GItem[] {
  const out: GItem[] = []
  for (const c of candidates) {
    if (out.length >= n) break
    if (avoid.some((a) => clashes(a, c)) || out.some((o) => clashes(o, c))) continue
    out.push(c)
  }
  return out
}

/** Shuffled sample that keeps only distinct items. */
export function sampleDistinct(pool: readonly GItem[], n: number, avoid: readonly GItem[], rand: Rand): GItem[] {
  return pickDistinct(shuffle(pool, rand), n, avoid)
}

/** Number of characters two strings share at the start. */
export function commonPrefix(a: string, b: string): number {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return i
}

export function commonSuffix(a: string, b: string): number {
  let i = 0
  while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i++
  return i
}

/**
 * How alike two items look and sound when read: shared beginning and ending, similar length, same category.
 * Used for the hardest distractors.
 */
export function similarity(a: GItem, b: GItem, lang: Lang): number {
  const x = foldText(textOf(a, lang))
  const y = foldText(textOf(b, lang))
  const sameCat = a.cats.some((c) => b.cats.includes(c)) ? 2 : 0
  return commonPrefix(x, y) * 2 + commonSuffix(x, y) * 1.5 + sameCat - Math.abs(x.length - y.length) * 0.4
}

export { sample, shuffle }

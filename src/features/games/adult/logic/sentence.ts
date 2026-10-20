import { SENTENCES, sentenceKey } from '../../../../content/adultgamedata'
import { PHRASES } from '../../../../content/phrases'
import type { Level } from '../../logic/rounds'
import { ADULT_ROUND, shuffle, type Lang, type Rand } from './common'

/** Chunks per level: 3, 4 or 5 word cards. */
export const CHUNKS: Record<Level, number> = { 1: 3, 2: 4, 3: 5 }

export interface SentenceItem {
  id: string
  /** Audio key of the whole sentence. */
  key: string
  uz: string[]
  ru: string[]
}

/** Splits words into `n` groups of nearly equal size (earlier groups take the extra word). Null when there are too few words. */
export function chunkWords(text: string, n: number): string[] | null {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length < n) return null
  const out: string[] = []
  let at = 0
  for (let i = 0; i < n; i++) {
    const size = Math.floor(words.length / n) + (i < words.length % n ? 1 : 0)
    out.push(words.slice(at, at + size).join(' '))
    at += size
  }
  return out
}

/** Phrases that read well as a sentence puzzle: no numbers, slashes or quotes, a few words long. */
function phraseItems(n: number): SentenceItem[] {
  const out: SentenceItem[] = []
  for (const p of PHRASES) {
    if (p.audience === 'kid') continue
    if (/[0-9/«»]/.test(p.uz + p.ru)) continue
    const uzWords = p.uz.trim().split(/\s+/).length
    const ruWords = p.ru.trim().split(/\s+/).length
    if (uzWords < n || ruWords < n || uzWords > n + 2 || ruWords > n + 2) continue
    const uz = chunkWords(p.uz, n)
    const ru = chunkWords(p.ru, n)
    if (uz && ru) out.push({ id: `p_${p.id}`, key: `p.${p.id}`, uz, ru })
  }
  return out
}

export function sentencePool(level: Level): SentenceItem[] {
  const n = CHUNKS[level]
  const own = SENTENCES.filter((s) => s.uz.length === n && s.ru.length === n).map((s) => ({
    id: s.id,
    key: sentenceKey(s.id),
    uz: s.uz,
    ru: s.ru.map((c) => c.replace(/\+/g, '')),
  }))
  return [...own, ...phraseItems(n)]
}

export function sentenceRound(level: Level, rand: Rand = Math.random, size = ADULT_ROUND): SentenceItem[] {
  return shuffle(sentencePool(level), rand).slice(0, size)
}

/** The sentence text in a speech language. */
export const sentenceText = (s: SentenceItem, lang: Lang): string => (lang === 'ru' ? s.ru : s.uz).join(' ')

/** A shuffled order of the chunk indexes that is never already the right order. */
export function scramble(n: number, rand: Rand = Math.random): number[] {
  const ident = Array.from({ length: n }, (_, i) => i)
  if (n < 2) return ident
  for (let tries = 0; tries < 30; tries++) {
    const order = shuffle(ident, rand)
    if (order.some((v, i) => v !== i)) return order
  }
  return ident.slice().reverse()
}

/** Is the placed order (chunk indexes) the original one? Equal chunks (same text) are interchangeable. */
export function isRightOrder(placed: readonly number[], chunks: readonly string[]): boolean {
  return placed.length === chunks.length && placed.every((p, i) => chunks[p] === chunks[i])
}

/** The chunk (among the ones still in the pool) that should go next, given what is placed so far. */
export function hintIndex(placed: readonly number[], chunks: readonly string[], pool: readonly number[]): number | null {
  const want = chunks[placed.length]
  if (want === undefined) return null
  return pool.find((i) => chunks[i] === want) ?? null
}

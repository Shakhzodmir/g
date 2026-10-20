import type { TopicId, Word } from '../../../content/types'

/** Topics offered in "Topchi!" — concrete, picturable nouns only. */
export const FIND_TOPICS: TopicId[] = ['food', 'animals', 'toys', 'clothes', 'body', 'people', 'drinks', 'school']

/** Picturable words of a topic (things and people; no feelings, actions or descriptions). */
export function pictureWords(words: readonly Word[], topic: TopicId): Word[] {
  return words.filter((w) => w.topic === topic && (w.fitz === 'thing' || w.fitz === 'people'))
}

/** Memory cards use clear, distinct pictures from a few familiar topics. */
export const MEMORY_TOPICS: TopicId[] = ['food', 'animals', 'toys']

export function memoryWords(words: readonly Word[]): Word[] {
  return MEMORY_TOPICS.flatMap((t) => pictureWords(words, t))
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Kind-aware pools: children keep the topics above; adults draw from the adult word pool and the adult item catalog. */

import { adultItems, adultWordPool, CAT_BY_ID, itemById, type CatId } from '../../../content/adultgamedata'
import { wordById, wordsForKind } from '../../../content/vocab'
import { pickDistinct } from '../adult/logic/common'

/** Word pool of a profile kind (the audience filter of the vocabulary; adults also lose the child register). */
export function poolWordsFor(kind: 'child' | 'adult'): Word[] {
  return kind === 'adult' ? adultWordPool() : wordsForKind('child')
}

/** Categories whose pictures make good memory pairs for adults (clear, distinct, everyday). */
const ADULT_MEMORY_CATS: CatId[] = ['food', 'fruit', 'veg', 'drinks', 'clothes', 'body', 'transport', 'home', 'kitchen', 'health', 'tools', 'tech']

/** Adult memory pool: distinct pictures with distinct names. */
export function adultMemoryItems() {
  const wanted = new Set(ADULT_MEMORY_CATS)
  const items = adultItems().filter((i) => i.cats.some((c) => wanted.has(c)))
  return pickDistinct(items, items.length, [])
}

/** What a memory card shows, by pair id: a vocabulary word id (children) or an adult item id (`w.…` / `g.ad.i.…`). */
export function pairInfo(id: string): { key: string; uz: string; ru: string; symbol: string } | undefined {
  const w = wordById(id)
  if (w) return { key: `w.${w.id}`, uz: w.uz, ru: w.ru, symbol: w.symbol }
  const it = itemById(id)
  return it ? { key: it.key, uz: it.uz, ru: it.ru, symbol: it.symbol } : undefined
}

export { CAT_BY_ID }

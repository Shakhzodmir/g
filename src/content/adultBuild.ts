import { word } from './build'
import type { Fitz, Phrase, TopicId, Word } from './types'

/** An adult-only vocabulary word (see build.ts `word`). Uzbek is what an adult would actually say; Russian is plain and gender-neutral. */
export function a(topic: TopicId, fitz: Fitz, id: string, uz: string, ru: string, ruTts: string, symbol: string): Word {
  return word(topic, fitz, id, uz, ru, ruTts, symbol, undefined, 'adult')
}

/** An adult phrase. `group` names the phrase category (used to sort the phrases tab). */
export function ap(group: string, id: string, uz: string, ru: string, ruTts: string, symbol: string, uzTts?: string): Phrase {
  const phrase: Phrase = { id, uz, ru, ruTts, symbol, audience: 'adult', group }
  if (uzTts) phrase.uzTts = uzTts
  return phrase
}

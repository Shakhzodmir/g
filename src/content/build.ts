import type { Audience, Fitz, TopicId, Word } from './types'

/** `[uz, ru]` syllable split with "-", e.g. ['ol-ma', 'яб-ло-ко']. */
export type Syl = [uz: string, ru: string]

/**
 * Builds a vocabulary word. uz is canonical Uzbek Latin (U+02BB in oʻ/gʻ, U+02BC tutuq); ruTts has "+" before the
 * stressed vowel of every word with 2+ syllables. `audience` defaults to both.
 */
export function word(
  topic: TopicId,
  fitz: Fitz,
  id: string,
  uz: string,
  ru: string,
  ruTts: string,
  symbol: string,
  syl?: Syl,
  audience?: Audience,
): Word {
  const w: Word = { id, uz, ru, ruTts, fitz, symbol, topic }
  if (syl) w.syllables = { uz: syl[0], ru: syl[1] }
  if (audience) w.audience = audience
  return w
}

/** A core-grid word at a fixed 6×6 position (row, col 0-based) with the level that unlocks it. Core words never move. */
export function core(
  id: string,
  uz: string,
  ru: string,
  ruTts: string,
  fitz: Fitz,
  symbol: string,
  row: number,
  col: number,
  level: 1 | 2 | 3,
): Word {
  return { id, uz, ru, ruTts, fitz, symbol, topic: 'core', core: { row, col, level } }
}

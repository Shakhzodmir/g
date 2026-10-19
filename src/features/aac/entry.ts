import type { Fitz, Phrase, Word } from '../../content/types'
import type { Bi } from '../../i18n/types'
import type { CustomCard } from '../../store/db'

/** Anything that can be tapped on the communicator and spoken / put into the message bar. */
export interface Entry {
  /** Audio key: w.<id>, p.<id> or c.<id>. */
  key: string
  /** Reference written to the usage log (word id, phrase id or c.<cardId>). */
  ref: string
  kind: 'word' | 'phrase' | 'card'
  text: Bi
  symbol: string
  fitz: Fitz
  src?: string
}

export type OnTap = (e: Entry) => void

export function wordEntry(w: Word): Entry {
  return { key: `w.${w.id}`, ref: w.id, kind: 'word', text: { uz: w.uz, ru: w.ru }, symbol: w.symbol, fitz: w.fitz }
}

export function phraseEntry(p: Phrase): Entry {
  return { key: `p.${p.id}`, ref: p.id, kind: 'phrase', text: { uz: p.uz, ru: p.ru }, symbol: p.symbol, fitz: 'social' }
}

export function cardEntry(c: CustomCard, src?: string): Entry {
  return {
    key: `c.${c.id}`,
    ref: `c.${c.id}`,
    kind: 'card',
    // A card written in one language only still has a label, an accessible name and a voice in the other.
    text: { uz: c.uz || c.ru, ru: c.ru || c.uz },
    symbol: c.symbol ?? 'framed_picture',
    fitz: c.fitz,
    src,
  }
}

import { ARTICULATION } from '../../content/exercises'
import { FEELINGS, HELPERS } from '../../content/feelings'
import { PHRASES } from '../../content/phrases'
import { STICKERS } from '../../content/stickers'
import { wordById } from '../../content/vocab'
import type { Bi } from '../../i18n/types'
import type { CustomCard } from '../../store/db'

/*
 * Progress shows what a person chose. The event log stores internal refs of several families; each one is
 * mapped here to a bilingual, human title. A ref that cannot be resolved (a deleted custom card, an id from a
 * newer version) resolves to null and is hidden — never shown as a raw id.
 */

export interface RefInfo {
  label: Bi
  symbol: string
  image?: Blob | null
}

export type RefHint = 'game' | 'exercise' | 'feeling'

export const GAME_TITLES: Record<string, Bi> = {
  animals: { uz: 'Kim nima deydi?', ru: 'Кто как говорит?' },
  find: { uz: 'Topchi!', ru: 'Найди!' },
  memory: { uz: 'Juftini top', ru: 'Найди пару' },
  syllables: { uz: 'Chapak-chapak', ru: 'Хлоп-хлоп' },
}

export const GAME_SYMBOLS: Record<string, string> = { animals: 'cow', find: 'magnifying_glass_tilted_left', memory: 'puzzle_piece', syllables: 'drum' }

export const EXERCISE_TITLES: Record<string, Bi> = {
  blow: { uz: 'Puflash', ru: 'Подуй' },
  voice: { uz: 'Ovoz chiqarish', ru: 'Голос' },
  mirror: { uz: 'Koʻzgu', ru: 'Зеркальце' },
}

const EXERCISE_SYMBOLS: Record<string, string> = { blow: 'wind_face', voice: 'speaking_head', mirror: 'lips' }

const PREFIX = /^(w|p|f|c|st|exercise|game|helper|feeling|sticker)[.:](.+)$/

const hasText = (b: Bi) => !!(b.uz || b.ru)

function custom(id: string, cards: CustomCard[]): RefInfo | null {
  const c = cards.find((x) => x.id === id)
  if (!c || !(c.uz || c.ru)) return null
  return { label: { uz: c.uz || c.ru, ru: c.ru || c.uz }, symbol: c.symbol ?? 'framed_picture', image: c.image }
}

function word(id: string): RefInfo | null {
  const w = wordById(id)
  return w ? { label: { uz: w.uz, ru: w.ru }, symbol: w.symbol } : null
}

function phrase(id: string): RefInfo | null {
  const p = PHRASES.find((x) => x.id === id)
  return p ? { label: { uz: p.uz, ru: p.ru }, symbol: p.symbol } : null
}

function feeling(id: string): RefInfo | null {
  const f = FEELINGS.find((x) => x.id === id)
  return f ? { label: { uz: f.uz, ru: f.ru }, symbol: f.symbol } : null
}

function helper(id: string): RefInfo | null {
  const h = HELPERS.find((x) => x.id === id)
  return h ? { label: { uz: h.uz, ru: h.ru }, symbol: h.symbol } : null
}

function game(id: string): RefInfo | null {
  const g = GAME_TITLES[id]
  return g ? { label: g, symbol: GAME_SYMBOLS[id] ?? 'puzzle' } : null
}

function exercise(id: string): RefInfo | null {
  const known = EXERCISE_TITLES[id]
  if (known) return { label: known, symbol: EXERCISE_SYMBOLS[id] ?? 'lips' }
  const a = ARTICULATION.find((x) => x.id === id)
  return a ? { label: a.title, symbol: 'lips' } : null
}

function sticker(id: string): RefInfo | null {
  const s = STICKERS.find((x) => x.id === id)
  return s ? { label: { uz: s.uz, ru: s.ru }, symbol: s.symbol } : null
}

/** Resolves an event ref of any family to something displayable, or null when it cannot be named. */
export function resolveRef(ref: string, cards: CustomCard[] = [], hint?: RefHint): RefInfo | null {
  let r: RefInfo | null = null
  const m = PREFIX.exec(ref)
  if (m) {
    const [, family, id] = m
    switch (family) {
      case 'c':
        r = custom(id, cards)
        break
      case 'w':
        r = word(id)
        break
      case 'p':
        r = phrase(id)
        break
      case 'f':
      case 'feeling':
        r = feeling(id)
        break
      case 'helper':
        r = helper(id)
        break
      case 'game':
        r = game(id)
        break
      case 'exercise':
        r = exercise(id)
        break
      case 'st':
      case 'sticker':
        r = sticker(id)
        break
    }
  } else if (hint === 'game') r = game(ref)
  else if (hint === 'exercise') r = exercise(ref)
  else if (hint === 'feeling') r = feeling(ref) ?? helper(ref)
  else r = word(ref) ?? phrase(ref) ?? feeling(ref) ?? helper(ref) ?? sticker(ref)
  return r && hasText(r.label) ? r : null
}

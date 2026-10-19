import { describe, expect, it } from 'vitest'
import { ARTICULATION } from '../../content/exercises'
import { FEELINGS, HELPERS } from '../../content/feelings'
import { PHRASES } from '../../content/phrases'
import { STICKERS } from '../../content/stickers'
import { WORDS } from '../../content/vocab'
import type { CustomCard } from '../../store/db'
import { GAME_TITLES, resolveRef } from './refs'

const card = (id: string, uz = 'Olma', ru = 'Яблоко'): CustomCard => ({ id, profileId: 'p', topic: 'food', fitz: 'thing', uz, ru, image: null, createdAt: 1 })
const names = (r: ReturnType<typeof resolveRef>) => (r ? [r.label.uz, r.label.ru] : null)

describe('progress refs (P8): every family gets a human, bilingual title', () => {
  it('games, with and without the hint', () => {
    for (const id of ['find', 'animals', 'memory', 'syllables']) {
      expect(resolveRef(id, [], 'game')?.label).toEqual(GAME_TITLES[id])
      expect(resolveRef(`game:${id}`)?.label).toEqual(GAME_TITLES[id])
    }
    expect(names(resolveRef('find', [], 'game'))).toEqual(['Topchi!', 'Найди!'])
    // never the raw id
    expect(resolveRef('find', [], 'game')?.label.uz).not.toBe('Find')
  })

  it('exercises: blow / voice / mirror, with or without prefix, and articulation ids', () => {
    expect(resolveRef('blow', [], 'exercise')?.label.ru).toBe('Подуй')
    expect(resolveRef('voice', [], 'exercise')?.label.uz).toBe('Ovoz chiqarish')
    expect(resolveRef('exercise:voice')?.label.ru).toBe('Голос')
    expect(resolveRef('exercise:blow')?.label.uz).toBe('Puflash')
    expect(resolveRef(ARTICULATION[0].id, [], 'exercise')?.label).toEqual(ARTICULATION[0].title)
  })

  it('helpers (calm and feelings) and feelings', () => {
    for (const h of HELPERS) expect(resolveRef(`helper:${h.id}`)?.label).toEqual({ uz: h.uz, ru: h.ru })
    for (const f of FEELINGS) {
      expect(resolveRef(`feeling:${f.id}`)?.label.uz).toBe(f.uz)
      expect(resolveRef(f.id, [], 'feeling')?.label.uz).toBe(f.uz)
      expect(resolveRef(`f.${f.id}`)?.label.ru).toBe(f.ru)
    }
  })

  it('words, phrases, schedule activities and stickers', () => {
    expect(names(resolveRef(WORDS[0].id))).toEqual([WORDS[0].uz, WORDS[0].ru])
    expect(resolveRef('wake_up')?.label.ru).toBeTruthy() // a schedule activity is a word
    expect(resolveRef(PHRASES[0].id)?.label.uz).toBe(PHRASES[0].uz)
    expect(resolveRef(`st.${STICKERS[0].id}`)?.label.uz).toBe(STICKERS[0].uz)
  })

  it('custom cards resolve while they exist and are hidden once deleted', () => {
    expect(names(resolveRef('c.abc', [card('abc')]))).toEqual(['Olma', 'Яблоко'])
    expect(resolveRef('c.3f2a9c1e-7b1d-4a55-9d63-0c5f1d2a8b77', [card('abc')])).toBeNull()
    expect(resolveRef('c.abc', [card('abc', '', '')])).toBeNull()
  })

  it('unresolvable refs are hidden, not shown as capitalised ids', () => {
    for (const ref of ['kb', 'bar', 'helper:nope', 'exercise:unknown', 'feeling:zzz', 'st.nope', 'totally_unknown', 'c.deadbeef', '']) {
      expect(resolveRef(ref, [])).toBeNull()
    }
  })
})

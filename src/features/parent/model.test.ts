import { describe, expect, it } from 'vitest'
import { finalLabels } from './CardEditor'
import { asciiSlug, cleanName, cleanText, isSafeId, storageProblem } from './model'
import { validName } from './profileEdit'

describe('names (P7 / P21)', () => {
  it('rejects names that are empty after removing zero-width characters', () => {
    expect(validName('')).toBeNull()
    expect(validName('   ')).toBeNull()
    expect(validName('​​')).toBeNull()
    expect(validName('​ ­﻿ ⁠')).toBeNull()
    expect(validName('​Aziz​')).toBe('Aziz')
  })

  it('limits names to 30 characters and collapses whitespace', () => {
    expect(Array.from(cleanName('A'.repeat(100))).length).toBe(30)
    expect(cleanName('  Aziz   Karimov ')).toBe('Aziz Karimov')
    expect(cleanName('Aziz\u0000\u0007x')).toBe('Aziz x')
    expect(cleanText(12, 5)).toBe('')
  })
})

describe('ids', () => {
  it('accepts normal ids and refuses prototype names and odd characters', () => {
    for (const ok of ['p-123e4567-e89b', 'default', 'card1', 'c.abc', 'p-1:uz:w.water']) expect(isSafeId(ok, 100)).toBe(true)
    for (const bad of ['__proto__', 'constructor', 'prototype', 'a.constructor', '', ' x', 'x y', '../x', 'a'.repeat(101), 5, null]) expect(isSafeId(bad as unknown)).toBe(false)
  })
})

describe('storage problems', () => {
  it('tells "no IndexedDB" from "disk full"', () => {
    expect(storageProblem(new Error('x'), false)).toBe('unavailable')
    expect(storageProblem(Object.assign(new Error('x'), { name: 'QuotaExceededError' }), true)).toBe('quota')
    expect(storageProblem({ inner: { name: 'QuotaExceededError' } }, true)).toBe('quota')
    expect(storageProblem(new Error('boom'), true)).toBe('other')
  })
})

describe('file names', () => {
  it('transliterates Cyrillic', () => {
    expect(asciiSlug('Азиз Каримов')).toBe('aziz-karimov')
    expect(asciiSlug('Ўктам Ғуломов')).toBe('oktam-gulomov')
    expect(asciiSlug('😀')).toBe('profil')
  })
})

describe('custom card labels (L-03)', () => {
  it('needs at least one label', () => {
    expect(finalLabels('', '')).toBeNull()
    expect(finalLabels('​', '  ')).toBeNull()
  })

  it('fills the empty language with the same text, so the card is never blank', () => {
    expect(finalLabels('Olma', '')).toEqual({ uz: 'Olma', ru: 'Olma' })
    expect(finalLabels('', 'Яблоко')).toEqual({ uz: 'Яблоко', ru: 'Яблоко' })
    expect(finalLabels('Olma', 'Яблоко')).toEqual({ uz: 'Olma', ru: 'Яблоко' })
  })

  it('converts Cyrillic Uzbek in the uz field to canonical Latin', () => {
    expect(finalLabels('Салом', '')).toEqual({ uz: 'Salom', ru: 'Salom' })
    expect(finalLabels('Ўйин', 'Игра')).toEqual({ uz: 'Oʻyin', ru: 'Игра' })
    expect(finalLabels("Go'zal", '')?.uz).toBe('Goʻzal')
  })
})

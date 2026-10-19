import { describe, expect, it } from 'vitest'
import { formatNumber, formatQuantity, formatVars, keepLatin, renderBi, renderWithVars, subtitle, unit, type Dict } from './index'

// Every strings module in the app (common + one per feature) must be complete and well-formed.
const modules = import.meta.glob<Record<string, unknown>>(['./common.ts', '../**/strings.ts'], { eager: true })

function dicts(): Array<[string, Dict<string>]> {
  const out: Array<[string, Dict<string>]> = []
  for (const [path, mod] of Object.entries(modules)) {
    for (const [name, value] of Object.entries(mod)) {
      const v = value as Partial<Dict<string>>
      if (v && typeof v === 'object' && v.uz && v.ru) out.push([`${path}#${name}`, v as Dict<string>])
    }
  }
  return out
}

describe('UI strings', () => {
  it('finds at least the common dictionary', () => {
    expect(dicts().length).toBeGreaterThan(0)
  })

  it.each(dicts())('%s has matching, non-empty uz/ru keys and clean Uzbek apostrophes', (_name, dict) => {
    expect(Object.keys(dict.ru).sort()).toEqual(Object.keys(dict.uz).sort())
    for (const [key, uz] of Object.entries(dict.uz)) {
      expect(uz.trim(), key).not.toBe('')
      expect(dict.ru[key].trim(), key).not.toBe('')
      expect(uz, `${key} must use ʻ/ʼ, not ASCII or curly apostrophes`).not.toMatch(/['‘’`]/)
    }
  })
})

describe('renderBi', () => {
  it('renders by UI language and script', () => {
    const bi = { uz: 'Oʻyinlar', ru: 'Игры' }
    expect(renderBi(bi, 'uz', 'latn')).toBe('O‘yinlar')
    expect(renderBi(bi, 'uzc', 'cyrl')).toBe('Ўйинлар')
    expect(renderBi(bi, 'ru', 'latn')).toBe('Игры')
    expect(renderBi(bi, 'uz', 'latn2026')).toBe('Öyinlar')
  })

  it('formats variables', () => {
    expect(formatVars('Salom, {name}!', { name: 'Aziz' })).toBe('Salom, Aziz!')
    expect(formatVars('{n} ta', { n: 3 })).toBe('3 ta')
  })

  it('keeps placeholders intact in Cyrillic and converts the surrounding text', () => {
    const bi = { uz: 'Yana {n} ta yulduzcha', ru: 'Ещё {n}' }
    expect(renderWithVars(bi, 'uzc', 'cyrl', { n: 3 })).toBe('Яна 3 та юлдузча')
    expect(renderWithVars(bi, 'uz', 'latn', { n: 3 })).toBe('Yana 3 ta yulduzcha')
    expect(renderWithVars(bi, 'ru', 'latn', { n: 3 })).toBe('Ещё 3')
    expect(renderWithVars({ uz: 'Salom, {name}!', ru: 'Привет, {name}!' }, 'uzc', 'cyrl', { name: 'Aziz' })).toBe('Салом, Aziz!')
  })
})

describe('L-13: one on-screen rule for Uzbek Latin', () => {
  it('every Latin script uses ‘ ’ glyphs, data keeps ʻ ʼ', () => {
    const bi = { uz: 'Maʼlumotlar va Oʻzbekcha', ru: 'Данные' }
    expect(renderBi(bi, 'uz', 'latn')).toBe('Ma’lumotlar va O‘zbekcha')
    expect(renderBi(bi, 'uz', 'latn2026')).toBe('Ma’lumotlar va Özbekça')
    expect(bi.uz).toContain('ʼ')
  })

  it('variables (names) are inserted as typed, with the tighter glyphs only', () => {
    const bi = { uz: 'Salom, {name}!', ru: 'Привет, {name}!' }
    expect(renderWithVars(bi, 'uz', 'latn', { name: 'Oʻtkir' })).toBe('Salom, O‘tkir!')
    expect(renderWithVars(bi, 'uzc', 'cyrl', { name: 'Oʻtkir' })).toBe('Салом, O‘tkir!')
    expect(renderWithVars(bi, 'ru', 'latn', { name: 'Aziz' })).toBe('Привет, Aziz!')
  })

  it('keepLatin() inside a string keeps the name in Cyrillic', () => {
    expect(renderBi({ uz: `Salom, ${keepLatin('Aziz')}!`, ru: '' }, 'uzc', 'cyrl')).toBe('Салом, Aziz!')
    expect(renderBi({ uz: `Salom, ${keepLatin('Aziz')}!`, ru: '' }, 'uz', 'latn')).toBe('Salom, Aziz!')
  })
})

describe('L-14: localised numbers and units', () => {
  it('uses a decimal comma and the unit of the UI language', () => {
    expect(formatNumber(1.5, 'ru')).toBe('1,5')
    expect(formatNumber(2, 'ru')).toBe('2')
    expect(formatNumber(1.25, 'uz')).toBe('1,25')
    expect(unit('ru', 'cm')).toBe('см')
    expect(unit('uzc', 'cm')).toBe('см')
    expect(unit('uz', 'cm')).toBe('sm')
    expect(unit('ru', 'min')).toBe('мин')
    expect(unit('uzc', 's')).toBe('с')
    expect(formatQuantity(80, 'cm', 'ru')).toBe('80 см')
    expect(formatQuantity(1.5, 'x', 'ru')).toBe('×1,5')
    expect(formatQuantity(1.5, 's', 'uz')).toBe('1,5 s')
  })
})

describe('L-16: subtitle', () => {
  const bi = { uz: 'suv', ru: 'вода' }
  it('shows the UI-language text when it differs from the spoken one', () => {
    expect(subtitle(bi, 'ru', 'uz', 'latn')).toBe('вода')
    expect(subtitle(bi, 'uz', 'ru', 'latn')).toBe('suv')
    expect(subtitle(bi, 'uzc', 'ru', 'cyrl')).toBe('сув')
  })
  it('is null when UI and speech language agree', () => {
    expect(subtitle(bi, 'ru', 'ru', 'latn')).toBeNull()
    expect(subtitle(bi, 'uz', 'uz', 'latn')).toBeNull()
  })
})

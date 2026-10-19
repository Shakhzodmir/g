import { describe, expect, it } from 'vitest'
import { formatVars, renderBi, type Dict } from './index'

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
})

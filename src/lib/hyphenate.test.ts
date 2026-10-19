import { describe, expect, it } from 'vitest'
import { shy, syllablesOf } from './hyphenate'

const SHY = '­'

describe('syllablesOf (uz)', () => {
  const cases: Array<[string, string]> = [
    ['xohlayman', 'xoh-lay-man'],
    ['ona', 'ona'], // a one-letter first syllable is glued to the next one
    ['olma', 'ol-ma'],
    ['mashina', 'ma-shi-na'],
    ['quyon', 'qu-yon'],
    ['sartaroshxonada', 'sar-ta-rosh-xo-na-da'],
    ['oʻyinchoq', 'oʻyin-choq'],
    ['bogʻcha', 'bogʻ-cha'],
    ['shifokorga', 'shi-fo-kor-ga'],
    ['yulduzchalar', 'yul-duz-cha-lar'],
    ['hojatxona', 'ho-jat-xo-na'],
  ]
  it.each(cases)('%s → %s', (word, expected) => {
    expect(syllablesOf(word, 'uz').join('-')).toBe(expected)
  })
})

describe('syllablesOf (ru)', () => {
  const cases: Array<[string, string]> = [
    ['упражнения', 'уп-раж-не-ния'],
    ['пожалуйста', 'по-жа-луй-ста'],
    ['помоги', 'по-мо-ги'],
    ['мама', 'ма-ма'],
    ['хочу', 'хо-чу'],
  ]
  it.each(cases)('%s → %s', (word, expected) => {
    expect(syllablesOf(word, 'ru').join('-')).toBe(expected)
  })
})

describe('shy', () => {
  it('inserts soft hyphens only into long words and keeps the text identical otherwise', () => {
    const out = shy('Men xohlayman suv', 'uz')
    expect(out.replaceAll(SHY, '')).toBe('Men xohlayman suv')
    expect(out).toContain(`xoh${SHY}lay${SHY}man`)
    expect(out.startsWith('Men suv')).toBe(false)
    expect(shy('suv', 'uz')).toBe('suv')
  })

  it('never leaves a single letter alone and ignores non-letters', () => {
    const out = shy('Sartaroshxonada!', 'uz')
    expect(out.replaceAll(SHY, '')).toBe('Sartaroshxonada!')
    for (const part of out.split(SHY)) expect(part.replace(/[^\p{L}ʻʼ]/gu, '').length).toBeGreaterThanOrEqual(2)
  })

  it('honours a custom minimum word length', () => {
    expect(shy('xohlayman', 'uz', 10)).toBe('xohlayman')
    expect(shy('xohlayman', 'uz', 9)).toContain(SHY)
  })

  it('works for Cyrillic Uzbek and Russian', () => {
    expect(shy('хоҳлайман', 'uz').replaceAll(SHY, '')).toBe('хоҳлайман')
    expect(shy('Упражнения', 'ru')).toContain(SHY)
  })
})

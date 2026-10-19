import { describe, expect, it } from 'vitest'
import { WORDS } from '../../../content/vocab'
import { LEVELS } from './rounds'
import { splitSyllables, SYLLABLE_RANGE, syllablesOf, syllableWords } from './syllables'

describe('syllablesOf', () => {
  it('uses the curated split of the speech language', () => {
    const apple = WORDS.find((w) => w.id === 'apple')!
    expect(syllablesOf(apple, 'uz')).toEqual(['ol', 'ma'])
    expect(syllablesOf(apple, 'ru')).toEqual(['я', 'бло', 'ко'])
  })

  it('falls back to the heuristic without a curated split', () => {
    expect(syllablesOf({ uz: 'ananas', ru: 'ананас' }, 'uz')).toEqual(['a', 'na', 'nas'])
    expect(syllablesOf({ uz: 'ananas', ru: 'ананас' }, 'ru')).toEqual(['а', 'на', 'нас'])
  })
})

describe('splitSyllables (heuristic)', () => {
  it('splits Uzbek with digraphs and closed syllables', () => {
    expect(splitSyllables('ona', 'uz')).toEqual(['o', 'na'])
    expect(splitSyllables('shaftoli', 'uz')).toEqual(['shaf', 'to', 'li'])
    expect(splitSyllables('qoʻgʻirchoq', 'uz')).toEqual(['qoʻ', 'gʻir', 'choq'])
    expect(splitSyllables('kakao', 'uz')).toEqual(['ka', 'ka', 'o'])
    expect(splitSyllables('multfilm', 'uz')).toEqual(['mult', 'film'])
    expect(splitSyllables('non', 'uz')).toEqual(['non'])
    expect(splitSyllables('tez yordam', 'uz')).toEqual(['tez', 'yor', 'dam'])
  })

  it('splits Russian into open syllables', () => {
    expect(splitSyllables('мама', 'ru')).toEqual(['ма', 'ма'])
    expect(splitSyllables('кошка', 'ru')).toEqual(['ко', 'шка'])
    expect(splitSyllables('чайник', 'ru')).toEqual(['чай', 'ник'])
    expect(splitSyllables('морковь', 'ru')).toEqual(['мор', 'ковь'])
    expect(splitSyllables('мороженое', 'ru')).toEqual(['мо', 'ро', 'же', 'но', 'е'])
  })

  // The curated data occasionally follows morphology instead of phonetics; those words are listed here.
  const EXCEPTIONS: Record<'uz' | 'ru', string[]> = { uz: ['glasses'], ru: ['bedroom', 'hospital', 'sun'] }

  it.each(['uz', 'ru'] as const)('agrees with the curated %s data for almost every word', (lang) => {
    const disagree = WORDS.filter((w) => w.syllables)
      .filter((w) => splitSyllables(lang === 'uz' ? w.uz : w.ru, lang).join('-') !== w.syllables![lang].toLowerCase())
      .map((w) => w.id)
    expect(disagree).toEqual(EXCEPTIONS[lang])
  })
})

describe('syllableWords', () => {
  it('filters by the syllable range of the level, in the speech language', () => {
    for (const lang of ['uz', 'ru'] as const) {
      for (const level of LEVELS) {
        const words = syllableWords(WORDS, level, lang)
        expect(words.length).toBeGreaterThanOrEqual(5)
        const [min, max] = SYLLABLE_RANGE[level]
        for (const w of words) {
          const n = syllablesOf(w, lang).length
          expect(n).toBeGreaterThanOrEqual(min)
          expect(n).toBeLessThanOrEqual(max)
        }
      }
    }
    // "olma" has two syllables in Uzbek but three in Russian ("я-бло-ко").
    expect(syllableWords(WORDS, 1, 'uz').some((w) => w.id === 'apple')).toBe(true)
    expect(syllableWords(WORDS, 1, 'ru').some((w) => w.id === 'apple')).toBe(false)
  })
})

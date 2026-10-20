import { describe, expect, it } from 'vitest'
import { MORE_PHRASES, MORE_TOPICS, MORE_WORDS } from './more'
import { PHRASES } from './phrases'
import { TOPICS } from './topics'
import { WORDS, wordById, wordsByTopic, wordsForKind } from './vocab'

/* Round 3: the children's vocabulary additions (src/content/more.ts, more/*.ts). */

const COLOR_IDS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'white', 'black', 'brown', 'gray', 'light_blue']
const NUMBER_UZ = ['bir', 'ikki', 'uch', 'toʻrt', 'besh', 'olti', 'yetti', 'sakkiz', 'toʻqqiz', 'oʻn', 'oʻn bir', 'oʻn ikki', 'oʻn uch', 'oʻn toʻrt', 'oʻn besh', 'oʻn olti', 'oʻn yetti', 'oʻn sakkiz', 'oʻn toʻqqiz', 'yigirma']
const NUMBER_RU = ['один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять', 'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать', 'двадцать']
const SHAPE_IDS = ['circle', 'square', 'triangle', 'rectangle', 'star', 'heart', 'oval', 'diamond']
const OPPOSITE_PAIRS: Array<[string, string]> = [
  ['big', 'small'],
  ['hot', 'cold'],
  ['fast', 'slow'],
  ['up', 'down'],
  ['open', 'closed'],
  ['full', 'empty'],
  ['clean', 'dirty'],
  ['light', 'heavy'],
  ['day', 'night'],
  ['happy', 'sad'],
]
/** Child-only topics: all their words must carry audience 'child' so adult profiles never meet them. */
const CHILD_TOPICS = MORE_TOPICS.filter((t) => t.audience === 'child').map((t) => t.id)

describe('children vocabulary (round 3): size', () => {
  it('grows the vocabulary to ≥ 700 words with ≥ 16 new topics and ≥ 100 child phrases', () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(700)
    expect(MORE_WORDS.length).toBeGreaterThanOrEqual(445)
    expect(MORE_TOPICS.length).toBeGreaterThanOrEqual(16)
    expect(MORE_PHRASES.filter((p) => p.audience !== 'adult').length).toBeGreaterThanOrEqual(100)
    expect(MORE_PHRASES.every((p) => p.audience === 'kid' || p.audience === 'both')).toBe(true)
  })

  it('every new topic is registered once, has 14–40 words, and its words keep the topic colour (fitz)', () => {
    const ids = MORE_TOPICS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const t of MORE_TOPICS) {
      expect(TOPICS.some((x) => x.id === t.id), t.id).toBe(true)
      const words = wordsByTopic(t.id)
      expect(words.length, t.id).toBeGreaterThanOrEqual(14)
      expect(words.length, t.id).toBeLessThanOrEqual(40)
      expect(t.uz.trim() && t.ru.trim(), t.id).toBeTruthy()
      for (const w of words) expect(w.fitz, `${t.id}/${w.id}`).toBe(t.fitz)
    }
  })

  it('words added to existing topics are inside the 14–40 range too', () => {
    for (const id of ['food', 'people', 'feelings', 'body', 'toys', 'clothes', 'animals', 'time']) {
      const n = wordsByTopic(id).length
      expect(n, id).toBeGreaterThanOrEqual(14)
      expect(n, id).toBeLessThanOrEqual(40)
    }
  })

  it('child-only topics only hold child words; adult profiles never get them', () => {
    expect(CHILD_TOPICS.length).toBeGreaterThanOrEqual(8)
    for (const id of CHILD_TOPICS) for (const w of wordsByTopic(id)) expect(w.audience, `${id}/${w.id}`).toBe('child')
    const adult = new Set(wordsForKind('adult').map((w) => w.id))
    for (const id of CHILD_TOPICS) for (const w of wordsByTopic(id)) expect(adult.has(w.id), w.id).toBe(false)
  })
})

describe('children vocabulary (round 3): fixed ids used by the games', () => {
  it('colours: 12 fixed ids with distinct pictures', () => {
    const words = COLOR_IDS.map((c) => wordById(`color_${c}`))
    for (const [i, w] of words.entries()) {
      expect(w, COLOR_IDS[i]).toBeDefined()
      expect(w!.topic).toBe('colors')
    }
    expect(new Set(words.map((w) => w!.symbol)).size).toBe(12)
    expect(wordById('color_light_blue')?.uz).toBe('havorang')
    expect(wordById('color_orange')?.ru).toBe('оранжевый')
  })

  it('numbers: number_1 … number_20 in order, Fluent keycaps up to 10 and custom tiles for 11–20', () => {
    const nums = wordsByTopic('numbers')
    expect(nums.map((w) => w.id).slice(0, 20)).toEqual(Array.from({ length: 20 }, (_, i) => `number_${i + 1}`))
    nums.forEach((w, i) => {
      expect(w.uz, w.id).toBe(NUMBER_UZ[i])
      expect(w.ru, w.id).toBe(NUMBER_RU[i])
      expect(w.symbol, w.id).toBe(i < 10 ? `keycap_${i + 1}` : `number_${i + 1}`)
    })
    expect(new Set(nums.map((w) => w.symbol)).size).toBe(20)
  })

  it('shapes: 8 fixed ids with distinct pictures', () => {
    const words = SHAPE_IDS.map((s) => wordById(`shape_${s}`))
    for (const [i, w] of words.entries()) {
      expect(w, SHAPE_IDS[i]).toBeDefined()
      expect(w!.topic).toBe('shapes')
    }
    expect(new Set(wordsByTopic('shapes').map((w) => w.symbol)).size).toBe(wordsByTopic('shapes').length)
  })

  it('opposites: 10 fixed pairs stay adjacent, are described words, and never share a picture', () => {
    const list = wordsByTopic('opposites')
    expect(list).toHaveLength(20)
    OPPOSITE_PAIRS.forEach(([a, b], i) => {
      expect(list[i * 2].id).toBe(`opp_${a}`)
      expect(list[i * 2 + 1].id).toBe(`opp_${b}`)
      expect(list[i * 2].symbol, `${a}/${b}`).not.toBe(list[i * 2 + 1].symbol)
      expect(list[i * 2].uz).not.toBe(list[i * 2 + 1].uz)
      expect(list[i * 2].fitz).toBe('describe')
    })
  })
})

describe('children vocabulary (round 3): quality', () => {
  /** Deliberate repeats: the games need these words as pairs / the same word in two senses. */
  const REPEATS = new Set(['katta', 'kichik', 'issiq', 'sovuq', 'xursand', 'xafa', 'doira', 'yurak', 'kuz', 'yoz'])

  it('no new word repeats the Uzbek text of another child-facing word (except the deliberate pairs)', () => {
    const seen = new Map<string, string>()
    const dup: string[] = []
    for (const w of WORDS) {
      if (w.audience === 'adult') continue
      const key = w.uz.trim().toLowerCase()
      const prev = seen.get(key)
      if (prev && !REPEATS.has(key)) dup.push(`${key}: ${prev} / ${w.id}`)
      else if (!prev) seen.set(key, w.id)
    }
    expect(dup).toEqual([])
  })

  it('phrase ids are unique and never reuse a base phrase id', () => {
    const ids = PHRASES.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every new word has a picture, an Uzbek text, a Russian text with stress marks and a part of speech', () => {
    for (const w of MORE_WORDS) {
      expect(w.symbol, w.id).toMatch(/^[a-z0-9_]+$/)
      expect(w.ruTts, w.id).toBeTruthy()
      expect(w.uz.length, w.id).toBeGreaterThan(0)
      expect(w.ru.length, w.id).toBeGreaterThan(0)
    }
  })

  it('concrete two-syllable-plus nouns carry syllables in both languages (≥ 60 % of the new nouns)', () => {
    const nouns = MORE_WORDS.filter((w) => w.fitz === 'thing' && !/\s/.test(w.uz) && !/\s|-/.test(w.ru))
    const withSyl = nouns.filter((w) => w.syllables)
    expect(withSyl.length / nouns.length).toBeGreaterThan(0.6)
    for (const w of withSyl) {
      expect(w.syllables!.uz.includes('-') || !/[aeiou].*[aeiou]/i.test(w.uz.replace(/oʻ/g, 'o')), w.id).toBe(true)
    }
  })

  it('child phrases cover requests, refusals, social routines, school, doctor, sensory needs, play, feelings and safety', () => {
    for (const prefix of ['req_', 'ref_', 'soc_', 'sch_', 'doc_', 'sen_', 'play_', 'feel_', 'safe_', 'home_'])
      expect(MORE_PHRASES.filter((p) => p.id.startsWith(prefix)).length, prefix).toBeGreaterThanOrEqual(10)
    expect(MORE_PHRASES.find((p) => p.id === 'sen_earmuffs')?.uz).toBe('Quloqchin kerak')
    expect(MORE_PHRASES.find((p) => p.id === 'sen_too_bright')?.uz).toBe('Juda yorugʻ')
    expect(MORE_PHRASES.find((p) => p.id === 'safe_help_now')?.uz).toBe('Yordam bering!')
    expect(MORE_PHRASES.find((p) => p.id === 'safe_lost')?.uz).toBe('Yoʻqolib qoldim')
  })

  it('the new family words are in the people topic', () => {
    for (const id of ['uncle_mother', 'uncle_father', 'aunt_mother', 'aunt_father', 'bride', 'groom']) expect(wordById(id)?.topic, id).toBe('people')
    expect(wordById('uncle_mother')?.uz).toBe('togʻa')
    expect(wordById('aunt_father')?.uz).toBe('amma')
    expect(wordById('bride')?.uz).toBe('kelin')
  })

  it('Uzbek realia are present: non-like foods and household items', () => {
    for (const id of ['tandir', 'cauldron', 'tablecloth', 'mattress', 'cradle', 'veranda', 'carpet', 'chapan', 'doira', 'dutor', 'navroz', 'cotton']) expect(wordById(id), id).toBeDefined()
  })

  it('nothing contains pork or alcohol words', () => {
    const bad = /choʻchqa|pig\b|свин|вино\b|пиво|водка|alkogol|spirt|vino\b|pivo\b/i
    for (const w of MORE_WORDS) expect(`${w.uz} ${w.ru}`, w.id).not.toMatch(bad)
    for (const p of MORE_PHRASES) expect(`${p.uz} ${p.ru}`, p.id).not.toMatch(bad)
  })
})

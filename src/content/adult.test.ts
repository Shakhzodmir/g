import { describe, expect, it } from 'vitest'
import { ADULT_QUICK_IDS } from './adultPhrases'
import { PHRASES } from './phrases'
import { TOPICS, topicsForKind } from './topics'
import { WORDS, wordsByTopic, wordsForKind } from './vocab'

/* The adult vocabulary and phrase bank (round 3, content-adult): shape, tone and coverage. */

const adultWords = WORDS.filter((w) => w.audience === 'adult')
const adultTopics = TOPICS.filter((t) => t.audience === 'adult')
const adultPhrases = PHRASES.filter((p) => p.audience === 'adult')

describe('adult vocabulary', () => {
  it('has at least 12 adult topics and 450 adult words', () => {
    expect(adultTopics.length).toBeGreaterThanOrEqual(12)
    expect(adultWords.length).toBeGreaterThanOrEqual(450)
  })

  it('every adult word belongs to an adult topic and every adult topic has 14–48 words', () => {
    const ids = new Set(adultTopics.map((t) => t.id))
    for (const w of adultWords) expect(ids.has(w.topic), `${w.id} -> ${w.topic}`).toBe(true)
    for (const t of adultTopics) {
      const n = wordsByTopic(t.id).length
      expect(n, t.id).toBeGreaterThanOrEqual(14)
      expect(n, t.id).toBeLessThanOrEqual(48)
    }
  })

  it('the required adult areas exist', () => {
    const ids = new Set(adultTopics.map((t) => t.id))
    for (const id of ['health', 'medicine', 'hospital', 'home', 'meals', 'shopping', 'transit', 'work', 'phone', 'relations', 'emotions', 'needs', 'polite', 'tradition', 'talk', 'bodyparts'])
      expect(ids.has(id), id).toBe(true)
  })

  it('topicsForKind puts the adult topics first and hides them from children', () => {
    const adult = topicsForKind('adult')
    expect(adult[0].id).toBe('core')
    expect(adult[1].audience).toBe('adult')
    expect(topicsForKind('child').some((t) => t.audience === 'adult')).toBe(false)
    expect(wordsForKind('child').some((w) => w.audience === 'adult')).toBe(false)
    expect(wordsForKind('adult').filter((w) => w.audience === 'adult')).toHaveLength(adultWords.length)
  })

  it('symptom and diet vocabulary named by the brief is present', () => {
    const uz = new Set(adultWords.map((w) => w.uz))
    for (const t of ['ogʻriq', 'bosh aylanishi', 'koʻngil aynishi', 'nafas qisilishi', 'qon bosimi', 'tabletka', 'ukol', 'tomchi', 'ovqatdan oldin', 'ovqatdan keyin', 'allergiya', 'retsept', 'rentgen', 'tuzsiz', 'shakarsiz', 'yumshoq ovqat', 'qaytim', 'chek', 'bekat', 'uy manzili', 'parol', 'zaryad', 'qaynona', 'nevara', 'mahalla', 'mehmon', 'sabr', 'xavotir', 'umidsizlik', 'ishonch'])
      expect(uz.has(t), t).toBe(true)
  })

  it('body-map words use the custom pictograms', () => {
    const symbols = new Set(wordsByTopic('bodyparts').map((w) => w.symbol))
    for (const s of ['body_neck', 'body_chest', 'body_lower_back', 'body_knee', 'body_stomach']) expect(symbols.has(s), s).toBe(true)
  })

  it('no two words of one adult topic share a picture (a tab must be scannable)', () => {
    const dup: string[] = []
    for (const t of adultTopics) {
      const seen = new Map<string, string>()
      for (const w of wordsByTopic(t.id)) {
        const other = seen.get(w.symbol)
        if (other) dup.push(`${t.id}: ${other} / ${w.id} (${w.symbol})`)
        seen.set(w.symbol, w.id)
      }
    }
    expect(dup).toEqual([])
  })

  it('tone: nothing childish — no diminutive praise, no mascot or kid words', () => {
    const CHILDISH = /barakalla|molodets|молодец|умница|малыш|ёжик|мамочка|папочка|bolajon|musicha/i
    const bad = [...adultWords, ...adultPhrases].filter((x) => CHILDISH.test(`${x.uz} ${x.ru}`)).map((x) => x.id)
    expect(bad).toEqual([])
  })
})

describe('adult phrases', () => {
  it('has at least 150 adult phrases in the known groups', () => {
    expect(adultPhrases.length).toBeGreaterThanOrEqual(150)
    const groups = new Set(['need', 'pain', 'doctor', 'talk', 'emergency', 'social', 'shop', 'work', 'phone', 'family', 'feel', 'polite', 'tradition', 'frame'])
    const bad = adultPhrases.filter((p) => !p.group || !groups.has(p.group)).map((p) => p.id)
    expect(bad).toEqual([])
    for (const g of groups) expect(adultPhrases.filter((p) => p.group === g).length, g).toBeGreaterThanOrEqual(8)
  })

  it('pain by body area exists and stays calm (no red lead symbol)', () => {
    const area = adultPhrases.filter((p) => p.id.startsWith('pa_'))
    expect(area.length).toBeGreaterThanOrEqual(20)
    for (const p of area) expect(p.symbol).not.toMatch(/red|blood/)
  })

  it('the essential statements of the brief are there', () => {
    const uz = new Set(PHRASES.map((p) => p.uz))
    for (const t of [
      'Tez yordam chaqiring',
      'Iltimos, sabr qiling',
      'Men gapirish ilovasidan foydalanaman',
      'Menga gapirish qiyin, sekinroq gapiring',
      'Men tushunaman, lekin gapira olmayman',
      'Iltimos, yozib bering',
      'Menga kerak:',
      'Men xohlayman:',
    ])
      expect(uz.has(t), t).toBe(true)
  })

  it('the quick strip: eight adult / shared phrases that exist', () => {
    expect(ADULT_QUICK_IDS).toHaveLength(8)
    for (const id of ADULT_QUICK_IDS) {
      const p = PHRASES.find((x) => x.id === id)
      expect(p, id).toBeDefined()
      expect(p!.audience === 'adult' || p!.audience === 'both', id).toBe(true)
    }
  })

  it('emergency phrases are short enough to be read in a crisis', () => {
    for (const p of adultPhrases.filter((x) => x.group === 'emergency')) expect(p.uz.length, p.id).toBeLessThanOrEqual(60)
  })

  it('Russian is addressed with «вы» or is first person without a gendered past tense', () => {
    const GENDER_PAST = /(?:^|\s)я\s+(?:\S+\s+)?[а-яё]+(?:л|ла|лся|лась)(?![а-яё])/i
    const bad = adultPhrases.filter((p) => GENDER_PAST.test(p.ru)).map((p) => `${p.id}: ${p.ru}`)
    expect(bad).toEqual([])
  })

  it('no digits in spoken adult phrases (the Uzbek voice would not read them)', () => {
    const bad = adultPhrases.filter((p) => !/^pain_\d+$/.test(p.id) && /[0-9]/.test(p.uz)).map((p) => p.id)
    expect(bad).toEqual([])
  })
})

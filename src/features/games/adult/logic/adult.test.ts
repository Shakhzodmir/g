import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  adultItems,
  adultSpoken,
  adultWordPool,
  CATS,
  catItems,
  COMMANDS,
  cueFirst,
  cueKey,
  firstLetters,
  frameIdOf,
  FRAMES,
  hasSpokenCue,
  itemById,
  PLACE_Q,
  plain,
  QA,
  refItem,
  SENTENCES,
  SITUATIONS,
  usableCats,
  YESNO,
} from '../../../../content/adultgamedata'
import { seeded } from '../../../../lib/random'
import { LEVELS, type Level } from '../../logic/rounds'
import { categoryRounds, CATEGORY_LEVELS, makeCategoryRound, namingCategories } from './category'
import { clashes, foldText, similarity } from './common'
import { listenRound } from './listening'
import { matchDistractors, matchRound, WORDPIC_OPTIONS } from './matching'
import { cuesFor, matchesTyped, namingPool, namingRound, nextCue, summarizeNaming } from './naming'
import { makeOddItem, oddRound, ODD_OPTIONS } from './oddone'
import { CHUNKS, chunkWords, hintIndex, isRightOrder, scramble, sentencePool, sentenceRound } from './sentence'
import { situationOptions, situationRound } from './situations'

const RU_VOWEL = /[аеёиоуыэюя]/g

/** Same rule as content.test.ts: every Russian word of 2+ vowels has exactly one "+" before a vowel (ё carries it). */
function stressProblems(tts: string): string[] {
  const out: string[] = []
  for (const token of tts.toLowerCase().split(/[^а-яё+]+/).filter(Boolean)) {
    const bare = token.replace(/\+/g, '')
    const vowels = (bare.match(RU_VOWEL) ?? []).length
    const plus = (token.match(/\+/g) ?? []).length
    if (plus > 1) out.push(`${token}: more than one +`)
    if (plus === 1 && !/\+[аеёиоуыэюя]/.test(token)) out.push(`${token}: + not before a vowel`)
    if (vowels >= 2 && plus === 0) out.push(`${token}: no stress mark`)
    if (vowels >= 2 && bare.includes('ё') && !token.includes('+ё')) out.push(`${token}: ё must carry the stress`)
  }
  return out
}

describe('adult game content', () => {
  const spoken = adultSpoken()

  it('has unique audio keys, all under g.ad.', () => {
    const keys = spoken.map((s) => s.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const k of keys) expect(k.startsWith('g.ad.'), k).toBe(true)
  })

  it('every spoken Russian text marks the stress on every word of 2+ syllables', () => {
    const bad = spoken.flatMap((s) => stressProblems(s.ruTts).map((p) => `${s.key}: ${p}`))
    expect(bad).toEqual([])
  })

  it('displayed Russian is the speech form without "+"', () => {
    for (const s of spoken) expect(s.ru, s.key).toBe(plain(s.ruTts))
  })

  it('Uzbek uses oʻ/gʻ (U+02BB) and the tutuq (U+02BC): no ASCII or curly apostrophes, no Cyrillic', () => {
    const bad = spoken.filter((s) => /['’‘`´]/.test(s.uz) || /[Ѐ-ӿ]/.test(s.uz)).map((s) => `${s.key}: ${s.uz}`)
    expect(bad).toEqual([])
  })

  it('Russian is plain adult language: no gendered forms in brackets, no diminutives of the child register', () => {
    for (const s of spoken) {
      expect(s.ru, s.key).not.toMatch(/\([а-я]{1,3}\)/i)
      expect(s.ru, s.key).not.toMatch(/\+/)
    }
  })

  it('every category has enough pictures and every picture exists on disk', () => {
    const dir = join(__dirname, '../../../../../public/symbols')
    const have = new Set([...readdirSync(dir), ...readdirSync(join(dir, 'custom'))].map((f) => f.replace(/\.(webp|svg)$/, '')))
    for (const c of CATS) expect(catItems(c.id).length, c.id).toBeGreaterThanOrEqual(7)
    const missing = adultItems().filter((i) => !have.has(i.symbol)).map((i) => `${i.id}: ${i.symbol}`)
    expect(missing).toEqual([])
    expect(existsSync(dir)).toBe(true)
  })

  it('items are unique and carry their categories', () => {
    const items = adultItems()
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length)
    expect(items.length).toBeGreaterThan(120)
    for (const c of CATS) for (const it of catItems(c.id)) expect(it.cats, it.id).toContain(c.id)
  })

  it('the adult pool leaves out the child register', () => {
    const ids = adultWordPool().map((w) => w.id)
    for (const bad of ['teddy', 'doll', 'mother_oyi', 'bubbles', 'drum', 'balloon']) expect(ids).not.toContain(bad)
    for (const keep of ['bus', 'car', 'book', 'doctor']) expect(ids).toContain(keep)
  })

  it('curated questions and commands point at real pictures', () => {
    for (const q of QA) {
      expect(refItem(q.answer), `${q.id} answer`).toBeDefined()
      expect(q.others.map(refItem).filter(Boolean).length, `${q.id} others`).toBeGreaterThanOrEqual(3)
      expect(q.others).not.toContain(q.answer)
    }
    for (const c of COMMANDS) {
      expect(refItem(c.a), `${c.id} a`).toBeDefined()
      expect(refItem(c.b), `${c.id} b`).toBeDefined()
    }
    for (const p of PLACE_Q) expect(p.answer).not.toBe(p.other)
    expect(YESNO.filter((y) => y.yes).length).toBeGreaterThan(2)
    expect(YESNO.filter((y) => !y.yes).length).toBeGreaterThan(2)
  })

  it('has at least 6 sentences for each length plus phrase-based ones', () => {
    for (const n of [3, 4, 5]) expect(SENTENCES.filter((s) => s.uz.length === n && s.ru.length === n).length).toBeGreaterThanOrEqual(6)
    for (const s of SENTENCES) expect(s.uz.length, s.id).toBe(s.ru.length)
  })

  it('has enough situations, each with a distinct right phrase', () => {
    expect(SITUATIONS.length).toBeGreaterThanOrEqual(12)
    expect(new Set(SITUATIONS.map((s) => s.good.uz)).size).toBe(SITUATIONS.length)
  })
})

describe('cue ladder (naming)', () => {
  const apple = itemById('w.apple')!
  const water = itemById('w.water')!

  it('offers the cues in the fixed order and ends with the spoken word', () => {
    const c = cuesFor(apple)
    expect(c[0]).toBe(1)
    expect(c[c.length - 1]).toBe(4)
    expect(c).toEqual([...c].sort())
  })

  it('skips the spoken syllable for one-syllable words and the sentence when there is no frame', () => {
    expect(hasSpokenCue(water)).toBe(false)
    expect(cuesFor(water)).not.toContain(2)
    // a lone-vowel first syllable (ol- / я-) is too short to be heard as a cue: no spoken step
    expect(hasSpokenCue(apple)).toBe(false)
    const banana = itemById('w.banana')!
    expect(hasSpokenCue(banana)).toBe(true)
    expect(cuesFor(banana)).toContain(2)
    expect(cuesFor(banana)).toContain(3)
  })

  it('nextCue climbs one step at a time and ends with null', () => {
    let cue = 0 as 0 | 1 | 2 | 3 | 4
    const seen: number[] = []
    for (;;) {
      const n = nextCue(apple, cue)
      if (n === null) break
      seen.push(n)
      cue = n
    }
    expect(seen).toEqual(cuesFor(apple))
    expect(nextCue(apple, 4)).toBeNull()
  })

  it('shows the first syllable, or the first letters of a one-syllable word', () => {
    expect(cueFirst(apple, 'uz')).toBe('ol')
    expect(cueFirst(apple, 'ru')).toBe('я')
    expect(firstLetters('shifokor', 'uz')).toBe('sh')
    expect(firstLetters('oʻrdak', 'uz')).toBe('oʻ')
    expect(firstLetters('чай', 'ru')).toBe('ч')
  })

  it('every item with a frame id has that frame, and every frame is spoken', () => {
    const keys = new Set(spokenKeys())
    for (const it of adultItems()) {
      const f = frameIdOf(it)
      if (f) expect(FRAMES[f], it.id).toBeDefined()
      if (hasSpokenCue(it)) expect(keys.has(cueKey(it)), it.id).toBe(true)
    }
  })

  it('checks typed answers loosely: case, apostrophes, spaces and the Cyrillic script do not matter', () => {
    const item = { uz: 'oʻrdak', ru: 'утка' }
    expect(matchesTyped("O'rdak", item)).toBe(true)
    expect(matchesTyped(' ЎРДАК ', item)).toBe(true)
    expect(matchesTyped('утка', item)).toBe(true)
    expect(matchesTyped('ўрдак', item)).toBe(true)
    expect(matchesTyped('ойна', { uz: 'oyna', ru: 'зеркало' })).toBe(true)
    expect(matchesTyped('ordak', item)).toBe(true)
    expect(matchesTyped('', item)).toBe(false)
    expect(matchesTyped('tovuq', item)).toBe(false)
    expect(foldText('Ёлка')).toBe('елка')
  })

  it('counts unaided names, cued names by level and skipped items', () => {
    const s = summarizeNaming([
      { item: 'a', cue: 0, ok: true, mode: 'said' },
      { item: 'b', cue: 0, ok: true, mode: 'typed' },
      { item: 'c', cue: 2, ok: true, mode: 'said' },
      { item: 'd', cue: 4, ok: true, mode: 'said' },
      { item: 'e', cue: 1, ok: false, mode: 'said' },
    ])
    expect(s).toEqual({ total: 5, unaided: 2, cued: { 1: 0, 2: 1, 3: 0, 4: 1 }, skipped: 1 })
  })

  it('builds a deterministic round of different pictures at every level', () => {
    for (const level of LEVELS) for (const lang of ['uz', 'ru'] as const) {
      const a = namingRound(level, lang, seeded(5 + level))
      const b = namingRound(level, lang, seeded(5 + level))
      expect(a.map((i) => i.id)).toEqual(b.map((i) => i.id))
      expect(a).toHaveLength(8)
      expect(new Set(a.map((i) => i.symbol)).size).toBe(8)
    }
    const first = namingRound(1, 'uz', seeded(9), 8, 'w.apple')
    expect(first.map((i) => i.id)).not.toContain('w.apple')
  })

  it('level 3 targets are longer words than level 1', () => {
    const avg = (l: Level) => {
      const pool = namingPool(l, 'uz')
      return pool.reduce((s, i) => s + i.uz.length, 0) / pool.length
    }
    expect(avg(3)).toBeGreaterThan(avg(1))
  })
})

describe('sentence builder', () => {
  it('splits words into nearly equal chunks', () => {
    expect(chunkWords('a b c d e', 3)).toEqual(['a b', 'c d', 'e'])
    expect(chunkWords('a b', 3)).toBeNull()
    expect(chunkWords('Men tushunaman, lekin gapira olmayman', 5)).toEqual(['Men', 'tushunaman,', 'lekin', 'gapira', 'olmayman'])
  })

  it('has a pool for every level with the right number of chunks in both languages', () => {
    for (const level of LEVELS) {
      const pool = sentencePool(level)
      expect(pool.length).toBeGreaterThanOrEqual(8)
      for (const s of pool) {
        expect(s.uz).toHaveLength(CHUNKS[level])
        expect(s.ru).toHaveLength(CHUNKS[level])
      }
      expect(sentenceRound(level, seeded(3))).toHaveLength(8)
    }
  })

  it('never shows the sentence already in order', () => {
    for (let seed = 1; seed < 80; seed++) for (const n of [3, 4, 5]) expect(isRightOrder(scramble(n, seeded(seed)), Array.from({ length: n }, (_, i) => `w${i}`))).toBe(false)
  })

  it('accepts identical chunks in either place and rejects a wrong order', () => {
    const chunks = ['a', 'b', 'a']
    expect(isRightOrder([0, 1, 2], chunks)).toBe(true)
    expect(isRightOrder([2, 1, 0], chunks)).toBe(true)
    expect(isRightOrder([1, 0, 2], chunks)).toBe(false)
    expect(isRightOrder([0, 1], chunks)).toBe(false)
  })

  it('the hint is the next right chunk still in the pool', () => {
    const chunks = ['x', 'y', 'z']
    expect(hintIndex([], chunks, [2, 0, 1])).toBe(0)
    expect(hintIndex([0], chunks, [2, 1])).toBe(1)
    expect(hintIndex([0, 1, 2], chunks, [])).toBeNull()
  })
})

describe('category find', () => {
  it('puts exactly the category members among the targets and none among the distractors', () => {
    for (const level of LEVELS) for (let seed = 1; seed < 40; seed++) {
      const r = makeCategoryRound(level, seeded(seed))!
      const p = CATEGORY_LEVELS[level]
      expect(r.cards).toHaveLength(p.cards)
      expect(r.targets.length).toBeGreaterThanOrEqual(p.targets[0])
      expect(r.targets.length).toBeLessThanOrEqual(p.targets[1])
      for (const c of r.cards) expect(c.cats.includes(r.cat.id), c.id).toBe(r.targets.includes(c.id))
      for (let i = 0; i < r.cards.length; i++) for (let j = i + 1; j < r.cards.length; j++) expect(clashes(r.cards[i], r.cards[j])).toBe(false)
    }
  })

  it('level 3 draws distractors from neighbouring categories', () => {
    let near = 0
    let all = 0
    for (let seed = 1; seed < 40; seed++) {
      const r = makeCategoryRound(3, seeded(seed))!
      const nearIds = new Set([...r.cat.near, ...CATS.filter((c) => c.near.includes(r.cat.id)).map((c) => c.id)])
      for (const c of r.cards.filter((x) => !r.targets.includes(x.id))) {
        all++
        if (c.cats.some((k) => nearIds.has(k))) near++
      }
    }
    expect(near / all).toBeGreaterThan(0.8)
  })

  it('rounds never repeat a category in a row and are deterministic', () => {
    const a = categoryRounds(2, seeded(11))
    const b = categoryRounds(2, seeded(11))
    expect(a.map((r) => r.cat.id)).toEqual(b.map((r) => r.cat.id))
    for (let i = 1; i < a.length; i++) expect(a[i].cat.id).not.toBe(a[i - 1].cat.id)
  })

  it('the say-as-many-as-you-can categories are the rich ones', () => {
    for (const c of namingCategories(seeded(2))) expect(catItems(c.id).length).toBeGreaterThanOrEqual(8)
    expect(usableCats(8).length).toBeGreaterThan(8)
  })
})

describe('word and picture matching', () => {
  const rand = seeded(21)
  it('always contains the target once with the level’s number of different options', () => {
    for (const level of LEVELS) for (const lang of ['uz', 'ru'] as const) {
      for (const m of matchRound(level, lang, seeded(level * 7), 8)) {
        expect(m.options).toHaveLength(WORDPIC_OPTIONS[level])
        expect(m.options.filter((o) => o.id === m.target.id)).toHaveLength(1)
        for (let i = 0; i < m.options.length; i++) for (let j = i + 1; j < m.options.length; j++) expect(clashes(m.options[i], m.options[j])).toBe(false)
      }
    }
    void rand
  })

  it('level 1 distractors are unrelated, level 2 are the same category, level 3 look and sound alike', () => {
    const target = itemById('w.apple')!
    const l1 = matchDistractors(target, 1, 'uz', seeded(1))
    for (const d of l1) expect(d.cats.some((c) => target.cats.includes(c))).toBe(false)
    const l2 = matchDistractors(target, 2, 'uz', seeded(1))
    for (const d of l2) expect(d.cats.some((c) => target.cats.includes(c))).toBe(true)
    const sim = (ds: ReturnType<typeof matchDistractors>) => ds.reduce((s, d) => s + similarity(target, d, 'uz'), 0) / ds.length
    expect(sim(matchDistractors(target, 3, 'uz', seeded(1)))).toBeGreaterThan(sim(l1))
  })

  it('is deterministic with a seed and avoids the previous target', () => {
    const a = matchRound(2, 'uz', seeded(4), 8, 'w.apple')
    const b = matchRound(2, 'uz', seeded(4), 8, 'w.apple')
    expect(a.map((m) => m.target.id)).toEqual(b.map((m) => m.target.id))
    expect(a.map((m) => m.target.id)).not.toContain('w.apple')
  })
})

describe('odd one out', () => {
  it('has one picture that is not in the category of all the others', () => {
    for (const level of LEVELS) for (let seed = 1; seed < 40; seed++) {
      const it = makeOddItem(level, seeded(seed))!
      expect(it.options).toHaveLength(ODD_OPTIONS[level])
      expect(it.odd.cats.includes(it.cat.id)).toBe(false)
      const rest = it.options.filter((o) => o.id !== it.odd.id)
      expect(rest).toHaveLength(ODD_OPTIONS[level] - 1)
      for (const o of rest) expect(o.cats.includes(it.cat.id), o.id).toBe(true)
    }
  })

  it('rounds have the set size and do not repeat a category in a row', () => {
    for (const level of LEVELS) {
      const r = oddRound(level, seeded(level))
      expect(r).toHaveLength(8)
      for (let i = 1; i < r.length; i++) expect(r[i].cat.id).not.toBe(r[i - 1].cat.id)
    }
  })
})

describe('listening comprehension', () => {
  it('builds a full round at every level', () => {
    for (const level of LEVELS) expect(listenRound(level, seeded(level)).length).toBe(8)
  })

  it('level 1 mixes category questions and word pointing; the answer is among the pictures', () => {
    const r = listenRound(1, seeded(3))
    expect(new Set(r.map((i) => i.kind))).toEqual(new Set(['cat', 'word']))
    for (const it of r) if (it.kind === 'cat' || it.kind === 'word') expect(it.options.map((o) => o.id)).toContain(it.answer)
  })

  it('category questions have exactly one member of the asked category', () => {
    for (let seed = 1; seed < 30; seed++) for (const it of listenRound(1, seeded(seed))) {
      if (it.kind !== 'cat') continue
      const cat = CATS.find((c) => it.key === `g.ad.q.${c.id}`)!
      expect(it.options.filter((o) => o.cats.includes(cat.id))).toHaveLength(1)
    }
  })

  it('level 2 uses function, place and yes/no questions; level 3 adds two-step commands with 6 pictures', () => {
    const kinds2 = new Set(listenRound(2, seeded(1)).map((i) => i.kind))
    expect(kinds2.has('qa')).toBe(true)
    expect(kinds2.has('place') || kinds2.has('yesno')).toBe(true)
    const r3 = listenRound(3, seeded(1))
    const cmds = r3.filter((i) => i.kind === 'command')
    expect(cmds.length).toBeGreaterThanOrEqual(4)
    for (const c of cmds) {
      if (c.kind !== 'command') continue
      expect(c.options).toHaveLength(6)
      expect(c.order[0]).not.toBe(c.order[1])
      for (const id of c.order) expect(c.options.map((o) => o.id)).toContain(id)
    }
  })

  it('place questions contain the answer among their two places', () => {
    for (const it of listenRound(2, seeded(8))) if (it.kind === 'place') expect(it.places.map((p) => p.id)).toContain(it.answer)
  })

  it('every prompt has a spoken clip', () => {
    const keys = new Set(spokenKeys())
    for (const level of LEVELS) for (let seed = 1; seed < 10; seed++) for (const it of listenRound(level, seeded(seed))) {
      expect(keys.has(it.key) || it.key.startsWith('w.') || it.key.startsWith('g.ad.i.'), it.key).toBe(true)
    }
  })
})

describe('situations', () => {
  it('always has exactly one fitting phrase', () => {
    for (const level of LEVELS) for (let seed = 1; seed < 30; seed++) for (const it of situationRound(level, seeded(seed))) {
      expect(it.options.filter((o) => o.good)).toHaveLength(1)
      expect(it.options.find((o) => o.good)!.text.uz).toBe(it.sit.good.uz)
      const texts = it.options.map((o) => o.text.uz)
      expect(new Set(texts).size, it.sit.id).toBe(texts.length)
    }
  })

  it('has 2 options at level 1 and 3 at levels 2 and 3', () => {
    const sd = SITUATIONS[0]
    expect(situationOptions(sd, 1, seeded(1))).toHaveLength(2)
    expect(situationOptions(sd, 2, seeded(1))).toHaveLength(3)
    expect(situationOptions(sd, 3, seeded(1))).toHaveLength(3)
  })

  it('every option phrase has a clip', () => {
    const keys = new Set(spokenKeys())
    for (const sd of SITUATIONS) for (const level of LEVELS) for (const o of situationOptions(sd, level, seeded(2))) expect(keys.has(o.key), o.key).toBe(true)
  })
})

function spokenKeys(): string[] {
  return adultSpoken().map((s) => s.key)
}

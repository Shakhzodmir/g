import { describe, expect, it } from 'vitest'
import { COLORS, GAME_LINES, LISTEN_SENTENCES, LISTEN_TASKS, ODD_CATEGORIES, OPP_PAIRS, ROUTINES_3, ROUTINES_4, SHAPES, STEP_PART } from '../../../content/gamedata'
import { wordById, wordsForKind } from '../../../content/vocab'
import { seeded } from '../../../lib/random'
import { buildWords, hintBead, isNextSyllable, makeBuildRound } from './buildword'
import { colorPool, makeColorRound, similar } from './colors'
import { COUNT_MAX, makeCountRound, nextCount } from './count'
import { makeOddRound, members, ODD_COUNT } from './oddone'
import { makeOppRound, OPP_OPTIONS, oppPairs } from './opposite'
import { makePointRound, POINT_OPTIONS } from './pointto'
import { LEVELS, ROUND_SIZE } from './rounds'
import { isNextStep, makeRoutineRound } from './routine'
import { makeShapeRound, shapePool, similarShapes } from './shapes'
import { firstSound, makeSoundRound, soundGroups, SOUNDS } from './sound'

const kids = wordsForKind('child')
const has = (id: string) => kids.some((w) => w.id === id)
const symbolOf = (id: string) => kids.find((w) => w.id === id)?.symbol
const SEEDS = Array.from({ length: 25 }, (_, i) => i + 1)

describe('game data', () => {
  it('every word the games rely on exists for children', () => {
    const ids = [
      ...COLORS.map((c) => c.word),
      ...SHAPES.map((s) => s.word),
      ...OPP_PAIRS.flatMap((p) => [p.a, p.b]),
      ...Array.from({ length: 10 }, (_, i) => `number_${i + 1}`),
      ...Object.values(ODD_CATEGORIES).flat(),
      ...ROUTINES_3.flat(),
      ...ROUTINES_4.flat(),
      ...LISTEN_SENTENCES.flatMap((s) => [s.target, ...(s.avoid ?? [])]),
      ...LISTEN_TASKS.flatMap((t) => t.targets),
    ]
    expect([...new Set(ids.filter((id) => !has(id)))]).toEqual([])
  })

  it('has unique audio keys, both languages, canonical Uzbek apostrophes', () => {
    const all = [...GAME_LINES, ...LISTEN_SENTENCES, ...LISTEN_TASKS]
    expect(new Set(all.map((l) => l.key)).size).toBe(all.length)
    for (const l of all) {
      expect(l.uz.trim(), l.key).not.toBe('')
      expect(l.ru.trim(), l.key).not.toBe('')
      expect(l.uz, l.key).not.toMatch(/['’‘`]/)
      // Every Russian word of two or more syllables carries a stress mark.
      for (const w of (l.ruTts ?? l.ru).split(/[\s,.?!]+/).filter(Boolean)) {
        const vowels = (w.match(/[аеёиоуыэюя]/gi) ?? []).length
        if (vowels >= 2) expect(w, `${l.key}: ${w}`).toMatch(/\+|ё/)
      }
    }
  })

  it('every routine step has a day part', () => {
    for (const s of [...ROUTINES_3, ...ROUTINES_4].flat()) expect(STEP_PART[s], s).toBeDefined()
  })
})

describe('colours', () => {
  it('levels have the planned option counts and always include the target once', () => {
    for (const seed of SEEDS)
      for (const level of LEVELS) {
        const round = makeColorRound(level, has, seeded(seed))
        expect(round).toHaveLength(ROUND_SIZE)
        for (const it of round) {
          expect(it.options).toHaveLength(level === 1 ? 2 : 4)
          expect(it.options.filter((o) => o.color === it.target)).toHaveLength(1)
          for (const a of it.options) for (const b of it.options) if (a !== b) expect(similar(a.color, b.color)).toBe(false)
          if (level === 3) for (const o of it.options) expect(o.symbol).toBeTruthy()
          else for (const o of it.options) expect(o.symbol).toBeUndefined()
        }
      }
  })

  it('skips colours without a name word and never repeats a target in a row', () => {
    const only = (id: string) => id !== 'color_red' && has(id)
    expect(colorPool(1, only)).not.toContain('red')
    const round = makeColorRound(2, has, seeded(3))
    for (let i = 1; i < round.length; i++) expect(round[i].target).not.toBe(round[i - 1].target)
  })

  it('is deterministic for a seed', () => {
    expect(makeColorRound(2, has, seeded(9))).toEqual(makeColorRound(2, has, seeded(9)))
  })
})

describe('counting', () => {
  it('stays inside 1–3, 1–6, 1–10 and offers the number among ascending options', () => {
    for (const seed of SEEDS)
      for (const level of LEVELS) {
        for (const it of makeCountRound(level, seeded(seed))) {
          expect(it.n).toBeGreaterThanOrEqual(1)
          expect(it.n).toBeLessThanOrEqual(COUNT_MAX[level])
          expect(it.options.filter((o) => o === it.n)).toHaveLength(1)
          expect([...it.options].sort((a, b) => a - b)).toEqual(it.options)
          expect(new Set(it.options).size).toBe(it.options.length)
          expect(Math.max(...it.options)).toBeLessThanOrEqual(COUNT_MAX[level])
        }
      }
  })

  it('counts by tapping 1, 2, 3 … then stops', () => {
    expect([nextCount(0, 3), nextCount(1, 3), nextCount(2, 3), nextCount(3, 3)]).toEqual([1, 2, 3, null])
  })
})

describe('shapes', () => {
  it('level 1 uses 3 shapes with 2 options, level 2 all with 4, level 3 real objects', () => {
    expect(shapePool(1, has)).toHaveLength(3)
    expect(shapePool(2, has)).toHaveLength(8)
    for (const seed of SEEDS)
      for (const level of LEVELS)
        for (const it of makeShapeRound(level, has, seeded(seed))) {
          expect(it.options).toHaveLength(level === 1 ? 2 : 4)
          expect(it.options.filter((o) => o.shape === it.target)).toHaveLength(1)
          for (const a of it.options) for (const b of it.options) if (a !== b) expect(similarShapes(a.shape, b.shape)).toBe(false)
          expect(it.options.every((o) => (level === 3) === !!o.symbol)).toBe(true)
        }
  })
})

describe('odd one out', () => {
  it('has one odd picture among 3 or 4 and it is the only one of its category', () => {
    for (const seed of SEEDS)
      for (const level of LEVELS) {
        const round = makeOddRound(level, symbolOf, seeded(seed))
        expect(round).toHaveLength(ROUND_SIZE)
        for (const it of round) {
          expect(it.options).toHaveLength(ODD_COUNT[level])
          expect(it.options).toContain(it.odd)
          expect(ODD_CATEGORIES[it.oddGroup]).toContain(it.odd)
          expect(it.options.filter((o) => ODD_CATEGORIES[it.group].includes(o))).toHaveLength(ODD_COUNT[level] - 1)
          expect(it.options.filter((o) => ODD_CATEGORIES[it.oddGroup].includes(o))).toHaveLength(1)
          expect(new Set(it.options.map(symbolOf)).size).toBe(it.options.length)
        }
      }
  })

  it('category members never share a picture', () => {
    for (const c of Object.keys(ODD_CATEGORIES)) {
      const m = members(c, symbolOf)
      expect(new Set(m.map(symbolOf)).size).toBe(m.length)
    }
  })
})

describe('routines', () => {
  it('level 1 shows two steps and asks for the third among 2 cards', () => {
    for (const seed of SEEDS)
      for (const it of makeRoutineRound(1, has, seeded(seed))) {
        expect(it.shown).toEqual(it.steps.slice(0, 2))
        expect(it.answers).toEqual([it.steps[2]])
        expect(it.options).toHaveLength(2)
        expect(it.options).toContain(it.steps[2])
      }
  })

  it('level 2 shows the first step and wants the other two in order', () => {
    for (const seed of SEEDS)
      for (const it of makeRoutineRound(2, has, seeded(seed))) {
        expect(it.shown).toEqual([it.steps[0]])
        expect(it.answers).toEqual(it.steps.slice(1))
        for (const a of it.answers) expect(it.options).toContain(a)
        expect(it.options).not.toContain(it.steps[0])
      }
  })

  it('level 3 wants all four steps in order and shuffles the cards', () => {
    for (const seed of SEEDS)
      for (const it of makeRoutineRound(3, has, seeded(seed))) {
        expect(it.steps).toHaveLength(4)
        expect(it.answers).toEqual(it.steps)
        expect([...it.options].sort()).toEqual([...it.steps].sort())
      }
  })

  it('validates taps in order', () => {
    const [it] = makeRoutineRound(3, has, seeded(2))
    expect(isNextStep(it, 0, it.steps[0])).toBe(true)
    expect(isNextStep(it, 0, it.steps[1])).toBe(false)
    expect(isNextStep(it, 3, it.steps[3])).toBe(true)
  })

  it('a wrong card never comes from the same part of the day', () => {
    for (const seed of SEEDS)
      for (const level of [1, 2] as const)
        for (const it of makeRoutineRound(level, has, seeded(seed))) {
          const extra = it.options.filter((o) => !it.answers.includes(o))
          const parts = new Set(it.steps.map((s) => STEP_PART[s]))
          for (const e of extra) expect(parts.has(STEP_PART[e])).toBe(false)
        }
  })
})

describe('first sound', () => {
  const ru = (id: string) => wordById(id)!
  it('reads the first sound per language', () => {
    expect(firstSound(ru('mother'), 'uz')).toBe('o')
    expect(firstSound(ru('mother'), 'ru')).toBe('м')
    expect(firstSound(ru('car'), 'uz')).toBe('m')
    expect(firstSound(ru('shoes'), 'uz')).toBe('t')
    expect(firstSound(ru('juice'), 'uz')).toBe('sh')
    expect(firstSound(ru('rabbit'), 'uz')).toBe('q')
  })

  it('has enough words for every sound group in both languages', () => {
    for (const lang of ['uz', 'ru'] as const) {
      const groups = soundGroups(kids, lang)
      expect(groups.size).toBeGreaterThanOrEqual(5)
      for (const s of groups.keys()) expect(SOUNDS[lang]).toContain(s)
    }
  })

  it('the correct picture begins like the target and no other option does', () => {
    for (const lang of ['uz', 'ru'] as const)
      for (const seed of SEEDS)
        for (const level of LEVELS) {
          const round = makeSoundRound(kids, lang, level, seeded(seed))
          expect(round).toHaveLength(ROUND_SIZE)
          for (const it of round) {
            expect(it.correct.id).not.toBe(it.target.id)
            expect(firstSound(it.correct, lang)).toBe(it.sound)
            expect(firstSound(it.target, lang)).toBe(it.sound)
            expect(it.options.filter((o) => firstSound(o, lang) === it.sound)).toEqual([it.correct])
            expect(it.options).toHaveLength(level === 1 ? 2 : 3)
            expect(it.options.map((o) => o.symbol)).not.toContain(it.target.symbol)
          }
        }
  })
})

describe('build a word', () => {
  it('uses 2, 3, then 4+ syllables per level in each language', () => {
    for (const lang of ['uz', 'ru'] as const) {
      expect(buildWords(kids, 1, lang).length).toBeGreaterThanOrEqual(5)
      expect(buildWords(kids, 2, lang).length).toBeGreaterThanOrEqual(5)
      expect(buildWords(kids, 3, lang).length).toBeGreaterThanOrEqual(5)
      for (const seed of [1, 2, 3])
        for (const it of makeBuildRound(kids, 2, lang, seeded(seed))) {
          expect(it.syllables).toHaveLength(3)
        }
      for (const it of makeBuildRound(kids, 1, lang, seeded(4))) expect(it.syllables).toHaveLength(2)
      for (const it of makeBuildRound(kids, 3, lang, seeded(4))) expect(it.syllables.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('shuffles the tray (same syllables) and checks the order', () => {
    for (const seed of SEEDS)
      for (const it of makeBuildRound(kids, 2, 'uz', seeded(seed))) {
        expect(it.beads.map((b) => b.text).sort()).toEqual([...it.syllables].sort())
        expect(it.beads.map((b) => b.text)).not.toEqual(it.syllables)
        expect(isNextSyllable(it, 0, it.syllables[0])).toBe(true)
        expect(isNextSyllable(it, 1, it.syllables[0])).toBe(it.syllables[1] === it.syllables[0])
        expect(hintBead(it, new Set(), 0)).toBeDefined()
      }
  })
})

describe('opposites', () => {
  it('the correct card is the other side of the shown pair; wrong cards are other pairs', () => {
    for (const seed of SEEDS)
      for (const level of LEVELS) {
        const round = makeOppRound(level, has, seeded(seed))
        expect(round).toHaveLength(ROUND_SIZE)
        for (const it of round) {
          expect(it.options).toHaveLength(OPP_OPTIONS[level])
          expect(it.options.filter((o) => o.id === it.correct.id)).toHaveLength(1)
          expect(it.options.map((o) => o.id)).not.toContain(it.shown.id)
          expect(it.correct.id.split('.')[0]).toBe(it.shown.id.split('.')[0])
          expect(it.options.filter((o) => o.id.split('.')[0] === it.pair.id)).toHaveLength(1)
          expect(it.hideShown).toBe(level === 3)
        }
      }
  })

  it('level 1 uses only the easy pairs', () => {
    expect(oppPairs(1, has).every((p) => p.easy)).toBe(true)
    expect(oppPairs(3, has).length).toBe(OPP_PAIRS.length)
  })
})

describe('listen and point', () => {
  it('sentences have 2 or 3 cards, the answer among them and no named object as a wrong card', () => {
    for (const seed of SEEDS)
      for (const level of [1, 2] as const)
        for (const it of makePointRound(kids, level, seeded(seed))) {
          expect(it.options).toHaveLength(POINT_OPTIONS[level])
          expect(it.answers).toHaveLength(1)
          expect(it.options).toContain(it.answers[0])
          const s = LISTEN_SENTENCES.find((x) => x.key === it.line.key)!
          for (const a of s.avoid ?? []) expect(it.options).not.toContain(a)
        }
  })

  it('level 3 asks for two things in the spoken order among 4 cards', () => {
    for (const seed of SEEDS)
      for (const it of makePointRound(kids, 3, seeded(seed))) {
        const t = LISTEN_TASKS.find((x) => x.key === it.line.key)!
        expect(it.answers).toEqual([...t.targets])
        expect(it.options).toHaveLength(4)
        for (const a of it.answers) expect(it.options).toContain(a)
        expect(new Set(it.options.map((o) => wordById(o)!.symbol)).size).toBe(4)
      }
  })
})

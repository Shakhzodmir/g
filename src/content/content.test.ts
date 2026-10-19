import { describe, expect, it } from 'vitest'
import symbolMap from '../../scripts/symbol-map.json'
import * as animals from './animals'
import { SOUND_MAKERS } from './animals'
import * as exercises from './exercises'
import { ARTICULATION } from './exercises'
import * as feelings from './feelings'
import { FEELINGS, HELPERS } from './feelings'
import * as phrases from './phrases'
import { PHRASES } from './phrases'
import * as schedules from './schedules'
import { SCHEDULE_TEMPLATES } from './schedules'
import * as stickers from './stickers'
import { STICKERS } from './stickers'
import * as stories from './stories'
import { STORIES } from './stories'
import * as tips from './tips'
import { TIPS } from './tips'
import * as topics from './topics'
import { TOPICS } from './topics'
import type { TopicId } from './types'
import * as vocab from './vocab'
import { WORDS, wordById, wordsByTopic } from './vocab'
import * as voiceLines from './voiceLines'
import { NUMBER_LINES, VOICE_LINES } from './voiceLines'

const MODULES: Record<string, unknown> = {
  vocab,
  topics,
  phrases,
  animals,
  exercises,
  tips,
  stickers,
  voiceLines,
  feelings,
  stories,
  schedules,
}

const SYMBOLS = symbolMap as Record<string, string>

/** Calls `visit(key, value, path)` for every string in an exported object tree. */
function walkStrings(value: unknown, visit: (key: string, value: string, path: string) => void, key = '', path = ''): void {
  if (typeof value === 'string') visit(key, value, path)
  else if (Array.isArray(value)) value.forEach((v, i) => walkStrings(v, visit, key, `${path}[${i}]`))
  else if (value && typeof value === 'object')
    for (const [k, v] of Object.entries(value)) walkStrings(v, visit, k, path ? `${path}.${k}` : k)
}

function allStrings(): Array<{ key: string; value: string; path: string }> {
  const out: Array<{ key: string; value: string; path: string }> = []
  for (const [name, mod] of Object.entries(MODULES)) walkStrings(mod, (key, value, path) => out.push({ key, value, path: `${name}.${path}` }))
  return out
}

const RU_VOWEL = /[аеёиоуыэюя]/g

/** Problems with Russian stress marks: every word with 2+ vowels needs exactly one "+" right before a vowel. */
function stressProblems(tts: string): string[] {
  const problems: string[] = []
  for (const token of tts.toLowerCase().split(/[^а-яё+]+/).filter(Boolean)) {
    const bare = token.replace(/\+/g, '')
    const vowels = (bare.match(RU_VOWEL) ?? []).length
    const plus = (token.match(/\+/g) ?? []).length
    if (plus > 1) problems.push(`${token}: more than one +`)
    if (plus === 1 && !/\+[аеёиоуыэюя]/.test(token)) problems.push(`${token}: + not before a vowel`)
    if (vowels >= 2 && plus === 0) problems.push(`${token}: no stress mark`)
    if (vowels >= 2 && bare.includes('ё') && !token.includes('+ё')) problems.push(`${token}: ё must carry the stress`)
  }
  return problems
}

const ruLetters = (s: string) => s.toLowerCase().replace(/ё/g, 'е').replace(/[^а-я]/g, '')

/** ruTts without "+" must say the same words as the displayed Russian (skipped for digits and "a / b"). */
function ttsMatches(ru: string, tts: string): boolean {
  if (/[0-9/]/.test(ru)) return true
  return ruLetters(ru) === ruLetters(tts.replace(/\+/g, ''))
}

describe('vocabulary', () => {
  it('has unique ids', () => {
    const ids = WORDS.map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9_]*$/)
  })

  it('every word has uz, ru, ruTts, symbol, fitz and topic', () => {
    const topicIds = new Set(TOPICS.map((t) => t.id))
    for (const w of WORDS) {
      expect(w.uz.trim(), w.id).not.toBe('')
      expect(w.ru.trim(), w.id).not.toBe('')
      expect(w.ruTts?.trim(), w.id).toBeTruthy()
      expect(w.symbol, w.id).toBeTruthy()
      expect(w.fitz, w.id).toBeTruthy()
      expect(topicIds.has(w.topic), w.id).toBe(true)
    }
  })

  it('has exactly 36 core words in a fixed 6×6 grid with levels 9 / 18 / 36', () => {
    const core = WORDS.filter((w) => w.topic === 'core')
    expect(core).toHaveLength(36)
    expect(WORDS.filter((w) => w.core && w.topic !== 'core')).toHaveLength(0)
    const cells = new Set<string>()
    for (const w of core) {
      expect(w.core, w.id).toBeDefined()
      const { row, col } = w.core!
      expect(Number.isInteger(row) && row >= 0 && row < 6, w.id).toBe(true)
      expect(Number.isInteger(col) && col >= 0 && col < 6, w.id).toBe(true)
      cells.add(`${row},${col}`)
    }
    expect(cells.size).toBe(36)
    const upTo = (l: number) => core.filter((w) => w.core!.level <= l).length
    expect([upTo(1), upTo(2), upTo(3)]).toEqual([9, 18, 36])
  })

  it('level 1 is a compact block', () => {
    const l1 = WORDS.filter((w) => w.core?.level === 1).map((w) => w.core!)
    const rows = l1.map((c) => c.row)
    const cols = l1.map((c) => c.col)
    expect(Math.max(...rows) - Math.min(...rows)).toBeLessThanOrEqual(2)
    expect(Math.max(...cols) - Math.min(...cols)).toBeLessThanOrEqual(2)
  })

  it('every topic except core has 14–24 words and wordsByTopic keeps them', () => {
    expect(TOPICS).toHaveLength(13)
    expect(TOPICS[0].id).toBe('core')
    expect(new Set(TOPICS.map((t) => t.id)).size).toBe(13)
    for (const t of TOPICS) {
      const words = wordsByTopic(t.id as TopicId)
      if (t.id === 'core') continue
      expect(words.length, t.id).toBeGreaterThanOrEqual(14)
      expect(words.length, t.id).toBeLessThanOrEqual(24)
    }
    expect(wordById('water')?.uz).toBe('suv')
    expect(wordById('nope')).toBeUndefined()
  })

  it('syllables rejoin to the word and every syllable has exactly one vowel', () => {
    const withSyl = WORDS.filter((w) => w.syllables)
    expect(withSyl.length).toBeGreaterThanOrEqual(30)
    const letters = (s: string) => s.toLowerCase().replace(/[^\p{L}]/gu, '')
    for (const w of withSyl) {
      const { uz, ru } = w.syllables!
      expect(letters(uz.replace(/-/g, '')), w.id).toBe(letters(w.uz))
      expect(letters(ru.replace(/-/g, '')), w.id).toBe(letters(w.ru))
      for (const s of uz.split('-')) expect((s.match(/[aeiou]/gi) ?? []).length, `${w.id} uz ${s}`).toBe(1)
      for (const s of ru.split('-')) expect((s.toLowerCase().match(RU_VOWEL) ?? []).length, `${w.id} ru ${s}`).toBe(1)
    }
  })
})

describe('orthography', () => {
  it('no ASCII or curly apostrophe in any Uzbek string; ʻ only after o/g', () => {
    const bad: string[] = []
    for (const { key, value, path } of allStrings()) {
      if (key !== 'uz' && key !== 'uzTts') continue
      if (/['‘’`]/.test(value)) bad.push(`${path}: ${value}`)
      if (/(?<![oOgG])ʻ/.test(value)) bad.push(`${path}: ʻ not after o/g: ${value}`)
      if (/[oOgG]ʼ/.test(value)) bad.push(`${path}: ʼ after o/g (should be ʻ?): ${value}`)
      if (/[Ѐ-ӿ]/.test(value)) bad.push(`${path}: Cyrillic in uz: ${value}`)
    }
    expect(bad).toEqual([])
  })

  it('Russian strings are Cyrillic', () => {
    const bad: string[] = []
    for (const { key, value, path } of allStrings()) {
      if (key !== 'ru' && key !== 'ruTts' && key !== 'ruSoundTts' && key !== 'ruInstructionTts') continue
      if (/[A-Za-z]/.test(value)) bad.push(`${path}: ${value}`)
    }
    expect(bad).toEqual([])
  })
})

describe('speech text', () => {
  type Spoken = { id: string; ru: string; tts: string | undefined }
  const spoken: Spoken[] = [
    ...WORDS.map((w) => ({ id: `w.${w.id}`, ru: w.ru, tts: w.ruTts })),
    ...PHRASES.map((p) => ({ id: `p.${p.id}`, ru: p.ru, tts: p.ruTts })),
    ...SOUND_MAKERS.map((s) => ({ id: `o.${s.id}`, ru: s.sound.ru, tts: s.ruSoundTts })),
    ...ARTICULATION.map((x) => ({ id: `x.${x.id}`, ru: x.instruction.ru, tts: x.ruInstructionTts })),
    ...VOICE_LINES.map((l) => ({ id: `ui.${l.id}`, ru: l.ru, tts: l.ruTts })),
    ...NUMBER_LINES.map((l) => ({ id: `ui.${l.id}`, ru: l.ru, tts: l.ruTts })),
    ...FEELINGS.map((f) => ({ id: `feel.${f.id}`, ru: f.ru, tts: f.ruTts })),
    ...HELPERS.map((h) => ({ id: `help.${h.id}`, ru: h.ru, tts: h.ruTts })),
    ...STORIES.flatMap((s) => s.pages.map((p, i) => ({ id: `story.${s.id}.${i}`, ru: p.ru, tts: p.ruTts }))),
  ]

  it('every spoken Russian text has ruTts', () => {
    const missing = spoken.filter((s) => !s.tts?.trim()).map((s) => s.id)
    expect(missing).toEqual([])
  })

  it('ruTts marks stress on every word of 2+ syllables', () => {
    const bad = spoken.flatMap((s) => stressProblems(s.tts ?? '').map((p) => `${s.id}: ${p}`))
    expect(bad).toEqual([])
  })

  it('ruTts says the same words as the displayed Russian', () => {
    const bad = spoken.filter((s) => !ttsMatches(s.ru, s.tts ?? '')).map((s) => `${s.id}: "${s.ru}" vs "${s.tts}"`)
    expect(bad).toEqual([])
  })

  it('pain phrases with digits carry an Uzbek spoken form', () => {
    for (const p of PHRASES.filter((x) => /[0-9]/.test(x.uz))) expect(p.uzTts, p.id).toBeTruthy()
  })
})

describe('symbols', () => {
  it('every referenced symbol exists in scripts/symbol-map.json', () => {
    const missing = new Set<string>()
    for (const { key, value, path } of allStrings()) if (key === 'symbol' && !(value in SYMBOLS)) missing.add(`${path}: ${value}`)
    expect([...missing]).toEqual([])
  })

  it('symbol-map values are Fluent 3D PNG paths or custom SVGs', () => {
    for (const [id, path] of Object.entries(SYMBOLS)) {
      expect(id).toMatch(/^[a-z0-9_]+$/)
      expect(path, id).toMatch(/^(custom:[a-z0-9_]+\.svg|assets\/[^/]+\/(?:(?:Medium-Light)\/)?3D\/[^/]+_3d(?:_medium-light)?\.png)$/)
    }
  })
})

describe('other modules', () => {
  it('phrases: unique ids, ≥24 for children, ≥25 for adults', () => {
    const ids = PHRASES.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(PHRASES.filter((p) => p.audience !== 'adult').length).toBeGreaterThanOrEqual(24)
    expect(PHRASES.filter((p) => p.audience !== 'kid').length).toBeGreaterThanOrEqual(25)
    for (let n = 0; n <= 10; n++) expect(PHRASES.some((p) => p.id === `pain_${n}`), `pain_${n}`).toBe(true)
  })

  it('sound makers: ≥12 animals, 6 vehicles, ids are words', () => {
    expect(SOUND_MAKERS.filter((s) => s.kind === 'animal').length).toBeGreaterThanOrEqual(12)
    expect(SOUND_MAKERS.filter((s) => s.kind === 'vehicle')).toHaveLength(6)
    expect(new Set(SOUND_MAKERS.map((s) => s.id)).size).toBe(SOUND_MAKERS.length)
    for (const s of SOUND_MAKERS) {
      const w = wordById(s.id)
      expect(w, s.id).toBeDefined()
      expect(w!.uz, s.id).toBe(s.uz)
      expect(w!.ru, s.id).toBe(s.ru)
    }
  })

  it('articulation: the 10 exercises of spec 4.4 with their metrics', () => {
    expect(ARTICULATION.map((x) => x.id)).toEqual(['smile', 'tube', 'open', 'cheeks', 'fence', 'clock', 'spatula', 'needle', 'horse', 'jam'])
    const metric = Object.fromEntries(ARTICULATION.map((x) => [x.id, x.metric]))
    expect(metric.smile).toEqual({ kind: 'avg', names: ['mouthSmileLeft', 'mouthSmileRight'] })
    expect(metric.tube).toEqual({ kind: 'single', name: 'mouthPucker' })
    expect(metric.open).toEqual({ kind: 'single', name: 'jawOpen' })
    expect(metric.cheeks).toEqual({ kind: 'single', name: 'cheekPuff' })
    expect(metric.fence).toEqual({ kind: 'avg', names: ['mouthStretchLeft', 'mouthStretchRight'] })
    for (const id of ['clock', 'spatula', 'needle', 'horse', 'jam']) expect(metric[id], id).toBeNull()
    for (const x of ARTICULATION) {
      expect(x.holdSec, x.id).toBeGreaterThan(0)
      expect(x.reps, x.id).toBeGreaterThan(0)
    }
  })

  it('tips, stickers', () => {
    expect(TIPS).toHaveLength(12)
    expect(new Set(TIPS.map((t) => t.id)).size).toBe(12)
    expect(STICKERS).toHaveLength(24)
    expect(new Set(STICKERS.map((s) => s.id)).size).toBe(24)
    for (const id of ['anor', 'non', 'doppi', 'somsa', 'palov']) expect(SYMBOLS[id]).toBe(`custom:${id}.svg`)
  })

  it('feelings: 8 feelings, ≥10 helpers, helps resolve', () => {
    expect(FEELINGS).toHaveLength(8)
    expect(HELPERS.length).toBeGreaterThanOrEqual(10)
    const helperIds = new Set(HELPERS.map((h) => h.id))
    expect(helperIds.size).toBe(HELPERS.length)
    for (const f of FEELINGS) {
      expect(f.helps.length, f.id).toBeGreaterThan(0)
      for (const h of f.helps) expect(helperIds.has(h), `${f.id} → ${h}`).toBe(true)
    }
  })

  it('stories: 3 stories with the planned page counts', () => {
    const pages = Object.fromEntries(STORIES.map((s) => [s.id, s.pages.length]))
    expect(Object.keys(pages)).toEqual(['doctor', 'haircut', 'kindergarten_morning'])
    expect(pages.doctor).toBeGreaterThanOrEqual(8)
    expect(pages.doctor).toBeLessThanOrEqual(10)
    expect(pages.haircut).toBeGreaterThanOrEqual(7)
    expect(pages.haircut).toBeLessThanOrEqual(9)
    expect(pages.kindergarten_morning).toBeGreaterThanOrEqual(8)
    expect(pages.kindergarten_morning).toBeLessThanOrEqual(10)
  })

  it('schedule items resolve to WORDS', () => {
    expect(SCHEDULE_TEMPLATES.map((s) => s.id)).toEqual(['morning', 'kindergarten', 'evening'])
    for (const s of SCHEDULE_TEMPLATES) for (const id of s.items) expect(wordById(id), `${s.id} → ${id}`).toBeDefined()
  })

  it('voice lines have unique ids', () => {
    const ids = [...VOICE_LINES, ...NUMBER_LINES].map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
// scripts/symbol-map.json plus every scripts/symbol-map.<name>.json (authors keep separate files to avoid write clashes)
const mapFiles = import.meta.glob<Record<string, string>>('../../scripts/symbol-map*.json', { eager: true, import: 'default' })
const symbolMap: Record<string, string> = Object.assign({}, ...Object.values(mapFiles))
import { isKeptLatin, uzLatnToCyrl } from '../i18n/orthography'
import { shy, syllablesOf } from '../lib/hyphenate'
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
import { S as EXERCISE_STRINGS } from '../features/exercises/strings'
import { S as GAME_STRINGS } from '../features/games/strings'
import { S as PARENT_STRINGS } from '../features/parent/strings'
import { S as TIMER_STRINGS } from '../features/timer/strings'
import { S as TOKEN_STRINGS } from '../features/tokens/strings'

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

  it('every topic except core has 14–40 words and wordsByTopic keeps them', () => {
    expect(TOPICS.length).toBeGreaterThanOrEqual(13)
    expect(TOPICS[0].id).toBe('core')
    expect(new Set(TOPICS.map((t) => t.id)).size).toBe(TOPICS.length)
    for (const t of TOPICS) {
      const words = wordsByTopic(t.id as TopicId)
      if (t.id === 'core') continue
      expect(words.length, t.id).toBeGreaterThanOrEqual(14)
      // adult topics are practical vocabularies (symptoms, documents, home) and may be longer than a child's tab
      expect(words.length, t.id).toBeLessThanOrEqual(t.audience === 'adult' ? 48 : 40)
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
  it('every referenced symbol exists in scripts/symbol-map*.json', () => {
    const missing = new Set<string>()
    for (const { key, value, path } of allStrings()) if (key === 'symbol' && !(value in SYMBOLS)) missing.add(`${path}: ${value}`)
    expect([...missing]).toEqual([])
  })

  it('symbol-map values are Fluent 3D PNG paths or custom SVGs', () => {
    for (const [id, path] of Object.entries(SYMBOLS)) {
      expect(id).toMatch(/^[a-z0-9_]+$/)
      expect(path, id).toMatch(/^(custom:[a-z0-9_]+\.svg|assets\/[^/]+\/(?:(?:Medium-Light|Medium)\/)?3D\/[^/]+_3d(?:_medium-light|_medium)?\.png)$/)
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


/* ------------------------------------------------------------------ L-12 symbols ------------------------------------------------------------------ */

const ROOT = process.cwd().split(String.fromCharCode(92)).join('/')
const SYMBOL_DIR = `${ROOT}/public/symbols/`
const SRC_DIR = `${ROOT}/src/`

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}${entry.name}`
    if (entry.isDirectory()) out.push(...sourceFiles(`${full}/`))
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(full)
  }
  return out
}

describe('symbol files', () => {
  it('every symbol-map entry has its image in public/symbols', () => {
    const missing: string[] = []
    for (const [id, src] of Object.entries(SYMBOLS)) {
      const file = src.startsWith('custom:') ? `${SYMBOL_DIR}custom/${src.slice(7)}` : `${SYMBOL_DIR}${id}.webp`
      if (!existsSync(file)) missing.push(`${id} → ${file}`)
    }
    expect(missing).toEqual([])
  })

  it('every symbol id written anywhere in src (symbol: "x", <SymbolImg id="x">) is in the map', () => {
    const unknown = new Set<string>()
    for (const file of sourceFiles(SRC_DIR)) {
      const text = readFileSync(file, 'utf8')
      for (const m of text.matchAll(/\bsymbol:\s*'([a-z0-9_]+)'/g)) if (!(m[1] in SYMBOLS)) unknown.add(`${file.replace(SRC_DIR, '')}: ${m[1]}`)
      for (const m of text.matchAll(/<SymbolImg\s+id="([a-z0-9_]+)"/g)) if (!(m[1] in SYMBOLS)) unknown.add(`${file.replace(SRC_DIR, '')}: ${m[1]}`)
    }
    expect([...unknown]).toEqual([])
  })

  it('custom symbols in the map are registered in SymbolImg', () => {
    const text = readFileSync(`${SRC_DIR}ui/SymbolImg.tsx`, 'utf8')
    const registered = new Set([...(/CUSTOM_SYMBOLS = new Set\(\[([^\]]*)\]/.exec(text)?.[1] ?? '').matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]))
    for (const [id, src] of Object.entries(SYMBOLS)) if (src.startsWith('custom:')) expect(registered.has(id), id).toBe(true)
  })
})

describe('opposite meanings never share a symbol (L-12)', () => {
  const symbolOfWord = (id: string) => wordById(id)?.symbol
  const symbolOfPhrase = (id: string) => PHRASES.find((p) => p.id === id)?.symbol
  const WORD_PAIRS: Array<[string, string]> = [
    ['yes', 'no'],
    ['good', 'bad'],
    ['big', 'small'],
    ['open', 'close'],
    ['hot_drink', 'cold_drink'],
    ['hot', 'cold'],
    ['come', 'go'],
    ['like', 'dislike'],
    ['up', 'down'],
    ['happy', 'sad'],
    ['more', 'finished'],
    ['stop', 'go'],
  ]
  it.each(WORD_PAIRS)('%s differs from %s', (a, b) => {
    expect(symbolOfWord(a), a).toBeTruthy()
    expect(symbolOfWord(a), `${a} vs ${b}`).not.toBe(symbolOfWord(b))
  })

  it('phrase opposites differ too', () => {
    expect(symbolOfPhrase('cold')).not.toBe(symbolOfPhrase('hot'))
    expect(symbolOfPhrase('no_thanks')).not.toBe(symbolOfPhrase('thank_you'))
  })

  it('no two core words share an image (a grid cell must be recognisable)', () => {
    const seen = new Map<string, string>()
    const dup: string[] = []
    for (const w of WORDS.filter((x) => x.topic === 'core')) {
      const other = seen.get(w.symbol)
      if (other) dup.push(`${other} / ${w.id}: ${w.symbol}`)
      seen.set(w.symbol, w.id)
    }
    expect(dup).toEqual([])
  })

  it('the roles of kindergarten teacher, teacher, speech therapist, doctor and nurse look different', () => {
    const roles = ['kg_teacher', 'teacher', 'speech_therapist', 'doctor', 'nurse'].map((id) => symbolOfWord(id))
    expect(new Set(roles).size).toBe(roles.length)
  })

  it('no bright-red lead symbols for the question word, waking up, love and anger (spec: no bright red)', () => {
    for (const bad of ['red_question_mark', 'alarm_clock', 'red_heart', 'angry_face']) {
      const used = [...WORDS, ...PHRASES, ...FEELINGS].filter((x) => x.symbol === bad).map((x) => x.id)
      expect(used, bad).toEqual([])
    }
  })

  it('the misleading symbols found by the language QA are gone', () => {
    const banned = new Set([
      'bubble_tea', 'brick', 'fire', 'thong_sandal', 'cook', 'water_wave', 'children_crossing', 'door',
      'counterclockwise_arrows_button', 'clockwise_vertical_arrows', 'leftwards_hand', 'detective', 'large_orange_diamond',
      'small_orange_diamond', 'locked', 'unlocked', 'nesting_dolls', 'woman_dancing', 'speech_balloon',
    ])
    const used = [...WORDS, ...PHRASES].filter((x) => banned.has(x.symbol)).map((x) => `${x.id}: ${x.symbol}`)
    expect(used).toEqual([])
    expect(symbolOfWord('lagman')).toBe('spaghetti')
    expect(symbolOfWord('compote')).toBe('jar')
  })
})

/* ------------------------------------------------------------------ L-09 stress, second pass ------------------------------------------------------------------ */

describe('ruTts stress (second pass over every multi-syllable word)', () => {
  /** Verified stress of words that are easy to get wrong (loanwords, Central-Asian food, endings). */
  const STRESS: Record<string, string> = {
    манты: 'мант+ы',
    какао: 'кака+о',
    лагман: 'лагм+ан',
    самса: 'самс+а',
    арбуз: 'арб+уз',
    банан: 'бан+ан',
    гранат: 'гран+ат',
    виноград: 'виногр+ад',
    помидор: 'помид+ор',
    огурец: 'огур+ец',
    компот: 'комп+от',
    лимонад: 'лимон+ад',
    стакан: 'стак+ан',
    компьютер: 'компь+ютер',
    телефон: 'телеф+он',
    магазин: 'магаз+ин',
    велосипед: 'велосип+ед',
    вертолёт: 'вертол+ёт',
    самолёт: 'самол+ёт',
    барабан: 'бараб+ан',
    красиво: 'крас+иво',
    молоко: 'молок+о',
    верблюд: 'вербл+юд',
    тюбетейка: 'тюбет+ейка',
    накидкой: 'н+акидкой',
    больница: 'больн+ица',
    большой: 'больш+ой',
    температура: 'температ+ура',
    сестра: 'сестр+а',
    мамочка: 'м+амочка',
    папочка: 'п+апочка',
    тишина: 'тишин+а',
    нужна: 'нужн+а',
    фонендоскопом: 'фонендоск+опом',
    близкий: 'бл+изкий',
    близким: 'бл+изким',
    человеком: 'чел+овеком',
    замечательно: 'замеч+ательно',
    попытка: 'поп+ытка',
    держать: 'держ+ать',
    кушать: 'куш+ать',
    горячее: 'гор+ячее',
    холодное: 'хол+одное',
    старший: 'ст+арший',
    младший: 'мл+адший',
    устаю: 'уста+ю',
  }

  function ttsTokens(): Array<{ id: string; token: string }> {
    const out: Array<{ id: string; token: string }> = []
    const push = (id: string, tts?: string) => {
      for (const t of (tts ?? '').toLowerCase().split(/[^а-яё+]+/).filter(Boolean)) out.push({ id, token: t })
    }
    for (const w of WORDS) push(`w.${w.id}`, w.ruTts)
    for (const p of PHRASES) push(`p.${p.id}`, p.ruTts)
    for (const l of [...VOICE_LINES, ...NUMBER_LINES]) push(`ui.${l.id}`, l.ruTts)
    for (const f of FEELINGS) push(`feel.${f.id}`, f.ruTts)
    for (const h of HELPERS) push(`help.${h.id}`, h.ruTts)
    for (const st of STORIES) st.pages.forEach((pg, i) => push(`story.${st.id}.${i}`, pg.ruTts))
    for (const x of ARTICULATION) push(`x.${x.id}`, x.ruInstructionTts)
    return out
  }

  it('the verified words carry the right stress everywhere they are spoken', () => {
    const bad: string[] = []
    for (const { id, token } of ttsTokens()) {
      const expected = STRESS[token.replace(/\+/g, '')]
      if (expected && token !== expected) bad.push(`${id}: ${token} -> ${expected}`)
    }
    expect(bad).toEqual([])
  })

  it('manty and kakao (found by the QA) are fixed', () => {
    expect(wordById('manti')?.ruTts).toBe('мант+ы')
    expect(wordById('cocoa')?.ruTts).toBe('кака+о')
  })

  it('one word is never stressed in two different ways', () => {
    const seen = new Map<string, string>()
    const conflicts: string[] = []
    for (const { id, token } of ttsTokens()) {
      const bare = token.replace(/\+/g, '')
      if ((bare.match(/[аеёиоуыэюя]/g) ?? []).length < 2) continue
      const prev = seen.get(bare)
      if (prev && prev !== token) conflicts.push(`${bare}: ${prev} vs ${token} (${id})`)
      else seen.set(bare, token)
    }
    expect(conflicts).toEqual([])
  })

  it('owl, bee and helicopter sounds are pronounceable by the Russian voice (vowels present)', () => {
    const sound = (id: string) => SOUND_MAKERS.find((s) => s.id === id)!
    expect(sound('owl').sound.ru).toBe('у-ху')
    expect(sound('bee').ruSoundTts).toBe('жу-жу')
    expect(sound('helicopter').ruSoundTts).toBe('тр+а-та-та')
    for (const s of SOUND_MAKERS) expect(s.ruSoundTts ?? s.sound.ru, s.id).toMatch(/[аеёиоуыэюя]/i)
    expect(sound('chicken').sound.uz).toBe('qoʻq-qoʻq')
  })
})

/* ------------------------------------------------------------------ L-05 Russian gender ------------------------------------------------------------------ */

type Dict = { uz: Record<string, string>; ru: Record<string, string> }
const STRING_MODULES = import.meta.glob<Record<string, unknown>>(['../i18n/common.ts', '../**/strings.ts'], { eager: true })

function allRussian(): Array<{ where: string; text: string }> {
  const out: Array<{ where: string; text: string }> = []
  for (const [path, mod] of Object.entries(STRING_MODULES))
    for (const [name, value] of Object.entries(mod)) {
      const d = value as Partial<Dict>
      if (d && typeof d === 'object' && d.uz && d.ru) for (const [key, text] of Object.entries(d.ru)) out.push({ where: `${path}#${name}.${key}`, text })
    }
  for (const { key, value, path } of allStrings()) if (key === 'ru' || key === 'ruSoundTts') out.push({ where: path, text: value })
  return out
}

describe('Russian is gender-neutral (L-05)', () => {
  const GENDERED: Array<[string, RegExp]> = [
    ['slash form like «готов(а)»', /[А-Яа-яЁё]\((?:а|ла|ся|лась|на|ая)\)/],
    ['«Я» + masculine/feminine past verb', /(?:^|[\s«"(—-])[Яя]\s+(?:не\s+|уже\s+|очень\s+|сам\s+|сама\s+)?[а-яё]+(?:л|ла|лся|лась)(?![а-яё])/],
    ['«Ты» + past verb', /(?:^|[\s«"(—-])[Тт]ы\s+(?:не\s+|уже\s+|сам\s+|сама\s+)?[а-яё]+(?:л|ла|лся|лась)(?![а-яё])/],
    ['short adjective after «Я»', /(?:^|[\s«"(—-])[Яя]\s+(?:очень\s+)?(?:готов|рад|должен|уверен|согласен|голоден|прав)(?![а-яё])/],
    ['«сам выбрал» style', /\bсам\s+(?:выбрал|попросил|сказал|сделал|нажал)/i],
    ['gendered praise', /(?:^|[^а-яё])(?:умница|умник|молодец|молодчина)(?![а-яё])/i],
  ]

  it('no gendered first/second-person forms and no gendered praise in any Russian string', () => {
    const bad: string[] = []
    for (const { where, text } of allRussian())
      for (const [label, re] of GENDERED) if (re.test(text)) bad.push(`${where}: «${text}» (${label})`)
    expect(bad).toEqual([])
  })

  it('the former offenders are rewritten', () => {
    expect(wordById('tired')?.ru).toBe('устаю')
    expect(PHRASES.find((p) => p.id === 'tired')?.ru).toBe('Я устаю')
    expect(FEELINGS.find((f) => f.id === 'tired')?.ru).toBe('Я устаю')
    expect(wordById('surprised')?.ru).toBe('удивительно')
    expect(PARENT_STRINGS.ru.lineTopWord).not.toContain('(а)')
    expect(PARENT_STRINGS.ru.lineFeelings).not.toContain('(а)')
  })

  it('progress lines never put a capital letter in the middle of a sentence', () => {
    for (const key of ['lineTopWord', 'lineFeelings', 'lineSpoken', 'lineExercises', 'lineDays'] as const) {
      const text = PARENT_STRINGS.ru[key].replace(/\{\w+\}/g, 'x')
      expect(/[а-яё,]\s+[А-ЯЁ]/.test(text), key).toBe(false)
    }
  })
})

describe('Russian praise / retry lines never scold or command (L-07, L-18)', () => {
  const FORBIDDEN = /хватит|нельзя|не трогай|неправильно|ошибк|неверно|плохо получ|опять|снова не/i
  const calm = [
    ...VOICE_LINES.filter((l) => /^(praise_|retry_|break_|round_|rest|enough_today)/.test(l.id)).map((l) => `${l.id}: ${l.ru}`),
    `exercises.sceneDone: ${EXERCISE_STRINGS.ru.sceneDone}`,
    `exercises.restText: ${EXERCISE_STRINGS.ru.restText}`,
    `exercises.exerciseDone: ${EXERCISE_STRINGS.ru.exerciseDone}`,
    `games.restText: ${GAME_STRINGS.ru.restText}`,
  ]
  it.each(calm)('%s', (line) => {
    expect(line).not.toMatch(FORBIDDEN)
  })

  it('"enough" and "quiet" are first-person needs, not orders', () => {
    const enough = PHRASES.find((p) => p.id === 'enough')!
    expect(enough.uz).not.toBe('Boʻldi')
    expect(enough.ru).not.toBe('Хватит')
    expect(wordById('quiet')).toBeUndefined() // the order-like word «jim / тихо» is gone
    expect(PHRASES.find((p) => p.id === 'need_quiet')?.ru).toBe('Мне нужна тишина')
    expect(EXERCISE_STRINGS.uz.restText).not.toMatch(/aylan/i)
    expect(EXERCISE_STRINGS.ru.restText).not.toMatch(/кружил/i)
  })

  it('effort praise is the same idea in both languages', () => {
    const line = VOICE_LINES.find((l) => l.id === 'praise_harakat')!
    expect(line.uz).toMatch(/harakat/)
    expect(line.ru).toMatch(/попытка/)
  })
})

/* ------------------------------------------------------------------ L-07/L-10/L-11/L-17/L-18/L-20 wording ------------------------------------------------------------------ */

describe('terminology is one-to-one (L-10)', () => {
  it('the exercises section is «Разминка» everywhere in Russian and «Koʻzgu» for the mirror in Uzbek', () => {
    expect(EXERCISE_STRINGS.ru.allExercises).toBe('Вся разминка')
    expect(EXERCISE_STRINGS.ru.toExercises).toBe('К разминке')
    expect(EXERCISE_STRINGS.ru.mirror).toBe('Зеркальце')
    for (const [key, text] of Object.entries(EXERCISE_STRINGS.ru)) expect(text, key).not.toMatch(/Все упражнения|К упражнениям|Зеркало\b/)
    for (const [key, text] of Object.entries(EXERCISE_STRINGS.uz)) expect(text, key).not.toMatch(/\bOyna|\boyna|razminka/i)
    expect(EXERCISE_STRINGS.uz.mirrorTitle).toBe('Koʻzgu')
    expect(PARENT_STRINGS.ru.lineExercises).not.toMatch(/упражнений/)
  })

  it('"reset" is «Заново», never «Сначала» (that is the first-then board word)', () => {
    expect(TIMER_STRINGS.ru.reset).toBe('Заново')
    expect(TOKEN_STRINGS.ru.reset).toBe('Заново')
  })

  it('one Uzbek term for ready-made sentences, one adult-profile kind, one avatar name', () => {
    expect(PARENT_STRINGS.uz.kindAdult).toBe('Katta yoshli')
    expect(PARENT_STRINGS.ru.av_dove).toBe('Муся')
    for (const mod of Object.values(STRING_MODULES))
      for (const value of Object.values(mod)) {
        const d = value as Partial<Dict>
        if (d && typeof d === 'object' && d.uz) for (const text of Object.values(d.uz)) expect(text).not.toMatch(/Tayyor iboralar/)
      }
  })

  it('tips hint does not state a wrong count', () => {
    for (const lang of ['uz', 'ru'] as const) {
      const digits = PARENT_STRINGS[lang].secTipsHint.match(/\d+/g) ?? []
      for (const d of digits) expect(Number(d)).toBe(TIPS.length)
    }
  })
})

describe('Uzbek wording fixes (L-11, L-18, L-20)', () => {
  it('imperatives', () => {
    expect(wordById('dance')?.uz).toBe('raqsga tush')
    expect(wordById('draw')?.uz).toBe('rasm chiz')
    expect(wordById('go')?.uz).toBe('boramiz')
  })

  it('older/younger siblings keep their distinction in Russian', () => {
    expect(wordById('older_brother')?.ru).toBe('старший брат')
    expect(wordById('younger_brother')?.ru).toBe('младший брат')
    expect(wordById('older_sister')?.ru).toBe('старшая сестра')
    expect(wordById('younger_sister')?.ru).toBe('младшая сестра')
  })

  it('colloquial oyi / dada exist next to ona / ota; tish is singular in both languages; vehicles live together; no duplicate song/music', () => {
    expect(wordById('mother')?.uz).toBe('ona')
    expect(wordById('mother_oyi')?.uz).toBe('oyi')
    expect(wordById('father_dada')?.uz).toBe('dada')
    expect(wordById('teeth')?.ru).toBe('зуб')
    for (const id of ['bus', 'car', 'train', 'airplane', 'helicopter', 'bicycle', 'ambulance']) expect(wordById(id)?.topic, id).toBe('toys')
    expect(wordById('song')).toBeUndefined()
    expect(wordById('music')).toBeDefined()
  })

  it('core eat is a child-directed «кушать», not the ambiguous «есть»', () => {
    expect(wordById('eat')?.ru).toBe('кушать')
  })

  it('hot / cold drink words agree', () => {
    expect(wordById('hot_drink')?.ru).toBe('горячее')
    expect(wordById('cold_drink')?.ru).toBe('холодное')
  })
})

describe('social stories keep to the Carol Gray rules (L-17)', () => {
  const all = STORIES.flatMap((s) => s.pages.map((p, i) => ({ id: `${s.id}.${i}`, ...p })))

  it('assume no particular parent', () => {
    for (const p of all) {
      expect(p.uz, p.id).not.toMatch(/\bonam/i)
      expect(p.ru, p.id).not.toMatch(/\bмам[аыуе]|\bмамой/i)
    }
  })

  it('make no promise about pain', () => {
    for (const p of all) {
      if (/ogʻrimaydi/i.test(p.uz)) expect(p.uz, p.id).toMatch(/Odatda ogʻrimaydi/)
      if (/не больно/i.test(p.ru)) expect(p.ru, p.id).toMatch(/Обычно не больно/)
    }
    expect(all.find((p) => p.id === 'haircut.4')?.uz).toContain('Odatda ogʻrimaydi')
    expect(all.find((p) => p.id === 'haircut.4')?.ru).toContain('Обычно не больно')
  })

  it('the stethoscope has one name in both languages and holding a hand is not a handshake', () => {
    const page = all.find((p) => p.id === 'doctor.5')!
    expect(page.uz).toMatch(/fonendoskop/i)
    expect(page.ru).toMatch(/фонендоскоп/i)
    expect(all.find((p) => p.id === 'doctor.7')?.symbol).not.toBe('handshake')
  })

  it('the helper "with mum" no longer assumes who comes along', () => {
    const h = HELPERS.find((x) => x.id === 'with_mom')!
    expect(h.uz).toBe('Yaqin odam bilan')
    expect(h.ru).toBe('С близким человеком')
  })
})

/* ------------------------------------------------------------------ L-04 / L-06 on the real content ------------------------------------------------------------------ */

describe('hyphenation of the whole vocabulary (L-04)', () => {
  const texts: Array<[string, 'uz' | 'ru']> = []
  for (const w of WORDS) texts.push([w.uz, 'uz'], [uzLatnToCyrl(w.uz), 'uz'], [w.ru, 'ru'])
  for (const p of PHRASES) texts.push([p.uz, 'uz'], [uzLatnToCyrl(p.uz), 'uz'], [p.ru, 'ru'])

  it('no fragment ever starts with ь ъ й ʼ ʻ, and the text is unchanged without the soft hyphens', () => {
    const SHY = '­'
    const bad: string[] = []
    for (const [text, lang] of texts) {
      const out = shy(text, lang, 4)
      if (out.replaceAll(SHY, '') !== text) bad.push(`changed: ${text}`)
      // a word may START with й (йўқ); only the continuation fragments of a wrapped word matter
      for (const word of out.split(/\s+/)) for (const frag of word.split(SHY).slice(1)) if (/^[ьъйЬЪЙʼʻ]/.test(frag)) bad.push(`${text} -> ${out}`)
    }
    expect(bad).toEqual([])
  })

  it('the QA examples split cleanly', () => {
    for (const w of ['большой', 'маленький', 'платье', 'одеться', 'больница', 'обезьяна', 'умыться', 'спальня', 'мультик'])
      for (const part of syllablesOf(w, 'ru')) expect(part[0]).not.toMatch(/[ьъй]/)
  })
})

describe('transliteration of the real content (L-06)', () => {
  it('every Uzbek string converts without Latin leftovers (except protected tokens) and keeps loanword spellings', () => {
    const bad: string[] = []
    for (const { key, value, path } of allStrings()) {
      if (key !== 'uz') continue
      const out = uzLatnToCyrl(value)
      const leftovers = out.match(/[A-Za-z]+/g)?.filter((t) => !isKeptLatin(t)) ?? []
      if (leftovers.length) bad.push(`${path}: ${value} -> ${out}`)
    }
    expect(bad).toEqual([])
    expect(uzLatnToCyrl(wordById('cartoon')!.uz)).toBe('мультфильм')
  })

  it('protected acronyms never appear inside a SPOKEN Uzbek text (the synthesizer only reads Cyrillic)', () => {
    const spoken = [
      ...WORDS.map((w) => w.uzTts ?? w.uz),
      ...PHRASES.map((p) => p.uzTts ?? p.uz),
      ...VOICE_LINES.map((l) => l.uz),
      ...FEELINGS.map((f) => f.uz),
      ...HELPERS.map((h) => h.uz),
      ...STORIES.flatMap((st) => st.pages.map((p) => p.uz)),
      ...SOUND_MAKERS.map((m) => m.sound.uz),
    ]
    for (const text of spoken) for (const token of text.match(/[A-Za-z0-9ʻʼ]+/g) ?? []) expect(isKeptLatin(token), `${text} :: ${token}`).toBe(false)
  })
})

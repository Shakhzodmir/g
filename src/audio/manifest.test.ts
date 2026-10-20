import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildManifest } from '../../scripts/audio-manifest'
import { adultSpoken } from '../content/adultgamedata'
import { SOUND_MAKERS } from '../content/animals'
import { ARTICULATION } from '../content/exercises'
import { FEELINGS, HELPERS } from '../content/feelings'
import { GAME_LINES, LISTEN_SENTENCES, LISTEN_TASKS } from '../content/gamedata'
import { PHRASES } from '../content/phrases'
import { STICKERS } from '../content/stickers'
import { STORIES } from '../content/stories'
import { NUMBER_LINES, VOICE_LINES } from '../content/voiceLines'
import { WORDS } from '../content/vocab'

/*
 * Key coverage: every audio key that code speaks and that can be known statically must have a clip
 * in the manifest (otherwise the word is silent for Uzbek on devices without an Uzbek system voice).
 * Keys that are intentionally clip-less: `kb` (typed keyboard text) and `c.<id>` (family's custom cards).
 */

const SRC = join(__dirname, '..')
const manifest = buildManifest()
const has = (lang: 'uz' | 'ru', key: string) => manifest.some((e) => e.lang === lang && e.key === key)
const bothLangs = (key: string) => has('uz', key) && has('ru', key)

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      if (name !== 'content') sourceFiles(p, out)
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(p)
  }
  return out
}
const files = sourceFiles(SRC).map((f) => ({ file: relative(SRC, f).split('\\').join('/'), text: readFileSync(f, 'utf8') }))

const EXEMPT = new Set(['kb'])
/** Template families `<prefix>${…}` and the content that proves each id is in the manifest. */
const FAMILIES: Record<string, string[]> = {
  'w.': WORDS.map((w) => `w.${w.id}`),
  'p.': PHRASES.map((p) => `p.${p.id}`),
  'v.': VOICE_LINES.map((v) => `v.${v.id}`),
  'h.': HELPERS.map((h) => `h.${h.id}`),
  'f.': FEELINGS.map((f) => `f.${f.id}`),
  'sticker.': STICKERS.map((s) => `sticker.${s.id}`),
  'stt.': STORIES.map((s) => `stt.${s.id}`),
  's.': SOUND_MAKERS.map((s) => `s.${s.id}`),
  'o.': SOUND_MAKERS.map((s) => `o.${s.id}`),
  'g.animals.': SOUND_MAKERS.map((s) => `g.animals.${s.id}`),
  'g.find.': WORDS.filter((w) => w.topic !== 'core').map((w) => `g.find.${w.id}`),
  'g.syl.': WORDS.filter((w) => w.syllables).map((w) => `g.syl.${w.id}`),
  'g.ad.': adultSpoken().map((s) => s.key),
  'n.': NUMBER_LINES.map((n) => `n.${n.id.replace(/^num_/, '')}`),
  'x.': [...ARTICULATION.map((x) => `x.${x.id}`), 'x.blow_candles', 'x.blow_dandelion', 'x.blow_boat'],
  'c.': [], // custom cards: no bundled clip by design
}

describe('audio manifest key coverage', () => {
  it('has a clip for every literal key passed to speak()', () => {
    const missing: string[] = []
    for (const { file, text } of files) {
      for (const m of text.matchAll(/\bkey:\s*'([^']+)'/g)) {
        if (!EXEMPT.has(m[1]) && !bothLangs(m[1])) missing.push(`${file}: ${m[1]}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('has a voice line for every id passed to voice()/line()/voiceLine()', () => {
    const missing: string[] = []
    for (const { file, text } of files) {
      for (const call of text.matchAll(/\b(?:voice|line|voiceLine)\(([^()]*)\)/g)) {
        for (const id of call[1].matchAll(/'([a-z0-9_]+)'(?!\s*\?)/g)) if (!bothLangs(`v.${id[1]}`)) missing.push(`${file}: v.${id[1]}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('only uses audio key families the manifest knows about', () => {
    const unknown: string[] = []
    for (const { file, text } of files) {
      for (const m of text.matchAll(/\bkey:\s*`([^`$]*)\$\{/g)) {
        if (!Object.keys(FAMILIES).some((p) => m[1].startsWith(p))) unknown.push(`${file}: ${m[1]}\${…}`)
      }
    }
    expect(unknown).toEqual([])
  })

  it('has clips (both languages) for every id of every key family', () => {
    const missing: string[] = []
    for (const keys of Object.values(FAMILIES)) for (const k of keys) if (!bothLangs(k)) missing.push(k)
    expect(missing).toEqual([])
  })

  it('has clips (both languages) for every spoken line of the kids games', () => {
    for (const l of [...GAME_LINES, ...LISTEN_SENTENCES, ...LISTEN_TASKS]) expect(bothLangs(l.key), l.key).toBe(true)
  })

  it('has clips for all 24 stickers, the adult voice prompt and the token counters', () => {
    expect(STICKERS).toHaveLength(24)
    for (const s of STICKERS) expect(bothLangs(`sticker.${s.id}`), `sticker.${s.id}`).toBe(true)
    expect(bothLangs('x.voice_adult')).toBe(true)
    for (const k of ['v.tok_full', 'v.tok_reward', 'v.tok_one_more', 'v.tok_more', 'v.tok_star_count', 'v.tok_star_few', 'v.tok_star_many']) {
      expect(bothLangs(k), k).toBe(true)
    }
  })
})

// Collects every text the app speaks into scripts/.cache/audio-manifest.json for scripts/gen_audio.py.
// Uzbek is sent to the synthesizer in Cyrillic (unambiguous ў/ғ; the Silero Latin alphabet has no ʻ).
// Run: npx tsx scripts/build-audio-manifest.ts
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { uzLatnToCyrl } from '../src/i18n/orthography'

type Entry = { key: string; lang: 'uz' | 'ru'; text: string }

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const entries: Entry[] = []
const seen = new Set<string>()

function add(key: string, uz: string | undefined, ru: string | undefined) {
  if (uz && !seen.has(`uz:${key}`)) {
    seen.add(`uz:${key}`)
    entries.push({ key, lang: 'uz', text: uzLatnToCyrl(uz).replace(/\?$/, '?') })
  }
  if (ru && !seen.has(`ru:${key}`)) {
    seen.add(`ru:${key}`)
    entries.push({ key, lang: 'ru', text: ru })
  }
}

type AnyRec = Record<string, unknown>
async function load(name: string): Promise<AnyRec> {
  try {
    return (await import(`../src/content/${name}.ts`)) as AnyRec
  } catch (e) {
    console.warn(`(skip ${name}: ${(e as Error).message})`)
    return {}
  }
}

const vocab = await load('vocab')
const topics = await load('topics')
const phrases = await load('phrases')
const animals = await load('animals')
const exercises = await load('exercises')
const voice = await load('voiceLines')
const feelings = await load('feelings')
const stories = await load('stories')

interface W { id: string; uz: string; ru: string; uzTts?: string; ruTts?: string; topic?: string; syllables?: { uz: string; ru: string } }
const words = (vocab.WORDS as W[] | undefined) ?? []
for (const w of words) {
  add(`w.${w.id}`, w.uzTts ?? w.uz, w.ruTts ?? w.ru)
  if (w.topic && w.topic !== 'core') add(`g.find.${w.id}`, `Qani ${w.uzTts ?? w.uz}?`, `Где ${w.ruTts ?? w.ru}?`)
  if (w.syllables) add(`g.syl.${w.id}`, w.syllables.uz.split('-').join(', '), w.syllables.ru.split('-').join(', '))
}
for (const t of (topics.TOPICS as W[] | undefined) ?? []) add(`t.${t.id}`, t.uz, t.ruTts ?? t.ru)
for (const p of (phrases.PHRASES as W[] | undefined) ?? []) add(`p.${p.id}`, p.uzTts ?? p.uz, p.ruTts ?? p.ru)

interface SM { id: string; uz: string; ru: string; ruTts?: string; sound: { uz: string; ru: string }; ruSoundTts?: string }
for (const s of (animals.SOUND_MAKERS as SM[] | undefined) ?? []) {
  add(`s.${s.id}`, s.uz, s.ruTts ?? s.ru)
  add(`o.${s.id}`, s.sound.uz, s.ruSoundTts ?? s.sound.ru)
  add(`g.animals.${s.id}`, `Kim ${s.sound.uz} deydi?`, `Кто говорит ${s.ruSoundTts ?? s.sound.ru}?`)
}

interface EX { id: string; title: { uz: string; ru: string }; instruction: { uz: string; ru: string }; ruInstructionTts?: string }
for (const x of (exercises.ARTICULATION as EX[] | undefined) ?? []) {
  add(`xt.${x.id}`, x.title.uz, x.title.ru)
  add(`x.${x.id}`, x.instruction.uz, x.ruInstructionTts ?? x.instruction.ru)
}

for (const v of (voice.VOICE_LINES as W[] | undefined) ?? []) add(`v.${v.id}`, v.uzTts ?? v.uz, v.ruTts ?? v.ru)
for (const n of (voice.NUMBER_LINES as W[] | undefined) ?? []) add(`n.${n.id.replace(/^num_/, '')}`, n.uzTts ?? n.uz, n.ruTts ?? n.ru)
for (const f of (feelings.FEELINGS as W[] | undefined) ?? []) add(`f.${f.id}`, f.uz, f.ruTts ?? f.ru)
for (const h of (feelings.HELPERS as W[] | undefined) ?? []) add(`h.${h.id}`, h.uz, h.ruTts ?? h.ru)

interface ST { id: string; title: { uz: string; ru: string }; pages: Array<{ uz: string; ru: string; ruTts?: string }> }
for (const s of (stories.STORIES as ST[] | undefined) ?? []) {
  add(`stt.${s.id}`, s.title.uz, s.title.ru)
  s.pages.forEach((p, i) => add(`st.${s.id}.${i}`, p.uz, p.ruTts ?? p.ru))
}

// Exercise prompts spoken by the blow / voice games (keys match src/features/exercises).
add('x.blow_candles', 'Shamlarni puflab oʻchir.', 'Подуй и задуй св+ечи.')
add('x.blow_dandelion', 'Qoqioʻtni puflab uchir.', 'Подуй на одув+анчик.')
add('x.blow_boat', 'Qayiqchani puflab suzdir.', 'Подуй — кор+аблик поплывёт.')
add('x.voice', 'Ovoz chiqar: a-a-a. Musicha yuqoriga uchadi.', 'Скажи а-а-а — М+уся полетит вверх.')

// Fixed UI utterances referenced directly by app code.
add('ui.greeting', 'Salom! Men Musicha.', 'Прив+ет! Я М+уся.')
add('p.need_break', 'Menga tanaffus kerak', 'Мне н+ужен перер+ыв')

mkdirSync(join(root, 'scripts', '.cache'), { recursive: true })
writeFileSync(join(root, 'scripts', '.cache', 'audio-manifest.json'), JSON.stringify(entries, null, 1))
const chars = entries.reduce((n, e) => n + e.text.length, 0)
console.log(`audio manifest: ${entries.length} clips (${entries.filter((e) => e.lang === 'uz').length} uz, ${entries.filter((e) => e.lang === 'ru').length} ru), ${chars} characters`)

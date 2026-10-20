// Pure builder of the speech-clip manifest: every text the app speaks from a bundled clip.
// Used by scripts/build-audio-manifest.ts (writes the JSON for gen_audio.py) and by the coverage test
// src/audio/manifest.test.ts (fails when code speaks a statically-known key that has no manifest entry).
// Uzbek is sent to the synthesizer in Cyrillic (unambiguous ў/ғ; the Silero Latin alphabet has no ʻ).
import { adultSpoken } from '../src/content/adultgamedata'
import { GAME_LINES, LISTEN_SENTENCES, LISTEN_TASKS } from '../src/content/gamedata'
import { SOUND_MAKERS } from '../src/content/animals'
import { ARTICULATION } from '../src/content/exercises'
import { FEELINGS, HELPERS } from '../src/content/feelings'
import { PHRASES } from '../src/content/phrases'
import { STICKERS } from '../src/content/stickers'
import { STORIES } from '../src/content/stories'
import { TOPICS } from '../src/content/topics'
import { VOICE_LINES, NUMBER_LINES } from '../src/content/voiceLines'
import { WORDS } from '../src/content/vocab'
import { uzLatnToCyrl } from '../src/i18n/orthography'

export interface ManifestEntry {
  key: string
  lang: 'uz' | 'ru'
  /** Silero input: Uzbek in Cyrillic, Russian with `+` stress marks. */
  text: string
  /** Uz only: canonical Uzbek Latin exactly as in the content (ʻ / ʼ), for Azure Neural TTS. */
  latin?: string
  /** Ru only: the Russian text without `+` stress marks (ё kept), for Azure Neural TTS. */
  plain?: string
}

/** Stress marks (`+` before the stressed vowel) for sticker names, which the content files do not carry. */
const STICKER_RU_TTS: Record<string, string> = {
  anor: 'Гран+ат',
  non: 'Леп+ёшка',
  doppi: 'Тюбет+ейка',
  somsa: 'С+амса',
  palov: 'Плов',
  choynak: 'Ч+айник',
  piyola: 'Пи+ала',
  qovun: 'Д+ыня',
  tarvuz: 'Арб+уз',
  uzum: 'Вин+оград',
  gilos: 'Чер+ешня',
  shaftoli: 'П+ерсик',
  tuya: 'Верблюд',
  lola: 'Тюльп+ан',
  kungaboqar: 'Подс+олнух',
  musicha: 'М+уся',
  qozichoq: 'Ягнёнок',
  kapalak: 'Б+абочка',
  baliqcha: 'Р+ыбка',
  varrak: 'Возд+ушный з+мей',
  kamalak: 'Р+адуга',
  quyosh: 'Сол+нышко',
  yulduz: 'Звёздочка',
  ayiqcha: 'М+ишка',
}

interface W {
  id: string
  uz: string
  ru: string
  uzTts?: string
  ruTts?: string
  topic?: string
  syllables?: { uz: string; ru: string }
}

export function buildManifest(): ManifestEntry[] {
  const entries: ManifestEntry[] = []
  const seen = new Set<string>()

  function add(key: string, uz: string | undefined, ru: string | undefined) {
    if (uz && !seen.has(`uz:${key}`)) {
      seen.add(`uz:${key}`)
      entries.push({ key, lang: 'uz', text: uzLatnToCyrl(uz), latin: uz })
    }
    if (ru && !seen.has(`ru:${key}`)) {
      seen.add(`ru:${key}`)
      entries.push({ key, lang: 'ru', text: ru, plain: ru.replace(/\+/g, '') })
    }
  }

  for (const w of WORDS as W[]) {
    add(`w.${w.id}`, w.uzTts ?? w.uz, w.ruTts ?? w.ru)
    if (w.topic && w.topic !== 'core') add(`g.find.${w.id}`, `Qani ${w.uzTts ?? w.uz}?`, `Где ${w.ruTts ?? w.ru}?`)
    if (w.syllables) add(`g.syl.${w.id}`, w.syllables.uz.split('-').join(', '), w.syllables.ru.split('-').join(', '))
  }
  for (const t of TOPICS as W[]) add(`t.${t.id}`, t.uz, t.ruTts ?? t.ru)
  for (const p of PHRASES as W[]) add(`p.${p.id}`, p.uzTts ?? p.uz, p.ruTts ?? p.ru)

  // Adult training games (src/features/games/adult): names of their own items, cues, sentences, questions, situations: keys `g.ad.*`.
  for (const s of adultSpoken()) add(s.key, s.uz, s.ruTts)
  // Children's games added in round 3 (src/features/games/*Game.tsx, src/content/gamedata.ts): keys `g.count.*`, `g.odd.*`, `g.routine.*`, `g.sound.*`, `g.build.*`, `g.opp.*`, `g.point.*`.
  for (const l of [...GAME_LINES, ...LISTEN_SENTENCES, ...LISTEN_TASKS]) add(l.key, l.uz, l.ruTts ?? l.ru)

  // Sticker album (src/features/games/Album.tsx, schedule cards): key `sticker.<id>`.
  for (const s of STICKERS as W[]) add(`sticker.${s.id}`, s.uzTts ?? s.uz, s.ruTts ?? STICKER_RU_TTS[s.id] ?? s.ru)

  interface SM {
    id: string
    uz: string
    ru: string
    ruTts?: string
    sound: { uz: string; ru: string }
    ruSoundTts?: string
  }
  for (const s of SOUND_MAKERS as SM[]) {
    add(`s.${s.id}`, s.uz, s.ruTts ?? s.ru)
    add(`o.${s.id}`, s.sound.uz, s.ruSoundTts ?? s.sound.ru)
    add(`g.animals.${s.id}`, `Kim ${s.sound.uz} deydi?`, `Кто говорит ${s.ruSoundTts ?? s.sound.ru}?`)
  }

  interface EX {
    id: string
    title: { uz: string; ru: string }
    instruction: { uz: string; ru: string }
    ruInstructionTts?: string
  }
  for (const x of ARTICULATION as EX[]) {
    add(`xt.${x.id}`, x.title.uz, x.title.ru)
    add(`x.${x.id}`, x.instruction.uz, x.ruInstructionTts ?? x.instruction.ru)
  }

  for (const v of VOICE_LINES as W[]) add(`v.${v.id}`, v.uzTts ?? v.uz, v.ruTts ?? v.ru)
  for (const n of NUMBER_LINES as W[]) add(`n.${n.id.replace(/^num_/, '')}`, n.uzTts ?? n.uz, n.ruTts ?? n.ru)
  for (const f of FEELINGS as W[]) add(`f.${f.id}`, f.uz, f.ruTts ?? f.ru)
  for (const h of HELPERS as W[]) add(`h.${h.id}`, h.uz, h.ruTts ?? h.ru)

  interface ST {
    id: string
    title: { uz: string; ru: string }
    pages: Array<{ uz: string; ru: string; ruTts?: string }>
  }
  for (const s of STORIES as ST[]) {
    add(`stt.${s.id}`, s.title.uz, s.title.ru)
    s.pages.forEach((p, i) => add(`st.${s.id}.${i}`, p.uz, p.ruTts ?? p.ru))
  }

  // Exercise prompts spoken by the blow / voice games (keys match src/features/exercises).
  add('x.blow_candles', 'Shamlarni puflab oʻchir.', 'Подуй и задуй св+ечи.')
  add('x.blow_dandelion', 'Qoqioʻtni puflab uchir.', 'Подуй на одув+анчик.')
  add('x.blow_boat', 'Qayiqchani puflab suzdir.', 'Подуй — кор+аблик поплывёт.')
  add('x.voice', 'Ovoz chiqar: a-a-a. Musicha yuqoriga uchadi.', 'Скажи а-а-а — М+уся полетит вверх.')
  // Adult variant of the voice game (formal register, no mascot).
  add('x.voice_adult', 'Ovoz chiqaring: a-a-a. Shar yuqoriga koʻtariladi.', 'Произн+есите а-а-а — шар подним+ется.')

  // Fixed UI utterances referenced directly by app code.
  add('ui.greeting', 'Salom! Men Musicha.', 'Прив+ет! Я М+уся.')
  add('p.need_break', 'Menga tanaffus kerak', 'Мне н+ужен перер+ыв')

  return entries
}

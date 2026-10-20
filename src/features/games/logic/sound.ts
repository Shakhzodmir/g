import { shuffle } from '../../../lib/random'
import type { SpeechLang } from '../../../i18n/types'
import type { Word } from '../../../content/types'
import type { Level } from './rounds'

/*
 * "Qaysi tovush?": first-sound awareness. The first sound of a word is language specific, so it is read from the
 * word's own spelling in the speech language. Only easy sounds are used; Russian has no o- (akanye: "огурец"
 * starts with "a") and no isolated letter names are ever spoken: the child hears a word and a sentence.
 */

export const SOUNDS: Record<SpeechLang, string[]> = {
  uz: ['m', 'b', 's', 't', 'a', 'o'],
  ru: ['м', 'б', 'с', 'т', 'а'],
}

const UZ_DIGRAPHS = ['oʻ', 'gʻ', 'sh', 'ch', 'ng']

/** First sound (as a letter) of a word in a language, or '' when it starts with something ambiguous. */
export function firstSound(w: Pick<Word, 'uz' | 'ru'>, lang: SpeechLang): string {
  if (lang === 'ru') {
    const t = w.ru.trim().toLowerCase()
    // "тю-", "мя-", "бя-" etc. are soft: skip to keep the sounds clean.
    if (/^[мбст][яюеёиь]/.test(t)) return ''
    return t[0] ?? ''
  }
  const t = w.uz.trim().toLowerCase().replace(/[‘’'`]/g, 'ʻ')
  for (const d of UZ_DIGRAPHS) if (t.startsWith(d)) return d
  return t[0] ?? ''
}

export const SOUND_OPTIONS: Record<Level, number> = { 1: 2, 2: 3, 3: 3 }

export interface SoundItem {
  target: Word
  sound: string
  /** The one picture that begins like the target (a different word). */
  correct: Word
  options: Word[]
}

/** Picturable words grouped by their (easy) first sound; one word per picture. */
export function soundGroups(words: readonly Word[], lang: SpeechLang): Map<string, Word[]> {
  const allowed = new Set(SOUNDS[lang])
  const bySymbol = new Set<string>()
  const groups = new Map<string, Word[]>()
  for (const w of words) {
    if (w.fitz !== 'thing' && w.fitz !== 'people') continue
    if (w.topic === 'core') continue
    const s = firstSound(w, lang)
    if (!allowed.has(s) || bySymbol.has(w.symbol)) continue
    bySymbol.add(w.symbol)
    if (!groups.has(s)) groups.set(s, [])
    groups.get(s)!.push(w)
  }
  for (const [s, list] of groups) if (list.length < 2) groups.delete(s)
  return groups
}

export function makeSoundRound(words: readonly Word[], lang: SpeechLang, level: Level, rand: () => number = Math.random, size = 5, previous?: string): SoundItem[] {
  const groups = soundGroups(words, lang)
  const sounds = [...groups.keys()]
  if (sounds.length < 2) return []
  const order = shuffle(sounds, rand)
  if (previous && order.length > 1 && order[0] === previous) order.push(order.shift()!)
  const n = SOUND_OPTIONS[level]
  const items: SoundItem[] = []
  for (let i = 0; i < size; i++) {
    const sound = order[i % order.length]
    const [target, correct] = shuffle(groups.get(sound)!, rand)
    const otherSounds = shuffle(sounds.filter((s) => s !== sound), rand).slice(0, n - 1)
    const distractors = otherSounds.map((s) => shuffle(groups.get(s)!, rand)[0])
    items.push({ target, sound, correct, options: shuffle([correct, ...distractors], rand) })
  }
  return items
}

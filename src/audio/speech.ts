import audioIndex from '../content/audio-index.json'
import type { AudioKey } from '../content/types'
import { normalizeUz } from '../i18n/orthography'
import type { Bi, SpeechLang } from '../i18n/types'
import { db, dbAvailable } from '../store/db'
import { getProfile } from '../store/profile'
import { emitLevel, onLevel, playUrl, stopPlayback } from './player'
import { systemVoiceFor } from './voices'

export type SpeakSource = 'recording' | 'clip' | 'system' | 'none'

export interface SpeakItem {
  /** Bundled clip key (w.water, p.help …) or a custom-card key (c.<id>). */
  key: AudioKey
  text: Bi
}

const clips: Record<SpeechLang, Set<string>> = {
  uz: new Set((audioIndex as { uz: string[] }).uz),
  ru: new Set((audioIndex as { ru: string[] }).ru),
}

export function hasClip(key: AudioKey, lang: SpeechLang): boolean {
  return clips[lang].has(key)
}

export function clipUrl(key: AudioKey, lang: SpeechLang): string {
  return `${import.meta.env.BASE_URL}audio/${lang}/${encodeURIComponent(key)}.mp3`
}

/** Decision table for where a spoken item comes from (pure; unit-tested). */
export function resolveSource(p: { hasRecording: boolean; hasClip: boolean; hasSystemVoice: boolean; preferSystem: boolean }): SpeakSource {
  if (p.hasRecording) return 'recording'
  if (p.hasClip && !(p.preferSystem && p.hasSystemVoice)) return 'clip'
  if (p.hasSystemVoice) return 'system'
  if (p.hasClip) return 'clip'
  return 'none'
}

export function recordingId(profileId: string, key: AudioKey, lang: SpeechLang): string {
  return `${profileId}:${lang}:${key}`
}

async function findRecording(key: AudioKey, lang: SpeechLang): Promise<Blob | null> {
  if (!(await dbAvailable())) return null
  try {
    const row = await db.recordings.get(recordingId(getProfile().id, key, lang))
    return row?.blob ?? null
  } catch {
    return null
  }
}

let speakToken = 0
const noneListeners = new Set<(text: string) => void>()

/** Notified when nothing could be spoken, so the UI can show the text big and suggest recording. */
export function onUnspoken(cb: (text: string) => void): () => void {
  noneListeners.add(cb)
  return () => noneListeners.delete(cb)
}

function speakSystem(text: string, lang: SpeechLang, voice: SpeechSynthesisVoice, rate: number, volume: number): Promise<void> {
  return new Promise((resolve) => {
    const synth = globalThis.speechSynthesis
    const u = new SpeechSynthesisUtterance(text)
    u.voice = voice
    u.lang = voice.lang || (lang === 'uz' ? 'uz-UZ' : 'ru-RU')
    u.rate = rate
    u.volume = volume
    // speechSynthesis gives no audio stream; animate the beak with a gentle pulse while speaking.
    let pulse = 0
    const iv = setInterval(() => emitLevel(0.35 + 0.35 * Math.abs(Math.sin((pulse += 0.6)))), 90)
    const end = () => {
      clearInterval(iv)
      emitLevel(0)
      resolve()
    }
    u.onend = end
    u.onerror = end
    synth.speak(u)
  })
}

let sequence = 0

async function speakOne(item: SpeakItem, lang: SpeechLang): Promise<{ source: SpeakSource }> {
  const token = ++speakToken
  stopPlayback()
  try {
    globalThis.speechSynthesis?.cancel()
  } catch {
    /* ignore */
  }
  const { voice: v } = getProfile()
  const text = lang === 'uz' ? normalizeUz(item.text.uz) : item.text.ru
  const [recording, system] = await Promise.all([findRecording(item.key, lang), systemVoiceFor(lang)])
  if (token !== speakToken) return { source: 'none' }
  const source = resolveSource({ hasRecording: !!recording, hasClip: hasClip(item.key, lang), hasSystemVoice: !!system, preferSystem: v.preferSystem })
  try {
    if (source === 'recording' && recording) {
      const url = URL.createObjectURL(recording)
      try {
        await playUrl(url, { volume: v.volume })
      } finally {
        URL.revokeObjectURL(url)
      }
    } else if (source === 'clip') {
      await playUrl(clipUrl(item.key, lang), { volume: v.volume, rate: v.rate })
    } else if (source === 'system' && system) {
      await speakSystem(text, lang, system, v.rate, v.volume)
    } else {
      noneListeners.forEach((l) => l(text))
    }
  } catch {
    if (token !== speakToken) return { source: 'none' }
    // A clip failed (e.g. not cached yet while offline): try the system voice, then show the text.
    if (system && source !== 'system') {
      await speakSystem(text, lang, system, v.rate, v.volume)
      return { source: 'system' }
    }
    noneListeners.forEach((l) => l(text))
    return { source: 'none' }
  }
  return { source }
}

/** Speaks one item (defaults to the profile's speech language). Cancels anything currently speaking. */
export function speak(item: SpeakItem, lang: SpeechLang = getProfile().speechLang): Promise<{ source: SpeakSource }> {
  sequence++
  return speakOne(item, lang)
}

/** Speaks items one after another (message bar). Any new speak/stop cancels the sequence. */
export async function speakSequence(items: SpeakItem[], lang: SpeechLang = getProfile().speechLang): Promise<void> {
  const mine = ++sequence
  for (const item of items) {
    if (mine !== sequence) return
    await speakOne(item, lang)
    if (mine !== sequence) return
    await new Promise((r) => setTimeout(r, 120))
  }
}

export function stopSpeaking(): void {
  sequence++
  speakToken++
  stopPlayback()
  try {
    globalThis.speechSynthesis?.cancel()
  } catch {
    /* ignore */
  }
}

export function onSpeechLevel(cb: (level: number) => void): () => void {
  return onLevel(cb)
}

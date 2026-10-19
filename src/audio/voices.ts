import type { SpeechLang } from '../i18n/types'

/**
 * Picks a system voice for the language. Exact region match first, then language prefix.
 * Never falls back to a different language (a Turkish or Kazakh voice reading Uzbek teaches wrong sounds).
 */
export function pickVoice(voices: readonly Pick<SpeechSynthesisVoice, 'lang' | 'name' | 'localService'>[], lang: SpeechLang) {
  const norm = (l: string) => l.toLowerCase().replace('_', '-')
  const exact = lang === 'uz' ? 'uz-uz' : 'ru-ru'
  const candidates = voices.filter((v) => norm(v.lang) === exact || norm(v.lang).startsWith(`${lang}-`) || norm(v.lang) === lang)
  if (!candidates.length) return null
  const score = (v: (typeof candidates)[number]) =>
    (norm(v.lang) === exact ? 4 : 0) + (/natural|neural|online/i.test(v.name) ? 2 : 0) + (v.localService ? 1 : 0)
  return [...candidates].sort((a, b) => score(b) - score(a))[0]
}

let cached: SpeechSynthesisVoice[] | null = null
let pending: Promise<SpeechSynthesisVoice[]> | null = null
let watching = false
/** True once a wait for the list has ended (even empty): later calls never wait again, the watcher keeps the cache fresh. */
let settled = false

/** Keeps the cache current: Chrome fills the list asynchronously and may change it later. */
function watchVoices(synth: SpeechSynthesis): void {
  if (watching) return
  watching = true
  try {
    synth.addEventListener?.('voiceschanged', () => {
      const now = synth.getVoices()
      if (now.length) cached = now
    })
  } catch {
    /* ignore */
  }
}

/** Voices known right now, without waiting (empty until the browser has filled the list). */
export function voicesNow(): SpeechSynthesisVoice[] {
  const synth = globalThis.speechSynthesis
  if (!synth) return []
  try {
    const now = synth.getVoices()
    if (now.length) cached = now
  } catch {
    /* ignore */
  }
  return cached ?? []
}

/** Synchronous system-voice lookup from what is known now. Never waits. */
export function systemVoiceNow(lang: SpeechLang): SpeechSynthesisVoice | null {
  return (pickVoice(voicesNow(), lang) as SpeechSynthesisVoice | null) ?? null
}

/**
 * Resolves the voice list (Chrome fills it asynchronously). Empty when the API is missing or the device has
 * no voices at all. One shared wait per call site: concurrent callers reuse the same pending promise.
 */
export function loadVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  const synth = globalThis.speechSynthesis
  if (!synth) return Promise.resolve([])
  const now = voicesNow()
  if (now.length || settled) return Promise.resolve(now)
  if (pending) return pending
  watchVoices(synth)
  pending = new Promise<SpeechSynthesisVoice[]>((resolve) => {
    let timer: ReturnType<typeof setTimeout>
    const finish = () => {
      clearTimeout(timer)
      synth.removeEventListener?.('voiceschanged', finish)
      pending = null
      settled = true
      resolve(voicesNow())
    }
    synth.addEventListener?.('voiceschanged', finish, { once: true })
    timer = setTimeout(finish, timeoutMs)
  })
  return pending
}

/** Starts filling the voice cache in the background (call once at app start). Never throws, never blocks. */
export function preloadVoices(): void {
  try {
    void loadVoices()
  } catch {
    /* ignore */
  }
}

export async function systemVoiceFor(lang: SpeechLang): Promise<SpeechSynthesisVoice | null> {
  return (pickVoice(await loadVoices(), lang) as SpeechSynthesisVoice | null) ?? null
}

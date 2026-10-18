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

/** Resolves the voice list (Chrome fills it asynchronously). Empty when the API is missing. */
export function loadVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  const synth = globalThis.speechSynthesis
  if (!synth) return Promise.resolve([])
  const now = synth.getVoices()
  if (now.length) {
    cached = now
    return Promise.resolve(now)
  }
  if (cached) return Promise.resolve(cached)
  return new Promise((resolve) => {
    const done = () => {
      cached = synth.getVoices()
      resolve(cached)
    }
    synth.addEventListener?.('voiceschanged', done, { once: true })
    setTimeout(done, timeoutMs)
  })
}

export async function systemVoiceFor(lang: SpeechLang): Promise<SpeechSynthesisVoice | null> {
  return (pickVoice(await loadVoices(), lang) as SpeechSynthesisVoice | null) ?? null
}

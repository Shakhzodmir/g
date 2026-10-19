import audioIndex from '../content/audio-index.json'
import type { SpeechLang } from '../i18n/types'
import { clipUrl } from './speech'

const CACHE = 'audio-clips'

/**
 * Downloads every clip of one language into the service-worker runtime cache in the background,
 * so the communicator keeps speaking offline. Idempotent and resumable (skips cached files).
 */
export async function prefetchLanguagePack(lang: SpeechLang, onProgress?: (done: number, total: number) => void): Promise<void> {
  if (typeof caches === 'undefined') return
  const keys = (audioIndex as Record<SpeechLang, string[]>)[lang] ?? []
  const cache = await caches.open(CACHE)
  let done = 0
  const queue = keys.map((k) => new URL(clipUrl(k, lang), location.href).href)
  const worker = async () => {
    while (queue.length) {
      const url = queue.shift()!
      try {
        if (!(await cache.match(url))) {
          const res = await fetch(url)
          if (res.ok) await cache.put(url, res)
        }
      } catch {
        /* offline or quota: try again next launch */
      }
      onProgress?.(++done, keys.length)
    }
  }
  await Promise.all([worker(), worker(), worker()])
}

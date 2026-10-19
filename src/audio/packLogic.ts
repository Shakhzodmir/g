import versions from '../content/audio-versions.json'
import type { SpeechLang } from '../i18n/types'

/** Short content hash of one clip (from gen_audio.py), '' when unknown (dev, new key before regeneration). */
export function clipVersion(key: string, lang: SpeechLang): string {
  return (versions as Record<SpeechLang, Record<string, string>>)[lang]?.[key] ?? ''
}

/**
 * URL of a bundled clip. The `?v=` hash changes whenever the clip is regenerated, so an installed device
 * (service worker: CacheFirst, one year) fetches the new file instead of replaying the old one forever.
 */
export function versionedClipUrl(base: string, key: string, lang: SpeechLang, version = clipVersion(key, lang)): string {
  const path = `${base}audio/${lang}/${encodeURIComponent(key)}.mp3`
  return version ? `${path}?v=${version}` : path
}

const stripQuery = (url: string) => url.split('?')[0]

export interface PackPlan {
  /** Wanted URLs that are not cached yet. */
  missing: string[]
  /** Cached clip URLs that can be deleted: an old version whose current version is cached, or a clip that no longer exists. */
  stale: string[]
}

/**
 * Compares the cache with the wanted (versioned) URLs of all languages. An old version is only dropped once its
 * replacement is cached, so a device that updates the app while offline keeps speaking with the old clips.
 */
export function planPackSync(cached: readonly string[], wanted: readonly string[]): PackPlan {
  const have = new Set(cached)
  const want = new Set(wanted)
  const wantedPaths = new Set(wanted.map(stripQuery))
  const missing = wanted.filter((u) => !have.has(u))
  const stale = cached.filter((u) => {
    if (want.has(u)) return false
    const path = stripQuery(u)
    if (!wantedPaths.has(path)) return true
    return wanted.some((w) => stripQuery(w) === path && have.has(w))
  })
  return { missing, stale }
}

export interface ConnectionInfo {
  saveData?: boolean
  effectiveType?: string
  type?: string
}

export type PrefetchPolicy = 'skip' | 'idle' | 'now'

/**
 * Whether to download the language pack in the background: never with Data Saver or on 2G; on 3G / cellular only
 * when the device is idle; otherwise at once. An unknown connection (Safari, Firefox) counts as fine.
 */
export function prefetchPolicy(c: ConnectionInfo | undefined): PrefetchPolicy {
  if (!c) return 'now'
  if (c.saveData) return 'skip'
  if (c.effectiveType === 'slow-2g' || c.effectiveType === '2g') return 'skip'
  if (c.effectiveType === '3g' || c.type === 'cellular') return 'idle'
  return 'now'
}

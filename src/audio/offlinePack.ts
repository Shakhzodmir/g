import { create } from 'zustand'
import audioIndex from '../content/audio-index.json'
import type { SpeechLang } from '../i18n/types'
import { planPackSync, prefetchPolicy, type ConnectionInfo } from './packLogic'
import { clipUrl } from './speech'

const CACHE = 'audio-clips'

export type PackState = 'idle' | 'running' | 'done' | 'partial' | 'skipped'

export interface PackStatus {
  lang: SpeechLang | null
  /** Clips of `lang` that are cached (current version). */
  done: number
  total: number
  state: PackState
  /** Why a download was skipped: Data Saver or a 2G connection. */
  reason: 'saveData' | 'slowNetwork' | null
}

/** Offline pack status for the parent zone ("Offline: ready 890/890"). */
export const usePackStatus = create<PackStatus>()(() => ({ lang: null, done: 0, total: 0, state: 'idle', reason: null }))

const connection = (): ConnectionInfo | undefined => (globalThis.navigator as (Navigator & { connection?: ConnectionInfo }) | undefined)?.connection

const absolute = (url: string) => new URL(url, location.href).href
const wantedUrls = (lang: SpeechLang) => ((audioIndex as Record<SpeechLang, string[]>)[lang] ?? []).map((k) => absolute(clipUrl(k, lang)))

function whenIdle(): Promise<void> {
  return new Promise((resolve) => {
    const ric = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback
    if (ric) ric(() => resolve(), { timeout: 15_000 })
    else setTimeout(resolve, 8000)
  })
}

interface PrefetchOptions {
  /** Ignore Data Saver / slow-network rules (an explicit "download now" button). */
  force?: boolean
  onProgress?: (done: number, total: number) => void
}

let running: { lang: SpeechLang; promise: Promise<void> } | null = null

/**
 * Downloads every clip of ONE language (the speech language) into the service-worker cache in the background,
 * so the communicator keeps speaking offline. Idempotent and resumable: only clips whose versioned URL is not
 * cached are fetched, and superseded versions are deleted once replaced. Honors Data Saver / slow networks unless `force`.
 */
export function prefetchLanguagePack(lang: SpeechLang, opts: PrefetchOptions = {}): Promise<void> {
  if (running?.lang === lang) return running.promise
  const promise = run(lang, opts).finally(() => {
    running = null
  })
  running = { lang, promise }
  return promise
}

async function run(lang: SpeechLang, opts: PrefetchOptions): Promise<void> {
  if (typeof caches === 'undefined') return
  const wanted = wantedUrls(lang)
  const total = wanted.length
  const set = (p: Partial<PackStatus>) => usePackStatus.setState({ lang, total, ...p })
  const policy = opts.force ? 'now' : prefetchPolicy(connection())
  const cache = await caches.open(CACHE)
  const cachedNow = async () => (await cache.keys()).map((r) => r.url)
  const initial = new Set(await cachedNow())
  const have = () => wanted.filter((u) => initial.has(u)).length
  if (policy === 'skip') {
    set({ done: have(), state: have() === total ? 'done' : 'skipped', reason: connection()?.saveData ? 'saveData' : 'slowNetwork' })
    return
  }
  set({ done: have(), state: have() === total ? 'done' : 'running', reason: null })
  if (policy === 'idle') await whenIdle()
  const { missing } = planPackSync([...initial], wanted)
  let done = have()
  const queue = [...missing]
  const worker = async () => {
    while (queue.length) {
      const url = queue.shift()!
      try {
        const res = await fetch(url)
        if (res.ok) {
          await cache.put(url, res)
          done++
        }
      } catch {
        /* offline or quota: try again next launch */
      }
      set({ done, state: 'running' })
      opts.onProgress?.(done, total)
    }
  }
  await Promise.all([worker(), worker(), worker()])
  // Drop superseded clips, for both languages (a clip played in the other language may be cached too).
  const all = [...wantedUrls('uz'), ...wantedUrls('ru')]
  const { stale } = planPackSync(await cachedNow(), all)
  for (const u of stale) await cache.delete(u).catch(() => false)
  set({ done, state: done >= total ? 'done' : 'partial' })
}

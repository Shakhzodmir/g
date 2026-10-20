import { create } from 'zustand'
import symbolFiles from 'virtual:symbol-index'
import { prefetchPolicy, type ConnectionInfo } from '../audio/packLogic'

/** Same cache the service worker's CacheFirst route for /symbols/ uses (vite.config.ts), so pack and runtime share entries. */
export const SYMBOLS_CACHE = 'symbols'

export type SymbolsPackState = 'idle' | 'running' | 'done' | 'partial' | 'skipped'

export interface SymbolsPackStatus {
  done: number
  total: number
  state: SymbolsPackState
}

/** Background symbols pack status (read by the parent "About" screen next to the audio pack). */
export const useSymbolsPackStatus = create<SymbolsPackStatus>()(() => ({ done: 0, total: 0, state: 'idle' }))

const connection = (): ConnectionInfo | undefined => (globalThis.navigator as (Navigator & { connection?: ConnectionInfo }) | undefined)?.connection

const base = () => (typeof document === 'undefined' ? 'http://localhost/' : document.baseURI)
/** Absolute URLs of every picture symbol (the same URLs <SymbolImg> requests). */
export const symbolUrls = (files: readonly string[] = symbolFiles): string[] => files.map((f) => new URL(`${import.meta.env.BASE_URL}${f}`, base()).href)

function whenIdle(): Promise<void> {
  return new Promise((resolve) => {
    const ric = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback
    if (ric) ric(() => resolve(), { timeout: 20_000 })
    else setTimeout(resolve, 8000)
  })
}

let running: Promise<void> | null = null

/**
 * Downloads every picture symbol (about 340 small files, ~2.7 MB) into the 'symbols' cache in the background, LOW priority:
 * two at a time, one pause between them, skipped on Data Saver / 2G and idle-only on 3G / cellular. Independent of the
 * language. Idempotent and resumable (only missing files are fetched). Start it AFTER the audio pack.
 */
export function prefetchSymbolsPack(opts: { force?: boolean } = {}): Promise<void> {
  if (!running) {
    running = run(opts).finally(() => {
      running = null
    })
  }
  return running
}

async function run(opts: { force?: boolean }): Promise<void> {
  if (typeof caches === 'undefined') return
  const wanted = symbolUrls()
  const total = wanted.length
  const set = (p: Partial<SymbolsPackStatus>) => useSymbolsPackStatus.setState({ total, ...p })
  const policy = opts.force ? 'now' : prefetchPolicy(connection())
  const cache = await caches.open(SYMBOLS_CACHE)
  const have = new Set((await cache.keys()).map((r) => r.url))
  const missing = () => wanted.filter((u) => !have.has(u))
  if (policy === 'skip') {
    set({ done: wanted.length - missing().length, state: missing().length === 0 ? 'done' : 'skipped' })
    return
  }
  set({ done: wanted.length - missing().length, state: missing().length === 0 ? 'done' : 'running' })
  if (missing().length === 0) return
  if (policy === 'idle') await whenIdle()
  const queue = missing()
  let done = total - queue.length
  const worker = async () => {
    while (queue.length) {
      const url = queue.shift()!
      try {
        // low priority: never competes with what the child is looking at
        const res = await fetch(url, { priority: 'low' } as RequestInit)
        if (res.ok) {
          await cache.put(url, res)
          done++
          have.add(url)
        }
      } catch {
        /* offline or quota: the next launch continues */
      }
      set({ done, state: 'running' })
      await new Promise((r) => setTimeout(r, 40))
    }
  }
  await Promise.all([worker(), worker()])
  set({ done, state: done >= total ? 'done' : 'partial' })
}

export interface OfflineSummary {
  done: number
  total: number
  state: 'unknown' | 'running' | 'done' | 'skipped' | 'partial'
}

/** One "offline ready" summary from the audio pack (speech language) and the symbols pack. */
export function summarizeOffline(
  audio: { done: number; total: number; state: SymbolsPackState },
  symbols: { done: number; total: number; state: SymbolsPackState },
): OfflineSummary {
  const done = audio.done + symbols.done
  const total = audio.total + symbols.total
  const states = [audio.state, symbols.state]
  // not started yet (both idle) or the second pack is still waiting for the first
  if (states.includes('idle')) return { done, total, state: states.every((s) => s === 'idle') ? 'unknown' : 'running' }
  if (states.every((s) => s === 'done')) return { done, total, state: 'done' }
  if (states.includes('running')) return { done, total, state: 'running' }
  if (states.includes('skipped')) return { done, total, state: 'skipped' }
  return { done, total, state: 'partial' }
}

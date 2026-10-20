import { describe, expect, it } from 'vitest'
import { isIosBrowser } from './installPrompt'
import { summarizeOffline, symbolUrls } from './symbolsPack'

describe('summarizeOffline', () => {
  const s = (state: 'idle' | 'running' | 'done' | 'partial' | 'skipped', done = 0, total = 10) => ({ state, done, total })
  it('is "done" only when both packs are done', () => {
    expect(summarizeOffline(s('done', 10), s('done', 10)).state).toBe('done')
    expect(summarizeOffline(s('done', 10), s('running', 3)).state).toBe('running')
  })
  it('is unknown before anything ran, and running while the second pack waits', () => {
    expect(summarizeOffline(s('idle'), s('idle')).state).toBe('unknown')
    expect(summarizeOffline(s('done', 10), s('idle')).state).toBe('running')
  })
  it('reports skipped (Data Saver / 2G) and partial downloads, and adds the counts', () => {
    expect(summarizeOffline(s('skipped'), s('skipped')).state).toBe('skipped')
    expect(summarizeOffline(s('partial', 7), s('done', 10)).state).toBe('partial')
    expect(summarizeOffline(s('done', 4, 5), s('running', 3, 6))).toMatchObject({ done: 7, total: 11 })
  })
})

describe('symbolUrls', () => {
  it('resolves every symbol file against the page', () => {
    const urls = symbolUrls(['symbols/a.webp', 'symbols/custom/b.svg'])
    expect(urls).toHaveLength(2)
    expect(urls[0]).toMatch(/symbols\/a\.webp$/)
    expect(urls[1]).toMatch(/symbols\/custom\/b\.svg$/)
  })
  it('knows the real symbol set', () => {
    expect(symbolUrls().length).toBeGreaterThan(300)
  })
})

describe('isIosBrowser', () => {
  it('recognises iPhone, iPad and iPadOS (desktop UA with touch), not Android or desktop', () => {
    expect(isIosBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)', 5)).toBe(true)
    expect(isIosBrowser('Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)', 5)).toBe(true)
    expect(isIosBrowser('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true)
    expect(isIosBrowser('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false)
    expect(isIosBrowser('Mozilla/5.0 (Linux; Android 12; Pixel 6)', 5)).toBe(false)
  })
})

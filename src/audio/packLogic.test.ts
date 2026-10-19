import { describe, expect, it } from 'vitest'
import { planPackSync, prefetchPolicy, versionedClipUrl } from './packLogic'

describe('versionedClipUrl', () => {
  it('appends the clip hash so a regenerated clip is a new URL', () => {
    expect(versionedClipUrl('/g/', 'w.water', 'uz', 'abcd1234')).toBe('/g/audio/uz/w.water.mp3?v=abcd1234')
    expect(versionedClipUrl('/g/', 'w.water', 'uz', 'ffff0000')).not.toBe(versionedClipUrl('/g/', 'w.water', 'uz', 'abcd1234'))
  })
  it('has no query for an unknown clip and encodes the key', () => {
    expect(versionedClipUrl('./', 'x y', 'ru', '')).toBe('./audio/ru/x%20y.mp3')
  })
})

describe('planPackSync', () => {
  const a1 = 'https://h/audio/uz/a.mp3?v=1'
  const a2 = 'https://h/audio/uz/a.mp3?v=2'
  const b1 = 'https://h/audio/uz/b.mp3?v=1'
  it('fetches clips whose versioned URL is not cached', () => {
    expect(planPackSync([a1], [a2, b1]).missing).toEqual([a2, b1])
    expect(planPackSync([a2, b1], [a2, b1]).missing).toEqual([])
  })
  it('keeps the old version until the new one is cached (offline update), then drops it', () => {
    expect(planPackSync([a1], [a2]).stale).toEqual([])
    expect(planPackSync([a1, a2], [a2]).stale).toEqual([a1])
  })
  it('drops clips that no longer exist and legacy unversioned entries once replaced', () => {
    expect(planPackSync([b1], [a2]).stale).toEqual([b1])
    expect(planPackSync(['https://h/audio/uz/a.mp3', a2], [a2]).stale).toEqual(['https://h/audio/uz/a.mp3'])
  })
})

describe('prefetchPolicy', () => {
  it('skips Data Saver and 2G, waits for idle on 3G / cellular, otherwise goes now', () => {
    expect(prefetchPolicy({ saveData: true, effectiveType: '4g' })).toBe('skip')
    expect(prefetchPolicy({ effectiveType: 'slow-2g' })).toBe('skip')
    expect(prefetchPolicy({ effectiveType: '2g' })).toBe('skip')
    expect(prefetchPolicy({ effectiveType: '3g' })).toBe('idle')
    expect(prefetchPolicy({ effectiveType: '4g', type: 'cellular' })).toBe('idle')
    expect(prefetchPolicy({ effectiveType: '4g', type: 'wifi' })).toBe('now')
    expect(prefetchPolicy(undefined)).toBe('now')
  })
})

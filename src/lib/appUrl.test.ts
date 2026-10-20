import { describe, expect, it } from 'vitest'
import { appBaseUrl, appUrl, DEFAULT_APP_URL, displayUrl, normalizeAppBase } from './appUrl'
import { FEATURES } from '../app/features'

describe('app URL helper', () => {
  it('the default base is the GitHub Pages address, with a trailing slash', () => {
    expect(DEFAULT_APP_URL).toBe('https://shakhzodmir.github.io/g/')
    expect(appBaseUrl()).toBe(DEFAULT_APP_URL)
  })

  it('builds HashRouter deep links', () => {
    expect(appUrl('/talk')).toBe('https://shakhzodmir.github.io/g/#/talk')
    expect(appUrl('/exercises/mirror')).toBe('https://shakhzodmir.github.io/g/#/exercises/mirror')
    expect(appUrl('/talk?mode=phrases')).toBe('https://shakhzodmir.github.io/g/#/talk?mode=phrases')
  })

  it('the start page has no hash; a route without a leading slash or with a "#" is repaired', () => {
    expect(appUrl('/')).toBe('https://shakhzodmir.github.io/g/')
    expect(appUrl()).toBe('https://shakhzodmir.github.io/g/')
    expect(appUrl('games')).toBe('https://shakhzodmir.github.io/g/#/games')
    expect(appUrl('#/games')).toBe('https://shakhzodmir.github.io/g/#/games')
    expect(appUrl(' /ex ercises ')).toBe('https://shakhzodmir.github.io/g/#/exercises')
  })

  it('a custom domain is swapped in by one argument (or one constant)', () => {
    expect(appUrl('/talk', 'https://gapimiz.uz')).toBe('https://gapimiz.uz/#/talk')
    expect(appUrl('/talk', 'https://gapimiz.uz/app')).toBe('https://gapimiz.uz/app/#/talk')
    expect(appUrl('/', 'https://gapimiz.uz/')).toBe('https://gapimiz.uz/')
  })

  it('normalises a base: no query, no hash, no double slash; junk falls back to the default', () => {
    expect(normalizeAppBase('https://gapimiz.uz/?x=1#/old')).toBe('https://gapimiz.uz/')
    expect(normalizeAppBase('  https://gapimiz.uz/g  ')).toBe('https://gapimiz.uz/g/')
    expect(normalizeAppBase('')).toBe(DEFAULT_APP_URL)
    expect(normalizeAppBase(undefined)).toBe(DEFAULT_APP_URL)
    expect(normalizeAppBase('not a url')).toBe(DEFAULT_APP_URL)
    expect(normalizeAppBase('javascript:alert(1)')).toBe(DEFAULT_APP_URL)
    expect(normalizeAppBase('ftp://gapimiz.uz/')).toBe(DEFAULT_APP_URL)
    expect(normalizeAppBase('https://user:pw@gapimiz.uz/')).toBe(DEFAULT_APP_URL)
  })

  it('displayUrl drops the scheme only', () => {
    expect(displayUrl(appUrl('/talk'))).toBe('shakhzodmir.github.io/g/#/talk')
  })

  it('deep links land on routes the app really has', () => {
    const paths = Object.values(FEATURES).map((f) => f.path)
    for (const route of ['/talk', '/exercises', '/exercises/mirror', '/games', '/calm', '/day']) {
      const hash = appUrl(route).split('#')[1]
      expect(paths.some((p) => hash === p || hash.startsWith(`${p}/`)), route).toBe(true)
    }
  })
})

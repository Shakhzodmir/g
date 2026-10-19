import { describe, expect, it } from 'vitest'
import { resolveSource } from './speech'
import { pickVoice } from './voices'

describe('resolveSource', () => {
  const base = { hasRecording: false, hasClip: false, hasSystemVoice: false, preferSystem: false }
  it('prefers the family recording', () => {
    expect(resolveSource({ ...base, hasRecording: true, hasClip: true, hasSystemVoice: true })).toBe('recording')
  })
  it('uses the bundled clip by default', () => {
    expect(resolveSource({ ...base, hasClip: true, hasSystemVoice: true })).toBe('clip')
  })
  it('uses the system voice when preferred and available', () => {
    expect(resolveSource({ ...base, hasClip: true, hasSystemVoice: true, preferSystem: true })).toBe('system')
  })
  it('keeps the clip when the system voice is preferred but missing', () => {
    expect(resolveSource({ ...base, hasClip: true, preferSystem: true })).toBe('clip')
  })
  it('falls back to the system voice when there is no clip', () => {
    expect(resolveSource({ ...base, hasSystemVoice: true })).toBe('system')
  })
  it('returns none when nothing can speak (e.g. Uzbek custom word on Android)', () => {
    expect(resolveSource(base)).toBe('none')
  })
})

describe('pickVoice', () => {
  const v = (lang: string, name = lang, localService = true) => ({ lang, name, localService })
  it('picks an exact uz-UZ voice, preferring natural ones', () => {
    const voices = [v('uz-UZ', 'Microsoft Sardor Online (Natural)', false), v('uz-UZ', 'Basic uz'), v('ru-RU')]
    expect(pickVoice(voices, 'uz')?.name).toBe('Microsoft Sardor Online (Natural)')
  })
  it('never substitutes Turkish or Kazakh for Uzbek', () => {
    expect(pickVoice([v('tr-TR'), v('kk-KZ'), v('ru-RU')], 'uz')).toBeNull()
  })
  it('accepts underscore and prefix forms for Russian', () => {
    expect(pickVoice([v('en-US'), v('ru_RU')], 'ru')?.lang).toBe('ru_RU')
  })
})

describe('first word is never delayed by the voice list (C4)', () => {
  it('plays the bundled clip at once when the device has no voices at all', async () => {
    const { vi } = await import('vitest')
    vi.resetModules()
    const playUrl = vi.fn(() => Promise.resolve())
    vi.doMock('./player', () => ({ playUrl, stopPlayback: vi.fn(), emitLevel: vi.fn(), onLevel: vi.fn() }))
    // The browser never reports a voice and never fires voiceschanged.
    Object.defineProperty(globalThis, 'speechSynthesis', {
      configurable: true,
      value: { getVoices: () => [], addEventListener: () => undefined, removeEventListener: () => undefined, cancel: () => undefined, speak: vi.fn() },
    })
    const { speak } = await import('./speech')
    const started = performance.now()
    const r = await speak({ key: 'w.i', text: { uz: 'Men', ru: 'Я' } }, 'uz')
    expect(r.source).toBe('clip')
    expect(performance.now() - started).toBeLessThan(400)
    expect(playUrl).toHaveBeenCalledTimes(1)
    expect(String((playUrl.mock.calls as unknown[][])[0][0])).toContain('audio/uz/w.i.mp3')
    vi.doUnmock('./player')
  })
})

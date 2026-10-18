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

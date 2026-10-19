import { describe, expect, it } from 'vitest'
import { defaultProfile, sanitizeProfile } from './profileTypes'

describe('sanitizeProfile', () => {
  it('keeps a valid profile unchanged', () => {
    const p = defaultProfile({ name: 'Aziz', theme: 'tun', aac: { level: 3 }, textScale: 1.5 })
    expect(sanitizeProfile(p)).toEqual(p)
  })

  it('falls back to the default theme for an unknown one', () => {
    expect(sanitizeProfile({ ...defaultProfile(), theme: 'neon' }).theme).toBe('bolajon')
    expect(sanitizeProfile({ ...defaultProfile({ kind: 'adult' }), theme: 42 }).theme).toBe('kattalar')
  })

  it('clamps numeric settings to the ranges the settings screens allow', () => {
    const p = sanitizeProfile({
      ...defaultProfile(),
      aac: { level: 9 },
      voice: { rate: 9, volume: -3, sfxVolume: 'loud', musicVolume: 5 },
      touch: { holdMs: 99999, ignoreRepeatMs: -1, dwellMs: Number.NaN },
      scanning: { mode: 'sideways', intervalMs: 10, audioCue: 'yes' },
      textScale: 1.6,
    })
    expect(p.aac.level).toBe(2)
    expect(p.voice.rate).toBe(1.4)
    expect(p.voice.volume).toBe(0)
    expect(p.voice.sfxVolume).toBe(0.6)
    expect(p.voice.musicVolume).toBe(1)
    expect(p.touch.holdMs).toBe(1500)
    expect(p.touch.ignoreRepeatMs).toBe(0)
    expect(p.touch.dwellMs).toBe(0)
    expect(p.scanning.mode).toBe('off')
    expect(p.scanning.intervalMs).toBe(500)
    expect(p.scanning.audioCue).toBe(false)
    expect(p.textScale).toBe(1.5)
  })

  it('survives garbage and fills in missing nested objects', () => {
    expect(sanitizeProfile(null)).toEqual(defaultProfile())
    expect(sanitizeProfile('x')).toEqual(defaultProfile())
    const p = sanitizeProfile({ id: 'p1', name: 'Dilnoza', aac: 'nope', hiddenWordIds: 5 })
    expect(p.id).toBe('p1')
    expect(p.name).toBe('Dilnoza')
    expect(p.aac).toEqual(defaultProfile().aac)
    expect(p.textScale).toBe(1)
  })
})

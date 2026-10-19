import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db, resetDbAvailability } from './db'
import { useDevice } from './device'
import { defaultProfile, useProfileStore } from './profile'

describe('defaultProfile', () => {
  it('matches the spec defaults for a child', () => {
    const p = defaultProfile()
    expect(p.kind).toBe('child')
    expect(p.theme).toBe('bolajon')
    expect(p.aac.level).toBe(2)
    expect(p.touch).toEqual({ activateOnRelease: true, holdMs: 0, ignoreRepeatMs: 300, dwellMs: 0 })
    expect(p.scanning.mode).toBe('off')
    expect(p.speechLang).toBe('uz')
  })

  it('uses the adult theme for adults and merges nested patches', () => {
    const p = defaultProfile({ kind: 'adult', touch: { holdMs: 500 } })
    expect(p.theme).toBe('kattalar')
    expect(p.touch.holdMs).toBe(500)
    expect(p.touch.ignoreRepeatMs).toBe(300)
  })
})

describe('profile store', () => {
  beforeEach(() => {
    resetDbAvailability()
    useProfileStore.setState({ profile: defaultProfile(), profiles: [], loaded: false, persistent: false })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    resetDbAvailability()
  })

  it('persists created profiles and reloads them', async () => {
    const created = await useProfileStore.getState().create({ name: 'Aziz', speechLang: 'uz' })
    useProfileStore.setState({ profile: defaultProfile(), profiles: [], loaded: false })
    await useProfileStore.getState().load()
    expect(useProfileStore.getState().profile.id).toBe(created.id)
    expect(useProfileStore.getState().profile.name).toBe('Aziz')
    expect(useProfileStore.getState().persistent).toBe(true)
  })

  it('keeps working in memory when IndexedDB cannot open', async () => {
    vi.spyOn(db, 'open').mockRejectedValue(new Error('QuotaExceededError'))
    await useProfileStore.getState().load()
    expect(useProfileStore.getState().loaded).toBe(true)
    expect(useProfileStore.getState().persistent).toBe(false)
    await useProfileStore.getState().update({ aac: { level: 3 } })
    expect(useProfileStore.getState().profile.aac.level).toBe(3)
    expect(useProfileStore.getState().profile.aac.showLabels).toBe(true)
  })

  it('treats an IndexedDB that never answers as unavailable after ~2.5 s', async () => {
    vi.useFakeTimers()
    vi.spyOn(db, 'open').mockReturnValue(new Promise(() => undefined) as never)
    const loading = useProfileStore.getState().load()
    await vi.advanceTimersByTimeAsync(2600)
    await loading
    vi.useRealTimers()
    expect(useProfileStore.getState().loaded).toBe(true)
    expect(useProfileStore.getState().persistent).toBe(false)
  })

  it('sanitizes a stored profile with an unknown theme and out-of-range values on load', async () => {
    await db.profiles.put({ ...defaultProfile(), id: 'bad', theme: 'neon', voice: { ...defaultProfile().voice, rate: 7 } } as never)
    useDevice.setState({ activeProfileId: 'bad' })
    await useProfileStore.getState().load()
    expect(useProfileStore.getState().profile.theme).toBe('bolajon')
    expect(useProfileStore.getState().profile.voice.rate).toBe(1.4)
    await db.profiles.delete('bad')
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { db, resetDbAvailability } from './db'
import { useDevice } from './device'
import { applyUiLangToProfile, defaultProfile, sanitizeProfile, speechLangForUi, useProfileStore } from './profile'

describe('speech language follows the UI language', () => {
  beforeEach(async () => {
    resetDbAvailability()
    await db.profiles.clear()
    useDevice.setState({ uiLang: 'uz', uzScript: 'latn' })
    useProfileStore.setState({ profile: defaultProfile(), profiles: [], loaded: false, persistent: false })
  })

  it('maps every UI language to a speech language', () => {
    expect(speechLangForUi('uz')).toBe('uz')
    expect(speechLangForUi('uzc')).toBe('uz')
    expect(speechLangForUi('ru')).toBe('ru')
  })

  it('defaults to following and sanitizeProfile keeps the flag', () => {
    expect(defaultProfile().speechLangFollowsUi).toBe(true)
    expect(sanitizeProfile({ ...defaultProfile(), speechLangFollowsUi: false }).speechLangFollowsUi).toBe(false)
    expect(sanitizeProfile({ ...defaultProfile(), speechLangFollowsUi: 'x' }).speechLangFollowsUi).toBe(true)
  })

  it('old profiles (no flag) follow only when they already matched the UI language', () => {
    const matching = { ...defaultProfile(), speechLang: 'ru' as const }
    delete (matching as Partial<typeof matching>).speechLangFollowsUi
    expect(applyUiLangToProfile(sanitizeProfile(matching), 'ru', matching).speechLangFollowsUi).toBe(true)
    const differing = { ...defaultProfile(), speechLang: 'ru' as const }
    delete (differing as Partial<typeof differing>).speechLangFollowsUi
    const out = applyUiLangToProfile(sanitizeProfile(differing), 'uz', differing)
    expect(out.speechLangFollowsUi).toBe(false)
    expect(out.speechLang).toBe('ru')
  })

  it('changing the UI language switches every following profile at once, in memory and in storage', async () => {
    const st = useProfileStore.getState()
    const a = await st.create({ name: 'A' })
    const b = await useProfileStore.getState().create({ name: 'B', speechLangFollowsUi: false, speechLang: 'ru' })
    await useProfileStore.getState().switchTo(a.id)
    expect(useProfileStore.getState().profile.speechLang).toBe('uz')

    useDevice.getState().setUiLang('ru')
    // in-memory is updated synchronously
    expect(useProfileStore.getState().profile.speechLang).toBe('ru')
    const mem = useProfileStore.getState().profiles
    expect(mem.find((p) => p.id === a.id)?.speechLang).toBe('ru')
    expect(mem.find((p) => p.id === b.id)?.speechLang).toBe('ru') // override, stays Russian
    await new Promise((r) => setTimeout(r, 50))
    expect((await db.profiles.get(a.id))?.speechLang).toBe('ru')

    useDevice.getState().setUiLang('uzc')
    expect(useProfileStore.getState().profile.speechLang).toBe('uz')
    expect(useProfileStore.getState().profiles.find((p) => p.id === b.id)?.speechLang).toBe('ru') // override kept
    await new Promise((r) => setTimeout(r, 50))
    expect((await db.profiles.get(a.id))?.speechLang).toBe('uz')
    expect((await db.profiles.get(b.id))?.speechLang).toBe('ru')
  })

  it('the override can differ; turning it off snaps back to the UI language', async () => {
    await useProfileStore.getState().create({ name: 'A' })
    await useProfileStore.getState().update({ speechLangFollowsUi: false, speechLang: 'ru' })
    expect(useProfileStore.getState().profile.speechLang).toBe('ru')
    useDevice.getState().setUiLang('uzc')
    expect(useProfileStore.getState().profile.speechLang).toBe('ru')
    await useProfileStore.getState().update({ speechLangFollowsUi: true })
    expect(useProfileStore.getState().profile.speechLang).toBe('uz')
  })

  it('a new profile speaks the current UI language', async () => {
    useDevice.getState().setUiLang('ru')
    const p = await useProfileStore.getState().create({ name: 'Z' })
    expect(p.speechLang).toBe('ru')
  })

  it('load() reconciles stored profiles with the UI language', async () => {
    await db.profiles.put({ ...defaultProfile({ id: 'old', name: 'Old', speechLang: 'uz' }), speechLangFollowsUi: undefined } as never)
    useDevice.setState({ uiLang: 'ru', activeProfileId: 'old' })
    await useProfileStore.getState().load()
    // old profile spoke uz while the UI is ru: it keeps its language (override), no surprise switch
    expect(useProfileStore.getState().profile.speechLang).toBe('uz')
    expect(useProfileStore.getState().profile.speechLangFollowsUi).toBe(false)
  })
})

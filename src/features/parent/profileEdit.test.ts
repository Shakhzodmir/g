import { describe, expect, it } from 'vitest'
import { defaultProfile } from '../../store/profileTypes'
import { patchFromForm, switchesKind, type ProfileForm } from './profileEdit'

const form = (over: Partial<ProfileForm> = {}): ProfileForm => ({ name: 'Aziz', avatar: 'cat', ageGroup: '5-7', kind: 'child', ...over })

describe('switching the mode in the profile editor', () => {
  const child = defaultProfile({ kind: 'child', name: 'Aziz' })

  it('asks for a confirmation only when the kind changes', () => {
    expect(switchesKind(child, form())).toBe(false)
    expect(switchesKind(child, form({ kind: 'adult' }))).toBe(true)
    expect(switchesKind(null, form({ kind: 'adult' }))).toBe(false)
  })

  it('applies the new kind defaults (theme, sensory, AAC level)', () => {
    const patch = patchFromForm(child, form({ kind: 'adult', ageGroup: '13+' }))
    expect(patch).toMatchObject({ kind: 'adult', theme: 'kattalar', sensory: 'normal', aac: { level: 3 } })
    expect(patch).not.toHaveProperty('speechLang')
  })

  it('does not touch the settings when the kind stays the same', () => {
    const patch = patchFromForm({ ...child, theme: 'tun' }, form({ name: 'Aziza' }))
    expect(patch).not.toHaveProperty('theme')
    expect(patch).not.toHaveProperty('aac')
  })

  it('a new profile starts from its kind defaults', () => {
    expect(patchFromForm(null, form({ kind: 'adult' }))).toMatchObject({ theme: 'kattalar', aac: { level: 3 } })
    expect(patchFromForm(null, form())).toMatchObject({ theme: 'bolajon', aac: { level: 2 } })
  })
})

import { describe, expect, it } from 'vitest'
import { defaultProfile, kindSwitchPatch, mergeProfile } from './profileTypes'

describe('defaults per kind', () => {
  it('child: Bolajon, level 2, 5–7', () => {
    const p = defaultProfile({ kind: 'child' })
    expect(p).toMatchObject({ kind: 'child', theme: 'bolajon', ageGroup: '5-7', sensory: 'normal' })
    expect(p.aac).toMatchObject({ level: 2, showLabels: true, labelPos: 'bottom', colorCoding: true })
  })

  it('adult: Kattalar, all core words, labels on, 13+', () => {
    const p = defaultProfile({ kind: 'adult' })
    expect(p).toMatchObject({ kind: 'adult', theme: 'kattalar', ageGroup: '13+', sensory: 'normal' })
    expect(p.aac).toMatchObject({ level: 3, showLabels: true, labelPos: 'bottom', colorCoding: true })
  })

  it('switching kind re-applies theme, sensory and AAC level but keeps name, language, avatar and hidden words', () => {
    const child = defaultProfile({ kind: 'child', name: 'Aziz', avatar: 'cat', speechLang: 'ru', theme: 'tun', sensory: 'festive', aac: { hiddenWordIds: ['yes'] } })
    const adult = mergeProfile(child, { kind: 'adult', ...kindSwitchPatch('adult') })
    expect(adult).toMatchObject({ kind: 'adult', theme: 'kattalar', sensory: 'normal', name: 'Aziz', avatar: 'cat', speechLang: 'ru' })
    expect(adult.aac).toMatchObject({ level: 3, hiddenWordIds: ['yes'] })
    const back = mergeProfile(adult, { kind: 'child', ...kindSwitchPatch('child') })
    expect(back).toMatchObject({ theme: 'bolajon', aac: { level: 2 } })
  })
})

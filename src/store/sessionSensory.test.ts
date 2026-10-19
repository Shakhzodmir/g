import { afterEach, describe, expect, it } from 'vitest'
import { sessionSensoryActive, setSessionSensory, useProfileStore } from './profile'

afterEach(() => {
  setSessionSensory(null)
})

describe('teacher quiet mode is session-only (B13)', () => {
  it('festive → calm → back to festive, never normal', () => {
    useProfileStore.setState({ profile: { ...useProfileStore.getState().profile, sensory: 'festive' } })
    setSessionSensory('calm')
    expect(useProfileStore.getState().profile.sensory).toBe('calm')
    expect(sessionSensoryActive()).toBe(true)
    setSessionSensory(null)
    expect(useProfileStore.getState().profile.sensory).toBe('festive')
    expect(sessionSensoryActive()).toBe(false)
  })

  it('a second "on" keeps the very first saved level', () => {
    useProfileStore.setState({ profile: { ...useProfileStore.getState().profile, sensory: 'festive' } })
    setSessionSensory('calm')
    setSessionSensory('calm')
    setSessionSensory(null)
    expect(useProfileStore.getState().profile.sensory).toBe('festive')
  })

  it('an explicit choice of the level ends the override and wins', async () => {
    useProfileStore.setState({ profile: { ...useProfileStore.getState().profile, sensory: 'festive' } })
    setSessionSensory('calm')
    await useProfileStore.getState().update({ sensory: 'normal' })
    expect(sessionSensoryActive()).toBe(false)
    setSessionSensory(null)
    expect(useProfileStore.getState().profile.sensory).toBe('normal')
  })
})

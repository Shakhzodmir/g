import { beforeEach, describe, expect, it } from 'vitest'
import { loadLevel, saveLevel } from '../games/logic/levelKey'
import { getTimerPrefs, useTimerStore } from '../timer/store'
import { useTokenStore } from '../tokens/store'
import { clearGapimizKeys, clearProfileDeviceState } from './wipe'

describe('clearGapimizKeys (P5/P9)', () => {
  beforeEach(() => localStorage.clear())

  it('removes every gapimiz.* key and nothing else', () => {
    for (const k of ['gapimiz.device', 'gapimiz.tokens', 'gapimiz.timer', 'gapimiz.exercises', 'gapimiz.schedule.ui', 'gapimiz.games.level.p1.find', 'gapimiz.pin', 'gapimiz.future.thing']) localStorage.setItem(k, '1')
    localStorage.setItem('other.app', 'keep')
    const removed = clearGapimizKeys(localStorage)
    expect(removed).toHaveLength(8)
    expect(Object.keys(localStorage)).toEqual(['other.app'])
  })
})

describe('deleting a profile clears its device-side state', () => {
  it('forgets token board, timer and game levels of that profile only', async () => {
    useTokenStore.getState().setBoard('gone', { goal: 5, count: 2, rewardRef: null })
    useTokenStore.getState().setBoard('stays', { goal: 6, count: 1, rewardRef: null })
    useTimerStore.getState().patch('gone', { minutes: 9 })
    saveLevel('gone', 'find', 3)
    saveLevel('stays', 'find', 2)
    await clearProfileDeviceState('gone')
    expect(useTokenStore.getState().boards.gone).toBeUndefined()
    expect(useTokenStore.getState().boards.stays).toBeDefined()
    expect(getTimerPrefs('gone').minutes).toBe(3)
    expect(loadLevel('gone', 'find')).toBe(1)
    expect(loadLevel('stays', 'find')).toBe(2)
  })
})

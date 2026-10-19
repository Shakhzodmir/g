import { beforeEach, describe, expect, it } from 'vitest'
import { loadLevel, saveLevel, levelKey } from './games/logic/levelKey'
import { mergeStickers, useStickerMemory, recordSticker, ownedStickerIds } from './games/stickers'
import { clearAllLocalState, clearProfileLocalState } from './profileState'
import { createTimer, start } from './timer/timerLogic'
import { useTimerStore } from './timer/store'
import { createBoard, addToken } from './tokens/tokenLogic'
import { useTokenStore } from './tokens/store'

beforeEach(() => {
  clearAllLocalState(['a', 'b'])
  useStickerMemory.getState().clear()
})

describe('per-profile local state', () => {
  it('game level is keyed by profile and game', () => {
    expect(levelKey('a', 'find')).toBe('gapimiz.games.level.a.find')
    saveLevel('a', 'find', 3)
    saveLevel('b', 'find', 2)
    expect(loadLevel('a', 'find')).toBe(3)
    expect(loadLevel('b', 'find')).toBe(2)
    expect(loadLevel('c', 'find')).toBe(1) // a new child starts at 1, never inherits
    expect(loadLevel('a', 'animals')).toBe(1)
  })

  it('timer and token board do not leak between profiles', () => {
    const timers = useTimerStore.getState()
    timers.patch('a', { minutes: 10, timer: start(createTimer(10 * 60_000), 1000) })
    timers.patch('b', { minutes: 2 })
    useTokenStore.getState().setBoard('a', addToken(createBoard(5)))
    expect(useTimerStore.getState().slots.b.timer.status).toBe('idle')
    expect(useTokenStore.getState().boards.b).toBeUndefined()
  })

  it('clearProfileLocalState forgets one profile only', () => {
    useTimerStore.getState().patch('a', { minutes: 10 })
    useTimerStore.getState().patch('b', { minutes: 2 })
    useTokenStore.getState().setBoard('a', createBoard(7))
    useTokenStore.getState().setBoard('b', createBoard(4))
    saveLevel('a', 'memory', 3)
    saveLevel('b', 'memory', 2)
    useStickerMemory.getState().add({ profileId: 'a', stickerId: 'x', ts: 1, persisted: false })
    useStickerMemory.getState().add({ profileId: 'b', stickerId: 'y', ts: 2, persisted: false })

    clearProfileLocalState('a')

    expect(useTimerStore.getState().slots.a).toBeUndefined()
    expect(useTimerStore.getState().slots.b.minutes).toBe(2)
    expect(useTokenStore.getState().boards.a).toBeUndefined()
    expect(useTokenStore.getState().boards.b.goal).toBe(4)
    expect(loadLevel('a', 'memory')).toBe(1)
    expect(loadLevel('b', 'memory')).toBe(2)
    expect(useStickerMemory.getState().rows.map((r) => r.profileId)).toEqual(['b'])
  })

  it('clearAllLocalState removes every device key of the child features', () => {
    useTimerStore.getState().patch('a', { minutes: 10 })
    useTokenStore.getState().setBoard('a', createBoard(7))
    saveLevel('a', 'find', 3)
    localStorage.setItem('gapimiz.games.level.ghost.find', '3') // a profile that is no longer known
    clearAllLocalState(['a'])
    expect(loadLevel('a', 'find')).toBe(1)
    expect(localStorage.getItem('gapimiz.games.level.ghost.find')).toBeNull()
    expect(useTimerStore.getState().slots).toEqual({})
    expect(useTokenStore.getState().boards).toEqual({})
    expect(localStorage.getItem('gapimiz.timer')).toBeNull()
    expect(localStorage.getItem('gapimiz.tokens')).toBeNull()
  })
})

describe('stickers without IndexedDB', () => {
  it('a sticker earned this session is kept in memory and merged newest first', async () => {
    await recordSticker('a', 'cat')
    const owned = await ownedStickerIds('a')
    expect(owned.has('cat')).toBe(true)
    expect((await ownedStickerIds('b')).size).toBe(0)
    const mem = useStickerMemory.getState().rows
    const rows = mergeStickers([{ profileId: 'a', stickerId: 'old', ts: 1 }], mem.map((m) => ({ ...m, persisted: false })), 'a')
    expect(rows.map((r) => r.stickerId)).toEqual(['cat', 'old'])
  })

  it('rows already in the database are not shown twice', () => {
    const row = { profileId: 'a', stickerId: 'cat', ts: 5, persisted: true }
    expect(mergeStickers([{ profileId: 'a', stickerId: 'cat', ts: 5 }], [row], 'a')).toHaveLength(1)
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { useProfileStore, defaultProfile } from '../../store/profile'
import { MESSAGE_LIMIT } from './message'
import { loadMessage, useMessage } from './store'

const word = (n: number) => ({ key: `w.w${n}`, text: { uz: `s${n}`, ru: `с${n}` }, symbol: 'plus', fitz: 'misc' as const, src: 'blob:dead' })
const switchProfile = (id: string) => useProfileStore.setState({ profile: defaultProfile({ id }) })

describe('message bar persistence', () => {
  beforeEach(() => {
    sessionStorage.clear()
    switchProfile('a')
    useMessage.getState().dispatch({ type: 'clear' })
  })

  it('survives a reload: the saved message is restored (without dead photo URLs)', () => {
    useMessage.getState().dispatch({ type: 'add', item: word(1) })
    useMessage.getState().dispatch({ type: 'add', item: word(2) })
    const restored = loadMessage('a')
    expect(restored.items.map((i) => i.key)).toEqual(['w.w1', 'w.w2'])
    expect(restored.items.every((i) => i.src === undefined)).toBe(true)
    expect(restored.nextUid).toBeGreaterThan(Math.max(...restored.items.map((i) => i.uid)))
  })

  it('does not leak between profiles and comes back on switching back', () => {
    useMessage.getState().dispatch({ type: 'add', item: word(1) })
    switchProfile('b')
    expect(useMessage.getState().items).toEqual([])
    useMessage.getState().dispatch({ type: 'add', item: word(7) })
    switchProfile('a')
    expect(useMessage.getState().items.map((i) => i.key)).toEqual(['w.w1'])
    switchProfile('b')
    expect(useMessage.getState().items.map((i) => i.key)).toEqual(['w.w7'])
  })

  it('clearing removes the saved copy; garbage in storage is ignored', () => {
    useMessage.getState().dispatch({ type: 'add', item: word(1) })
    useMessage.getState().dispatch({ type: 'clear' })
    expect(sessionStorage.getItem('gapimiz.aac.message.a')).toBeNull()
    sessionStorage.setItem('gapimiz.aac.message.a', '{nope')
    expect(loadMessage('a').items).toEqual([])
  })

  it('records what changed for the live region and counts taps on a full bar', () => {
    const { dispatch, noteFullTap } = useMessage.getState()
    dispatch({ type: 'add', item: word(1) })
    expect(useMessage.getState().change).toMatchObject({ type: 'add', item: { key: 'w.w1' } })
    dispatch({ type: 'backspace' })
    expect(useMessage.getState().change).toMatchObject({ type: 'backspace', item: { key: 'w.w1' } })
    noteFullTap()
    expect(useMessage.getState().fullTaps).toBe(0)
    for (let i = 0; i < MESSAGE_LIMIT + 3; i++) dispatch({ type: 'add', item: word(i) })
    expect(useMessage.getState().items).toHaveLength(MESSAGE_LIMIT)
    noteFullTap()
    expect(useMessage.getState().fullTaps).toBe(1)
  })
})

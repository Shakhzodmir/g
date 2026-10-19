import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SLOT, useTimerStore, type TimerSlot } from './store'
import { createTimer, pause, start } from './timerLogic'
import { createTimerWatcher, LATE_MS, type EndKind, type WatcherDeps } from './watcher'

const MIN = 60_000

function setup(opts: { hidden?: boolean } = {}) {
  const slots: Record<string, TimerSlot> = {}
  let profile = 'a'
  let hidden = opts.hidden ?? false
  const ends: Array<{ profileId: string; kind: EndKind; nextRef: string | null }> = []
  const deps: WatcherDeps = {
    now: () => Date.now(),
    activeProfileId: () => profile,
    getSlot: (id) => slots[id] ?? DEFAULT_SLOT,
    patch: (id, p) => {
      slots[id] = { ...(slots[id] ?? DEFAULT_SLOT), ...p }
    },
    onEnd: (e) => ends.push(e),
    isHidden: () => hidden,
    setTimer: (fn, ms) => setTimeout(fn, ms),
    clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
  }
  const w = createTimerWatcher(deps)
  const run = (id: string, minutes = 1, nextRef: string | null = null) => {
    slots[id] = { ...DEFAULT_SLOT, minutes, nextRef, timer: start(createTimer(minutes * MIN), Date.now()) }
    w.check()
  }
  return { w, slots, ends, run, setProfile: (p: string) => (profile = p), setHidden: (h: boolean) => (hidden = h) }
}

describe('global timer watcher', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
  })
  afterEach(() => vi.useRealTimers())

  it('fires exactly once at the end time, from any screen', () => {
    const s = setup()
    s.run('a', 1, 'eat')
    vi.advanceTimersByTime(MIN - 100)
    expect(s.ends).toHaveLength(0)
    vi.advanceTimersByTime(200)
    expect(s.ends).toEqual([expect.objectContaining({ profileId: 'a', kind: 'live', nextRef: 'eat' })])
    expect(s.slots.a.timer.status).toBe('done')
    expect(s.slots.a.notice).toBeNull()
    // Nothing repeats: more time, more checks (focus, visibilitychange, store updates).
    vi.advanceTimersByTime(10 * MIN)
    s.w.check()
    s.w.check()
    expect(s.ends).toHaveLength(1)
  })

  it('does not signal again after a reload (the done state is already stored)', () => {
    const s = setup()
    s.run('a')
    vi.advanceTimersByTime(MIN + 50)
    expect(s.ends).toHaveLength(1)
    // "Reload": a new watcher over the same stored slots.
    const again = createTimerWatcher({
      now: () => Date.now(),
      activeProfileId: () => 'a',
      getSlot: (id) => s.slots[id] ?? DEFAULT_SLOT,
      patch: () => undefined,
      onEnd: (e) => s.ends.push(e),
      isHidden: () => false,
      setTimer: (fn, ms) => setTimeout(fn, ms),
      clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
    })
    again.check()
    vi.advanceTimersByTime(MIN)
    expect(s.ends).toHaveLength(1)
  })

  it('shows the quiet card, not sound, when the end passed long ago (page closed or throttled)', () => {
    const s = setup()
    s.run('a')
    // The page was frozen: the clock jumps well past the end before the first re-check.
    vi.setSystemTime(Date.now() + MIN + LATE_MS + 1)
    s.w.check()
    expect(s.ends).toEqual([expect.objectContaining({ kind: 'late' })])
    expect(s.slots.a.timer.status).toBe('done')
    expect(s.slots.a.notice).not.toBeNull()
  })

  it('on a hidden page it signals on time and also leaves the card for when the page is seen again', () => {
    const s = setup({ hidden: true })
    s.run('a')
    vi.advanceTimersByTime(MIN + 50)
    expect(s.ends).toEqual([expect.objectContaining({ kind: 'live' })])
    expect(s.slots.a.notice).not.toBeNull()
  })

  it('a pause cancels the timeout; resuming re-arms it for the new end', () => {
    const s = setup()
    s.run('a', 2)
    vi.advanceTimersByTime(30_000)
    s.slots.a = { ...s.slots.a, timer: pause(s.slots.a.timer, Date.now()) }
    s.w.check()
    vi.advanceTimersByTime(10 * MIN)
    expect(s.ends).toHaveLength(0)
    s.slots.a = { ...s.slots.a, timer: start(s.slots.a.timer, Date.now()) }
    s.w.check()
    vi.advanceTimersByTime(90_000 - 100)
    expect(s.ends).toHaveLength(0)
    vi.advanceTimersByTime(200)
    expect(s.ends).toHaveLength(1)
  })

  it('only watches the active profile', () => {
    const s = setup()
    s.run('a')
    s.setProfile('b')
    s.w.check() // profile switched: a's timeout is dropped
    vi.advanceTimersByTime(2 * MIN)
    expect(s.ends).toHaveLength(0)
    // Back on profile a later: the end passed meanwhile, quietly.
    s.setProfile('a')
    s.w.check()
    expect(s.ends).toEqual([expect.objectContaining({ profileId: 'a', kind: 'late' })])
  })

  it('arming twice for the same end does not stack timeouts', () => {
    const s = setup()
    s.run('a')
    s.w.check()
    s.w.check()
    expect(vi.getTimerCount()).toBe(1)
  })
})

describe('timer store slots are per profile', () => {
  it('keeps each profile timer separate and removes one on delete', () => {
    const st = useTimerStore.getState()
    st.patch('p1', { minutes: 5 })
    st.patch('p2', { minutes: 10 })
    expect(useTimerStore.getState().slots.p1.minutes).toBe(5)
    expect(useTimerStore.getState().slots.p2.minutes).toBe(10)
    st.remove('p1')
    expect(useTimerStore.getState().slots.p1).toBeUndefined()
    expect(useTimerStore.getState().slots.p2.minutes).toBe(10)
    st.clear()
    expect(useTimerStore.getState().slots).toEqual({})
  })
})

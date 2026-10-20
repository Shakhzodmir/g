import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultProfile, useProfileStore } from '../../store/profile'
import { METER_STEPS, METER_STEPS_CALM } from './sensors/meterLevel'
import { VoiceMeter } from './VoiceMeter'

/** A manual frame clock: each call of `frame(ms, n)` runs the queued animation frames n times, ms apart. */
function fakeFrames() {
  let queue: Array<{ id: number; cb: FrameRequestCallback }> = []
  let id = 0
  let now = 0
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    queue.push({ id: ++id, cb })
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (n: number) => {
    queue = queue.filter((q) => q.id !== n)
  })
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  return (ms: number, times = 1) => {
    for (let i = 0; i < times; i++) {
      now += ms
      const run = queue
      queue = []
      act(() => run.forEach((q) => q.cb(now)))
    }
  }
}

beforeEach(() => {
  useProfileStore.setState({ profile: defaultProfile({ sensory: 'normal' }) })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('VoiceMeter', () => {
  it('is a real meter with an accessible name and a 0..100 range (Uzbek by default)', () => {
    fakeFrames()
    render(<VoiceMeter read={() => 0} active />)
    const m = screen.getByRole('meter', { name: 'Tovush darajasi' })
    expect(m).toHaveAttribute('aria-valuemin', '0')
    expect(m).toHaveAttribute('aria-valuemax', '100')
    expect(m).toHaveAttribute('aria-valuenow', '0')
    expect(m).toHaveAttribute('aria-valuetext', 'Hozircha jimjit')
  })

  it('fills while sound arrives, says so in words for screen readers, and empties when it stops', () => {
    const frame = fakeFrames()
    let level = 0
    render(<VoiceMeter read={() => level} active />)
    const m = screen.getByRole('meter')
    level = 1
    frame(33, 40)
    expect(m).toHaveAttribute('aria-valuenow', '100')
    expect(m).toHaveAttribute('aria-valuetext', 'Tovush eshitilyapti')
    level = 0
    frame(33, 200)
    expect(m).toHaveAttribute('aria-valuenow', '0')
    expect(m).toHaveAttribute('aria-valuetext', 'Hozircha jimjit')
  })

  it('a faint sound under the silence floor draws nothing', () => {
    const frame = fakeFrames()
    render(<VoiceMeter read={() => 0.02} active />)
    frame(33, 40)
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '0')
  })

  it('shows 0 when the microphone is not active (denied, missing, stopped)', () => {
    const frame = fakeFrames()
    const { rerender } = render(<VoiceMeter read={() => 1} active />)
    frame(33, 40)
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '100')
    rerender(<VoiceMeter read={() => 1} active={false} />)
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '0')
    frame(33, 10)
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '0')
  })

  it('normal sensory: 10 segments that may ease; calm sensory: 5 steady segments', () => {
    fakeFrames()
    const { container, unmount } = render(<VoiceMeter read={() => 0} active />)
    expect(container.querySelectorAll('[role="meter"] > span')).toHaveLength(METER_STEPS)
    expect(container.firstElementChild).toHaveAttribute('data-animate')
    unmount()
    useProfileStore.setState({ profile: defaultProfile({ sensory: 'calm' }) })
    const calm = render(<VoiceMeter read={() => 0} active />)
    expect(calm.container.querySelectorAll('[role="meter"] > span')).toHaveLength(METER_STEPS_CALM)
    expect(calm.container.firstElementChild).not.toHaveAttribute('data-animate')
  })

  it('reduced motion forces the calm behaviour whatever the profile says', () => {
    fakeFrames()
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('prefers-reduced-motion'),
      media: q,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
    }))
    const { container } = render(<VoiceMeter read={() => 0} active />)
    expect(container.querySelectorAll('[role="meter"] > span')).toHaveLength(METER_STEPS_CALM)
    expect(container.firstElementChild).not.toHaveAttribute('data-animate')
  })

  it('has no text of its own (it works for non-readers) and is not a live region', () => {
    fakeFrames()
    const { container } = render(<VoiceMeter read={() => 1} active />)
    expect(container.textContent).toBe('')
    expect(container.querySelector('[aria-live]')).toBeNull()
  })
})

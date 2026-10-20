import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useWakeLock } from './wakeLock'

function Probe({ active }: { active: boolean }) {
  useWakeLock(active)
  return null
}

function fakeWakeLock() {
  const release = vi.fn(() => Promise.resolve())
  const request = vi.fn(() => Promise.resolve({ release, addEventListener: vi.fn() }))
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true })
  return { request, release }
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'wakeLock')
})

describe('useWakeLock', () => {
  it('requests a screen lock while active and releases it when paused or unmounted', async () => {
    const { request, release } = fakeWakeLock()
    const view = render(<Probe active />)
    await act(async () => {})
    expect(request).toHaveBeenCalledWith('screen')
    view.rerender(<Probe active={false} />)
    await act(async () => {})
    expect(release).toHaveBeenCalledTimes(1)
    view.rerender(<Probe active />)
    await act(async () => {})
    expect(request).toHaveBeenCalledTimes(2)
    view.unmount()
    expect(release).toHaveBeenCalledTimes(2)
  })

  it('does nothing when the API is missing', () => {
    expect(() => render(<Probe active />)).not.toThrow()
  })
})

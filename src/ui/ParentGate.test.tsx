import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDevice } from '../store/device'
import { defaultProfile, useProfileStore } from '../store/profile'
import { ParentGate, resetPinLock } from './ParentGate'
import { hashPin } from './pin'

const LABEL = /1,5 soniya/

function setup(opts: { scan?: boolean; pin?: string } = {}) {
  useProfileStore.setState({ profile: defaultProfile({ scanning: { mode: opts.scan ? 'auto1' : 'off' } }) })
  const onUnlock = vi.fn()
  const onCancel = vi.fn()
  render(<ParentGate open onUnlock={onUnlock} onCancel={onCancel} />)
  return { onUnlock, onCancel }
}

describe('ParentGate', () => {
  beforeEach(() => {
    resetPinLock()
    useDevice.setState({ parentPinHash: null, uiLang: 'uz' })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('unlocks on a screen-reader / keyboard click (detail 0) without the 1.5 s hold', () => {
    const { onUnlock } = setup()
    fireEvent.click(screen.getByRole('button', { name: LABEL }), { detail: 0 })
    expect(onUnlock).toHaveBeenCalledTimes(1)
  })

  it('does not unlock on a plain pointer click (detail > 0)', () => {
    const { onUnlock } = setup()
    fireEvent.click(screen.getByRole('button', { name: LABEL }), { detail: 1 })
    expect(onUnlock).not.toHaveBeenCalled()
  })

  it('has no Open shortcut while switch scanning is off', () => {
    setup({ scan: false })
    expect(screen.queryByRole('button', { name: 'Ochish' })).toBeNull()
  })

  it('offers an explicit Open button while switch scanning is on', () => {
    const on = setup({ scan: true })
    fireEvent.click(screen.getByRole('button', { name: 'Ochish' }), { detail: 0 })
    expect(on.onUnlock).toHaveBeenCalledTimes(1)
  })

  it('a hold needs 1.5 s, ignores a second finger and cancels when any pointer lifts', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setTimeout', 'clearTimeout', 'Date'] })
    const { onUnlock } = setup()
    const btn = screen.getByRole('button', { name: LABEL })
    fireEvent.pointerDown(btn, { pointerId: 1, isPrimary: true, pointerType: 'touch' })
    act(() => vi.advanceTimersByTime(1000))
    // Second finger: non-primary, must not restart or double the loop.
    fireEvent.pointerDown(btn, { pointerId: 2, isPrimary: false, pointerType: 'touch' })
    act(() => vi.advanceTimersByTime(400))
    expect(onUnlock).not.toHaveBeenCalled()
    // Lifting ANY finger ends the hold.
    fireEvent.pointerUp(window, { pointerId: 2, pointerType: 'touch' })
    act(() => vi.advanceTimersByTime(3000))
    expect(onUnlock).not.toHaveBeenCalled()
    fireEvent.pointerDown(btn, { pointerId: 1, isPrimary: true, pointerType: 'touch' })
    act(() => vi.advanceTimersByTime(1600))
    expect(onUnlock).toHaveBeenCalledTimes(1)
  })

  it('PIN stage: on-screen keypad enters the PIN, wrong PIN delays after 3 failures, typing clears the error', async () => {
    useDevice.setState({ parentPinHash: await hashPin('2468') })
    const { onUnlock } = setup()
    fireEvent.click(screen.getByRole('button', { name: LABEL }), { detail: 0 })
    const type = (digits: string) => {
      for (const d of digits) fireEvent.click(screen.getByRole('button', { name: d }), { detail: 0 })
    }
    const done = () => fireEvent.click(screen.getByRole('button', { name: 'Tayyor' }), { detail: 0 })
    for (let i = 0; i < 3; i++) {
      type('1111')
      await act(async () => done())
      await screen.findByText(/PIN-kod mos kelmadi|Biroz kuting/)
    }
    expect(await screen.findByText(/Biroz kuting/)).toBeInTheDocument()
    // Locked: even the right PIN is refused until the delay has passed.
    type('2468')
    await act(async () => done())
    expect(onUnlock).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Tayyor' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('PIN stage: correct PIN via keypad unlocks and upgrades an old unsalted hash', async () => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('gapimiz:9876'))
    const legacy = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
    useDevice.setState({ parentPinHash: legacy })
    const { onUnlock } = setup()
    fireEvent.click(screen.getByRole('button', { name: LABEL }), { detail: 0 })
    for (const d of '9876') fireEvent.click(screen.getByRole('button', { name: d }), { detail: 0 })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Tayyor' }), { detail: 0 }))
    await vi.waitFor(() => expect(onUnlock).toHaveBeenCalledTimes(1))
    expect(useDevice.getState().parentPinHash?.startsWith('v2$')).toBe(true)
  })
})

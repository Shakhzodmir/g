import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultProfile, useProfileStore, type TouchSettings } from '../store/profile'
import { Pressable, resetRepeatGuard } from './Pressable'

function setTouch(t: Partial<TouchSettings>) {
  useProfileStore.setState({ profile: defaultProfile({ touch: t }) })
}

function setup(touch: Partial<TouchSettings> = {}) {
  setTouch(touch)
  const onActivate = vi.fn()
  render(<Pressable label="suv" onActivate={onActivate}>suv</Pressable>)
  return { onActivate, el: screen.getByRole('button', { name: 'suv' }) }
}

describe('Pressable', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetRepeatGuard()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('activates on release (click), not on pointer down', () => {
    const { onActivate, el } = setup()
    fireEvent.pointerDown(el, { pointerType: 'touch', pointerId: 1 })
    expect(onActivate).not.toHaveBeenCalled()
    fireEvent.pointerUp(el, { pointerType: 'touch', pointerId: 1 })
    fireEvent.click(el, { detail: 1 })
    expect(onActivate).toHaveBeenCalledTimes(1)
  })

  it('with holdMs=500 a short press does nothing and a long press fires once', () => {
    const { onActivate, el } = setup({ holdMs: 500 })
    fireEvent.pointerDown(el, { pointerType: 'touch', pointerId: 1 })
    act(() => vi.advanceTimersByTime(300))
    fireEvent.pointerUp(el, { pointerType: 'touch', pointerId: 1 })
    fireEvent.click(el, { detail: 1 })
    expect(onActivate).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(1000))
    fireEvent.pointerDown(el, { pointerType: 'touch', pointerId: 2 })
    act(() => vi.advanceTimersByTime(600))
    expect(onActivate).toHaveBeenCalledTimes(1)
    fireEvent.pointerUp(el, { pointerType: 'touch', pointerId: 2 })
    fireEvent.click(el, { detail: 1 })
    expect(onActivate).toHaveBeenCalledTimes(1)
  })

  it('ignores a repeated tap inside ignoreRepeatMs (tremor)', () => {
    const { onActivate, el } = setup({ ignoreRepeatMs: 300 })
    fireEvent.click(el, { detail: 1 })
    act(() => vi.advanceTimersByTime(120))
    fireEvent.click(el, { detail: 1 })
    expect(onActivate).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersByTime(400))
    fireEvent.click(el, { detail: 1 })
    expect(onActivate).toHaveBeenCalledTimes(2)
  })

  it('keyboard / assistive-tech clicks always work, even with a hold time', () => {
    const { onActivate, el } = setup({ holdMs: 800 })
    fireEvent.click(el, { detail: 0 })
    expect(onActivate).toHaveBeenCalledTimes(1)
  })

  it('dwell activates a hovering mouse after dwellMs and shows progress', () => {
    const { onActivate, el } = setup({ dwellMs: 800 })
    fireEvent.pointerEnter(el, { pointerType: 'mouse', pointerId: 1 })
    expect(el).toHaveAttribute('data-dwell', 'true')
    act(() => vi.advanceTimersByTime(799))
    expect(onActivate).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onActivate).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersByTime(2000))
    expect(onActivate).toHaveBeenCalledTimes(1)
  })

  it('leaving the target before the hold completes cancels it', () => {
    const { onActivate, el } = setup({ holdMs: 500 })
    fireEvent.pointerDown(el, { pointerType: 'touch', pointerId: 1 })
    act(() => vi.advanceTimersByTime(200))
    fireEvent.pointerLeave(el, { pointerType: 'touch', pointerId: 1 })
    act(() => vi.advanceTimersByTime(600))
    expect(onActivate).not.toHaveBeenCalled()
  })

  it('activateOnRelease=false fires on pointer down and swallows the following click', () => {
    const { onActivate, el } = setup({ activateOnRelease: false })
    fireEvent.pointerDown(el, { pointerType: 'touch', pointerId: 1 })
    expect(onActivate).toHaveBeenCalledTimes(1)
    fireEvent.pointerUp(el, { pointerType: 'touch', pointerId: 1 })
    fireEvent.click(el, { detail: 1 })
    expect(onActivate).toHaveBeenCalledTimes(1)
  })

  it('does nothing when disabled', () => {
    setTouch({})
    const onActivate = vi.fn()
    render(<Pressable label="x" disabled onActivate={onActivate}>x</Pressable>)
    fireEvent.click(screen.getByRole('button', { name: 'x' }), { detail: 1 })
    expect(onActivate).not.toHaveBeenCalled()
  })
})

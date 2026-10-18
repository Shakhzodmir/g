import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultProfile, useProfileStore, type ScanMode } from '../../store/profile'
import { Pressable, resetRepeatGuard } from '../Pressable'
import { ScanProvider } from './ScanProvider'
import { SCAN_CLASS } from './scanner'

function setScan(mode: ScanMode) {
  useProfileStore.setState({ profile: defaultProfile({ scanning: { mode, intervalMs: 1000 } }) })
}

const press = (key: string) => fireEvent.keyDown(window, { key, code: key === ' ' ? 'Space' : key })

describe('ScanProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetRepeatGuard()
  })
  afterEach(() => vi.useRealTimers())

  it('auto1: highlight advances every interval and Space selects', () => {
    setScan('auto1')
    const a = vi.fn()
    const b = vi.fn()
    render(
      <ScanProvider>
        <Pressable label="A" onActivate={a}>A</Pressable>
        <Pressable label="B" onActivate={b}>B</Pressable>
      </ScanProvider>,
    )
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('button', { name: 'A' })).toHaveClass(SCAN_CLASS)
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('button', { name: 'B' })).toHaveClass(SCAN_CLASS)
    act(() => press(' '))
    expect(b).toHaveBeenCalledTimes(1)
    expect(a).not.toHaveBeenCalled()
  })

  it('row-column: first a row is highlighted, selecting enters it, next selection activates an item', () => {
    setScan('auto1')
    const fns = { a1: vi.fn(), a2: vi.fn(), b1: vi.fn() }
    render(
      <ScanProvider>
        <Pressable label="a1" scanGroup="row-a" onActivate={fns.a1}>a1</Pressable>
        <Pressable label="a2" scanGroup="row-a" onActivate={fns.a2}>a2</Pressable>
        <Pressable label="b1" scanGroup="row-b" onActivate={fns.b1}>b1</Pressable>
      </ScanProvider>,
    )
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('button', { name: 'a1' })).toHaveClass(SCAN_CLASS)
    expect(screen.getByRole('button', { name: 'a2' })).toHaveClass(SCAN_CLASS)
    act(() => press('Enter'))
    expect(screen.getByRole('button', { name: 'a1' })).toHaveClass(SCAN_CLASS)
    expect(screen.getByRole('button', { name: 'a2' })).not.toHaveClass(SCAN_CLASS)
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('button', { name: 'a2' })).toHaveClass(SCAN_CLASS)
    act(() => press(' '))
    expect(fns.a2).toHaveBeenCalledTimes(1)
    expect(fns.a1).not.toHaveBeenCalled()
  })

  it('step2: Space moves, Enter selects', () => {
    setScan('step2')
    const a = vi.fn()
    const b = vi.fn()
    render(
      <ScanProvider>
        <Pressable label="A" onActivate={a}>A</Pressable>
        <Pressable label="B" onActivate={b}>B</Pressable>
      </ScanProvider>,
    )
    expect(screen.getByRole('button', { name: 'A' })).toHaveClass(SCAN_CLASS)
    act(() => press(' '))
    expect(screen.getByRole('button', { name: 'B' })).toHaveClass(SCAN_CLASS)
    act(() => press('Enter'))
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('does nothing when scanning is off', () => {
    setScan('off')
    const a = vi.fn()
    render(
      <ScanProvider>
        <Pressable label="A" onActivate={a}>A</Pressable>
      </ScanProvider>,
    )
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByRole('button', { name: 'A' })).not.toHaveClass(SCAN_CLASS)
  })
})

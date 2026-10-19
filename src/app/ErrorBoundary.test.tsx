import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary, isChunkLoadError, recoverFromChunkError, resetLocalSettings } from './ErrorBoundary'

function Boom({ message }: { message: string }): never {
  throw new Error(message)
}

describe('ErrorBoundary', () => {
  const reload = vi.fn()
  beforeEach(() => {
    sessionStorage.clear()
    reload.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, reload, hash: '' } })
  })
  afterEach(() => vi.restoreAllMocks())

  it('recognises failed lazy chunks', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://x/a.js'))).toBe(true)
    expect(isChunkLoadError(Object.assign(new Error('Loading chunk 4 failed'), { name: 'ChunkLoadError' }))).toBe(true)
    expect(isChunkLoadError(new Error('x is undefined'))).toBe(false)
  })

  it('shows a calm full-screen fallback with Home / Reload buttons for a render error', () => {
    render(
      <ErrorBoundary>
        <Boom message="x is undefined" />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Qayta yuklash' }))
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads automatically once for a chunk error, then purges and reloads, then shows the fallback', () => {
    expect(recoverFromChunkError()).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
    sessionStorage.setItem('gapimiz.chunkReloads', '2')
    expect(recoverFromChunkError()).toBe(false)
  })

  it('reset settings is behind a confirm and only clears gapimiz.* localStorage keys', () => {
    localStorage.setItem('gapimiz.device', '{}')
    localStorage.setItem('other', '1')
    render(
      <ErrorBoundary>
        <Boom message="oops" />
      </ErrorBoundary>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Sozlamalarni tiklash' }))
    expect(localStorage.getItem('gapimiz.device')).toBe('{}')
    fireEvent.click(screen.getByRole('button', { name: 'Ha, tiklash' }))
    expect(localStorage.getItem('gapimiz.device')).toBeNull()
    expect(localStorage.getItem('other')).toBe('1')
    resetLocalSettings()
  })
})

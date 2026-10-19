import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Dialog } from './Dialog'

function FormDialog({ onClose = () => undefined }: { onClose?: () => void }) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  // A fresh onClose identity on every render, exactly like real parents.
  return (
    <div id="root">
      <Dialog open onClose={() => onClose()} title="Karta">
        <label>
          Birinchi
          <input value={a} onChange={(e) => setA(e.target.value)} />
        </label>
        <label>
          Ikkinchi
          <input value={b} onChange={(e) => setB(e.target.value)} />
        </label>
      </Dialog>
    </div>
  )
}

describe('Dialog', () => {
  afterEach(() => {
    vi.useRealTimers()
    document.getElementById('root')?.removeAttribute('inert')
  })

  it('focuses the first field once and does not steal focus on re-render (typing in the 2nd field)', async () => {
    const user = userEvent.setup({ delay: 80 })
    render(<FormDialog />)
    await act(() => new Promise((r) => setTimeout(r, 80)))
    const first = screen.getByLabelText('Birinchi')
    const second = screen.getByLabelText('Ikkinchi')
    expect(first).toHaveFocus()
    await user.click(second)
    await user.keyboard('privet')
    expect(second).toHaveValue('privet')
    expect(second).toHaveFocus()
    expect(first).toHaveValue('')
  })

  it('shows a visible close button by default, hides it with hideClose', () => {
    const onClose = vi.fn()
    const { rerender } = render(
      <Dialog open onClose={onClose} title="T">
        x
      </Dialog>,
    )
    fireEvent.click(screen.getByRole('button', { name: /Yopish/ }))
    expect(onClose).toHaveBeenCalledTimes(1)
    rerender(
      <Dialog open onClose={onClose} title="T" hideClose>
        x
      </Dialog>,
    )
    expect(screen.queryByRole('button', { name: /Yopish/ })).toBeNull()
  })

  it('closes from the scrim only when the press both started and ended there', () => {
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose} title="T">
        <input aria-label="field" />
      </Dialog>,
    )
    const scrim = screen.getByRole('dialog').parentElement as HTMLElement
    // A click that began inside the panel (drag out of a text field) and ended on the scrim: ignored.
    fireEvent.pointerDown(screen.getByLabelText('field'))
    fireEvent.click(scrim)
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.pointerDown(scrim)
    fireEvent.click(scrim)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('makes the app root inert while open and restores it on close', () => {
    const { rerender } = render(
      <div id="root">
        <button>behind</button>
        <Dialog open onClose={() => undefined} title="T">
          x
        </Dialog>
      </div>,
    )
    expect(document.getElementById('root')).toHaveAttribute('inert')
    rerender(
      <div id="root">
        <button>behind</button>
        <Dialog open={false} onClose={() => undefined} title="T">
          x
        </Dialog>
      </div>,
    )
    expect(document.getElementById('root')).not.toHaveAttribute('inert')
  })
})

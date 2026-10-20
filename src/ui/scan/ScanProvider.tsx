import { useEffect, type ReactNode } from 'react'
import { useProfileStore } from '../../store/profile'
import { Scanner } from './scanner'

const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel', 'password', 'number', ''])

/**
 * True only where Space/Enter belong to the field: text-like inputs, textarea, select, contenteditable.
 * Radio, checkbox, range and button inputs do NOT count, otherwise one focused radio would silence scanning.
 */
export function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el || !el.tagName) return false
  if (el.isContentEditable) return true
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true
  if (el.tagName === 'INPUT') return TEXT_INPUT_TYPES.has(((el as HTMLInputElement).getAttribute('type') ?? '').toLowerCase())
  return false
}

/**
 * Enables switch access app-wide according to the profile: `auto1` (one switch, automatic highlight;
 * Space/Enter select) or `step2` (two switches: Space moves, Enter selects). Escape leaves a row.
 * `resetKey` (the current route) restarts the scan from the first item whenever the screen changes: a position kept
 * from the previous screen would land on an arbitrary element of the new one.
 */
export function ScanProvider({ children, onCue, resetKey }: { children: ReactNode; onCue?: (label: string) => void; resetKey?: string }) {
  const mode = useProfileStore((s) => s.profile.scanning.mode)
  const intervalMs = useProfileStore((s) => s.profile.scanning.intervalMs)
  const ignoreRepeatMs = useProfileStore((s) => s.profile.touch.ignoreRepeatMs)

  useEffect(() => {
    if (mode === 'off') return
    const scanner = new Scanner(undefined, onCue)
    let timer: ReturnType<typeof setInterval> | null = null
    const restart = () => {
      if (timer) clearInterval(timer)
      if (mode === 'auto1') timer = setInterval(() => scanner.step(), Math.max(400, intervalMs))
    }
    const lastAction = { space: 0, enter: 0 }
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return
      const isSpace = e.key === ' ' || e.code === 'Space'
      const isEnter = e.key === 'Enter'
      if (e.key === 'Escape') {
        scanner.back()
        return
      }
      if (!isSpace && !isEnter) return
      e.preventDefault()
      e.stopPropagation()
      // A held switch auto-repeats keydown: one press is one action. Tremor re-presses are filtered by the
      // same "ignore repeated activations" window the touch accommodations use.
      if (e.repeat) return
      const now = Date.now()
      const slot = isSpace ? 'space' : 'enter'
      if (ignoreRepeatMs > 0 && now - lastAction[slot] < ignoreRepeatMs) return
      lastAction[slot] = now
      if (mode === 'auto1') {
        scanner.select()
        restart()
      } else if (isSpace) {
        scanner.step()
      } else {
        scanner.select()
      }
    }
    window.addEventListener('keydown', onKey, true)
    restart()
    if (mode === 'step2') scanner.step()
    return () => {
      window.removeEventListener('keydown', onKey, true)
      if (timer) clearInterval(timer)
      scanner.clear()
    }
  }, [mode, intervalMs, ignoreRepeatMs, onCue, resetKey])

  return <>{children}</>
}

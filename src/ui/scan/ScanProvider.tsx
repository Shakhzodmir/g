import { useEffect, type ReactNode } from 'react'
import { useProfileStore } from '../../store/profile'
import { Scanner } from './scanner'

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

/**
 * Enables switch access app-wide according to the profile: `auto1` (one switch, automatic highlight;
 * Space/Enter select) or `step2` (two switches: Space moves, Enter selects). Escape leaves a row.
 */
export function ScanProvider({ children, onCue }: { children: ReactNode; onCue?: (label: string) => void }) {
  const mode = useProfileStore((s) => s.profile.scanning.mode)
  const intervalMs = useProfileStore((s) => s.profile.scanning.intervalMs)

  useEffect(() => {
    if (mode === 'off') return
    const scanner = new Scanner(undefined, onCue)
    let timer: ReturnType<typeof setInterval> | null = null
    const restart = () => {
      if (timer) clearInterval(timer)
      if (mode === 'auto1') timer = setInterval(() => scanner.step(), Math.max(400, intervalMs))
    }
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
  }, [mode, intervalMs, onCue])

  return <>{children}</>
}

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import { useProfileStore, type TouchSettings } from '../store/profile'
import { isPalm } from './palm'
import { ADULT_TOUCH, useAdultZone } from './AdultZone'

export interface PressableProps extends Omit<HTMLAttributes<HTMLElement>, 'onClick'> {
  onActivate: () => void
  /** Accessible name; should contain the visible text (WCAG 2.5.3). */
  label: string
  disabled?: boolean
  as?: 'button' | 'div'
  /** Row/group id for row-column switch scanning. */
  scanGroup?: string
  /** Exclude from switch scanning (e.g. decorative duplicates). */
  noScan?: boolean
  /** Per-component override of the profile's touch accommodations (e.g. games that need instant response). */
  touch?: Partial<TouchSettings>
  pressed?: boolean
  children?: ReactNode
}

// Repeat guard: a tremor re-fires the SAME target within a fraction of a second. Different targets are never
// blocked, so fast typing and fast message building keep working.
let lastActivation: { id: string; at: number } | null = null
export function resetRepeatGuard(): void {
  lastActivation = null
}

export const Pressable = forwardRef<HTMLElement, PressableProps>(function Pressable(
  { onActivate, label, disabled, as = 'button', scanGroup, noScan, touch: touchOverride, pressed, children, className, style, ...rest },
  ref,
) {
  const profileTouch = useProfileStore((s) => s.profile.touch)
  const adultZone = useAdultZone()
  const touch: TouchSettings = { ...profileTouch, ...(adultZone ? ADULT_TOUCH : null), ...touchOverride }
  const [isDown, setIsDown] = useState(false)
  const [dwelling, setDwelling] = useState(false)
  const instanceId = useId()
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointerActive = useRef(false)
  const swallowClick = useRef(false)
  const dwellSpent = useRef(false)
  const palmDown = useRef(false)

  const clearTimers = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current)
    if (dwellTimer.current) clearTimeout(dwellTimer.current)
    holdTimer.current = null
    dwellTimer.current = null
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  const fire = useCallback(
    (fromPointer: boolean) => {
      if (disabled) return
      if (fromPointer) {
        const now = Date.now()
        if (touch.ignoreRepeatMs > 0 && lastActivation && lastActivation.id === instanceId && now - lastActivation.at < touch.ignoreRepeatMs) return
        lastActivation = { id: instanceId, at: now }
      }
      onActivate()
    },
    [disabled, instanceId, onActivate, touch.ignoreRepeatMs],
  )

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (disabled) return
    // Board mode: a palm or sleeve on the panel is one big contact, not a press (see ui/palm.ts).
    palmDown.current = isPalm(e)
    if (palmDown.current) return
    pointerActive.current = true
    swallowClick.current = false
    setIsDown(true)
    if (!touch.activateOnRelease && touch.holdMs <= 0) {
      swallowClick.current = true
      fire(true)
      return
    }
    if (touch.holdMs > 0) {
      swallowClick.current = true
      clearTimers()
      holdTimer.current = setTimeout(() => {
        holdTimer.current = null
        setIsDown(false)
        fire(true)
      }, touch.holdMs)
    }
    rest.onPointerDown?.(e)
  }

  const cancelPress = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
    setIsDown(false)
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLElement>) => {
    cancelPress()
    rest.onPointerUp?.(e)
  }

  const onPointerLeave = (e: ReactPointerEvent<HTMLElement>) => {
    cancelPress()
    if (dwellTimer.current) {
      clearTimeout(dwellTimer.current)
      dwellTimer.current = null
    }
    setDwelling(false)
    dwellSpent.current = false
    rest.onPointerLeave?.(e)
  }

  const onPointerEnter = (e: ReactPointerEvent<HTMLElement>) => {
    rest.onPointerEnter?.(e)
    if (disabled || touch.dwellMs <= 0 || dwellSpent.current) return
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return
    setDwelling(true)
    dwellTimer.current = setTimeout(() => {
      dwellTimer.current = null
      dwellSpent.current = true
      setDwelling(false)
      fire(false)
    }, touch.dwellMs)
  }

  const onClick = (e: ReactMouseEvent<HTMLElement>) => {
    if (palmDown.current) {
      palmDown.current = false
      if (e.detail > 0) return // the click that follows a rejected palm; keyboard activation (detail 0) is never swallowed
    }
    // Pointer presses that were already handled by hold / immediate mode end with a click we must ignore.
    if (pointerActive.current && swallowClick.current) {
      pointerActive.current = false
      swallowClick.current = false
      return
    }
    const fromPointer = pointerActive.current || e.detail > 0
    pointerActive.current = false
    if (e.detail === 0 || !fromPointer) {
      // Keyboard, switch scanning or assistive technology: no hold requirement, no repeat guard.
      fire(false)
      return
    }
    if (touch.holdMs > 0) return
    fire(true)
  }

  const common = {
    ref: ref as never,
    ...rest,
    className,
    style: { ...style, '--dwell-ms': `${touch.dwellMs}ms`, '--hold-ms': `${touch.holdMs}ms` } as CSSProperties,
    // An empty name must not be written as aria-label="" (it would hide the visible text from the accessible name).
    'aria-label': label || undefined,
    'aria-disabled': disabled || undefined,
    'aria-pressed': pressed,
    'data-pressable': '',
    'data-pressed': isDown ? 'true' : undefined,
    'data-dwell': dwelling ? 'true' : undefined,
    'data-holding': isDown && touch.holdMs > 0 ? 'true' : undefined,
    'data-scan': noScan || disabled ? undefined : '',
    'data-scan-group': scanGroup,
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    onPointerCancel: onPointerLeave,
    onPointerEnter,
    onClick,
  }

  // One shared progress cue for hold-to-press and dwell (styled in design/global.css).
  const progressKind = dwelling ? 'dwell' : isDown && touch.holdMs > 0 ? 'hold' : null
  const progress = progressKind ? <span className="pressable-progress" data-kind={progressKind} aria-hidden="true" /> : null

  if (as === 'div') {
    return (
      <div
        {...common}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          rest.onKeyDown?.(e)
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!e.repeat) fire(false)
          }
        }}
      >
        {children}
        {progress}
      </div>
    )
  }
  return (
    <button {...common} type="button" disabled={disabled}>
      {children}
      {progress}
    </button>
  )
})

import { createContext, useContext, type ReactNode } from 'react'
import type { TouchSettings } from '../store/profileTypes'

/**
 * Touch accommodations (hold-to-press, dwell, repeat guard) are tuned for the child's or user's own screens.
 * Inside the adult area they would make settings, forms and the parent gate close to unusable, so every
 * Pressable below an <AdultZone> responds to a plain tap / click / Enter.
 */
export const ADULT_TOUCH: TouchSettings = { holdMs: 0, dwellMs: 0, ignoreRepeatMs: 0, activateOnRelease: true }

const AdultZoneContext = createContext(false)

export function AdultZone({ children }: { children: ReactNode }) {
  return <AdultZoneContext.Provider value>{children}</AdultZoneContext.Provider>
}

export function useAdultZone(): boolean {
  return useContext(AdultZoneContext)
}

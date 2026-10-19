import type { Sensory } from '../store/profileTypes'
import { getProfile } from '../store/profile'

/** True when the OS asks for reduced motion. */
export function prefersReducedMotion(): boolean {
  try {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  } catch {
    return false
  }
}

/**
 * The sensory level that actually applies: `prefers-reduced-motion` forces 'calm' (no springs, no particles,
 * no sound effects), otherwise the profile's own choice. Pass nothing to read the current profile.
 */
export function effectiveSensory(sensory: Sensory = getProfile().sensory, reduced: boolean = prefersReducedMotion()): Sensory {
  return reduced ? 'calm' : sensory
}

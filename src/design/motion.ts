import { useReducedMotion, type Transition } from 'motion/react'
import { useProfileStore, type Sensory } from '../store/profile'

export interface MotionPreset {
  /** Press feedback on buttons/cells. */
  press: Transition
  /** Screen/content transitions. */
  screen: Transition
  /** Dialog and sheet appearance. */
  dialog: Transition
  /** Small pop for a reward or a card arriving in the message bar. */
  pop: Transition
  /** Scale applied while pressing (1 = none). */
  pressScale: number
  /** Whether moving elements (fly-to-bar, hop) are allowed; otherwise fade only. */
  movement: boolean
  /** Mascot idle loops and ambient motion. */
  idleLoops: boolean
  /** Particle celebration (only in 'festive'). */
  particles: boolean
}

const spring = (stiffness: number, dampingRatio: number): Transition => ({
  type: 'spring',
  stiffness,
  damping: dampingRatio * 2 * Math.sqrt(stiffness),
  mass: 1,
})

const fade: Transition = { type: 'tween', duration: 0.15, ease: 'easeOut' }

/** Motion presets derived from Material 3 Expressive/Standard springs, tuned calmer for autistic users. */
export function motionPreset(sensory: Sensory, reduced: boolean, adult = false): MotionPreset {
  if (reduced || sensory === 'calm') {
    return { press: fade, screen: fade, dialog: fade, pop: fade, pressScale: 1, movement: false, idleLoops: false, particles: false }
  }
  if (adult) {
    return {
      press: spring(1400, 1),
      screen: spring(700, 0.9),
      dialog: { type: 'tween', duration: 0.2, ease: 'easeOut' },
      pop: spring(700, 0.9),
      pressScale: 0.98,
      movement: true,
      idleLoops: false,
      particles: false,
    }
  }
  return {
    press: spring(800, 0.75),
    screen: spring(380, 0.9),
    dialog: { type: 'tween', duration: 0.26, ease: [0.2, 0.9, 0.3, 1] },
    pop: spring(500, 0.7),
    pressScale: 0.96,
    movement: true,
    idleLoops: true,
    particles: sensory === 'festive',
  }
}

export function useMotionPreset(): MotionPreset {
  const reduced = useReducedMotion() ?? false
  const sensory = useProfileStore((s) => s.profile.sensory)
  const adult = useProfileStore((s) => s.profile.kind === 'adult')
  return motionPreset(sensory, reduced, adult)
}

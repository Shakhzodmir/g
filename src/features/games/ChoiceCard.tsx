import { motion, useAnimate } from 'motion/react'
import { useEffect, type ReactNode } from 'react'
import { useMotionPreset } from '../../design/motion'
import { shy } from '../../lib/hyphenate'
import { useProfileStore } from '../../store/profile'
import { Pressable, type PressableProps } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import styles from './Games.module.css'

export type ChoiceState = 'idle' | 'hint' | 'right' | 'dim'

export interface ChoiceCardProps extends Omit<PressableProps, 'children'> {
  symbol?: string
  /** A drawn picture (swatch, shape, numeral) instead of a symbol. */
  visual?: ReactNode
  /** Visible caption (optional: non-readers rely on the picture). */
  caption?: string
  state?: ChoiceState
  /** Increase to play the tiny calm "not this one" wiggle (a fade in calm mode). */
  wiggle?: number
  /** Increase to play a gentle bob (explore mode, correct answer). */
  bob?: number
  badge?: ReactNode
}

/** Big picture card for choice games. Never red, never a "wrong" sound: only a small wiggle. */
export function ChoiceCard({ symbol, visual, caption, state = 'idle', wiggle = 0, bob = 0, badge, className, ...rest }: ChoiceCardProps) {
  const preset = useMotionPreset()
  const lang = useProfileStore((s) => s.profile.speechLang)
  const [scope, animate] = useAnimate<HTMLSpanElement>()

  useEffect(() => {
    if (!wiggle || !scope.current) return
    if (preset.movement) void animate(scope.current, { x: [0, -7, 6, -4, 3, 0] }, { duration: 0.45, ease: 'easeInOut' })
    else void animate(scope.current, { opacity: [1, 0.6, 1] }, { duration: 0.3 })
  }, [wiggle, animate, preset.movement, scope])

  useEffect(() => {
    if (!bob || !scope.current) return
    if (preset.movement) void animate(scope.current, { y: [0, -14, 0, -5, 0], scale: [1, 1.04, 1, 1.01, 1] }, { duration: 0.8, ease: 'easeInOut' })
    else void animate(scope.current, { opacity: [1, 0.75, 1] }, { duration: 0.3 })
  }, [bob, animate, preset.movement, scope])

  return (
    <Pressable {...rest} className={[styles.choice, className].filter(Boolean).join(' ')} data-state={state}>
      <motion.span ref={scope} className={styles.choiceInner}>
        <span className={styles.choicePic} aria-hidden="true">
          {visual ?? <SymbolImg id={symbol ?? ''} />}
        </span>
        {caption && <span className={styles.choiceCaption}>{shy(caption, lang === 'ru' ? 'ru' : 'uz')}</span>}
      </motion.span>
      {badge}
    </Pressable>
  )
}

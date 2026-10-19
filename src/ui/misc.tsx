import { Maximize, Minimize } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { useMotionPreset } from '../design/motion'
import { COMMON } from '../i18n/common'
import { useStrings } from '../i18n'
import { Button } from './Button'
import styles from './misc.module.css'
import { SymbolImg } from './SymbolImg'

/** Raised surface. */
export function Card({ children, className, as: As = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' }) {
  return (
    <As className={[styles.card, className].filter(Boolean).join(' ')} data-surface="">
      {children}
    </As>
  )
}

/** Empty screens invite an action instead of just saying "nothing here". */
export function EmptyState({
  symbol,
  title,
  text,
  action,
  heading,
}: {
  symbol: string
  title: string
  text?: string
  action?: ReactNode
  /** Render the title as a real heading (use 1 when the empty state IS the screen, e.g. a 404 page). */
  heading?: 1 | 2 | 3
}) {
  const Heading = heading ? (`h${heading}` as 'h1' | 'h2' | 'h3') : 'p'
  return (
    <div className={styles.empty}>
      <SymbolImg id={symbol} size={96} />
      <Heading className={styles.emptyTitle}>{title}</Heading>
      {text && <p className={styles.emptyText}>{text}</p>}
      {action}
    </div>
  )
}

/**
 * Calm reward: the sticker settles in with a soft glow. Particles only in the "festive" sensory level,
 * always inside the reward area (never full-screen), no flashing.
 */
export function Reward({ symbol, label, onDone }: { symbol: string; label: string; onDone?: () => void }) {
  const preset = useMotionPreset()
  useEffect(() => {
    if (!onDone) return
    const t = setTimeout(onDone, 1600)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className={styles.reward} role="status" aria-live="polite">
      <motion.div
        className={styles.rewardGlow}
        initial={{ opacity: 0, scale: preset.movement ? 0.7 : 1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={preset.pop}
      >
        <SymbolImg id={symbol} />
      </motion.div>
      {preset.particles && (
        <div className={styles.particles} aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <motion.span
              key={i}
              className={styles.particle}
              style={{ '--i': i } as React.CSSProperties}
              initial={{ opacity: 0, x: 0, y: 0 }}
              animate={{ opacity: [0, 1, 0], x: Math.cos((i / 10) * Math.PI * 2) * 90, y: Math.sin((i / 10) * Math.PI * 2) * 70 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
            />
          ))}
        </div>
      )}
      <p className={styles.rewardLabel}>{label}</p>
    </div>
  )
}

export function FullscreenButton() {
  const t = useStrings(COMMON)
  const [on, setOn] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement)
  useEffect(() => {
    const h = () => setOn(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])
  if (typeof document === 'undefined' || !document.documentElement.requestFullscreen) return null
  const label = on ? t('exitFullscreen') : t('fullscreen')
  return (
    <Button
      variant="soft"
      iconOnly
      icon={on ? <Minimize /> : <Maximize />}
      label={label}
      onActivate={() => {
        if (document.fullscreenElement) void document.exitFullscreen()
        else void document.documentElement.requestFullscreen().catch(() => undefined)
      }}
    >
      {label}
    </Button>
  )
}

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Pressable, type PressableProps } from './Pressable'
import { SymbolImg } from './SymbolImg'
import styles from './Tile.module.css'

export type TileTone = 'primary' | 'secondary' | 'warm' | 'calm' | 'neutral'

export interface TileProps extends Omit<PressableProps, 'children'> {
  symbol?: string
  /** Custom visual instead of a symbol (e.g. the mascot). */
  art?: ReactNode
  title: string
  subtitle?: string
  tone?: TileTone
  /** 'plate' = round Rishtan plate (home navigation); 'card' = rounded rectangle. */
  shape?: 'plate' | 'card'
  /**
   * The tile opens another screen. A lazy screen may take a moment to arrive on a slow link: the tile shows a quiet
   * "on its way" state (slightly dimmer, no motion) so a second tap is not needed. Clears itself after 4 s.
   */
  navigates?: boolean
}

/** Large, picture-first navigation tile. The whole tile is one target. */
export function Tile({ symbol, art, title, subtitle, tone = 'primary', shape = 'card', navigates, className, onActivate, ...rest }: TileProps) {
  const [pending, setPending] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const activate = () => {
    if (navigates) {
      setPending(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setPending(false), 4000)
    }
    onActivate()
  }
  return (
    <Pressable {...rest} onActivate={activate} data-pending={pending || undefined} aria-busy={pending || undefined} className={[styles.tile, styles[tone], styles[shape], className].filter(Boolean).join(' ')}>
      <span className={styles.visual} aria-hidden="true">
        {art ?? (symbol ? <SymbolImg id={symbol} /> : null)}
      </span>
      <span className={styles.title}>{title}</span>
      {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
    </Pressable>
  )
}

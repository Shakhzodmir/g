import type { ReactNode } from 'react'
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
}

/** Large, picture-first navigation tile. The whole tile is one target. */
export function Tile({ symbol, art, title, subtitle, tone = 'primary', shape = 'card', className, ...rest }: TileProps) {
  return (
    <Pressable {...rest} className={[styles.tile, styles[tone], styles[shape], className].filter(Boolean).join(' ')}>
      <span className={styles.visual} aria-hidden="true">
        {art ?? (symbol ? <SymbolImg id={symbol} /> : null)}
      </span>
      <span className={styles.title}>{title}</span>
      {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
    </Pressable>
  )
}

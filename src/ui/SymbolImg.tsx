import { useState } from 'react'
import styles from './SymbolImg.module.css'

/** Symbols drawn for Uzbek realia (public/symbols/custom/*.svg); everything else is Fluent Emoji 3D WebP. */
export const CUSTOM_SYMBOLS = new Set(['anor', 'non', 'doppi', 'somsa', 'palov', 'qorin', 'size_big', 'size_small', 'different', 'doll', 'blocks'])

export function symbolUrl(id: string): string {
  const base = import.meta.env.BASE_URL
  return CUSTOM_SYMBOLS.has(id) ? `${base}symbols/custom/${id}.svg` : `${base}symbols/${id}.webp`
}

export interface SymbolImgProps {
  id: string
  /** Rendered size in CSS px (square); omit to fill the parent. */
  size?: number
  /** Use '' when a visible text label sits next to the symbol. */
  alt?: string
  /** Optional user photo (custom card) that replaces the symbol. */
  src?: string
  className?: string
}

export function SymbolImg({ id, size, alt = '', src, className }: SymbolImgProps) {
  const [failed, setFailed] = useState(false)
  const style = size ? { width: size, height: size } : undefined
  if (failed && !src) {
    return (
      <span className={[styles.fallback, className].filter(Boolean).join(' ')} style={style} role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}>
        <span className={styles.dot} />
      </span>
    )
  }
  return (
    <img
      className={[styles.img, src && styles.photo, className].filter(Boolean).join(' ')}
      style={style}
      src={src ?? symbolUrl(id)}
      alt={alt}
      draggable={false}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}

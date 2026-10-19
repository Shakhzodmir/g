import type { CSSProperties } from 'react'
import type { Fitz } from '../../content/types'
import { SOFT_HYPHEN, syllablesOf } from '../../lib/hyphenate'
import { useProfileStore, type AacSettings } from '../../store/profile'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import styles from './Aac.module.css'

/** Cells are narrow: words of 6+ letters get soft hyphens (the shared shy() starts at 7). */
function cellText(text: string, lang: 'uz' | 'ru'): string {
  return text.replace(/[\p{L}ʻʼ]{6,}/gu, (w) => syllablesOf(w, lang).join(SOFT_HYPHEN))
}

export function fitzVars(fitz: Fitz): CSSProperties {
  return { '--cell-bg': `var(--fitz-${fitz}-bg)`, '--cell-border': `var(--fitz-${fitz}-border)` } as CSSProperties
}

export interface CellProps {
  symbol: string
  src?: string
  label: string
  fitz: Fitz
  aac: Pick<AacSettings, 'showLabels' | 'labelPos' | 'colorCoding'>
  onActivate: () => void
  scanGroup?: string
  glow?: boolean
}

/** One AAC cell: symbol first, optional short label above or below, part-of-speech colour + border. */
export function Cell({ symbol, src, label, fitz, aac, onActivate, scanGroup, glow }: CellProps) {
  const lang = useProfileStore((s) => s.profile.speechLang)
  return (
    <Pressable
      className={styles.cell}
      label={label}
      scanGroup={scanGroup}
      onActivate={onActivate}
      style={aac.colorCoding ? fitzVars(fitz) : undefined}
      data-color={aac.colorCoding ? 'true' : 'false'}
      data-label={aac.showLabels ? aac.labelPos : 'off'}
      data-glow={glow ? 'true' : undefined}
    >
      <span className={styles.cellSymbol} aria-hidden="true">
        <SymbolImg id={symbol} src={src} />
      </span>
      {aac.showLabels && (
        <span className={styles.cellLabel} aria-hidden="true">
          {cellText(label, lang)}
        </span>
      )}
    </Pressable>
  )
}

/** Empty place of the same size: hidden or not-yet-unlocked words keep every other cell where it is. */
export function Placeholder() {
  return <span className={styles.placeholder} aria-hidden="true" />
}

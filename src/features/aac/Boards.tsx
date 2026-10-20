import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import type { TopicId } from '../../content/types'
import { wordsForKind } from '../../content/vocab'
import { useLabel } from '../../i18n'
import type { AacSettings } from '../../store/profile'
import styles from './Aac.module.css'
import { Cell, Placeholder } from './Cell'
import { buildCoreBoard, CORE_SIZE } from './core'
import { cardEntry, wordEntry, type Entry, type OnTap } from './entry'
import { useCustomCards } from './useCustomCards'

interface BoardProps {
  aac: AacSettings
  onTap: OnTap
  glowKey: string | null
  /** Accessible name of the grid (the topic's name). */
  name: string
}

const MIN_CELL = 48
const MAX_CELL = 190

/**
 * Cell size for the 6×6 core: as big as fits the panel's width and height. When even 52 px rows do not
 * fit the height (phone landscape), the panel scrolls, so the cell may as well be comfortable (≤ 72 px).
 */
export function coreCellSize(width: number, height: number, gap: number, comfortable: number): number {
  const fit = (len: number) => (len - (CORE_SIZE - 1) * gap) / CORE_SIZE
  const byWidth = fit(width)
  const byHeight = fit(height)
  const size = byHeight >= MIN_CELL ? Math.min(byWidth, byHeight) : Math.min(byWidth, comfortable)
  return Math.floor(Math.min(MAX_CELL, Math.max(MIN_CELL, size)))
}

/** Below this width a square cell cannot carry a symbol and a readable two-line label. */
const NARROW_CELL = 84
/** Tallest a narrow cell may grow, as a multiple of its width. */
const NARROW_MAX_RATIO = 1.45
/** Spare panel height must allow at least this ratio for the rows to fit without scrolling. */
const NARROW_FIT_RATIO = 1.2
/** When the rows cannot fit, a narrow cell keeps this ratio and the panel scrolls (positions never change). */
const NARROW_SCROLL_RATIO = 1.4

/**
 * Height of a cell. Cells are square, except on narrow phones: there a 13 px label needs room (up to three
 * short lines for the longest words), so cells are taller than wide. They use the spare panel height (up to
 * 1.45× the width); on the shortest phones, where the rows would not fit anyway, they keep 1.4× and the
 * panel scrolls.
 */
export function coreCellHeight(cell: number, height: number, gap: number): number {
  if (cell >= NARROW_CELL) return cell
  const byHeight = Math.floor((height - (CORE_SIZE - 1) * gap) / CORE_SIZE)
  return byHeight >= Math.round(cell * NARROW_FIT_RATIO)
    ? Math.min(byHeight, Math.floor(cell * NARROW_MAX_RATIO))
    : Math.round(cell * NARROW_SCROLL_RATIO)
}

function useCoreCell(ref: RefObject<HTMLElement | null>, comfortable: number): { cell: number; cellH: number; gap: number } {
  const [dims, setDims] = useState({ cell: 72, cellH: 72, gap: 6 })
  useLayoutEffect(() => {
    const el = ref.current?.parentElement
    if (!el) return
    const measure = () => {
      const cs = getComputedStyle(el)
      const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      const h = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
      // Phones: the tightest gap (4 px), every pixel of width goes to the cells.
      const gap = w < 420 ? 4 : Math.round(Math.min(12, Math.max(4, Math.min(w, h) * 0.012)))
      const cell = coreCellSize(w, h, gap, comfortable)
      const cellH = coreCellHeight(cell, h, gap)
      setDims((d) => (d.cell === cell && d.cellH === cellH && d.gap === gap ? d : { cell, cellH, gap }))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, comfortable])
  return dims
}

/** Fixed 6×6 core board: words never move; masked words leave empty places of the same size. */
export function CoreBoard({ aac, onTap, glowKey, name, comfortable = 72, kind = 'child' }: BoardProps & { comfortable?: number; kind?: 'child' | 'adult' }) {
  const label = useLabel()
  const ref = useRef<HTMLDivElement>(null)
  const { cell, cellH, gap } = useCoreCell(ref, comfortable)
  const cells = useMemo(() => buildCoreBoard(wordsForKind(kind), aac.level, aac.hiddenWordIds), [kind, aac.level, aac.hiddenWordIds])
  return (
    <div
      ref={ref}
      className={styles.core}
      role="group"
      aria-label={name}
      style={{ '--cell': `${cell}px`, '--cell-h': `${cellH}px`, '--gap': `${gap}px`, gridTemplateColumns: `repeat(${CORE_SIZE}, var(--cell))` } as CSSProperties}
    >
      {cells.map((c) => {
        if (!c.word) return <Placeholder key={`${c.row}-${c.col}`} />
        const e = wordEntry(c.word)
        return (
          <Cell
            key={e.key}
            symbol={e.symbol}
            label={label(e.text)}
            fitz={e.fitz}
            aac={aac}
            scanGroup={`row-${c.row}`}
            glow={glowKey === e.key}
            onActivate={() => onTap(e)}
          />
        )
      })}
    </div>
  )
}

/** Number of columns the browser actually laid out (auto-fill), for row-column scanning groups. */
function useGridColumns(ref: RefObject<HTMLElement | null>): number {
  const [cols, setCols] = useState(1)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const n = getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length
      setCols(Math.max(1, n))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return cols
}

/** A topic (fringe) board: stable order of built-in words, then the profile's own cards. */
export function TopicBoard({ topic, profileId, aac, onTap, glowKey, name, kind = 'child' }: BoardProps & { topic: TopicId; profileId: string; kind?: 'child' | 'adult' }) {
  const label = useLabel()
  const custom = useCustomCards(profileId, topic)
  const ref = useRef<HTMLDivElement>(null)
  const cols = useGridColumns(ref)
  const hidden = useMemo(() => new Set(aac.hiddenWordIds), [aac.hiddenWordIds])
  const slots: Array<Entry | null> = useMemo(
    () => [
      ...wordsForKind(kind)
        .filter((w) => w.topic === topic)
        .map((w) => (hidden.has(w.id) ? null : wordEntry(w))),
      ...custom.map((c) => cardEntry(c.card, c.src)),
    ],
    [topic, kind, hidden, custom],
  )
  return (
    <div ref={ref} className={styles.topicGrid} role="group" aria-label={name}>
      {slots.map((e, i) => {
        if (!e) return <Placeholder key={`ph-${i}`} />
        return (
          <Cell
            key={e.key}
            symbol={e.symbol}
            src={e.src}
            label={label(e.text)}
            fitz={e.fitz}
            aac={aac}
            scanGroup={`row-${Math.floor(i / cols)}`}
            glow={glowKey === e.key}
            onActivate={() => onTap(e)}
          />
        )
      })}
    </div>
  )
}

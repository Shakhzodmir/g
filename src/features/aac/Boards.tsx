import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import type { TopicId } from '../../content/types'
import { WORDS, wordsByTopic } from '../../content/vocab'
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
}

const MIN_CELL = 52
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

function useCoreCell(ref: RefObject<HTMLElement | null>, comfortable: number): { cell: number; gap: number } {
  const [dims, setDims] = useState({ cell: 72, gap: 6 })
  useLayoutEffect(() => {
    const el = ref.current?.parentElement
    if (!el) return
    const measure = () => {
      const cs = getComputedStyle(el)
      const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      const h = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
      const gap = Math.round(Math.min(12, Math.max(4, Math.min(w, h) * 0.012)))
      const cell = coreCellSize(w, h, gap, comfortable)
      setDims((d) => (d.cell === cell && d.gap === gap ? d : { cell, gap }))
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
export function CoreBoard({ aac, onTap, glowKey, comfortable = 72 }: BoardProps & { comfortable?: number }) {
  const label = useLabel()
  const ref = useRef<HTMLDivElement>(null)
  const { cell, gap } = useCoreCell(ref, comfortable)
  const cells = useMemo(() => buildCoreBoard(WORDS, aac.level, aac.hiddenWordIds), [aac.level, aac.hiddenWordIds])
  return (
    <div
      ref={ref}
      className={styles.core}
      role="group"
      style={{ '--cell': `${cell}px`, '--gap': `${gap}px`, gridTemplateColumns: `repeat(${CORE_SIZE}, var(--cell))` } as CSSProperties}
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
export function TopicBoard({ topic, profileId, aac, onTap, glowKey }: BoardProps & { topic: TopicId; profileId: string }) {
  const label = useLabel()
  const custom = useCustomCards(profileId, topic)
  const ref = useRef<HTMLDivElement>(null)
  const cols = useGridColumns(ref)
  const hidden = useMemo(() => new Set(aac.hiddenWordIds), [aac.hiddenWordIds])
  const slots: Array<Entry | null> = useMemo(
    () => [...wordsByTopic(topic).map((w) => (hidden.has(w.id) ? null : wordEntry(w))), ...custom.map((c) => cardEntry(c.card, c.src))],
    [topic, hidden, custom],
  )
  return (
    <div ref={ref} className={styles.topicGrid} role="group">
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

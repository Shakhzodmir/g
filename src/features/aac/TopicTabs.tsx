import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { useMotionPreset } from '../../design/motion'
import { useStrings } from '../../i18n'
import { pluralizeForms } from '../../i18n/plural'
import { shy } from '../../lib/hyphenate'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import styles from './Aac.module.css'
import { S } from './strings'

export interface TabItem {
  id: string
  label: string
  symbol: string
  /** Cards on the board of this tab (topics only); shown as a small number. */
  count?: number
}

interface Edges {
  vertical: boolean
  before: boolean
  after: boolean
}

const SLACK = 3

/**
 * The strip scrolls along its own axis (sideways on a phone, up and down in the column of a tablet or a whiteboard).
 * Tells which way there is more to see, and keeps itself up to date while scrolling, resizing and re-wrapping.
 */
function useScrollEdges(ref: RefObject<HTMLElement | null>, deps: unknown): Edges {
  const [edges, setEdges] = useState<Edges>({ vertical: false, before: false, after: false })
  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const vertical = getComputedStyle(el).flexDirection === 'column'
    const pos = vertical ? el.scrollTop : el.scrollLeft
    const max = vertical ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth
    const before = pos - SLACK > 0
    const after = max - pos - SLACK > 0
    const next = { vertical, before, after }
    setEdges((e) => (e.vertical === next.vertical && e.before === next.before && e.after === next.after ? e : next))
  }, [ref])
  useLayoutEffect(() => {
    measure()
    const el = ref.current
    if (!el) return
    el.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    ro?.observe(el)
    return () => {
      el.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
      ro?.disconnect()
    }
  }, [measure, ref, deps])
  return edges
}

/** Brings the chosen tab fully into view inside the strip (only the strip scrolls, never the page). */
function revealActive(nav: HTMLElement, smooth: boolean): void {
  const el = nav.querySelector<HTMLElement>('[aria-pressed="true"]')
  if (!el) return
  const vertical = getComputedStyle(nav).flexDirection === 'column'
  const n = nav.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  if (n.width === 0 || n.height === 0) return
  // keep a little of the next tab in view, so the strip still looks like it continues
  const pad = 24
  const behavior = smooth ? 'smooth' : 'auto'
  if (vertical) {
    if (r.top < n.top) nav.scrollTo({ top: nav.scrollTop - (n.top - r.top) - pad, behavior })
    else if (r.bottom > n.bottom) nav.scrollTo({ top: nav.scrollTop + (r.bottom - n.bottom) + pad, behavior })
  } else if (r.left < n.left) nav.scrollTo({ left: nav.scrollLeft - (n.left - r.left) - pad, behavior })
  else if (r.right > n.right) nav.scrollTo({ left: nav.scrollLeft + (r.right - n.right) + pad, behavior })
}

/**
 * The topic tabs. More than twenty topics do not fit one screen, so the strip scrolls, and says so: a soft fade on the
 * side where more tabs wait, plus a big round arrow that moves the strip by about a screenful. Nothing is hidden or
 * grouped away: every topic is one swipe, one arrow tap or one Tab key press away. The chosen tab is scrolled into
 * view when the screen opens on it (a deep link such as /talk?topic=school).
 */
export function TopicTabs({ tabs, activeId, onSelect, hy }: { tabs: TabItem[]; activeId: string | null; onSelect: (id: string) => void; hy: 'ru' | 'uz' }) {
  const t = useStrings(S)
  const preset = useMotionPreset()
  const nav = useRef<HTMLElement>(null)
  const edges = useScrollEdges(nav, tabs.length)

  useLayoutEffect(() => {
    if (nav.current) revealActive(nav.current, false)
  }, [activeId, tabs.length])

  // After a layout change (rotation, large text) the chosen tab may have moved out of sight.
  useEffect(() => {
    const el = nav.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => revealActive(el, false))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const page = (dir: 1 | -1) => {
    const el = nav.current
    if (!el) return
    const size = edges.vertical ? el.clientHeight : el.clientWidth
    const by = dir * Math.max(size * 0.8, 120)
    const behavior = preset.movement ? 'smooth' : 'auto'
    el.scrollBy(edges.vertical ? { top: by, behavior } : { left: by, behavior })
  }

  const Back = edges.vertical ? ChevronUp : ChevronLeft
  const Next = edges.vertical ? ChevronDown : ChevronRight
  return (
    <div className={styles.tabsWrap} data-dir={edges.vertical ? 'y' : 'x'} data-before={edges.before || undefined} data-after={edges.after || undefined}>
      <nav ref={nav} className={styles.tabs} aria-label={t('topics')}>
        {tabs.map((tab) => {
          const count = tab.count === undefined ? null : pluralizeForms(t('topicCount', { n: tab.count }), tab.count)
          return (
            <Pressable
              key={tab.id}
              className={styles.tab}
              label={count ? `${tab.label}, ${count}` : tab.label}
              scanGroup="tabs"
              pressed={tab.id === activeId}
              onActivate={() => onSelect(tab.id)}
            >
              <span className={styles.tabIcon} aria-hidden="true">
                <SymbolImg id={tab.symbol} />
              </span>
              <span className={styles.tabLabel}>{shy(tab.label, hy)}</span>
              {tab.count !== undefined && (
                <span className={styles.tabCount} aria-hidden="true">
                  {tab.count}
                </span>
              )}
            </Pressable>
          )
        })}
      </nav>
      {edges.before && (
        <Pressable className={styles.tabsArrow} data-side="before" label={t('topicsBack')} scanGroup="tabs" onActivate={() => page(-1)}>
          <Back aria-hidden="true" />
        </Pressable>
      )}
      {edges.after && (
        <Pressable className={styles.tabsArrow} data-side="after" label={t('topicsMore')} scanGroup="tabs" onActivate={() => page(1)}>
          <Next aria-hidden="true" />
        </Pressable>
      )}
    </div>
  )
}

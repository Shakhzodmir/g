import { useLayoutEffect, useRef, type ReactNode } from 'react'
import styles from './Page.module.css'

const PAGE_W = { narrow: 'var(--width-narrow)', normal: 'var(--width-normal)', wide: 'var(--width-wide)', full: 'none' } as const

/**
 * Standard page body: one gutter, one max width, one vertical rhythm for every screen.
 * width: narrow (reading / forms), normal (default), wide (boards and grids), full (edge to edge).
 */
export function Page({
  children,
  width = 'normal',
  gap = 'section',
  className,
}: {
  children: ReactNode
  width?: 'narrow' | 'normal' | 'wide' | 'full'
  gap?: 'section' | 'tight'
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  // The page header (a sibling above the page) follows this page's width through --page-w on <main>.
  // Written from here instead of `main:has([data-pw])`, which Chrome < 105 / Safari < 15.4 do not know.
  useLayoutEffect(() => {
    const el = ref.current
    const main = el?.closest('main')
    if (!el || !main || el.parentElement?.closest('[data-pw]')) return
    main.style.setProperty('--page-w', PAGE_W[width])
    return () => {
      main.style.removeProperty('--page-w')
    }
  }, [width])
  return (
    <div ref={ref} data-pw={width} className={[styles.page, styles[width], gap === 'tight' && styles.tight, className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}

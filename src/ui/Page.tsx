import type { ReactNode } from 'react'
import styles from './Page.module.css'

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
  return (
    <div className={[styles.page, styles[width], gap === 'tight' && styles.tight, className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}

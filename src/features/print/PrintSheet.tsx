import { lazy, Suspense, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { appUrl, displayUrl, appBaseUrl } from '../../lib/appUrl'
import css from './print.module.css'

/*
 * Reusable kit for one-page printable sheets (A4, ink-light, readable in black and white).
 *
 * PrintPages is the container (it scales the on-screen preview to the screen width); every page inside it is one
 * PrintSheet with lang, title, subtitle, footerNote and an optional qr = { route, caption, alt }, and the page content as its children.
 *
 * A sheet is laid out in millimetres and points at its real paper size (190 × 276 mm inside the 10 mm page margin), so the
 * preview and the printout are the same layout; on screen the whole sheet is only scaled down. Buttons and options around
 * the sheets carry `data-no-print`; the browser's own print dialog does the rest (see Print.tsx for a full example).
 * The QR code (QrLink) opens a screen of the deployed app through lib/appUrl and loads its encoder lazily.
 */

/** Printable width of the sheet in CSS pixels: 190 mm at 96 dpi. */
const SHEET_PX = (190 / 25.4) * 96

const QrCode = lazy(() => import('./QrCode'))

/** Fits the preview to the width of its container: 1 on a desktop, smaller on a phone. */
function useFitScale() {
  const ref = useRef<HTMLDivElement>(null)
  const [k, setK] = useState(1)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      if (w > 0) setK(Math.min(1, w / SHEET_PX))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, k }
}

export function PrintPages({ children, className }: { children: ReactNode; className?: string }) {
  const { ref, k } = useFitScale()
  return (
    <div ref={ref} className={[css.pages, className].filter(Boolean).join(' ')} style={{ '--k': k } as CSSProperties}>
      {children}
    </div>
  )
}

export interface SheetQr {
  /** App route to open, e.g. `/exercises/mirror`. */
  route: string
  /** Text next to the code, already in the sheet language. */
  caption: string
  /** Accessible name of the code, e.g. «QR-kod: https://…». */
  alt: string
}

/**
 * QR code with a caption. The size is `--qr-size` (26 mm by default, never below ~22 mm so a phone reads it from paper);
 * `column` puts the caption under the code. The encoder chunk is fetched on first use.
 */
export function QrLink({ route, caption, alt, layout = 'row', className }: SheetQr & { layout?: 'row' | 'column'; className?: string }) {
  const url = appUrl(route)
  return (
    <figure className={[css.qr, layout === 'column' && css.qrColumn, className].filter(Boolean).join(' ')} data-qr={route}>
      <span className={css.qrBox}>
        <Suspense fallback={<span className={css.qrWait} aria-hidden="true" />}>
          <QrCode text={url} label={alt} className={css.qrSvg} />
        </Suspense>
      </span>
      <figcaption className={css.qrCap}>{caption}</figcaption>
    </figure>
  )
}

export interface PrintSheetProps {
  /** BCP 47 tag of the sheet text (`uz-Latn`, `uz-Cyrl`, `ru`). */
  lang: string
  title: string
  /** The title in the other language: the paper reads in both. */
  subtitle?: string
  /** Extra content on the right of the header (a name/date block). */
  headExtra?: ReactNode
  children: ReactNode
  /** Footer QR code; omit for sheets whose QR codes are in the body. */
  qr?: SheetQr
  /** Small text lines in the footer (app name, disclaimer, page number). */
  footerNote?: ReactNode
  className?: string
}

/** One A4 page: title, content, footer with the app address (and an optional QR). Page breaks come after every sheet. */
export function PrintSheet({ lang, title, subtitle, headExtra, children, qr, footerNote, className }: PrintSheetProps) {
  return (
    <div className={css.slot}>
      <section className={[css.sheet, className].filter(Boolean).join(' ')} lang={lang} aria-label={title}>
        <header className={css.head}>
          <div className={css.headText}>
            <h2 className={css.title}>{title}</h2>
            {subtitle && subtitle !== title && <p className={css.subtitle}>{subtitle}</p>}
          </div>
          {headExtra}
        </header>
        <div className={css.body}>{children}</div>
        <footer className={css.foot}>
          {qr && <QrLink {...qr} />}
          <div className={css.footText}>
            {footerNote}
            <span className={css.footUrl}>{displayUrl(appBaseUrl())}</span>
          </div>
        </footer>
      </section>
    </div>
  )
}

/**
 * Switch-scanning engine (DOM based). Scannable elements carry `data-scan`; elements sharing a
 * `data-scan-group` value that are adjacent in DOM order form one row-unit (row → item scanning).
 * Only the topmost open modal (`[aria-modal="true"]`) is scanned while one is open.
 */
export interface ScanUnit {
  group: string | null
  elements: HTMLElement[]
}

export const SCAN_CLASS = 'is-scan-target'

function visible(el: HTMLElement): boolean {
  return !el.closest('[aria-hidden="true"], [inert], [hidden]') && !(el as HTMLButtonElement).disabled
}

export function scanRoot(doc: Document = document): HTMLElement {
  const modals = Array.from(doc.querySelectorAll<HTMLElement>('[aria-modal="true"]')).filter(visible)
  return modals[modals.length - 1] ?? doc.body
}

export function collectUnits(root: HTMLElement): ScanUnit[] {
  const items = Array.from(root.querySelectorAll<HTMLElement>('[data-scan]')).filter(visible)
  const units: ScanUnit[] = []
  for (const el of items) {
    const g = el.dataset.scanGroup ?? null
    const last = units[units.length - 1]
    if (g && last && last.group === g) last.elements.push(el)
    else units.push({ group: g, elements: [el] })
  }
  return units
}

export class Scanner {
  private level: { group: string; elements: HTMLElement[] } | null = null
  private index = -1
  private readonly getRoot: () => HTMLElement
  private readonly onCue?: (label: string) => void

  constructor(getRoot: () => HTMLElement = () => scanRoot(), onCue?: (label: string) => void) {
    this.getRoot = getRoot
    this.onCue = onCue
  }

  /** Units (or items inside the entered group) currently being cycled. */
  private targets(): HTMLElement[][] {
    if (this.level) {
      const alive = this.level.elements.filter((e) => e.isConnected && visible(e))
      return alive.map((e) => [e])
    }
    return collectUnits(this.getRoot()).map((u) => u.elements)
  }

  current(): HTMLElement[] {
    const t = this.targets()
    return t[this.index] ?? []
  }

  private paint(): void {
    document.querySelectorAll(`.${SCAN_CLASS}`).forEach((e) => e.classList.remove(SCAN_CLASS))
    const cur = this.current()
    cur.forEach((e) => e.classList.add(SCAN_CLASS))
    cur[0]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
    const label = cur.length === 1 ? cur[0].getAttribute('aria-label') ?? cur[0].textContent ?? '' : ''
    if (label && this.onCue) this.onCue(label)
  }

  step(): void {
    const t = this.targets()
    if (!t.length) {
      this.level = null
      this.index = -1
      this.paint()
      return
    }
    this.index += 1
    if (this.index >= t.length) {
      // Overscan: leaving a row returns to the top level.
      if (this.level) {
        this.level = null
        this.index = 0
      } else {
        this.index = 0
      }
    }
    this.paint()
  }

  select(): void {
    const cur = this.current()
    if (!cur.length) {
      this.step()
      return
    }
    if (!this.level && cur.length > 1) {
      const group = cur[0].dataset.scanGroup ?? ''
      this.level = { group, elements: cur }
      this.index = 0
      this.paint()
      return
    }
    const target = cur[0]
    this.level = null
    this.index = -1
    this.clear()
    target.click()
  }

  back(): void {
    this.level = null
    this.index = -1
    this.paint()
  }

  clear(): void {
    document.querySelectorAll(`.${SCAN_CLASS}`).forEach((e) => e.classList.remove(SCAN_CLASS))
  }
}

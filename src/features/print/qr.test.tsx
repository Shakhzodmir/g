import { render, screen } from '@testing-library/react'
import jsQR from 'jsqr'
import { describe, expect, it } from 'vitest'
import { appUrl } from '../../lib/appUrl'
import { ARTICULATION_ROUTE } from './ArticulationSheet'
import { CONTACTS_ROUTE } from './ContactsSheet'
import { QrLink } from './PrintSheet'
import { qrMatrix, qrPath, qrSide, QUIET_ZONE, type QrMatrix } from './qr'
import { ROUTINE_ROUTES } from './RoutineSheet'

/** Every deep link that is printed on a sheet. */
const PRINTED_ROUTES = ['/talk', '/exercises', ARTICULATION_ROUTE, '/games', '/calm', CONTACTS_ROUTE, ...ROUTINE_ROUTES]

/** Dark/light pixels of the code with its quiet zone, `px` pixels per module — what a scanner sees on the paper. */
function raster(m: QrMatrix, px: number, quiet = QUIET_ZONE): { data: Uint8ClampedArray; width: number; height: number } {
  const side = (m.size + quiet * 2) * px
  const data = new Uint8ClampedArray(side * side * 4).fill(255)
  for (let y = 0; y < m.size; y++)
    for (let x = 0; x < m.size; x++) {
      if (!m.modules[y][x]) continue
      for (let dy = 0; dy < px; dy++)
        for (let dx = 0; dx < px; dx++) {
          const i = (((y + quiet) * px + dy) * side + (x + quiet) * px + dx) * 4
          data[i] = data[i + 1] = data[i + 2] = 0
        }
    }
  return { data, width: side, height: side }
}

/** Reads the matrix back from the SVG path text (the drawing a sheet really contains). */
function matrixFromPath(d: string, size: number, quiet = QUIET_ZONE): boolean[][] {
  const modules = Array.from({ length: size }, () => Array<boolean>(size).fill(false))
  for (const m of d.matchAll(/M(\d+) (\d+)h(\d+)v1h-(\d+)z/g)) {
    const x0 = Number(m[1]) - quiet
    const y = Number(m[2]) - quiet
    expect(m[3]).toBe(m[4])
    for (let k = 0; k < Number(m[3]); k++) modules[y][x0 + k] = true
  }
  return modules
}

describe('QR encoding of the app address', () => {
  it('the matrix is square, odd-sized, with the three finder patterns', () => {
    const m = qrMatrix(appUrl('/talk'))
    expect(m.modules).toHaveLength(m.size)
    expect(m.modules.every((row) => row.length === m.size)).toBe(true)
    expect(m.size).toBe(17 + 4 * m.version)
    const finder = (ox: number, oy: number) => {
      for (let y = 0; y < 7; y++)
        for (let x = 0; x < 7; x++) {
          const ring = Math.max(Math.abs(x - 3), Math.abs(y - 3))
          expect(m.modules[oy + y][ox + x], `finder ${ox},${oy} at ${x},${y}`).toBe(ring !== 2)
        }
    }
    finder(0, 0)
    finder(m.size - 7, 0)
    finder(0, m.size - 7)
  })

  it('is deterministic', () => {
    expect(qrMatrix(appUrl('/talk')).modules).toEqual(qrMatrix(appUrl('/talk')).modules)
    expect(qrMatrix(appUrl('/talk')).modules).not.toEqual(qrMatrix(appUrl('/games')).modules)
  })

  it.each(PRINTED_ROUTES)('%s decodes back to its URL at print size (26 mm at 300 dpi)', (route) => {
    const url = appUrl(route)
    const m = qrMatrix(url)
    const total = Math.round((26 / 25.4) * 300) // the code with its quiet zone, in printer pixels
    const px = Math.floor(total / qrSide(m))
    expect(px, 'at least ~6 printer pixels per module').toBeGreaterThanOrEqual(6)
    const img = raster(m, px)
    expect(jsQR(img.data, img.width, img.height)?.data).toBe(url)
  })

  it('a module is never smaller than 0.5 mm at 26 mm, so a phone camera reads it from paper', () => {
    for (const route of PRINTED_ROUTES) {
      const m = qrMatrix(appUrl(route))
      expect(26 / qrSide(m), route).toBeGreaterThanOrEqual(0.5)
    }
  })

  it('still decodes from a small, low-resolution copy (3 px per module, 150 dpi photocopy)', () => {
    const url = appUrl('/exercises/mirror')
    const img = raster(qrMatrix(url), 3)
    expect(jsQR(img.data, img.width, img.height)?.data).toBe(url)
  })

  it('the test is sensitive: a scrambled code does not decode to the address', () => {
    const url = appUrl('/talk')
    const m = qrMatrix(url)
    const broken: QrMatrix = { ...m, modules: m.modules.map((row, y) => row.map((v, x) => ((x * 7 + y * 13) % 5 < 2 ? !v : v))) }
    const img = raster(broken, 8)
    expect(jsQR(img.data, img.width, img.height)?.data).not.toBe(url)
  })

  it('the SVG path draws exactly the encoder matrix', () => {
    const m = qrMatrix(appUrl('/exercises/mirror'))
    expect(matrixFromPath(qrPath(m), m.size)).toEqual(m.modules)
  })

  it('a custom domain gives a different, still readable code', () => {
    const url = appUrl('/talk', 'https://gapimiz.uz/')
    const m = qrMatrix(url)
    const img = raster(m, 8)
    expect(jsQR(img.data, img.width, img.height)?.data).toBe(url)
  })
})

describe('QrLink', () => {
  it('draws the code of the deep link and names it for assistive technology', async () => {
    const url = appUrl('/exercises/mirror')
    const { container } = render(<QrLink route="/exercises/mirror" caption="Koʻzgu" alt={`QR: ${url}`} />)
    const svg = await screen.findByRole('img', { name: `QR: ${url}` })
    expect(screen.getByText('Koʻzgu')).toBeInTheDocument()
    expect(container.querySelector('[data-qr="/exercises/mirror"]')).not.toBeNull()
    // end to end: what the component drew is what decodes
    const m = qrMatrix(url)
    const d = svg.querySelector('path')!.getAttribute('d')!
    const modules = matrixFromPath(d, m.size)
    const img = raster({ ...m, modules }, 8)
    expect(jsQR(img.data, img.width, img.height)?.data).toBe(url)
    expect(svg.getAttribute('viewBox')).toBe(`0 0 ${qrSide(m)} ${qrSide(m)}`)
  })
})

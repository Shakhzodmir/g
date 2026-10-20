import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { appUrl } from '../../lib/appUrl'
import { AMBULANCE_NUMBER, type Contact } from '../help/model'
import { useContacts } from '../help/store'
import ContactsSheet, { CONTACT_MIN_ROWS, CONTACT_ROWS_PER_PAGE, CONTACTS_ROUTE, contactRows } from './ContactsSheet'

const contact = (i: number): Contact => ({ id: `c${i}`, name: `Name ${i}`, role: 'logoped', phone: `90 000 00 ${String(i).padStart(2, '0')}`, place: `Place ${i}`, note: '', createdAt: i })

describe('contactRows (the pages of the contacts sheet)', () => {
  it('an empty book still prints a sheet of blank rows to write in', () => {
    const pages = contactRows([])
    expect(pages).toHaveLength(1)
    expect(pages[0]).toHaveLength(CONTACT_MIN_ROWS)
    expect(pages[0].every((r) => r === null)).toBe(true)
  })

  it('entries come first, blank rows fill up to the minimum', () => {
    const rows = contactRows([contact(1), contact(2)])[0]
    expect(rows.slice(0, 2).map((r) => r?.name)).toEqual(['Name 1', 'Name 2'])
    expect(rows).toHaveLength(CONTACT_MIN_ROWS)
    expect(rows.slice(2).every((r) => r === null)).toBe(true)
  })

  it('a long book is split evenly over pages and no page is over-full; nothing is lost or repeated', () => {
    for (const n of [CONTACT_ROWS_PER_PAGE, CONTACT_ROWS_PER_PAGE + 1, 25, 40]) {
      const list = Array.from({ length: n }, (_, i) => contact(i + 1))
      const pages = contactRows(list)
      expect(Math.max(...pages.map((p) => p.length)), `n=${n}`).toBeLessThanOrEqual(CONTACT_ROWS_PER_PAGE)
      expect(Math.max(...pages.map((p) => p.length)) - Math.min(...pages.map((p) => p.length))).toBeLessThanOrEqual(1)
      expect(pages.flat().filter(Boolean).map((r) => r!.id)).toEqual(list.map((c) => c.id))
    }
  })
})

describe('ContactsSheet', () => {
  beforeEach(() => {
    useContacts.setState({ contacts: [] })
  })

  it('prints the ambulance number, the family\'s entries and a QR code to the help page', async () => {
    useContacts.getState().add({ name: 'Dr. Karimova', role: 'logoped', phone: '90 123 45 67', place: 'Toshkent', note: 'Seshanba 10:00' })
    render(<ContactsSheet lang="uz" />)
    const sheet = screen.getByRole('region', { name: 'Muhim telefonlar' })
    expect(within(sheet).getByText(AMBULANCE_NUMBER)).toBeInTheDocument()
    const table = within(sheet).getByRole('table')
    expect(within(table).getByText('Dr. Karimova')).toBeInTheDocument()
    expect(within(table).getByText('90 123 45 67')).toBeInTheDocument()
    expect(within(table).getByText('Logoped')).toBeInTheDocument()
    expect(within(table).getByText(/Toshkent/)).toHaveTextContent('Seshanba 10:00')
    const url = appUrl(CONTACTS_ROUTE)
    const svg = await screen.findByRole('img', { name: new RegExp(url.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')) })
    expect(svg.querySelector('path')?.getAttribute('d')?.length).toBeGreaterThan(100)
  })

  it('Russian and Uzbek Cyrillic sheets use their own words, the entries stay as typed', async () => {
    useContacts.getState().add({ name: 'Dr. Karimova', role: 'logoped', phone: '90 123 45 67' })
    const { unmount } = render(<ContactsSheet lang="ru" />)
    expect(screen.getByRole('region', { name: 'Важные телефоны' })).toBeInTheDocument()
    expect(screen.getByText('Логопед')).toBeInTheDocument()
    expect(screen.getByText('Dr. Karimova')).toBeInTheDocument()
    unmount()
    render(<ContactsSheet lang="uzc" />)
    expect(screen.getByRole('region', { name: 'Муҳим телефонлар' })).toBeInTheDocument()
    expect(screen.getByText('Dr. Karimova')).toBeInTheDocument()
  })
})

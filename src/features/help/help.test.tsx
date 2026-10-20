import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearGapimizKeys } from '../parent/wipe'
import { CONTACT_LIMITS } from './model'
import Help from './Help'
import { CONTACTS_KEY, useContacts } from './store'

const mount = () =>
  render(
    <MemoryRouter>
      <div id="root">
        <Help />
      </div>
    </MemoryRouter>,
  )

/** Uzbek text is shown with ‘ ’ instead of the data forms ʻ ʼ: match both. */
const loose = (v: string) => new RegExp(v.replace(/[ʻʼ]/g, '.').replace(/[()]/g, '\\$&'))

beforeEach(() => {
  useContacts.setState({ contacts: [] })
  localStorage.clear()
})
afterEach(() => {
  document.getElementById('root')?.removeAttribute('inert')
})

async function fillAndSave(fields: { name?: string; phone?: string; place?: string; note?: string }) {
  fireEvent.click(screen.getByRole('button', { name: loose('Yozuv qoʻshish') }))
  const dialog = await screen.findByRole('dialog')
  if (fields.name !== undefined) fireEvent.change(within(dialog).getByLabelText(loose('Ismi yoki nomi')), { target: { value: fields.name } })
  if (fields.phone !== undefined) fireEvent.change(within(dialog).getByLabelText(/^Telefon/), { target: { value: fields.phone } })
  if (fields.place !== undefined) fireEvent.change(within(dialog).getByLabelText(loose('Manzil yoki klinika')), { target: { value: fields.place } })
  if (fields.note !== undefined) fireEvent.change(within(dialog).getByLabelText(/^Eslatma/), { target: { value: fields.note } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Saqlash' }))
}

describe('Qayerga murojaat qilish page', () => {
  it('shows the urgent block with the ambulance number as a tel link', () => {
    mount()
    const urgent = screen.getByTestId('help-urgent')
    expect(urgent).toHaveTextContent('103')
    expect(within(urgent).getByRole('link')).toHaveAttribute('href', 'tel:103')
  })

  it('lists who can help for a child and for an adult, and how to prepare', () => {
    mount()
    expect(screen.getByRole('heading', { name: 'Bola uchun' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Kattalar uchun' })).toBeInTheDocument()
    expect(screen.getAllByText('Logoped').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Qabulga tayyorlanish' })).toBeInTheDocument()
  })

  it('ships no phone number or address other than the ambulance: every tel link on a fresh page is 103', () => {
    mount()
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['tel:103'])
    expect(screen.getByTestId('book-empty')).toBeInTheDocument()
  })
})

describe('contact book', () => {
  it('adds an entry, shows it with a call link and keeps it in storage under the app prefix', async () => {
    mount()
    await fillAndSave({ name: 'Dr. Karimova', phone: '90 123 45 67', place: 'Toshkent, Chilonzor', note: 'Seshanba 10:00' })
    const list = await screen.findByTestId('book-list')
    expect(within(list).getByText('Dr. Karimova')).toBeInTheDocument()
    expect(within(list).getByText('Toshkent, Chilonzor')).toBeInTheDocument()
    expect(within(list).getByRole('link')).toHaveAttribute('href', 'tel:+998901234567')
    expect(CONTACTS_KEY.startsWith('gapimiz.')).toBe(true)
    const saved = JSON.parse(localStorage.getItem(CONTACTS_KEY)!)
    expect(saved.state.contacts).toHaveLength(1)
    expect(saved.state.contacts[0]).toMatchObject({ name: 'Dr. Karimova', phone: '90 123 45 67' })
  })

  it('refuses an empty entry and says why', async () => {
    mount()
    await fillAndSave({ place: 'only a place' })
    expect(await screen.findByRole('alert')).toHaveTextContent(loose('Ism yoki telefon kiriting.'))
    expect(useContacts.getState().contacts).toHaveLength(0)
  })

  it('edits and deletes an entry (with a confirmation)', async () => {
    useContacts.getState().add({ name: 'Dr. Karimova', role: 'logoped', phone: '90 123 45 67' })
    mount()
    fireEvent.click(screen.getByRole('button', { name: /^Tahrirlash: Dr\. Karimova/ }))
    const dialog = await screen.findByRole('dialog')
    const name = within(dialog).getByLabelText(loose('Ismi yoki nomi')) as HTMLInputElement
    expect(name.value).toBe('Dr. Karimova')
    fireEvent.change(name, { target: { value: 'Dr. Rahimova' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Saqlash' }))
    await waitFor(() => expect(useContacts.getState().contacts[0].name).toBe('Dr. Rahimova'))

    fireEvent.click(await screen.findByRole('button', { name: loose('Oʻchirish: Dr. Rahimova') }))
    const confirm = await screen.findByRole('dialog')
    expect(useContacts.getState().contacts).toHaveLength(1) // nothing is deleted before the confirmation
    fireEvent.click(within(confirm).getByRole('button', { name: loose('Oʻchirish') }))
    await waitFor(() => expect(useContacts.getState().contacts).toHaveLength(0))
    expect(await screen.findByTestId('book-empty')).toBeInTheDocument()
  })

  it('a blank form on every open: nothing is left over from the entry edited before', async () => {
    useContacts.getState().add({ name: 'Dr. Karimova', phone: '90 123 45 67' })
    mount()
    fireEvent.click(screen.getByRole('button', { name: /^Tahrirlash: Dr\. Karimova/ }))
    const first = await screen.findByRole('dialog')
    fireEvent.click(within(first).getByRole('button', { name: /Bekor qilish/ }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: loose('Yozuv qoʻshish') }))
    const second = await screen.findByRole('dialog')
    expect((within(second).getByLabelText(loose('Ismi yoki nomi')) as HTMLInputElement).value).toBe('')
  })

  it('stops adding at the limit and says so', () => {
    for (let i = 0; i < CONTACT_LIMITS.entries; i++) expect(useContacts.getState().add({ name: `n${i}` })).toBe(true)
    expect(useContacts.getState().add({ name: 'one too many' })).toBe(false)
    mount()
    expect(screen.getByRole('button', { name: loose('Yozuv qoʻshish') })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText(loose(`Daftar toʻlgan (${CONTACT_LIMITS.entries} ta)`))).toBeInTheDocument()
  })

  it('"delete all data" (every gapimiz.* key) removes the book too', () => {
    useContacts.getState().add({ name: 'Dr. Karimova', phone: '103' })
    expect(localStorage.getItem(CONTACTS_KEY)).not.toBeNull()
    clearGapimizKeys(localStorage)
    expect(localStorage.getItem(CONTACTS_KEY)).toBeNull()
  })
})

describe('storage', () => {
  it('a damaged saved book is repaired on load instead of crashing or being lost entirely', async () => {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify({ state: { contacts: [{ id: 'a', name: 'Kept', phone: '103', role: 'wizard' }, null, 5, { name: '' }] }, version: 99 }))
    await useContacts.persist.rehydrate()
    expect(useContacts.getState().contacts).toMatchObject([{ id: 'a', name: 'Kept', phone: '103', role: 'other' }])
  })

  it('garbage in storage gives an empty book', async () => {
    for (const raw of ['not json', '{"state":null}', '{"state":{"contacts":"x"},"version":1}', '[]']) {
      localStorage.setItem(CONTACTS_KEY, raw)
      await useContacts.persist.rehydrate()
      expect(useContacts.getState().contacts, raw).toEqual([])
    }
  })
})

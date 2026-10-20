import { describe, expect, it } from 'vitest'
import { AMBULANCE_NUMBER, CONTACT_LIMITS, CONTACT_ROLES, cleanInput, contactsAsText, dialNumber, isUsable, nextContactId, sanitizeContacts, type Contact } from './model'
import { ROLE_KEY } from './labels'
import { H } from './strings'

const c = (over: Partial<Contact> = {}): Contact => ({ id: 'c1', name: 'Dr. Karimova', role: 'logoped', phone: '90 123 45 67', place: 'Toshkent', note: 'Seshanba 10:00', createdAt: 1, ...over })

describe('dialNumber', () => {
  it('a local 9-digit number gets +998 so the link also works from abroad', () => {
    expect(dialNumber('90 123 45 67')).toBe('+998901234567')
    expect(dialNumber('(71) 123-45-67')).toBe('+998711234567')
  })
  it('998… without a plus gets the plus; a typed + is kept', () => {
    expect(dialNumber('998 90 123 45 67')).toBe('+998901234567')
    expect(dialNumber('+998 71 123 45 67')).toBe('+998711234567')
    expect(dialNumber('+7 495 123 45 67')).toBe('+74951234567')
  })
  it('short service numbers stay as typed', () => {
    expect(dialNumber(AMBULANCE_NUMBER)).toBe('103')
    expect(dialNumber(' 103 ')).toBe('103')
  })
  it('text without a dialable number gives null (no broken link is drawn)', () => {
    for (const bad of ['', '   ', 'ofis', '12', '+', '1234567890123456789']) expect(dialNumber(bad), bad).toBeNull()
  })
  it('never lets markup or a javascript: scheme into the link: only digits and a leading plus remain', () => {
    expect(dialNumber('javascript:alert(1)')).toBeNull()
    for (const v of ['<b>90</b>123 45 67 8', "'; drop table 123456", '90"><script>1234567', 'tel:+998 90 123 45 67']) {
      const d = dialNumber(v)
      expect(d === null || /^\+?\d+$/.test(d), v).toBe(true)
    }
  })
})

describe('cleanInput', () => {
  it('limits every field, collapses spaces and strips control characters', () => {
    const r = cleanInput({ name: `  ${'A'.repeat(200)}\n\t B `, role: 'logoped', phone: '9'.repeat(80), place: 'x'.repeat(500), note: 'n'.repeat(900) })
    expect(r.name.length).toBeLessThanOrEqual(CONTACT_LIMITS.name)
    expect(r.name).not.toMatch(/[\n\t]/)
    expect(r.phone).toHaveLength(CONTACT_LIMITS.phone)
    expect(r.place).toHaveLength(CONTACT_LIMITS.place)
    expect(r.note).toHaveLength(CONTACT_LIMITS.note)
    expect(cleanInput({ name: 'a   b\u0000c' }).name).toBe('a b c')
  })
  it('an unknown or missing role becomes «other»; non-strings become empty', () => {
    expect(cleanInput({ name: 'x', role: 'wizard' }).role).toBe('other')
    expect(cleanInput({ name: 'x' }).role).toBe('other')
    expect(cleanInput({ name: 42, phone: null, place: {}, note: [] })).toMatchObject({ name: '', phone: '', place: '', note: '' })
  })
  it('a contact needs a name or a phone', () => {
    expect(isUsable(cleanInput({}))).toBe(false)
    expect(isUsable(cleanInput({ place: 'only a place', note: 'only a note' }))).toBe(false)
    expect(isUsable(cleanInput({ name: 'x' }))).toBe(true)
    expect(isUsable(cleanInput({ phone: '103' }))).toBe(true)
  })
})

describe('sanitizeContacts (whatever storage holds)', () => {
  it('not a list gives an empty book', () => {
    for (const v of [null, undefined, 3, 'x', {}, { contacts: [] }]) expect(sanitizeContacts(v)).toEqual([])
  })
  it('keeps valid entries, drops junk and empty ones, repairs ids', () => {
    const out = sanitizeContacts([c(), null, 7, 'x', {}, { id: 'c1', name: 'Second with a clashing id' }, { name: 'No id', role: 'nope' }, { name: '   ', phone: '' }])
    expect(out.map((x) => x.name)).toEqual(['Dr. Karimova', 'Second with a clashing id', 'No id'])
    expect(new Set(out.map((x) => x.id)).size).toBe(3)
    expect(out[2].role).toBe('other')
  })
  it('caps the number of entries', () => {
    const many = Array.from({ length: 200 }, (_, i) => ({ id: `i${i}`, name: `n${i}` }))
    expect(sanitizeContacts(many)).toHaveLength(CONTACT_LIMITS.entries)
  })
  it('a hostile createdAt or id does not leak through', () => {
    const [x] = sanitizeContacts([{ id: 'a'.repeat(500), name: 'x', createdAt: 'yesterday' }])
    expect(x.id.length).toBeLessThanOrEqual(64)
    expect(x.createdAt).toBe(0)
  })
})

describe('text and ids', () => {
  it('contactsAsText writes one line per entry', () => {
    const text = contactsAsText([c(), c({ id: 'c2', name: '', role: 'other', phone: '103', place: '', note: '' })], (r) => `<${r}>`)
    expect(text).toBe('Dr. Karimova, <logoped>: 90 123 45 67, Toshkent, Seshanba 10:00\n<other>: 103')
  })
  it('nextContactId never reuses an id', () => {
    expect(nextContactId([])).toBe('c1')
    expect(nextContactId([c({ id: 'c2' })])).toBe('c3')
    expect(nextContactId([c({ id: 'c1' }), c({ id: 'c2' })])).toBe('c3')
    expect(nextContactId([c({ id: 'c2' }), c({ id: 'c3' })])).toBe('c4')
  })
  it('every role has a name in both languages', () => {
    for (const r of CONTACT_ROLES) {
      expect(H.uz[ROLE_KEY[r]].trim(), r).not.toBe('')
      expect(H.ru[ROLE_KEY[r]].trim(), r).not.toBe('')
    }
  })
})

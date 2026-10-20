/*
 * The family's contact book: the specialists and places a family has chosen to keep a number for. Pure data and
 * functions (no React, no storage), so the rules are testable on their own. It never holds a phone number or an
 * address that ships with the app: every entry is typed in by the family and stays on this device.
 */

export type ContactRole = 'doctor' | 'pediatrician' | 'logoped' | 'neurologist' | 'ent' | 'psychologist' | 'centre' | 'school' | 'other'

export const CONTACT_ROLES: readonly ContactRole[] = ['doctor', 'pediatrician', 'logoped', 'neurologist', 'ent', 'psychologist', 'centre', 'school', 'other']

export interface Contact {
  id: string
  name: string
  role: ContactRole
  phone: string
  place: string
  note: string
  createdAt: number
}

export const CONTACT_LIMITS = { entries: 40, name: 80, phone: 30, place: 160, note: 300 } as const

/** Number printed on the help page and on the contacts sheet: the ambulance in Uzbekistan. */
export const AMBULANCE_NUMBER = '103'

const clip = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '')

/** What the form hands over: anything typed, possibly nothing sensible. */
export interface ContactInput {
  name?: unknown
  role?: unknown
  phone?: unknown
  place?: unknown
  note?: unknown
}

/** A contact needs a name or a number to be worth keeping. */
export function isUsable(c: Pick<Contact, 'name' | 'phone'>): boolean {
  return c.name.length > 0 || c.phone.length > 0
}

/** Cleans a form: control characters and runs of spaces removed, every field limited, an unknown role becomes «other». */
export function cleanInput(input: ContactInput): Omit<Contact, 'id' | 'createdAt'> {
  return {
    name: clip(input.name, CONTACT_LIMITS.name),
    role: CONTACT_ROLES.includes(input.role as ContactRole) ? (input.role as ContactRole) : 'other',
    phone: clip(input.phone, CONTACT_LIMITS.phone),
    place: clip(input.place, CONTACT_LIMITS.place),
    note: clip(input.note, CONTACT_LIMITS.note),
  }
}

/**
 * Upgrades whatever is found in storage (older or newer build, edited by hand, damaged) into a valid list: unusable
 * entries are dropped, fields limited, duplicate ids made unique, the count capped. Never throws.
 */
export function sanitizeContacts(raw: unknown): Contact[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: Contact[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const c = cleanInput(r)
    if (!isUsable(c)) continue
    let id = typeof r.id === 'string' && r.id.trim() ? r.id.trim().slice(0, 64) : `c${out.length + 1}`
    while (seen.has(id)) id = `${id}_`
    seen.add(id)
    out.push({ ...c, id, createdAt: typeof r.createdAt === 'number' && Number.isFinite(r.createdAt) ? r.createdAt : 0 })
    if (out.length >= CONTACT_LIMITS.entries) break
  }
  return out
}

/**
 * Target of a `tel:` link, or null when the text has no dialable number. A local 9-digit number gets the Uzbekistan
 * prefix (+998) so the link also works from abroad; 998… without «+» gets the plus; short service numbers (103) and
 * anything else stay as typed.
 */
export function dialNumber(text: string): string | null {
  const t = text.trim()
  const plus = t.startsWith('+')
  const digits = t.replace(/\D/g, '')
  if (digits.length < 3) return null
  if (digits.length > 15) return null
  if (plus) return `+${digits}`
  if (digits.length === 9) return `+998${digits}`
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`
  return digits
}

/** Plain text of the book, for copying into a message or a note («Name, role: phone, place, note»). */
export function contactsAsText(list: readonly Contact[], roleName: (r: ContactRole) => string): string {
  return list
    .map((c) => {
      const head = [c.name, roleName(c.role)].filter(Boolean).join(', ')
      const tail = [c.phone, c.place, c.note].filter(Boolean).join(', ')
      return tail ? `${head}: ${tail}` : head
    })
    .join('\n')
}

/** Next unused id for a new entry. */
export function nextContactId(list: readonly Contact[]): string {
  const used = new Set(list.map((c) => c.id))
  for (let n = list.length + 1; ; n++) if (!used.has(`c${n}`)) return `c${n}`
}

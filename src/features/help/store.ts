import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { safeLocalStorage } from '../../store/safeStorage'
import { CONTACT_LIMITS, cleanInput, isUsable, nextContactId, sanitizeContacts, type Contact, type ContactInput } from './model'

/** The key starts with the app prefix, so "delete all data" (parent/wipe.ts) removes the book with everything else. */
export const CONTACTS_KEY = 'gapimiz.contacts'

export interface ContactsState {
  contacts: Contact[]
  /** Adds an entry; returns false when the form holds nothing worth saving or the book is full. */
  add: (input: ContactInput) => boolean
  /** Replaces the fields of an entry; false when it does not exist or the new fields are empty. */
  update: (id: string, input: ContactInput) => boolean
  remove: (id: string) => void
  clear: () => void
}

/** Contacts are per device, not per profile: the specialists of a family do not change when someone switches profile. */
export const useContacts = create<ContactsState>()(
  persist(
    (set, get) => ({
      contacts: [],
      add: (input) => {
        const c = cleanInput(input)
        const list = get().contacts
        if (!isUsable(c) || list.length >= CONTACT_LIMITS.entries) return false
        set({ contacts: [...list, { ...c, id: nextContactId(list), createdAt: Date.now() }] })
        return true
      },
      update: (id, input) => {
        const c = cleanInput(input)
        const list = get().contacts
        if (!isUsable(c) || !list.some((x) => x.id === id)) return false
        set({ contacts: list.map((x) => (x.id === id ? { ...x, ...c } : x)) })
        return true
      },
      remove: (id) => set({ contacts: get().contacts.filter((c) => c.id !== id) }),
      clear: () => set({ contacts: [] }),
    }),
    {
      name: CONTACTS_KEY,
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage()),
      partialize: (s) => ({ contacts: s.contacts }),
      // Any version, any shape: keep what is valid, never lose the book because of one damaged entry.
      migrate: (persisted) => ({ contacts: sanitizeContacts((persisted as { contacts?: unknown } | null)?.contacts) }),
      merge: (persisted, current) => ({ ...current, contacts: sanitizeContacts((persisted as { contacts?: unknown } | null)?.contacts) }),
    },
  ),
)

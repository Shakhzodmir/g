import { Copy, Pencil, Phone, Plus, Printer, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { COMMON } from '../../i18n/common'
import { useStrings } from '../../i18n'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { ConfirmDialog, Section } from '../parent/shared'
import parent from '../parent/parent.module.css'
import styles from './help.module.css'
import { ROLE_KEY } from './labels'
import { CONTACT_LIMITS, CONTACT_ROLES, contactsAsText, dialNumber, isUsable, cleanInput, type Contact, type ContactRole } from './model'
import { useContacts } from './store'
import { useH } from './useH'

interface Form {
  name: string
  role: ContactRole
  phone: string
  place: string
  note: string
}

const BLANK: Form = { name: '', role: 'logoped', phone: '', place: '', note: '' }
const formOf = (c: Contact): Form => ({ name: c.name, role: c.role, phone: c.phone, place: c.place, note: c.note })

/** Add / edit dialog. Every time it opens it starts from the entry being edited, or from a blank form (no leftovers). */
function EntryDialog({ open, entry, onClose }: { open: boolean; entry: Contact | null; onClose: () => void }) {
  const h = useH()
  const tc = useStrings(COMMON)
  const add = useContacts((s) => s.add)
  const update = useContacts((s) => s.update)
  const [form, setForm] = useState<Form>(BLANK)
  const [tried, setTried] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(entry ? formOf(entry) : BLANK)
    setTried(false)
  }, [open, entry])

  const empty = !isUsable(cleanInput(form))
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }))
  const submit = () => {
    setTried(true)
    if (empty) return
    if (entry ? update(entry.id, form) : add(form)) onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={entry ? h('editTitle') : h('addTitle')}
      footer={
        <>
          <Button variant="ghost" onActivate={onClose}>
            {tc('cancel')}
          </Button>
          <Button onActivate={submit}>{tc('save')}</Button>
        </>
      }
    >
      <div className={parent.stack}>
        <label className={parent.field}>
          <span className={parent.fieldLabel}>{h('fName')}</span>
          <input
            className={parent.input}
            value={form.name}
            maxLength={CONTACT_LIMITS.name}
            autoComplete="off"
            aria-invalid={tried && empty ? true : undefined}
            aria-describedby={tried && empty ? 'contact-need' : undefined}
            onChange={(e) => set({ name: e.target.value })}
          />
        </label>
        <label className={parent.field}>
          <span className={parent.fieldLabel}>{h('fRole')}</span>
          <select className={parent.input} value={form.role} onChange={(e) => set({ role: e.target.value as ContactRole })}>
            {CONTACT_ROLES.map((r) => (
              <option key={r} value={r}>
                {h(ROLE_KEY[r])}
              </option>
            ))}
          </select>
        </label>
        <label className={parent.field}>
          <span className={parent.fieldLabel}>{h('fPhone')}</span>
          <input
            className={parent.input}
            type="tel"
            inputMode="tel"
            value={form.phone}
            maxLength={CONTACT_LIMITS.phone}
            autoComplete="off"
            aria-invalid={tried && empty ? true : undefined}
            aria-describedby={tried && empty ? 'contact-need contact-phone-hint' : 'contact-phone-hint'}
            onChange={(e) => set({ phone: e.target.value })}
          />
          <span id="contact-phone-hint" className={parent.hint}>
            {h('fPhoneHint')}
          </span>
        </label>
        <label className={parent.field}>
          <span className={parent.fieldLabel}>{h('fPlace')}</span>
          <input className={parent.input} value={form.place} maxLength={CONTACT_LIMITS.place} autoComplete="off" onChange={(e) => set({ place: e.target.value })} />
        </label>
        <label className={parent.field}>
          <span className={parent.fieldLabel}>{h('fNote')}</span>
          <input className={parent.input} value={form.note} maxLength={CONTACT_LIMITS.note} autoComplete="off" onChange={(e) => set({ note: e.target.value })} />
        </label>
        {tried && empty && (
          <p id="contact-need" className={parent.errorText} role="alert">
            {h('needOne')}
          </p>
        )}
      </div>
    </Dialog>
  )
}

/** The family's own list of specialists: typed in by them, kept on this device, one tap to call. */
export default function ContactBook() {
  const h = useH()
  const navigate = useNavigate()
  const contacts = useContacts((s) => s.contacts)
  const remove = useContacts((s) => s.remove)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<Contact | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'failed'>('idle')
  const full = contacts.length >= CONTACT_LIMITS.entries
  const nameOf = (c: Contact) => c.name || c.phone || h('noName')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(contactsAsText(contacts, (r) => h(ROLE_KEY[r])))
      setCopyState('ok')
    } catch {
      setCopyState('failed')
    }
  }

  return (
    <Section title={h('bookTitle')}>
      <p className={parent.hint}>{h('bookHint')}</p>
      {contacts.length === 0 ? (
        <p data-testid="book-empty">{h('bookEmpty')}</p>
      ) : (
        <ul className={parent.list} data-testid="book-list">
          {contacts.map((c) => {
            const dial = dialNumber(c.phone)
            return (
              <li key={c.id} className={styles.entry}>
                <div className={styles.entryText}>
                  <span className={parent.itemMain}>{nameOf(c)}</span>
                  <span className={parent.itemSub}>{h(ROLE_KEY[c.role])}</span>
                  {c.phone && !dial && <span className={styles.phone}>{c.phone}</span>}
                  {c.place && <span className={parent.itemSub}>{c.place}</span>}
                  {c.note && <span className={parent.itemSub}>{c.note}</span>}
                </div>
                <div className={styles.entryActions}>
                  {dial && (
                    <a className={styles.call} href={`tel:${dial}`} aria-label={h('callLabel', { phone: c.phone })}>
                      <Phone aria-hidden="true" />
                      <span>{c.phone}</span>
                    </a>
                  )}
                  <Button variant="ghost" iconOnly icon={<Pencil />} label={h('editLabel', { name: nameOf(c) })} onActivate={() => setEditing(c)}>
                    {h('editLabel', { name: nameOf(c) })}
                  </Button>
                  <Button variant="ghost" iconOnly icon={<Trash2 />} label={h('deleteLabel', { name: nameOf(c) })} onActivate={() => setDeleting(c)}>
                    {h('deleteLabel', { name: nameOf(c) })}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {full && <p className={parent.notice}>{h('bookFull', { n: CONTACT_LIMITS.entries })}</p>}
      <div className={parent.row}>
        <Button icon={<Plus />} onActivate={() => setAdding(true)} disabled={full}>
          {h('addBtn')}
        </Button>
        {contacts.length > 0 && (
          <Button variant="soft" icon={<Copy />} onActivate={() => void copy()}>
            {h('copyBtn')}
          </Button>
        )}
        <Button variant="soft" icon={<Printer />} onActivate={() => navigate('/parent/print?sheet=contacts')}>
          {h('printBtn')}
        </Button>
      </div>
      {copyState !== 'idle' && (
        <p className={copyState === 'ok' ? parent.status : parent.notice} role="status">
          {copyState === 'ok' ? h('copied') : h('copyFailed')}
        </p>
      )}

      <EntryDialog open={adding || !!editing} entry={editing} onClose={() => (setAdding(false), setEditing(null))} />
      <ConfirmDialog
        open={!!deleting}
        title={h('deleteTitle')}
        text={deleting ? h('deleteQ', { name: nameOf(deleting) }) : ''}
        confirm={h('deleteDo')}
        onConfirm={() => {
          if (deleting) remove(deleting.id)
          setDeleting(null)
        }}
        onClose={() => setDeleting(null)}
      />
    </Section>
  )
}

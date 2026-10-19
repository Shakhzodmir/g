import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useId, type ReactNode } from 'react'
import { TOPICS } from '../../content/topics'
import type { TopicId } from '../../content/types'
import { COMMON } from '../../i18n/common'
import { formatVars, useI18n, useLabel, useStrings } from '../../i18n'
import { db, type CustomCard } from '../../store/db'
import { useProfileStore, type Profile } from '../../store/profile'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { Card } from '../../ui/misc'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import { useObjectUrl } from './image'
import { AVATARS, FITZ } from './model'
import type { RefInfo } from './refs'
import styles from './parent.module.css'
import { S, type StrKey } from './strings'

export const APP_VERSION = '0.1'

/**
 * Typed translator for this folder's strings. Placeholders are filled BEFORE the text is rendered:
 * the shared useStrings() transliterates first, which turns "{n}" into "{н}" in Uzbek Cyrillic.
 */
export function useT() {
  const { ui } = useI18n()
  return useCallback((key: StrKey, vars?: Record<string, string | number>) => ui({ uz: formatVars(S.uz[key], vars), ru: formatVars(S.ru[key], vars) }), [ui])
}

/** Dynamic key lookup (e.g. `fitz_${f}`), typed. */
export function useTk() {
  const t = useT()
  return (key: string, vars?: Record<string, string | number>) => t(key as StrKey, vars)
}

export function Section({ title, children, className, id }: { title?: string; children: ReactNode; className?: string; id?: string }) {
  return (
    <Card className={[styles.section, className].filter(Boolean).join(' ')}>
      {title && (
        <h2 className={styles.h2} id={id}>
          {title}
        </h2>
      )}
      {children}
    </Card>
  )
}

export { AVATARS, FITZ }

/** Profile avatar symbol (the default avatar "musicha" is drawn with the dove symbol). */
export function avatarSymbol(p: Pick<Profile, 'avatar' | 'kind'>): string {
  if (!p.avatar || p.avatar === 'musicha') return p.kind === 'adult' ? 'adult' : 'dove'
  return p.avatar
}

export function useProfileName(): string {
  const t = useT()
  const p = useProfileStore((s) => s.profile)
  return p.name.trim() || (p.kind === 'adult' ? t('adultFallback') : t('childFallback'))
}

/** Profile name for headings: the name, or "Child"/"Adult" when it is empty. */
export function useProfileTitle(): string {
  const t = useT()
  const p = useProfileStore((s) => s.profile)
  return p.name.trim() || (p.kind === 'adult' ? t('kindAdult') : t('kindChild'))
}

export function TopicChips({ value, onChange, label }: { value: TopicId; onChange: (t: TopicId) => void; label: string }) {
  const { ui } = useI18n()
  const id = useId()
  return (
    <>
      {/* Phones: a native picker keeps 13 topics from filling the screen. */}
      <label className={[styles.field, styles.topicSelect].join(' ')} htmlFor={id}>
        <span className={styles.fieldLabel}>{label}</span>
        <select id={id} className={styles.input} value={value} onChange={(e) => onChange(e.target.value as TopicId)}>
          {TOPICS.map((tp) => (
            <option key={tp.id} value={tp.id}>
              {ui(tp)}
            </option>
          ))}
        </select>
      </label>
      <div role="group" aria-label={label} className={styles.topicChips}>
        <ul className={styles.chips}>
          {TOPICS.map((tp) => (
            <li key={tp.id}>
              <Pressable className={styles.chip} label={ui(tp)} pressed={value === tp.id} scanGroup="topics" onActivate={() => onChange(tp.id)}>
                <SymbolImg id={tp.symbol} className={styles.chipSym} />
                <span>{ui(tp)}</span>
              </Pressable>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

/** Custom cards of the current profile (live). Undefined while loading. */
export function useCustomCards(): CustomCard[] | undefined {
  const pid = useProfileStore((s) => s.profile.id)
  return useLiveQuery(() => db.cards.where('profileId').equals(pid).toArray().catch(() => [] as CustomCard[]), [pid])
}

/** Symbol or the custom card's photo. */
export function RefVisual({ info, className }: { info: RefInfo; className?: string }) {
  const url = useObjectUrl(info.image ?? null)
  return <SymbolImg id={info.symbol} src={url} className={className} />
}

export function useRefLabel() {
  const label = useLabel()
  return (info: RefInfo) => label(info.label)
}

/** dd.mm */
export function shortDate(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function fullDate(ts: number): string {
  const d = new Date(ts)
  return `${shortDate(ts)}.${d.getFullYear()}`
}

/** Calm confirmation for destructive actions (no red, explicit verb on the confirm button). */
export function ConfirmDialog({
  open,
  title,
  text,
  confirm,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  text: string
  confirm: string
  onConfirm: () => void
  onClose: () => void
}) {
  const tc = useStrings(COMMON)
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onActivate={onClose}>
            {tc('cancel')}
          </Button>
          <Button variant="secondary" onActivate={onConfirm}>
            {confirm}
          </Button>
        </>
      }
    >
      <p>{text}</p>
    </Dialog>
  )
}

/** Shown on every adult screen while nothing can be saved (IndexedDB unavailable: private mode, blocked storage). */
export function StorageBanner() {
  const t = useT()
  const persistent = useProfileStore((s) => s.persistent)
  const loaded = useProfileStore((s) => s.loaded)
  if (persistent || !loaded) return null
  return (
    <p className={styles.notice} role="status">
      {t('noStorage')}
    </p>
  )
}

/** "Unsaved changes. Close?" — the primary action keeps the person in the form. */
export function DiscardDialog({ open, onKeep, onDiscard }: { open: boolean; onKeep: () => void; onDiscard: () => void }) {
  const t = useT()
  return (
    <Dialog
      open={open}
      onClose={onKeep}
      title={t('discardTitle')}
      footer={
        <>
          <Button variant="ghost" onActivate={onDiscard}>
            {t('discardDo')}
          </Button>
          <Button onActivate={onKeep}>{t('discardKeep')}</Button>
        </>
      }
    >
      <p>{t('discardQ')}</p>
    </Dialog>
  )
}

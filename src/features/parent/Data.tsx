import { Download, Trash2, Upload } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { APP_NAME } from '../../app/brand'
import { db, dbAvailable } from '../../store/db'
import { useProfileStore } from '../../store/profile'
import { Button } from '../../ui/Button'
import { Page } from '../../ui/Page'
import { PageHeader } from '../../ui/PageHeader'
import {
  backupFileName,
  backupStats,
  BACKUP_EXT,
  exportProfile,
  importBackup,
  LIMITS,
  parseBackup,
  type Backup,
  type IgnoredReport,
} from './backup'
import { storageProblem } from './model'
import styles from './parent.module.css'
import { pruneOldEvents } from './retention'
import { APP_VERSION, ConfirmDialog, fullDate, Section, StorageBanner, useProfileTitle, useT } from './shared'
import type { StrKey } from './strings'
import { lockParent } from './unlock'
import { wipeAllData } from './wipe'

type Status = { kind: 'ok' | 'problem'; text: string } | null

function download(name: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

/** "cards: 2, recordings: 1 …" for whatever was dropped or corrected; empty string when nothing was. */
function ignoredText(r: IgnoredReport, t: (k: StrKey, v?: Record<string, string | number>) => string): string {
  const parts: string[] = []
  if (r.cards) parts.push(t('ignCards', { n: r.cards }))
  if (r.recordings) parts.push(t('ignRecordings', { n: r.recordings }))
  if (r.schedules) parts.push(t('ignSchedules', { n: r.schedules }))
  if (r.stickers) parts.push(t('ignStickers', { n: r.stickers }))
  if (r.events) parts.push(t('ignEvents', { n: r.events }))
  if (r.checks) parts.push(t('ignChecks', { n: r.checks }))
  if (r.settings.length) parts.push(t('ignSettings', { names: r.settings.slice(0, 6).join(', ') + (r.settings.length > 6 ? ' …' : '') }))
  if (r.device) parts.push(t('ignDevice'))
  return parts.length ? `${t('ignoredLead')} ${parts.join('; ')}.` : ''
}

export default function Data() {
  const t = useT()
  const profile = useProfileStore((s) => s.profile)
  const profiles = useProfileStore((s) => s.profiles)
  const name = useProfileTitle()
  const pid = profile.id
  const counts = useLiveQuery(
    async () => ({
      cards: await db.cards.where('profileId').equals(pid).count(),
      recs: await db.recordings.where('profileId').equals(pid).count(),
      events: await db.events.where('profileId').equals(pid).count(),
    }),
    [pid],
  )
  const fileInput = useRef<HTMLInputElement>(null)
  const [exportStatus, setExportStatus] = useState<Status>(null)
  const [importStatus, setImportStatus] = useState<Status>(null)
  const [pending, setPending] = useState<{ backup: Backup; ignored: IgnoredReport } | null>(null)
  const [wipeOpen, setWipeOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void pruneOldEvents()
  }, [])

  const failure = async (e: unknown, fallback: StrKey): Promise<string> => {
    const p = storageProblem(e, await dbAvailable())
    return p === 'unavailable' ? t('storageUnavailable') : p === 'quota' ? t('storageQuota') : t(fallback)
  }

  const doExport = async () => {
    setBusy(true)
    setExportStatus(null)
    try {
      const backup = await exportProfile(profile, APP_VERSION)
      const file = backupFileName(profile)
      download(file, JSON.stringify(backup))
      setExportStatus({ kind: 'ok', text: `${t('exportDone')} ${file}` })
    } catch (e) {
      setExportStatus({ kind: 'problem', text: await failure(e, 'exportFailed') })
    } finally {
      setBusy(false)
    }
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setImportStatus(null)
    if (file.size > LIMITS.fileChars) {
      setImportStatus({ kind: 'problem', text: t('importTooBig') })
      return
    }
    let text = ''
    try {
      text = await file.text()
    } catch {
      setImportStatus({ kind: 'problem', text: t('importInvalid', { app: APP_NAME }) })
      return
    }
    const parsed = parseBackup(text)
    if (!parsed.ok) {
      setImportStatus({ kind: 'problem', text: parsed.error === 'newer' ? t('importNewer') : parsed.error === 'tooBig' ? t('importTooBig') : t('importInvalid', { app: APP_NAME }) })
      return
    }
    setPending({ backup: parsed.backup, ignored: parsed.ignored })
  }

  const doImport = async () => {
    const p = pending
    setPending(null)
    if (!p) return
    setBusy(true)
    try {
      const result = await importBackup(p.backup)
      await useProfileStore.getState().load()
      await useProfileStore.getState().switchTo(result.profile.id)
      const who = result.profile.name.trim() || t('noName')
      const lead = t(result.replaced ? 'importDoneReplaced' : 'importDoneAdded', { name: who })
      const device = result.deviceRestored ? ` ${t('importDeviceDone')}` : ''
      const ign = ignoredText(p.ignored, t)
      setImportStatus({ kind: 'ok', text: [lead + device, ign].filter(Boolean).join(' ') })
    } catch (e) {
      setImportStatus({ kind: 'problem', text: await failure(e, 'importFailed') })
    } finally {
      setBusy(false)
    }
  }

  const doWipe = async () => {
    setWipeOpen(false)
    setBusy(true)
    await wipeAllData().catch(() => undefined)
    lockParent()
    // A hard load of the root: every in-memory store starts from scratch and onboarding begins clean.
    window.location.hash = '#/onboarding'
    window.location.reload()
  }

  const pendingStats = pending ? backupStats(pending.backup) : null
  const willReplace = !!pending && profiles.some((x) => x.id === pending.backup.profile.id)
  const pendingIgnored = pending ? ignoredText(pending.ignored, t) : ''

  return (
    <>
      <PageHeader title={t('secData')} back="/parent" />
      <Page width="narrow">
        <p className={styles.intro}>{t('dataIntro')}</p>
        <StorageBanner />
        {counts && <p className={styles.muted}>{t('counts', { cards: counts.cards, recs: counts.recs, events: counts.events })}</p>}

        <Section title={t('exportTitle')}>
          <p>{t('exportHint', { name })}</p>
          <p className={styles.hint}>{t('exportDevice')}</p>
          <div className={styles.row}>
            <Button icon={<Download />} onActivate={() => void doExport()} disabled={busy}>
              {`${t('exportBtn')} (${BACKUP_EXT})`}
            </Button>
          </div>
          {exportStatus && (
            <p className={exportStatus.kind === 'ok' ? styles.status : styles.notice} role="status">
              {exportStatus.text}
            </p>
          )}
        </Section>

        <Section title={t('importTitle')}>
          <p>{t('importHint')}</p>
          <div className={styles.row}>
            <Button variant="soft" icon={<Upload />} onActivate={() => fileInput.current?.click()} disabled={busy}>
              {t('importBtn')}
            </Button>
          </div>
          <input
            ref={fileInput}
            className={styles.fileInput}
            type="file"
            accept={`${BACKUP_EXT},application/json,.json`}
            tabIndex={-1}
            aria-hidden="true"
            data-testid="backup-file"
            onChange={(e) => {
              void onFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          {importStatus && (
            <p className={importStatus.kind === 'ok' ? styles.status : styles.notice} role="status">
              {importStatus.text}
            </p>
          )}
        </Section>

        <Section title={t('wipeTitle')} className={styles.dangerZone}>
          <p>{t('wipeHint')}</p>
          <div className={styles.row}>
            <Button variant="ghost" icon={<Trash2 />} onActivate={() => setWipeOpen(true)} disabled={busy}>
              {t('wipeBtn')}
            </Button>
          </div>
        </Section>
      </Page>

      <ConfirmDialog
        open={!!pending}
        title={t('importConfirmTitle')}
        text={
          pending && pendingStats
            ? [
                t('importSummary', { name: pending.backup.profile.name.trim() || t('noName'), date: fullDate(pending.backup.exportedAt), cards: pendingStats.cards, recs: pendingStats.recordings, events: pendingStats.events }),
                willReplace ? t('importReplace') : t('importAdd'),
                pending.backup.device ? t('importDeviceNote') : '',
                pendingIgnored,
              ]
                .filter(Boolean)
                .join(' ')
            : ''
        }
        confirm={t('importDo')}
        onConfirm={() => void doImport()}
        onClose={() => setPending(null)}
      />
      <ConfirmDialog open={wipeOpen} title={t('wipeTitle')} text={t('wipeQ')} confirm={t('wipeDo')} onConfirm={() => void doWipe()} onClose={() => setWipeOpen(false)} />
    </>
  )
}


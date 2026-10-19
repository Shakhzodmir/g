import { Download, Trash2, Upload } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { APP_NAME } from '../../app/brand'
import { db } from '../../store/db'
import { useProfileStore } from '../../store/profile'
import { Button } from '../../ui/Button'
import { Page } from '../../ui/Page'
import { PageHeader } from '../../ui/PageHeader'
import { backupFileName, backupStats, BACKUP_EXT, exportProfile, importBackup, parseBackup, wipeDatabase, type Backup } from './backup'
import styles from './parent.module.css'
import { APP_VERSION, ConfirmDialog, fullDate, Section, useProfileTitle, useT } from './shared'
import { lockParent } from './unlock'

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

export default function Data() {
  const t = useT()
  const profile = useProfileStore((s) => s.profile)
  const persistent = useProfileStore((s) => s.persistent)
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
  const [pending, setPending] = useState<Backup | null>(null)
  const [wipeOpen, setWipeOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const doExport = async () => {
    setBusy(true)
    setExportStatus(null)
    try {
      const backup = await exportProfile(profile, APP_VERSION)
      const file = backupFileName(profile)
      download(file, JSON.stringify(backup))
      setExportStatus({ kind: 'ok', text: `${t('exportDone')} ${file}` })
    } catch {
      setExportStatus({ kind: 'problem', text: t('exportFailed') })
    } finally {
      setBusy(false)
    }
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setImportStatus(null)
    let text = ''
    try {
      text = await file.text()
    } catch {
      setImportStatus({ kind: 'problem', text: t('importInvalid', { app: APP_NAME }) })
      return
    }
    const parsed = parseBackup(text)
    if (!parsed.ok) {
      setImportStatus({ kind: 'problem', text: parsed.error === 'newer' ? t('importNewer') : t('importInvalid', { app: APP_NAME }) })
      return
    }
    setPending(parsed.backup)
  }

  const doImport = async () => {
    const b = pending
    setPending(null)
    if (!b) return
    setBusy(true)
    try {
      const restored = await importBackup(b)
      const store = useProfileStore.getState()
      await store.load()
      await useProfileStore.getState().switchTo(restored.id)
      setImportStatus({ kind: 'ok', text: t('importDone') })
    } catch {
      setImportStatus({ kind: 'problem', text: t('importFailed') })
    } finally {
      setBusy(false)
    }
  }

  const doWipe = async () => {
    setWipeOpen(false)
    setBusy(true)
    await wipeDatabase().catch(() => undefined)
    try {
      localStorage.removeItem('gapimiz.device')
    } catch {
      /* storage blocked: nothing persisted anyway */
    }
    lockParent()
    window.location.hash = '#/onboarding'
    window.location.reload()
  }

  const pendingStats = pending ? backupStats(pending) : null

  return (
    <>
      <PageHeader title={t('secData')} back="/parent" />
      <Page width="narrow">
        <p className={styles.intro}>{t('dataIntro')}</p>
        {!persistent && <p className={styles.notice}>{t('noStorage')}</p>}
        {counts && <p className={styles.muted}>{t('counts', { cards: counts.cards, recs: counts.recs, events: counts.events })}</p>}

        <Section title={t('exportTitle')}>
          <p>{t('exportHint', { name })}</p>
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
              {t('wipeTitle')}
            </Button>
          </div>
        </Section>
      </Page>

      <ConfirmDialog
        open={!!pending}
        title={t('importConfirmTitle')}
        text={
          pending && pendingStats
            ? `${t('importSummary', { name: pending.profile.name.trim() || t('noName'), date: fullDate(pending.exportedAt), cards: pendingStats.cards, recs: pendingStats.recordings, events: pendingStats.events })} ${t('importReplace')}`
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

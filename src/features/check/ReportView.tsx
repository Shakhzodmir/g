import { Copy, Printer, Send, Share2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router'
import { htmlLangOf } from '../../i18n'
import { useDevice } from '../../store/device'
import { useProfileStore } from '../../store/profile'
import { Button } from '../../ui/Button'
import { Toggle } from '../../ui/controls'
import { EmptyState } from '../../ui/misc'
import { Page } from '../../ui/Page'
import { PageHeader } from '../../ui/PageHeader'
import parent from '../parent/parent.module.css'
import { Section } from '../parent/shared'
import { bandIcon, checkPath } from './Bits'
import { useChecksReady, useKindRow, useKindView, isCheckKind } from './hooks'
import { ageKey, bandKey, disclaimerKeys, domainKey, kindTitleKey } from './labels'
import { HISTORY_ROWS, REPORT_WINDOW_DAYS, buildReportText, dayOf, reportDomains, telegramShareUrl, type ReportInput } from './report'
import { activeDaysIn } from './streak'
import type { StrKey } from './strings'
import styles from './check.module.css'
import { useBilingual, useCheckT } from './useT'
import type { Band, CheckKind } from './types'

type Status = { kind: 'ok' | 'problem'; text: string } | null

/** The app's own address (what the Telegram link carries as `url`): nothing about the person. */
function appUrl(): string {
  return `${window.location.origin}${window.location.pathname}`
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to the old way */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch {
    return false
  }
}

export default function Report() {
  const { kind } = useParams()
  if (!isCheckKind(kind)) return <Navigate to={checkPath()} replace />
  return <ReportFor kind={kind} />
}

function ReportFor({ kind }: { kind: CheckKind }) {
  const t = useCheckT()
  const { tr, primary, secondary } = useBilingual()
  const uiLang = useDevice((s) => s.uiLang)
  const profile = useProfileStore((s) => s.profile)
  const ready = useChecksReady()
  const view = useKindView(kind)
  const row = useKindRow(kind)
  const [withName, setWithName] = useState(false)
  const [status, setStatus] = useState<Status>(null)
  const latest = view.latest
  const name = withName ? profile.name.trim() || null : null

  const input = useMemo<ReportInput | null>(() => {
    if (!latest || !row) return null
    return {
      kind,
      name,
      result: latest,
      outcome: view.outcome,
      history: row.results.slice(-HISTORY_ROWS),
      practicedDays: activeDaysIn(row.ticks, view.today, REPORT_WINDOW_DAYS),
      windowDays: REPORT_WINDOW_DAYS,
      focus: row.plan?.focus ?? [],
    }
  }, [kind, name, latest, row, view.outcome, view.today])
  const text = useMemo(() => (input ? buildReportText(input, tr, primary, secondary) : ''), [input, tr, primary, secondary])

  const header = <PageHeader title={t('reportTitle')} back={checkPath(kind)} />
  if (!ready) {
    return (
      <>
        {header}
        <Page width="normal">
          <p className={parent.muted} role="status">
            {t('loading')}
          </p>
        </Page>
      </>
    )
  }
  if (!input || !latest) {
    return (
      <>
        {header}
        <Page width="normal">
          <EmptyState symbol="clipboard" title={t('noResultTitle')} text={t('noReport')} />
        </Page>
      </>
    )
  }

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const share = async () => {
    try {
      await navigator.share({ title: `${tr('title', primary)} / ${tr('title', secondary)}`, text })
      setStatus({ kind: 'ok', text: t('shared') })
    } catch (e) {
      // closing the share sheet is not an error
      if ((e as { name?: string })?.name !== 'AbortError') setStatus({ kind: 'problem', text: t('shareFailed') })
    }
  }
  const copy = async () => setStatus((await copyText(text)) ? { kind: 'ok', text: t('copied') } : { kind: 'problem', text: t('copyFailed') })
  const telegram = () => {
    window.open(telegramShareUrl(text, appUrl()), '_blank', 'noopener,noreferrer')
  }

  const lang = (l: 'uz' | 'ru') => (l === 'ru' ? 'ru' : htmlLangOf(uiLang === 'ru' ? 'uz' : uiLang))
  /** The interface language first, the other one smaller beneath (both for a specialist who reads either). */
  const bi = (key: StrKey, vars?: Record<string, string | number>) => (
    <>
      <span className={styles.p} lang={lang(primary)}>
        {tr(key, primary, vars)}
      </span>
      <span className={styles.s} lang={lang(secondary)}>
        {tr(key, secondary, vars)}
      </span>
    </>
  )
  const band = (b: Band) => (
    <span className={styles.sheetBand} data-band={b}>
      <span aria-hidden="true">{bandIcon(b)}</span>
      <span>
        <span className={styles.p} lang={lang(primary)}>
          {tr(bandKey(b), primary)}
        </span>
        <span className={styles.s} lang={lang(secondary)}>
          {tr(bandKey(b), secondary)}
        </span>
      </span>
    </span>
  )
  const [d1, d2] = disclaimerKeys(kind)
  const age = latest.age

  return (
    <>
      {header}
      <Page width="normal">
        <div className={styles.reportControls} data-no-print>
          <p className={parent.intro}>{t('reportIntro')}</p>
          <Section>
            <Toggle label={t('includeName')} hint={t('includeNameHint')} checked={withName} onChange={setWithName} />
            <div className={styles.actionRow}>
              <Button icon={<Printer />} onActivate={() => window.print()}>
                {t('btnPrint')}
              </Button>
              {canShare && (
                <Button variant="secondary" icon={<Share2 />} onActivate={() => void share()}>
                  {t('btnShare')}
                </Button>
              )}
              <Button variant="secondary" icon={<Copy />} onActivate={() => void copy()}>
                {t('btnCopy')}
              </Button>
              <Button variant="secondary" icon={<Send />} onActivate={telegram}>
                {t('btnTelegram')}
              </Button>
            </div>
            <p className={status?.kind === 'problem' ? parent.errorText : parent.hint} role="status" data-testid="share-status">
              {status?.text ?? ''}
            </p>
            <p className={parent.hint}>{t('printTip')}</p>
          </Section>
          <Section title={t('previewTitle')}>
            <p className={parent.hint}>{t('previewHint')}</p>
            <pre className={styles.preview} data-testid="share-text" tabIndex={0}>
              {text}
            </pre>
          </Section>
        </div>

        <div className={styles.sheetWrap}>
          <article className={styles.sheet} aria-label={t('reportTitle')} data-testid="report-sheet" lang={lang(primary)}>
            <h2 className={styles.sheetTitle}>{bi('title')}</h2>
            <div className={styles.sheetKind}>{bi(kindTitleKey(kind))}</div>
            <div className={styles.sheetMeta}>
              <span>{tr('rpDate', primary, { date: dayOf(latest.ts) })}</span>
              {age && <span>{tr('ageLabel', primary, { age: tr(ageKey(age), primary) })}</span>}
              {name && <span>{tr('rpName', primary, { name })}</span>}
            </div>
            <table>
              <caption>{bi('byDomain')}</caption>
              <tbody>
                {reportDomains(latest, kind).map(({ domain, band: b }) => (
                  <tr key={domain}>
                    <th scope="row">{bi(domainKey(domain))}</th>
                    <td>{band(b)}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row">{bi('overallLine')}</th>
                  <td>{band(latest.overall)}</td>
                </tr>
              </tbody>
            </table>
            {input.history.length > 1 && (
              <table>
                <caption>{bi('rpTrend')}</caption>
                <tbody>
                  {input.history.map((r) => (
                    <tr key={r.id}>
                      <th scope="row">{dayOf(r.ts)}</th>
                      <td>{band(r.overall)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p>{bi('rpPractice', { n: input.practicedDays, window: input.windowDays })}</p>
            <div className={styles.sheetNote}>
              <strong>{bi(d1)}</strong>
              <span>{bi(d2)}</span>
            </div>
            <p className={styles.sheetFoot}>{bi('rpFooter')}</p>
          </article>
        </div>
      </Page>
    </>
  )
}

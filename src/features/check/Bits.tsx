import { Bell, CircleAlert, CircleCheck, Eye, Info, Stethoscope, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../../ui/Button'
import parent from '../parent/parent.module.css'
import { Section } from '../parent/shared'
import { CHECK_CONFIG } from './config'
import { bandKey, disclaimerKeys, domainKey, warnKey, whereKeys } from './labels'
import { reportDomains } from './report'
import type { Outcome } from './scoring'
import styles from './check.module.css'
import { useCheckT } from './useT'
import type { Band, CheckKind, CheckResult } from './types'

/** Where the "where to turn" hint points. Another part of the app builds this page; until it exists the adult area shows its home. */
export const HELP_ROUTE = '/parent/help'
export const checkPath = (kind?: CheckKind, tail = ''): string => `/parent/check${kind ? `/${kind}` : ''}${tail}`

/** Icon of a band; the shape differs for every band so it never relies on colour. */
export function bandIcon(band: Band): ReactNode {
  if (band === 'good') return <CircleCheck />
  if (band === 'watch') return <Eye />
  return <CircleAlert />
}

/** One band: icon + text + a different border style, never colour alone. */
export function BandBadge({ band }: { band: Band }) {
  const t = useCheckT()
  return (
    <span className={styles.band} data-band={band}>
      <span aria-hidden="true" className={styles.bandIcon}>
        {bandIcon(band)}
      </span>
      <span>{t(bandKey(band))}</span>
    </span>
  )
}

export function DomainBands({ kind, result }: { kind: CheckKind; result: Pick<CheckResult, 'bands'> }) {
  const t = useCheckT()
  return (
    <ul className={styles.domains} role="list">
      {reportDomains(result, kind).map(({ domain, band }) => (
        <li key={domain} className={styles.domainRow}>
          <span className={styles.domainName}>{t(domainKey(domain))}</span>
          <BandBadge band={band} />
        </li>
      ))}
    </ul>
  )
}

/** "This is not a diagnosis": on every result screen, with the safety line for the kind of check. */
export function Disclaimer({ kind }: { kind?: CheckKind }) {
  const t = useCheckT()
  const [a, b] = disclaimerKeys(kind ?? 'child')
  return (
    <div className={styles.note} role="note" data-testid="disclaimer">
      <Info aria-hidden="true" />
      <div>
        <p className={styles.noteStrong}>{t(a)}</p>
        <p>{t(b)}</p>
        {kind && <p>{t(warnKey(kind))}</p>}
      </div>
    </div>
  )
}

/** A calm static "where to turn" hint with a plain link to the help page. */
export function WhereToTurn({ kind }: { kind: CheckKind }) {
  const t = useCheckT()
  const navigate = useNavigate()
  return (
    <div className={styles.tight} data-testid="where-to-turn">
      <h3 className={styles.h3}>
        {t('whereTitle')}
      </h3>
      <ul className={styles.whereList}>
        {whereKeys(kind).map((k) => (
          <li key={k}>{t(k)}</li>
        ))}
      </ul>
      <div className={styles.actionRow}>
        <Button variant="soft" icon={<Stethoscope />} onActivate={() => navigate(HELP_ROUTE)}>
          {t('helpLink')}
        </Button>
      </div>
    </div>
  )
}

/** The outcome of a repeat check: improved, or the calm "consider a specialist" screen. Nothing for a first check. */
export function OutcomeCard({ kind, outcome }: { kind: CheckKind; outcome: Outcome }) {
  const t = useCheckT()
  if (outcome.kind === 'first') return null
  if (outcome.kind === 'improved') {
    return (
      <div className={styles.goodCard} role="status" data-testid="outcome-improved">
        <div className={styles.bannerHead}>
          <TrendingUp aria-hidden="true" />
          <div>
            <h3 className={styles.bannerTitle}>{outcome.reason === 'clear' ? t('improvedClearTitle') : t('improvedUpTitle')}</h3>
            <p className={styles.bannerText}>{outcome.reason === 'clear' ? t('improvedClearText') : t('improvedUpText')}</p>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className={styles.calmCard} data-testid="outcome-specialist">
      <div className={styles.bannerHead}>
        <Stethoscope aria-hidden="true" />
        <div>
          <h3 className={styles.bannerTitle}>{t('specialistTitle')}</h3>
          <p className={styles.bannerText}>{t('specialistText')}</p>
        </div>
      </div>
      <WhereToTurn kind={kind} />
    </div>
  )
}

/** "Retest is due" banner. In-app only: this app never sends notifications. */
export function RetestBanner({ offset, onGo }: { offset: number; onGo: () => void }) {
  const t = useCheckT()
  return (
    <div className={styles.banner} role="status" data-testid="retest-banner">
      <div className={styles.bannerHead}>
        <Bell aria-hidden="true" />
        <div>
          <h3 className={styles.bannerTitle}>{t('retestBannerTitle')}</h3>
          <p className={styles.bannerText}>{t('retestBannerText', { n: offset })}</p>
        </div>
      </div>
      <div className={styles.actionRow}>
        <Button onActivate={onGo}>{t('retestBannerGo')}</Button>
      </div>
    </div>
  )
}

/** The result of one check: overall band, bands per domain, what it means, where to turn, the disclaimer. */
export function ResultSection({ kind, result, outcome, title }: { kind: CheckKind; result: CheckResult; outcome: Outcome; title: string }) {
  const t = useCheckT()
  const first = outcome.kind === 'first'
  const text = result.overall === 'good' ? t('firstGood') : result.overall === 'watch' ? t('firstWatch') : t('firstAttention')
  return (
    <Section title={title}>
      <div className={styles.overallRow}>
        <span>{t('overallLine')}:</span>
        <BandBadge band={result.overall} />
      </div>
      <DomainBands kind={kind} result={result} />
      {first && <p>{text}</p>}
      {result.stage === 'quick' && <p className={parent.hint}>{t('quickOnlyNote')}</p>}
      <OutcomeCard kind={kind} outcome={outcome} />
      {first && result.overall === 'attention' && <WhereToTurn kind={kind} />}
      <Disclaimer kind={kind} />
    </Section>
  )
}

export const PLAN_MINUTES = CHECK_CONFIG.plan.minutes

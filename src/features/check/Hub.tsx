import { Baby, Brain, MessageCircle, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useProfileStore } from '../../store/profile'
import { Page } from '../../ui/Page'
import { PageHeader } from '../../ui/PageHeader'
import { Pressable } from '../../ui/Pressable'
import parent from '../parent/parent.module.css'
import { StorageBanner } from '../parent/shared'
import { Disclaimer, RetestBanner, checkPath } from './Bits'
import { dayNumber, formatDay } from './days'
import { recommendedKind } from './derive'
import { useChecksReady, useKindView } from './hooks'
import { kindHintKey, kindTitleKey } from './labels'
import styles from './check.module.css'
import { useCheckT } from './useT'
import type { CheckKind } from './types'

function kindIcon(kind: CheckKind): ReactNode {
  if (kind === 'child') return <Baby />
  if (kind === 'asd') return <MessageCircle />
  return <Brain />
}

function KindCard({ kind, recommended }: { kind: CheckKind; recommended: boolean }) {
  const t = useCheckT()
  const navigate = useNavigate()
  const view = useKindView(kind)
  const status = view.due ? t('statusDue') : view.latest ? t('statusLast', { date: formatDay(dayNumber(view.latest.ts)) }) : t('statusNone')
  return (
    <li>
      <Pressable className={parent.homeCard} label={t(kindTitleKey(kind))} onActivate={() => navigate(checkPath(kind))} data-check={kind}>
        <span className={parent.homeIcon} aria-hidden="true">
          {kindIcon(kind)}
        </span>
        <span className={parent.homeText}>
          <span className={parent.homeTitle}>{t(kindTitleKey(kind))}</span>
          <span className={parent.homeHint}>{t(kindHintKey(kind))}</span>
          <span className={styles.kindMeta}>
            <span className={view.due ? styles.tagDue : styles.tag}>{status}</span>
            {recommended && <span className={styles.tag}>{t('recommended')}</span>}
          </span>
        </span>
      </Pressable>
    </li>
  )
}

/** /parent/check: the three screenings, with a banner for every repeat check that is due. */
export default function CheckHub() {
  const t = useCheckT()
  const navigate = useNavigate()
  const profileKind = useProfileStore((s) => s.profile.kind)
  const ready = useChecksReady()
  const rec = recommendedKind(profileKind)
  const order: CheckKind[] = [rec, ...(['child', 'asd', 'adult'] as const).filter((k) => k !== rec)]
  const dueChild = useKindView('child').due
  const dueAsd = useKindView('asd').due
  const dueAdult = useKindView('adult').due
  const dues: Array<[CheckKind, number]> = []
  if (dueChild) dues.push(['child', dueChild.offset])
  if (dueAsd) dues.push(['asd', dueAsd.offset])
  if (dueAdult) dues.push(['adult', dueAdult.offset])
  return (
    <>
      <PageHeader title={t('title')} back="/parent" />
      <Page width="normal">
        <p className={parent.intro}>{t('intro')}</p>
        <StorageBanner />
        {ready &&
          dues.map(([kind, offset]) => (
            <div key={kind} className={parent.stack}>
              <p className={parent.muted}>{t(kindTitleKey(kind))}</p>
              <RetestBanner offset={offset} onGo={() => navigate(checkPath(kind, '/run?retest=1'))} />
            </div>
          ))}
        <h2 className={parent.h2}>{t('sectionKinds')}</h2>
        {ready ? (
          <ul className={parent.homeGrid}>
            {order.map((k) => (
              <KindCard key={k} kind={k} recommended={k === rec} />
            ))}
          </ul>
        ) : (
          <p className={parent.muted} role="status">
            {t('loading')}
          </p>
        )}
        <p className={`${parent.hint} ${styles.privacyLine}`}>
          <ShieldCheck aria-hidden="true" className={styles.inlineIcon} />
          <span>{t('privacy')}</span>
        </p>
        <Disclaimer />
      </Page>
    </>
  )
}

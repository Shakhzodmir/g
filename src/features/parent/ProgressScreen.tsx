import { Leaf } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useI18n, useLabel } from '../../i18n'
import type { EventRow } from '../../store/db'
import { queryEvents } from '../../store/events'
import { useProfileStore } from '../../store/profile'
import { Button } from '../../ui/Button'
import { EmptyState } from '../../ui/misc'
import { Page } from '../../ui/Page'
import { PageHeader } from '../../ui/PageHeader'
import styles from './parent.module.css'
import { calendar, pluralRu, summarize, supportLines, windowStart, type Counted, type SupportLine } from './progress'
import { pruneOldEvents } from './retention'
import { resolveRef, type RefHint } from './refs'
import { RefVisual, Section, shortDate, StorageBanner, useCustomCards, useProfileName, useT } from './shared'

/** Events of the window, re-read (with a fresh clock) when the screen mounts and whenever the tab becomes visible again. */
function useEvents(profileId: string) {
  const [state, setState] = useState<{ events: EventRow[]; now: number } | null>(null)
  const load = useCallback(() => {
    const now = Date.now()
    let alive = true
    void pruneOldEvents(now)
      .then(() => queryEvents(profileId, windowStart(now)))
      .then((rows) => alive && setState({ events: rows, now }))
    return () => {
      alive = false
    }
  }, [profileId])
  useEffect(() => {
    setState(null)
    let stop = load()
    const again = () => {
      if (document.visibilityState === 'hidden') return
      stop()
      stop = load()
    }
    document.addEventListener('visibilitychange', again)
    window.addEventListener('focus', again)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', again)
      window.removeEventListener('focus', again)
    }
  }, [load])
  return state
}

function RankList({ items, empty, hint, limit = 10 }: { items: Array<Counted | { ref: string; count?: undefined }>; empty: string; hint?: RefHint; limit?: number }) {
  const cards = useCustomCards()
  const label = useLabel()
  const t = useT()
  const { uiLang } = useI18n()
  // Refs that cannot be named (deleted custom cards, ids from other versions) are hidden, never shown raw.
  const rows = items
    .map((it) => ({ it, info: resolveRef(it.ref, cards, hint) }))
    .filter((r): r is { it: (typeof items)[number]; info: NonNullable<typeof r.info> } => r.info !== null)
    .slice(0, limit)
  if (!rows.length) return <p className={styles.muted}>{empty}</p>
  return (
    <ol className={styles.rank}>
      {rows.map(({ it, info }) => (
        <li key={it.ref} className={styles.rankItem}>
          <RefVisual info={info} className={styles.rankSym} />
          <span>{label(info.label)}</span>
          <span className={styles.rankCount}>{it.count ? t('times', { n: it.count, times: uiLang === 'ru' ? pluralRu(it.count, 'раз', 'раза', 'раз') : '' }) : ''}</span>
        </li>
      ))}
    </ol>
  )
}

export default function Progress() {
  const t = useT()
  const navigate = useNavigate()
  const { uiLang } = useI18n()
  const label = useLabel()
  const pid = useProfileStore((s) => s.profile.id)
  const name = useProfileName()
  const loaded = useEvents(pid)
  const cards = useCustomCards()
  const summary = useMemo(() => (loaded ? summarize(loaded.events, loaded.now) : null), [loaded])
  const cal = useMemo(() => (loaded ? calendar(loaded.events, loaded.now) : []), [loaded])
  const ru = uiLang === 'ru'
  const times = (n: number) => (ru ? pluralRu(n, 'раз', 'раза', 'раз') : '')
  const days = (n: number) => (ru ? pluralRu(n, 'день', 'дня', 'дней') : '')
  /** Display name of a ref, or null when it cannot be named. */
  const wordOf = (ref: string): string | null => {
    const info = resolveRef(ref, cards)
    return info ? label(info.label) : null
  }

  const lineText = (l: SupportLine): string => {
    switch (l.id) {
      case 'topWord': {
        const word = wordOf(l.refs[0])
        return word ? t('lineTopWord', { name, word, n: l.n, times: times(l.n) }) : ''
      }
      case 'newWords': {
        const words = l.refs.map(wordOf).filter((w): w is string => !!w)
        return words.length ? t('lineNewWords', { n: words.length, words: words.join(', ') }) : ''
      }
      case 'spoken':
        return t('lineSpoken', { n: l.n, times: times(l.n) })
      case 'feelings':
        return t('lineFeelings', { name, n: l.n, times: times(l.n) })
      case 'exercises':
        return t('lineExercises', { n: l.n })
      case 'days':
        return t('lineDays', { n: l.n, days: days(l.n) })
      case 'gentle':
        return t('lineGentle')
    }
  }

  const weekdays = t('weekdays').split(',')

  return (
    <>
      <PageHeader title={t('secProgress')} back="/parent" />
      <Page width="normal">
        <p className={styles.intro}>{t('periodNote')}</p>
        <StorageBanner />
        {!summary ? (
          <p className={styles.muted} aria-busy="true">
            …
          </p>
        ) : summary.empty ? (
          <EmptyState
            symbol="sunflower"
            title={t('emptyTitle')}
            text={t('emptyText')}
            action={
              <Button variant="soft" onActivate={() => navigate('/talk')}>
                {t('emptyAction')}
              </Button>
            }
          />
        ) : (
          <>
            <Section title={t('supportTitle')}>
              <ul className={styles.lines}>
                {supportLines(summary)
                  .map((l) => ({ l, text: lineText(l) }))
                  .filter((x) => x.text)
                  .map(({ l, text }) => (
                    <li key={l.id} className={styles.line}>
                      <span className={styles.lineIcon} aria-hidden="true">
                        <Leaf />
                      </span>
                      <span>{text}</span>
                    </li>
                  ))}
              </ul>
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className={styles.statNum}>{summary.thisWeek.activeDays}</span>
                  <span className={styles.statLabel}>{t('statDays')}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statNum}>{summary.thisWeek.minutes}</span>
                  <span className={styles.statLabel}>{t('statMinutes')}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statNum}>{summary.thisWeek.sessions}</span>
                  <span className={styles.statLabel}>{t('statSessions')}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statNum}>{summary.thisWeek.words}</span>
                  <span className={styles.statLabel}>{t('statWords')}</span>
                </div>
              </div>
            </Section>

            <div className={styles.twoCol}>
              <Section title={t('calendarTitle')}>
                <div className={styles.calWrap}>
                  <div className={styles.cal} role="table" aria-label={t('calendarTitle')}>
                    <div role="row" style={{ display: 'contents' }}>
                      {weekdays.map((d) => (
                        <span key={d} role="columnheader" className={styles.calHead}>
                          {d}
                        </span>
                      ))}
                    </div>
                    {cal.map((week) => (
                      <div role="row" key={week[0].key} style={{ display: 'contents' }}>
                        {week.map((d) => (
                          <span
                            key={d.key}
                            role="cell"
                            className={styles.calDay}
                            data-active={d.count > 0 || undefined}
                            data-today={d.isToday || undefined}
                            data-future={d.inFuture || undefined}
                            aria-label={d.count > 0 ? t('dayActive', { date: shortDate(d.ts), n: d.count }) : t('dayQuiet', { date: shortDate(d.ts) })}
                          >
                            {d.date}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                  <p className={styles.hint}>{t('calendarHint')}</p>
                </div>
              </Section>

              <Section title={t('weeksTitle')}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">{t('colWeek')}</th>
                      <th scope="col" className={styles.num}>
                        {t('colDays')}
                      </th>
                      <th scope="col" className={styles.num}>
                        {t('colMinutes')}
                      </th>
                      <th scope="col" className={styles.num}>
                        {t('colSessions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...summary.weeks].reverse().map((w) => (
                      <tr key={w.start}>
                        <th scope="row">{t('weekFrom', { date: shortDate(w.start) })}</th>
                        <td className={styles.num}>{w.activeDays}</td>
                        <td className={styles.num}>{w.minutes}</td>
                        <td className={styles.num}>{w.sessions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            </div>

            <div className={styles.twoCol}>
              <Section title={t('topWordsTitle')}>
                <RankList items={summary.topWords} empty={t('noneYet')} />
              </Section>
              <Section title={t('newWordsTitle')}>
                <RankList items={summary.newWords.map((ref) => ({ ref }))} empty={t('noneYet')} />
              </Section>
            </div>

            <div className={styles.threeCol}>
              <Section title={t('gamesTitle')}>
                <RankList items={summary.games} empty={t('noneYet')} hint="game" />
              </Section>
              <Section title={t('exercisesTitle')}>
                <RankList items={summary.exercises} empty={t('noneYet')} hint="exercise" />
              </Section>
              <Section title={t('feelingsTitle')}>
                <RankList items={summary.feelings} empty={t('noneYet')} hint="feeling" />
              </Section>
            </div>
          </>
        )}
      </Page>
    </>
  )
}

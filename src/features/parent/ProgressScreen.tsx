import { Leaf } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
import { RefVisual, resolveRef, Section, shortDate, useCustomCards, useProfileName, useT } from './shared'

function useEvents(profileId: string) {
  const [events, setEvents] = useState<EventRow[] | null>(null)
  useEffect(() => {
    let alive = true
    setEvents(null)
    void queryEvents(profileId, windowStart(Date.now())).then((rows) => alive && setEvents(rows))
    return () => {
      alive = false
    }
  }, [profileId])
  return events
}

function RankList({ items, empty }: { items: Array<Counted | { ref: string; count?: undefined }>; empty: string }) {
  const cards = useCustomCards()
  const label = useLabel()
  const t = useT()
  const { uiLang } = useI18n()
  if (!items.length) return <p className={styles.muted}>{empty}</p>
  return (
    <ol className={styles.rank}>
      {items.map((it) => {
        const info = resolveRef(it.ref, cards)
        return (
          <li key={it.ref} className={styles.rankItem}>
            <RefVisual info={info} className={styles.rankSym} />
            <span>{label(info.label)}</span>
            <span className={styles.rankCount}>{it.count ? t('times', { n: it.count, times: uiLang === 'ru' ? pluralRu(it.count, 'раз', 'раза', 'раз') : '' }) : ''}</span>
          </li>
        )
      })}
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
  const events = useEvents(pid)
  const cards = useCustomCards()
  const now = useMemo(() => Date.now(), [])
  const summary = useMemo(() => (events ? summarize(events, now) : null), [events, now])
  const cal = useMemo(() => (events ? calendar(events, now) : []), [events, now])
  const ru = uiLang === 'ru'
  const times = (n: number) => (ru ? pluralRu(n, 'раз', 'раза', 'раз') : '')
  const days = (n: number) => (ru ? pluralRu(n, 'день', 'дня', 'дней') : '')
  const wordOf = (ref: string) => label(resolveRef(ref, cards).label)

  const lineText = (l: SupportLine): string => {
    switch (l.id) {
      case 'topWord':
        return t('lineTopWord', { name, word: wordOf(l.refs[0]), n: l.n, times: times(l.n) })
      case 'newWords':
        return t('lineNewWords', { n: l.n, words: l.refs.map(wordOf).join(', ') })
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
                {supportLines(summary).map((l) => (
                  <li key={l.id} className={styles.line}>
                    <span className={styles.lineIcon} aria-hidden="true">
                      <Leaf />
                    </span>
                    <span>{lineText(l)}</span>
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
                <RankList items={summary.games} empty={t('noneYet')} />
              </Section>
              <Section title={t('exercisesTitle')}>
                <RankList items={summary.exercises} empty={t('noneYet')} />
              </Section>
              <Section title={t('feelingsTitle')}>
                <RankList items={summary.feelings} empty={t('noneYet')} />
              </Section>
            </div>
          </>
        )}
      </Page>
    </>
  )
}

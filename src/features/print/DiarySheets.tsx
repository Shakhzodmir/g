import { useMemo } from 'react'
import { appUrl } from '../../lib/appUrl'
import { buildDiary, formatDayMonth, formatFullDate, parseIsoDate, type DiaryDays } from './diary'
import { MoodFace, type Mood } from './MoodFace'
import { PrintPages, PrintSheet } from './PrintSheet'
import { htmlLangOf, useSheetSubtitle, useSheetT, type SheetLang } from './sheetLang'
import sheets from './sheets.module.css'

const MOODS: readonly Mood[] = ['good', 'ok', 'hard']

/** "Mashq kundaligi / Дневник занятий": 7, 14 or 30 days of rows (tick, mood, note), one or two A4 pages. */
export default function DiarySheets({ lang, days, start, name }: { lang: SheetLang; days: DiaryDays; start: string; name: string }) {
  const t = useSheetT(lang)
  const sub = useSheetSubtitle(lang)
  const pages = useMemo(() => buildDiary(days, start), [days, start])
  const first = parseIsoDate(start)
  const weekdays = t('dWeekdays').split(',')
  const moodLabel: Record<Mood, string> = { good: t('dMoodGood'), ok: t('dMoodOk'), hard: t('dMoodHard') }
  const route = '/exercises'
  const total = pages.length

  return (
    <PrintPages>
      {pages.map((rows, pi) => (
        <PrintSheet
          key={pi}
          lang={htmlLangOf(lang)}
          title={t('dTitle')}
          subtitle={sub('dTitle')}
          qr={{ route, caption: t('dQr'), alt: t('qrAlt', { url: appUrl(route) }) }}
          footerNote={
            <>
              <span>{t('sheetApp')}</span>
              <span>{t('sheetDisclaimer')}</span>
              {total > 1 && <span>{t('pageOf', { n: pi + 1, total })}</span>}
            </>
          }
        >
          <div className={sheets.fields}>
            <div className={sheets.field}>
              <span className={sheets.fieldLabel}>{t('dName')}</span>
              <span className={sheets.fieldLine}>{name.trim()}</span>
            </div>
            <div className={sheets.fieldNarrow}>
              <span className={sheets.fieldLabel}>{t('dStart')}</span>
              <span className={sheets.fieldLine}>{first ? formatFullDate(first) : ''}</span>
            </div>
          </div>

          <div className={sheets.dTable} role="table" aria-label={t('dTitle')}>
            <div className={[sheets.dRow, sheets.dHead].join(' ')} role="row">
              <span role="columnheader">{t('dDay')}</span>
              <span role="columnheader">{t('dDate')}</span>
              <span role="columnheader">{t('dDone')}</span>
              <span role="columnheader">{t('dMood')}</span>
              <span role="columnheader">{t('dNote')}</span>
            </div>
            {rows.map((r) => (
              <div key={r.n} className={sheets.dRow} role="row">
                <span className={sheets.dNum} role="cell">
                  {r.n}
                </span>
                <span className={sheets.dDate} role="cell">
                  {r.date ? (
                    <>
                      <span className={sheets.dWeekday}>{weekdays[r.date.dow]}</span>
                      <span>{formatDayMonth(r.date)}</span>
                    </>
                  ) : null}
                </span>
                <span className={sheets.dCheck} role="cell">
                  <span className={sheets.box} />
                </span>
                <span className={sheets.dMoods} role="cell">
                  {MOODS.map((m) => (
                    <MoodFace key={m} mood={m} className={sheets.dFace} />
                  ))}
                </span>
                <span role="cell" />
              </div>
            ))}
          </div>

          <div className={sheets.legend}>
            {MOODS.map((m) => (
              <span key={m} className={sheets.legendItem}>
                <MoodFace mood={m} className={sheets.legendFace} />
                {moodLabel[m]}
              </span>
            ))}
          </div>
          <p className={sheets.note}>{t('dHow')}</p>
        </PrintSheet>
      ))}
    </PrintPages>
  )
}

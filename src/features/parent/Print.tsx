import { Printer } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { Fitz, TopicId } from '../../content/types'
import { wordsByTopic } from '../../content/vocab'
import { renderBi, useI18n, useLabel, useStrings, type Bi } from '../../i18n'
import { shy } from '../../lib/hyphenate'
import { appBaseUrl, appUrl, displayUrl } from '../../lib/appUrl'
import { useProfileStore } from '../../store/profile'
import { Button } from '../../ui/Button'
import { Segmented, Toggle } from '../../ui/controls'
import { Page } from '../../ui/Page'
import { PageHeader } from '../../ui/PageHeader'
import { symbolUrl } from '../../ui/SymbolImg'
import { DIARY_DAYS, buildDiary, type DiaryDays } from '../print/diary'
import { QrLink } from '../print/PrintSheet'
import { SHEET_LANGS, type SheetLang } from '../print/sheetLang'
import { P } from '../print/strings'
import { useObjectUrl } from './image'
import styles from './parent.module.css'
import ps from './Print.module.css'
import { Section, TopicChips, useCustomCards, useT } from './shared'

// The new sheets (diary, 15 minutes at home, articulation chart) and the QR encoder load only when the person opens them.
const DiarySheets = lazy(() => import('../print/DiarySheets'))
const RoutineSheet = lazy(() => import('../print/RoutineSheet'))
const ArticulationSheet = lazy(() => import('../print/ArticulationSheet'))
const ContactsSheet = lazy(() => import('../print/ContactsSheet'))

export const CARDS_PER_PAGE = 12

interface PrintItem {
  key: string
  label: Bi
  symbol: string
  fitz: Fitz
  image?: Blob | null
}

/** Splits items into A4 pages of 12 (3 × 4). */
export function paginate<T>(items: T[], perPage = CARDS_PER_PAGE): T[][] {
  const pages: T[][] = []
  for (let i = 0; i < items.length; i += perPage) pages.push(items.slice(i, i + perPage))
  return pages
}

function PrintCard({ item, both, colour, top }: { item: PrintItem; both: boolean; colour: boolean; top: boolean }) {
  const label = useLabel()
  const speechLang = useProfileStore((s) => s.profile.speechLang)
  const { uzScript, uiLang } = useI18n()
  const photo = useObjectUrl(item.image ?? null)
  const second = speechLang === 'ru' ? renderBi(item.label, uzScript === 'cyrl' ? 'uzc' : 'uz', uzScript) : item.label.ru
  return (
    <div className={ps.cell}>
      <div className={[ps.card, top && ps.cardTop].filter(Boolean).join(' ')} style={colour ? { borderColor: `var(--fitz-${item.fitz}-border)`, background: `color-mix(in srgb, var(--fitz-${item.fitz}-bg) 35%, #fff)` } : undefined}>
        {/* eager: lazy images outside the viewport would be missing from the printout */}
        <img className={[ps.img, photo && ps.photo].filter(Boolean).join(' ')} src={photo ?? symbolUrl(item.symbol)} alt="" loading="eager" decoding="sync" />
        <span className={ps.label} data-long={label(item.label).length > 14 || undefined}>
          <span>{shy(label(item.label), uiLang === 'ru' ? 'ru' : 'uz')}</span>
          {both && second && second !== label(item.label) && <span className={ps.second} lang={speechLang === 'ru' ? (uzScript === 'cyrl' ? 'uz-Cyrl' : 'uz-Latn') : 'ru'}>{shy(second, uiLang === 'ru' ? 'uz' : 'ru')}</span>}
        </span>
      </div>
    </div>
  )
}

/** The Print button with the page count and the "save as PDF" hint (never printed itself). */
function PrintRow({ pages, disabled, tip }: { pages: number; disabled?: boolean; tip: string }) {
  const t = useT()
  return (
    <>
      <div className={styles.spread}>
        <span className={styles.muted}>{t('printPages', { n: pages })}</span>
        <Button icon={<Printer />} onActivate={() => window.print()} disabled={disabled}>
          {t('printBtn')}
        </Button>
      </div>
      <p className={styles.hint}>{tip}</p>
    </>
  )
}

/** 3 × 4 picture cards, one topic at a time, with a QR code in the footer that opens the communicator. */
function CardSheets() {
  const t = useT()
  const tp = useStrings(P)
  const aac = useProfileStore((s) => s.profile.aac)
  const cards = useCustomCards()
  const [topic, setTopic] = useState<TopicId>('core')
  const [both, setBoth] = useState(false)
  const [colour, setColour] = useState(true)

  const items = useMemo<PrintItem[]>(() => {
    const hidden = new Set(aac.hiddenWordIds)
    const built = wordsByTopic(topic)
      .filter((w) => !hidden.has(w.id) && (!w.core || w.core.level <= aac.level))
      .map((w) => ({ key: w.id, label: { uz: w.uz, ru: w.ru }, symbol: w.symbol, fitz: w.fitz }))
    const mine = (cards ?? [])
      .filter((c) => c.topic === topic && !c.hidden)
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((c) => ({ key: `c.${c.id}`, label: { uz: c.uz || c.ru, ru: c.ru || c.uz }, symbol: c.symbol ?? 'framed_picture', fitz: c.fitz, image: c.image }))
    return [...built, ...mine]
  }, [topic, cards, aac.hiddenWordIds, aac.level])
  const pages = paginate(items)
  const top = aac.showLabels && aac.labelPos === 'top'
  const route = '/talk'

  return (
    <>
      <div className={styles.stack} data-no-print>
        <p className={styles.intro}>{t('printIntro')}</p>
        <Section title={t('printWhich')}>
          <TopicChips value={topic} onChange={setTopic} label={t('printWhich')} />
          <Toggle label={t('printBoth')} checked={both} onChange={setBoth} />
          <Toggle label={t('printColour')} checked={colour} onChange={setColour} />
          <PrintRow pages={pages.length} disabled={!items.length} tip={t('printTip')} />
        </Section>
      </div>
      {items.length ? (
        <div className={ps.sheets}>
          {pages.map((page, i) => (
            <section key={i} className={ps.sheet} aria-label={t('printPages', { n: `${i + 1}/${pages.length}` })}>
              <div className={ps.grid}>
                {page.map((it) => (
                  <PrintCard key={it.key} item={it} both={both} colour={colour} top={top} />
                ))}
                {Array.from({ length: CARDS_PER_PAGE - page.length }, (_, k) => (
                  <div key={`e${k}`} className={ps.cell} aria-hidden="true" />
                ))}
              </div>
              <div className={ps.foot}>
                <QrLink className={ps.footQr} route={route} caption={tp('cardsQrCaption')} alt={tp('qrAlt', { url: appUrl(route) })} />
                <span className={ps.footUrl}>{displayUrl(appBaseUrl())}</span>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className={styles.muted}>{t('printEmpty')}</p>
      )}
    </>
  )
}

type Kind = 'cards' | 'diary' | 'routine' | 'artic' | 'contacts'
const KINDS: readonly Kind[] = ['cards', 'diary', 'routine', 'artic', 'contacts']

/** Options and preview of the sheets that are not picture cards. */
function OtherSheets({ kind }: { kind: Exclude<Kind, 'cards'> }) {
  const tp = useStrings(P)
  const { uiLang } = useI18n()
  const [lang, setLang] = useState<SheetLang>(uiLang)
  const [days, setDays] = useState<DiaryDays>(14)
  const [start, setStart] = useState('')
  const [name, setName] = useState('')
  const [mono, setMono] = useState(false)
  const pages = kind === 'diary' ? buildDiary(days, start).length : 1
  const intro = kind === 'diary' ? tp('introDiary') : kind === 'routine' ? tp('introRoutine') : kind === 'contacts' ? tp('introContacts') : tp('introArtic')
  const langLabel: Record<SheetLang, string> = { uz: tp('langUz'), uzc: tp('langUzc'), ru: tp('langRu') }

  return (
    <>
      <div className={styles.stack} data-no-print>
        <p className={styles.intro}>{intro}</p>
        <Section>
          <Segmented<SheetLang> label={tp('sheetLang')} value={lang} onChange={setLang} wrap options={SHEET_LANGS.map((l) => ({ value: l, label: langLabel[l] }))} />
          {kind === 'diary' && (
            <>
              <Segmented<`${DiaryDays}`> label={tp('diaryDays')} value={`${days}`} onChange={(v) => setDays(Number(v) as DiaryDays)} wrap options={DIARY_DAYS.map((d) => ({ value: `${d}` as const, label: tp('diaryDaysN', { n: d }) }))} />
              <label className={styles.field}>
                <span className={styles.fieldLabel}>{tp('diaryNameLabel')}</span>
                <input className={styles.input} value={name} maxLength={40} autoComplete="off" aria-describedby="print-name-hint" onChange={(e) => setName(e.target.value)} />
                <span id="print-name-hint" className={styles.hint}>
                  {tp('diaryNameHint')}
                </span>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>{tp('diaryStartLabel')}</span>
                <input className={styles.input} type="date" value={start} min="2000-01-01" max="2100-12-31" aria-describedby="print-start-hint" onChange={(e) => setStart(e.target.value)} />
                <span id="print-start-hint" className={styles.hint}>
                  {tp('diaryStartHint')}
                </span>
              </label>
            </>
          )}
          {kind === 'artic' && <Toggle label={tp('mono')} hint={tp('monoHint')} checked={mono} onChange={setMono} />}
          <PrintRow pages={pages} tip={tp('sheetTip')} />
          <p className={styles.hint}>{tp('previewNote')}</p>
        </Section>
      </div>
      <Suspense fallback={null}>
        {kind === 'diary' && <DiarySheets lang={lang} days={days} start={start} name={name} />}
        {kind === 'routine' && <RoutineSheet lang={lang} />}
        {kind === 'artic' && <ArticulationSheet lang={lang} mono={mono} />}
        {kind === 'contacts' && <ContactsSheet lang={lang} />}
      </Suspense>
    </>
  )
}

/** "Chop etish / Печать": picture cards, practice diary, "15 minutes at home" and the articulation chart (A4, through the browser's print dialog). */
export default function Print() {
  const t = useT()
  const tp = useStrings(P)
  // `?sheet=contacts` (from the contact book) opens that sheet directly
  const [search] = useSearchParams()
  const [kind, setKind] = useState<Kind>(() => KINDS.find((k) => k === search.get('sheet')) ?? 'cards')
  const kindLabel: Record<Kind, string> = { cards: tp('kindCards'), diary: tp('kindDiary'), routine: tp('kindRoutine'), artic: tp('kindArtic'), contacts: tp('kindContacts') }

  return (
    <>
      <PageHeader title={t('secPrint')} back="/parent" />
      <Page width="normal" className={ps.page}>
        <div className={styles.stack} data-no-print>
          <Section>
            <Segmented<Kind> label={tp('sheetKind')} value={kind} onChange={setKind} wrap options={KINDS.map((k) => ({ value: k, label: kindLabel[k] }))} />
          </Section>
        </div>
        {kind === 'cards' ? <CardSheets /> : <OtherSheets key={kind} kind={kind} />}
      </Page>
    </>
  )
}

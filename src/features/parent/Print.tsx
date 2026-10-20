import { Printer } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Fitz, TopicId } from '../../content/types'
import { wordsByTopic } from '../../content/vocab'
import { renderBi, useI18n, useLabel, type Bi } from '../../i18n'
import { shy } from '../../lib/hyphenate'
import { useProfileStore } from '../../store/profile'
import { Button } from '../../ui/Button'
import { Toggle } from '../../ui/controls'
import { Page } from '../../ui/Page'
import { PageHeader } from '../../ui/PageHeader'
import { symbolUrl } from '../../ui/SymbolImg'
import { useObjectUrl } from './image'
import styles from './parent.module.css'
import ps from './Print.module.css'
import { Section, TopicChips, useCustomCards, useT } from './shared'

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

export default function Print() {
  const t = useT()
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

  return (
    <>
      <PageHeader title={t('secPrint')} back="/parent" />
      <Page width="normal">
        <div className={styles.stack} data-no-print>
          <p className={styles.intro}>{t('printIntro')}</p>
          <Section title={t('printWhich')}>
            <TopicChips value={topic} onChange={setTopic} label={t('printWhich')} />
            <Toggle label={t('printBoth')} checked={both} onChange={setBoth} />
            <Toggle label={t('printColour')} checked={colour} onChange={setColour} />
            <div className={styles.spread}>
              <span className={styles.muted}>{t('printPages', { n: pages.length })}</span>
              <Button icon={<Printer />} onActivate={() => window.print()} disabled={!items.length}>
                {t('printBtn')}
              </Button>
            </div>
            <p className={styles.hint}>{t('printTip')}</p>
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
              </section>
            ))}
          </div>
        ) : (
          <p className={styles.muted}>{t('printEmpty')}</p>
        )}
      </Page>
    </>
  )
}

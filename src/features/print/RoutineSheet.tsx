import { appUrl } from '../../lib/appUrl'
import { PrintPages, PrintSheet, QrLink } from './PrintSheet'
import { htmlLangOf, useSheetSubtitle, useSheetT, type SheetLang } from './sheetLang'
import sheets from './sheets.module.css'
import type { PKey } from './strings'

interface Block {
  minutes: number
  title: PKey
  text: PKey
  qrCaption: PKey
  route: string
}

/** The routine: four short parts, 3 + 5 + 5 + 2 = 15 minutes. Each part opens the matching screen of the app. */
const BLOCKS: readonly Block[] = [
  { minutes: 3, title: 'rWarmTitle', text: 'rWarmText', qrCaption: 'rWarmQr', route: '/exercises' },
  { minutes: 5, title: 'rGameTitle', text: 'rGameText', qrCaption: 'rGameQr', route: '/games' },
  { minutes: 5, title: 'rTalkTitle', text: 'rTalkText', qrCaption: 'rTalkQr', route: '/talk' },
  { minutes: 2, title: 'rCalmTitle', text: 'rCalmText', qrCaption: 'rCalmQr', route: '/calm' },
]

export const ROUTINE_ROUTES: readonly string[] = BLOCKS.map((b) => b.route)

const TIPS: readonly PKey[] = ['rTip1', 'rTip2', 'rTip3', 'rTip4', 'rTip5', 'rTip6', 'rTip7']

/** "Uyda 15 daqiqa / 15 минут дома": a simple daily routine for parents and screen-free tips, one A4 page. */
export default function RoutineSheet({ lang }: { lang: SheetLang }) {
  const t = useSheetT(lang)
  const sub = useSheetSubtitle(lang)
  return (
    <PrintPages>
      <PrintSheet
        lang={htmlLangOf(lang)}
        title={t('rTitle')}
        subtitle={sub('rTitle')}
        footerNote={
          <>
            <span>{t('sheetApp')}</span>
            <span>{t('sheetDisclaimer')}</span>
          </>
        }
      >
        <p className={sheets.lead}>{t('rLead')}</p>

        <ol className={sheets.steps}>
          {BLOCKS.map((b, i) => (
            <li key={b.title} className={sheets.step}>
              <span className={sheets.stepMin}>
                <span className={sheets.stepNum}>{b.minutes}</span>
                <span className={sheets.stepUnit}>{t('rMin')}</span>
              </span>
              <div className={sheets.stepText}>
                <h3 className={sheets.stepTitle}>
                  {i + 1}. {t(b.title)}
                </h3>
                <p>{t(b.text)}</p>
              </div>
              <QrLink layout="column" className={sheets.stepQr} route={b.route} caption={t(b.qrCaption)} alt={t('qrAlt', { url: appUrl(b.route) })} />
            </li>
          ))}
        </ol>

        <section className={sheets.tips} aria-label={t('rTipsTitle')}>
          <h3 className={sheets.tipsTitle}>{t('rTipsTitle')}</h3>
          <ul className={sheets.tipList}>
            {TIPS.map((k) => (
              <li key={k}>{t(k)}</li>
            ))}
          </ul>
        </section>

        <p className={sheets.callout}>{t('rStop')}</p>
        <p className={sheets.callout}>{t('rDoctor')}</p>
      </PrintSheet>
    </PrintPages>
  )
}

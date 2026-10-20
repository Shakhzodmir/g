import { ARTICULATION } from '../../content/exercises'
import { appUrl } from '../../lib/appUrl'
import { S as EXERCISES } from '../exercises/strings'
import { Ogizcha } from '../../ui/mascot/Ogizcha'
import { renderWithVars } from '../../i18n'
import { useDevice } from '../../store/device'
import { PrintPages, PrintSheet } from './PrintSheet'
import { htmlLangOf, useSheetBi, useSheetSubtitle, useSheetT, type SheetLang } from './sheetLang'
import sheets from './sheets.module.css'

export const ARTICULATION_ROUTE = '/exercises/mirror'

/** Ogʻizcha poses as a printable chart: the same names and instructions the mirror shows, with boxes to tick the repetitions. */
export default function ArticulationSheet({ lang, mono }: { lang: SheetLang; mono: boolean }) {
  const t = useSheetT(lang)
  const sub = useSheetSubtitle(lang)
  const bi = useSheetBi(lang)
  const uzScript = useDevice((s) => s.uzScript)
  // the warm-up note is the app's own sentence (exercises/strings), so the paper and the screen say the same thing
  const note = renderWithVars({ uz: EXERCISES.uz.warmupNote, ru: EXERCISES.ru.warmupNote }, lang, uzScript)
  return (
    <PrintPages>
      <PrintSheet
        lang={htmlLangOf(lang)}
        title={t('aTitle')}
        subtitle={sub('aTitle')}
        qr={{ route: ARTICULATION_ROUTE, caption: t('aQr'), alt: t('qrAlt', { url: appUrl(ARTICULATION_ROUTE) }) }}
        footerNote={
          <>
            <span>{note}</span>
            <span>{t('sheetApp')}</span>
          </>
        }
      >
        <p className={sheets.lead}>
          {t('aLead')} {t('aTick')}
        </p>
        <ol className={sheets.poses}>
          {ARTICULATION.map((ex, i) => (
            <li key={ex.id} className={sheets.pose}>
              <Ogizcha pose={ex.pose} animate={false} title="" size={120} className={[sheets.poseFace, mono && sheets.mono].filter(Boolean).join(' ')} />
              <div className={sheets.poseText}>
                <h3 className={sheets.poseTitle}>
                  {i + 1}. {bi(ex.title)}
                </h3>
                <p className={sheets.poseInstr}>{bi(ex.instruction)}</p>
                <p className={sheets.poseMeta}>{ex.holdSec >= 3 ? t('aHoldReps', { s: ex.holdSec, n: ex.reps }) : t('aRepsOnly', { n: ex.reps })}</p>
                <span className={sheets.ticks} aria-hidden="true">
                  {Array.from({ length: ex.reps }, (_, k) => (
                    <span key={k} className={sheets.tick} />
                  ))}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </PrintSheet>
    </PrintPages>
  )
}

import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { BOARD } from '../../app/strings'
import { formatNumber, formatQuantity, useI18n, useStrings } from '../../i18n'
import {
  effectiveScale,
  maxScaleFor,
  reachClamp,
  reachFraction,
  reachRaw,
  scaleTooLarge,
  suggestedScale,
  useDevice,
  useViewport,
  type BoardCalibration,
  type ReachAge,
} from '../../store/device'
import { Button } from '../../ui/Button'
import { Segmented, Slider, Toggle } from '../../ui/controls'
import { Card } from '../../ui/misc'
import { Page } from '../../ui/Page'
import { PageHeader } from '../../ui/PageHeader'
import styles from './BoardSetup.module.css'
import { BOARD_X } from './strings'

export default function BoardSetup() {
  const t = useStrings(BOARD)
  const tx = useStrings(BOARD_X)
  const { uiLang } = useI18n()
  const navigate = useNavigate()
  const vp = useViewport()
  const saved = useDevice((s) => s.boardCalibration)
  const boardMode = useDevice((s) => s.boardMode)
  const setBoard = useDevice((s) => s.setBoardMode)
  const setCalib = useDevice((s) => s.setBoardCalibration)
  const [diagonalIn, setDiag] = useState(saved?.diagonalIn ?? 75)
  const [bottomCm, setBottom] = useState(Math.round((saved?.bottomEdgeM ?? 0.8) * 100))
  const [ageGroup, setAge] = useState<ReachAge>(saved?.ageGroup ?? '5-8')
  const [distanceM, setDist] = useState(saved?.distanceM ?? 4)
  const suggestion = suggestedScale(diagonalIn, distanceM, vp)
  // The slider follows the suggestion (distance / diagonal / viewport changes) until the person moves it.
  const [userScale, setUserScale] = useState<number | null>(() =>
    saved && Math.abs(saved.scale - suggestedScale(saved.diagonalIn, saved.distanceM, vp)) > 1e-9 ? saved.scale : null,
  )
  const scale = userScale ?? suggestion
  const geom = { diagonalIn, bottomEdgeM: bottomCm / 100, ageGroup }
  const reach = reachFraction(geom)
  const clamp = reachClamp(geom)
  const maxScale = maxScaleFor(vp)
  const applied = effectiveScale({ scale }, vp)
  const tooLarge = scaleTooLarge(scale, vp)
  const effW = Math.round(vp.width / applied)
  const effH = Math.round(vp.height / applied)

  const current = (): BoardCalibration => ({ ...geom, distanceM, scale, reach })
  const save = () => {
    setCalib(current())
    setBoard(true)
    navigate('/')
  }
  // Switching on stores the values shown here, so board mode never runs with arbitrary defaults.
  const toggle = (on: boolean) => {
    if (on) setCalib(current())
    setBoard(on)
  }

  const pct = (v: number) => formatNumber(Math.round(v * 100), uiLang, 0)

  return (
    <>
      <PageHeader title={t('title')} />
      <Page width="wide" className={styles.page}>
        <p className={styles.intro}>{t('intro')}</p>
        <div className={styles.grid}>
          <Card className={styles.col}>
            <div className={styles.form}>
              <Toggle label={t('enabled')} checked={boardMode} onChange={toggle} />
              <Segmented
                label={t('diagonal')}
                value={String(diagonalIn) as '55' | '65' | '75' | '86'}
                options={(['55', '65', '75', '86'] as const).map((v) => ({ value: v, label: `${v}″` }))}
                onChange={(v) => setDiag(Number(v))}
              />
              <Slider
                label={t('bottomEdge')}
                value={bottomCm}
                min={40}
                max={120}
                step={5}
                format={(v) => formatQuantity(v, 'cm', uiLang)}
                onChange={setBottom}
              />
              <Segmented
                label={t('age')}
                value={ageGroup}
                options={[
                  { value: '3-4', label: '3–4' },
                  { value: '5-8', label: '5–8' },
                  { value: '9-12', label: '9–12' },
                  { value: 'adult', label: t('ageAdult') },
                ]}
                onChange={setAge}
              />
              <Slider label={t('distance')} value={distanceM} min={2} max={9} step={1} format={(v) => formatQuantity(v, 'm', uiLang)} onChange={setDist} />
            </div>
          </Card>

          <Card className={styles.col}>
            <div className={styles.form}>
              <Slider
                label={t('scale')}
                hint={t('suggested', { v: formatQuantity(suggestion, 'x', uiLang) })}
                value={scale}
                min={1}
                max={2.6}
                step={0.1}
                format={(v) => formatQuantity(v, 'x', uiLang)}
                onChange={setUserScale}
              />
              {userScale !== null && Math.abs(userScale - suggestion) > 1e-9 && (
                <Button variant="soft" onActivate={() => setUserScale(null)}>
                  {tx('suggestedUse')}
                </Button>
              )}
              <p className={styles.effective} data-bad={tooLarge || undefined}>
                {tx('effective', { w: formatNumber(effW, uiLang, 0), h: formatNumber(effH, uiLang, 0) })}
              </p>
              {tooLarge && (
                <p className={styles.warn} role="status">
                  <TriangleAlert aria-hidden="true" />
                  <span>{tx('scaleWarn', { v: formatNumber(scale, uiLang, 1), max: formatNumber(maxScale, uiLang, 1) })}</span>
                </p>
              )}

              <div className={styles.preview} role="img" aria-label={tx('preview')}>
                <div className={styles.screen}>
                  <span className={styles.sample} style={{ fontSize: `${(applied * 0.9).toFixed(2)}rem` }}>
                    {tx('sampleText')}
                  </span>
                  <div className={styles.reach} style={{ height: `${Math.round(reach * 88)}%` }} />
                  <div className={styles.navBar} />
                </div>
              </div>
              <p className={styles.reachText}>{t('reach', { p: pct(reach) })}</p>
              {clamp && (
                <p className={styles.warn} role="status">
                  <TriangleAlert aria-hidden="true" />
                  <span>{tx(clamp === 'low' ? 'reachLow' : 'reachHigh', { raw: pct(reachRaw(geom)), p: pct(reach) })}</span>
                </p>
              )}
            </div>
          </Card>
        </div>

        <div className={styles.actions}>
          <Button size="lg" onActivate={save}>
            {t('save')}
          </Button>
        </div>
      </Page>
    </>
  )
}

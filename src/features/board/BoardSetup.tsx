import { useState } from 'react'
import { useNavigate } from 'react-router'
import { BOARD } from '../../app/strings'
import { useStrings } from '../../i18n'
import { reachFraction, suggestedScale, useDevice, type ReachAge } from '../../store/device'
import { Button } from '../../ui/Button'
import { Segmented, Slider, Toggle } from '../../ui/controls'
import { Card } from '../../ui/misc'
import { Page } from '../../ui/Page'
import { PageHeader } from '../../ui/PageHeader'
import styles from './BoardSetup.module.css'

export default function BoardSetup() {
  const t = useStrings(BOARD)
  const navigate = useNavigate()
  const saved = useDevice((s) => s.boardCalibration)
  const boardMode = useDevice((s) => s.boardMode)
  const setBoard = useDevice((s) => s.setBoardMode)
  const setCalib = useDevice((s) => s.setBoardCalibration)
  const [diagonalIn, setDiag] = useState(saved?.diagonalIn ?? 75)
  const [bottomCm, setBottom] = useState(Math.round((saved?.bottomEdgeM ?? 0.8) * 100))
  const [ageGroup, setAge] = useState<ReachAge>(saved?.ageGroup ?? '5-8')
  const [distanceM, setDist] = useState(saved?.distanceM ?? 4)
  const cssHeight = typeof window !== 'undefined' ? window.innerHeight : 1080
  const suggestion = suggestedScale(diagonalIn, distanceM, cssHeight)
  const [scale, setScale] = useState(saved?.scale ?? suggestion)
  const reach = reachFraction({ diagonalIn, bottomEdgeM: bottomCm / 100, ageGroup })

  const save = () => {
    setCalib({ diagonalIn, bottomEdgeM: bottomCm / 100, ageGroup, distanceM, scale, reach })
    setBoard(true)
    navigate('/')
  }

  return (
    <>
      <PageHeader title={t('title')} />
      <Page width="narrow">
        <p className={styles.intro}>{t('intro')}</p>
        <Card>
          <div className={styles.form}>
            <Toggle label={t('enabled')} checked={boardMode} onChange={setBoard} />
            <Segmented
              label={t('diagonal')}
              value={String(diagonalIn) as '55' | '65' | '75' | '86'}
              options={(['55', '65', '75', '86'] as const).map((v) => ({ value: v, label: `${v}″` }))}
              onChange={(v) => setDiag(Number(v))}
            />
            <Slider label={t('bottomEdge')} value={bottomCm} min={40} max={120} step={5} format={(v) => `${v} sm`} onChange={setBottom} />
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
            <Slider label={t('distance')} value={distanceM} min={2} max={9} step={1} format={(v) => `${v} m`} onChange={setDist} />
            <Slider
              label={t('scale')}
              hint={t('suggested', { v: suggestion.toFixed(1) })}
              value={scale}
              min={1}
              max={2.6}
              step={0.1}
              format={(v) => `×${v.toFixed(1)}`}
              onChange={setScale}
            />
            <div className={styles.preview} aria-hidden="true">
              <div className={styles.screen}>
                <div className={styles.reach} style={{ height: `${Math.round(reach * 100)}%` }} />
              </div>
            </div>
            <p className={styles.reachText}>{t('reach', { p: Math.round(reach * 100) })}</p>
            <Button size="lg" onActivate={save}>
              {t('save')}
            </Button>
          </div>
        </Card>
      </Page>
    </>
  )
}

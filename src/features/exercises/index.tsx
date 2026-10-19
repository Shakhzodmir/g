import { Info, ShieldCheck } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { Route, Routes, useNavigate } from 'react-router'
import { useMotionPreset } from '../../design/motion'
import { useStrings } from '../../i18n'
import { useProfileStore } from '../../store/profile'
import { Musicha } from '../../ui/mascot/Musicha'
import { Page } from '../../ui/Page'
import { PageHeader } from '../../ui/PageHeader'
import { SymbolImg } from '../../ui/SymbolImg'
import { Tile } from '../../ui/Tile'
import styles from './exercises.module.css'
import { MirrorExercise, MirrorList } from './Mirror'
import { Candles } from './scenes/Scenes'
import { S } from './strings'

const BlowGame = lazy(() => import('./BlowGame'))
const VoiceGame = lazy(() => import('./VoiceGame'))

function Hub() {
  const t = useStrings(S)
  const navigate = useNavigate()
  const preset = useMotionPreset()
  const adult = useProfileStore((s) => s.profile.kind === 'adult')
  return (
    <div className={styles.frame}>
      <PageHeader title={t('title')} />
      <Page width="normal" className={styles.hub}>
      <ul className={styles.hubGrid} role="list">
        <li>
          <Tile
            art={<Candles progress={0.4} blowing={false} strength={0} movement={false} />}
            title={t('blowTitle')}
            label={t('blowTitle')}
            tone="warm"
            onActivate={() => navigate('/exercises/blow')}
          />
        </li>
        <li>
          <Tile
            art={
              <span className={styles.hubArt}>
                {adult ? <SymbolImg id="microphone" /> : <Musicha state="happy" size={120} calm={!preset.idleLoops} title="" />}
              </span>
            }
            title={adult ? t('voiceTitleAdult') : t('voiceTitle')}
            label={adult ? t('voiceTitleAdult') : t('voiceTitle')}
            tone="secondary"
            onActivate={() => navigate('/exercises/voice')}
          />
        </li>
        <li>
          <Tile symbol="mirror" title={t('mirrorTitle')} label={t('mirrorTitle')} tone="primary" onActivate={() => navigate('/exercises/mirror')} />
        </li>
      </ul>
      <div className={styles.notes}>
        <p className={styles.noteRow}>
          <Info aria-hidden="true" className={styles.noteIcon} />
          <span>{t('warmupNote')}</span>
        </p>
        <p className={styles.noteRow}>
          <ShieldCheck aria-hidden="true" className={styles.noteIcon} />
          <span>{t('privacyNote')}</span>
        </p>
      </div>
      </Page>
    </div>
  )
}

/** "Mashqlar / Упражнения": calm speech warm-ups (breath, voice, articulation mirror). */
export default function Exercises() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route index element={<Hub />} />
        <Route path="blow" element={<BlowGame />} />
        <Route path="voice" element={<VoiceGame />} />
        <Route path="mirror" element={<MirrorList />} />
        <Route path="mirror/:id" element={<MirrorExercise />} />
        <Route path="*" element={<Hub />} />
      </Routes>
    </Suspense>
  )
}

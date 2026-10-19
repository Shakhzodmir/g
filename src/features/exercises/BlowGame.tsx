import { Hand, Mic, Volume2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { playSfx } from '../../audio/sfx'
import { speak } from '../../audio/speech'
import { useMotionPreset } from '../../design/motion'
import { COMMON } from '../../i18n/common'
import { useStrings } from '../../i18n'
import { useProfileStore } from '../../store/profile'
import { logEvent } from '../../store/events'
import { Button } from '../../ui/Button'
import { Slider } from '../../ui/controls'
import { Musicha } from '../../ui/mascot/Musicha'
import { PageHeader } from '../../ui/PageHeader'
import { Pressable } from '../../ui/Pressable'
import styles from './exercises.module.css'
import { AdultSettings, HoldButton, LevelMeter } from './parts'
import { SCENES } from './scenes/Scenes'
import { createBlowDetector } from './sensors/blowDetector'
import { useMic } from './sensors/useMic'
import { useExerciseSettings, type BlowScene } from './settings'
import { bi, S } from './strings'

/** Seconds of steady blowing a scene needs (strong blows go a bit faster). */
const GOAL_SEC: Record<BlowScene, number> = { candles: 5, dandelion: 4.5, boat: 6 }
/** Breathing games stop after 2 minutes so the child does not get dizzy. */
export const SESSION_MS = 120_000
const SCENE_IDS: BlowScene[] = ['candles', 'dandelion', 'boat']
const SCENE_NAME = { candles: 'sceneCandles', dandelion: 'sceneDandelion', boat: 'sceneBoat' } as const
const SCENE_INSTR = { candles: 'instrCandles', dandelion: 'instrDandelion', boat: 'instrBoat' } as const
const HOLD_STRENGTH = 0.6

function ScenePicker({ value, onChange }: { value: BlowScene; onChange: (s: BlowScene) => void }) {
  const t = useStrings(S)
  return (
    <div className={styles.picker} role="group" aria-label={t('blowTitle')}>
      {SCENE_IDS.map((id) => {
        const Scene = SCENES[id]
        return (
          <Pressable key={id} className={styles.pick} label={t(SCENE_NAME[id])} pressed={id === value} scanGroup="scenes" onActivate={() => onChange(id)}>
            <span className={styles.pickArt} aria-hidden="true">
              <Scene progress={0} blowing={false} strength={0} movement={false} />
            </span>
            <span className={styles.pickLabel}>{t(SCENE_NAME[id])}</span>
          </Pressable>
        )
      })}
    </div>
  )
}

export default function BlowGame() {
  const t = useStrings(S)
  const tc = useStrings(COMMON)
  const navigate = useNavigate()
  const preset = useMotionPreset()
  const kind = useProfileStore((s) => s.profile.kind)
  const sensitivity = useExerciseSettings((s) => s.blowSensitivity)
  const scene = useExerciseSettings((s) => s.blowScene)
  const setSettings = useExerciseSettings((s) => s.set)

  const [phase, setPhase] = useState<'intro' | 'live' | 'rest'>('intro')
  const [mode, setMode] = useState<'mic' | 'hold'>('mic')
  const [noMic, setNoMic] = useState(false)
  const [progress, setProgress] = useState(0)
  const [blow, setBlow] = useState({ blowing: false, strength: 0 })
  const [done, setDone] = useState(false)
  const [meter, setMeter] = useState(0)

  const detector = useRef(createBlowDetector({ sensitivity }))
  const input = useRef({ blowing: false, strength: 0 })
  const progressRef = useRef(0)

  useEffect(() => detector.current.setSensitivity(sensitivity), [sensitivity])

  const mic = useMic(
    (f) => {
      const s = detector.current.update(f, f.t)
      input.current = { blowing: s.blowing, strength: s.strength }
      setMeter(Math.round(Math.min(1, f.rms / (s.threshold * 1.5)) * 10) / 10)
    },
    (floor) => {
      detector.current.setFloor(floor)
      detector.current.reset()
    },
  )
  const { status: micStatus, stop: stopMic, start: startMic } = mic

  useEffect(() => {
    if (micStatus === 'denied' || micStatus === 'unavailable') {
      setMode('hold')
      setNoMic(true)
    }
  }, [micStatus])

  const resetScene = useCallback(() => {
    progressRef.current = 0
    setProgress(0)
    setDone(false)
  }, [])

  // Game loop: integrates the blow into scene progress.
  const listening = phase === 'live' && !done && (mode === 'hold' || micStatus === 'running')
  useEffect(() => {
    if (!listening) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(100, now - last)
      last = now
      const inp = input.current
      if (inp.blowing) {
        progressRef.current = Math.min(1, progressRef.current + ((dt / 1000) * (0.6 + 0.8 * inp.strength)) / GOAL_SEC[scene])
        setProgress(Math.round(progressRef.current * 200) / 200)
      }
      const strength = Math.round(inp.strength * 10) / 10
      setBlow((b) => (b.blowing === inp.blowing && b.strength === strength ? b : { blowing: inp.blowing, strength }))
      if (progressRef.current >= 1) {
        setDone(true)
        setBlow({ blowing: false, strength: 0 })
        playSfx('chime')
        logEvent('exercise', 'blow', { scene, mode })
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [listening, scene, mode])

  // Session limit (never shown as a countdown).
  useEffect(() => {
    if (phase !== 'live') return
    const id = setTimeout(() => {
      stopMic()
      setPhase('rest')
    }, SESSION_MS)
    return () => clearTimeout(id)
  }, [phase, stopMic])

  const begin = (withMic: boolean) => {
    resetScene()
    setPhase('live')
    if (withMic) {
      setMode('mic')
      setNoMic(false)
      void startMic()
    } else {
      setMode('hold')
    }
  }

  const chooseScene = (s: BlowScene) => {
    setSettings({ blowScene: s })
    resetScene()
  }

  const sayInstruction = () => {
    const key = SCENE_INSTR[scene]
    void speak({ key: `x.blow_${scene}`, text: bi(key) })
  }

  const Scene = SCENES[scene]
  const calibrating = phase === 'live' && mode === 'mic' && (micStatus === 'asking' || micStatus === 'calibrating')

  const settings = (
    <AdultSettings>
      <Slider label={t('sensitivity')} hint={t('sensitivityHint')} value={sensitivity} min={1} max={10} onChange={(v) => setSettings({ blowSensitivity: v })} />
    </AdultSettings>
  )

  if (phase === 'rest') {
    return (
      <div className={styles.screen}>
        <PageHeader title={t('blowTitle')} back="/exercises" />
        <div className={styles.rest} role="status">
          {kind === 'child' ? <Musicha state="calm" size={160} calm title="" /> : null}
          <p className={styles.restTitle}>{tc('rest')}</p>
          <p className={styles.muted}>{t('restText')}</p>
          <Button size="lg" onActivate={() => navigate('/exercises')}>
            {t('toExercises')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.screen}>
      <PageHeader title={t('blowTitle')} back="/exercises" />

      <div className={styles.stage} data-scene={scene}>
        <Scene progress={progress} blowing={blow.blowing} strength={blow.strength} movement={preset.movement} className={styles.sceneArt} />
        {calibrating && (
          <div className={styles.overlay} role="status">
            <p className={styles.overlayText}>{micStatus === 'asking' ? t('asking') : t('calibrating')}</p>
            {micStatus === 'calibrating' && <span className={styles.calBar} aria-hidden="true" />}
          </div>
        )}
        {done && (
          <div className={styles.overlay} role="status">
            <p className={styles.doneText}>{t('sceneDone')}</p>
            <Button size="lg" variant="warm" onActivate={resetScene}>
              {tc('again')}
            </Button>
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <div className={styles.instrRow}>
          <Button variant="soft" iconOnly icon={<Volume2 />} label={tc('listen')} onActivate={sayInstruction}>
            {tc('listen')}
          </Button>
          <p className={styles.instr}>{t(SCENE_INSTR[scene])}</p>
          {settings}
        </div>

        <ScenePicker value={scene} onChange={chooseScene} />

        {phase === 'intro' ? (
          <div className={styles.start}>
            <div className={styles.startButtons}>
              <Button size="xl" icon={<Mic />} onActivate={() => begin(true)}>
                {t('startMic')}
              </Button>
              <Button size="lg" variant="soft" icon={<Hand />} onActivate={() => begin(false)}>
                {t('withoutMic')}
              </Button>
            </div>
            <p className={styles.adultNote}>
              {t('micExplain')} {t('privacyNote')}
            </p>
          </div>
        ) : mode === 'hold' ? (
          <div className={styles.holdZone}>
            {noMic && <p className={styles.adultNote} role="status">{tc('noMic')}</p>}
            <HoldButton
              onHoldChange={(held) => {
                input.current = held ? { blowing: true, strength: HOLD_STRENGTH } : { blowing: false, strength: 0 }
              }}
            />
          </div>
        ) : (
          micStatus === 'running' && (
            <p className={styles.micStatus}>
              <Mic aria-hidden="true" className={styles.micIcon} />
              <span>{t('micOn')}</span>
              <LevelMeter value={meter} label={t('micOn')} />
            </p>
          )
        )}
      </div>
    </div>
  )
}

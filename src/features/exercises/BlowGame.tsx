import { Hand, Mic, RotateCcw, Volume2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { playSfx } from '../../audio/sfx'
import { speak } from '../../audio/speech'
import { useMotionPreset } from '../../design/motion'
import { COMMON } from '../../i18n/common'
import { formatNumber, useI18n, useStrings } from '../../i18n'
import { useProfileStore } from '../../store/profile'
import { logEvent } from '../../store/events'
import { Button } from '../../ui/Button'
import { Slider } from '../../ui/controls'
import { Musicha } from '../../ui/mascot/Musicha'
import { PageHeader } from '../../ui/PageHeader'
import { Pressable } from '../../ui/Pressable'
import styles from './exercises.module.css'
import { AdultSettings, HoldButton, MicOverlay } from './parts'
import { SCENES } from './scenes/Scenes'
import { createBlowDetector } from './sensors/blowDetector'
import { levelFromThreshold } from './sensors/meterLevel'
import { useMic } from './sensors/useMic'
import { advanceSession, cooldownLeftMs, minutesLeft, SESSION_MS } from './sessionLimits'
import { useExerciseSettings, type BlowScene } from './settings'
import { bi, S } from './strings'
import { VoiceMeter } from './VoiceMeter'

export { SESSION_MS }

/** Seconds of steady blowing a scene needs (strong blows go a bit faster). */
const GOAL_SEC: Record<BlowScene, number> = { candles: 5, dandelion: 4.5, boat: 6 }
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
  const { uiLang } = useI18n()
  const navigate = useNavigate()
  const preset = useMotionPreset()
  const kind = useProfileStore((s) => s.profile.kind)
  const sensitivity = useExerciseSettings((s) => s.blowSensitivity)
  const scene = useExerciseSettings((s) => s.blowScene)
  const lastBlowEnd = useExerciseSettings((s) => s.lastBlowEnd)
  const setSettings = useExerciseSettings((s) => s.set)

  const [phase, setPhase] = useState<'intro' | 'live' | 'rest'>('intro')
  const [mode, setMode] = useState<'mic' | 'hold'>('mic')
  const [noMic, setNoMic] = useState(false)
  const [progress, setProgress] = useState(0)
  const [blow, setBlow] = useState({ blowing: false, strength: 0 })
  const [done, setDone] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const detector = useRef(createBlowDetector({ sensitivity }))
  const input = useRef({ blowing: false, strength: 0 })
  /** Raw loudness for the "we hear you" bar (0..1); the bar smooths it itself. */
  const meterLevel = useRef(0)
  const progressRef = useRef(0)

  useEffect(() => detector.current.setSensitivity(sensitivity), [sensitivity])

  const mic = useMic(
    (f) => {
      const s = detector.current.update(f, f.t)
      input.current = { blowing: s.blowing, strength: s.strength }
      meterLevel.current = levelFromThreshold(f.rms, s.threshold)
    },
    (floor) => {
      detector.current.setFloor(floor)
      detector.current.reset()
    },
  )
  const { status: micStatus, stop: stopMic, start: startMic, noisy } = mic

  useEffect(() => {
    if (micStatus === 'denied' || micStatus === 'unavailable') {
      setMode('hold')
      setNoMic(true)
    }
  }, [micStatus])

  const readMeter = useCallback(() => meterLevel.current, [])

  const resetScene = useCallback(() => {
    progressRef.current = 0
    meterLevel.current = 0
    input.current = { blowing: false, strength: 0 }
    setProgress(0)
    setDone(false)
  }, [])

  // Game loop: integrates the blow into scene progress.
  const listening = phase === 'live' && !done && (mode === 'hold' || micStatus === 'running')
  useEffect(() => {
    if (!listening) return
    let raf = 0
    let last = performance.now()
    const tick = (n: number) => {
      const dt = Math.min(100, n - last)
      last = n
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
        // The scene is finished: the microphone is not needed until «Yana».
        stopMic()
        playSfx('chime')
        logEvent('exercise', 'blow', { scene, mode })
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [listening, scene, mode, stopMic])

  // Session limit (never shown as a countdown). Only ACTIVE play counts: the clock stands still while the page
  // is hidden. After a full session the game rests for a while (see `cooldown` below).
  useEffect(() => {
    if (phase !== 'live') return
    let elapsed = 0
    let last = performance.now()
    const id = setInterval(() => {
      const n = performance.now()
      // At most one second per tick, so a throttled background timer cannot add the whole hidden time at once.
      elapsed = advanceSession(elapsed, Math.min(1000, n - last), document.hidden)
      last = n
      if (elapsed >= SESSION_MS) {
        clearInterval(id)
        stopMic()
        setSettings({ lastBlowEnd: Date.now() })
        setNow(Date.now())
        setPhase('rest')
      }
    }, 500)
    return () => clearInterval(id)
  }, [phase, stopMic, setSettings])

  // Rest period after a full session: re-entering the game does not start a new one at once.
  const cooldownMs = phase === 'intro' ? cooldownLeftMs(now, lastBlowEnd) : 0
  useEffect(() => {
    if (cooldownMs <= 0) return
    const id = setTimeout(() => setNow(Date.now()), Math.min(cooldownMs, 30_000) + 50)
    return () => clearTimeout(id)
  }, [cooldownMs])

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

  /** Switches (back) to the microphone: after a denial, or from "without microphone". */
  const retryMic = () => {
    resetScene()
    setMode('mic')
    setNoMic(false)
    void startMic()
  }

  const chooseScene = (s: BlowScene) => {
    setSettings({ blowScene: s })
    resetScene()
    // The microphone was released when the previous scene finished.
    if (phase === 'live' && mode === 'mic' && micStatus === 'idle') void startMic()
  }

  const again = () => {
    resetScene()
    if (mode === 'mic') void startMic()
  }

  const sayInstruction = () => {
    const key = SCENE_INSTR[scene]
    void speak({ key: `x.blow_${scene}`, text: bi(key) })
  }

  const Scene = SCENES[scene]
  const calibrating = phase === 'live' && mode === 'mic' && (micStatus === 'asking' || micStatus === 'calibrating')

  const settings = (
    <AdultSettings>
      {(close) => (
        <>
          <Slider label={t('sensitivity')} hint={t('sensitivityHint')} value={sensitivity} min={1} max={10} onChange={(v) => setSettings({ blowSensitivity: v })} />
          {noisy && mode === 'mic' && (
            <p className={styles.adultNote} role="status">
              {t('noisyRoom')}
            </p>
          )}
          {phase === 'live' && mode === 'mic' && micStatus === 'running' && (
            <Button
              variant="soft"
              icon={<RotateCcw />}
              onActivate={() => {
                close()
                again()
              }}
            >
              {t('recalibrateMic')}
            </Button>
          )}
          {phase === 'live' && mode === 'hold' && (
            <Button
              variant="soft"
              icon={<Mic />}
              onActivate={() => {
                close()
                retryMic()
              }}
            >
              {t('retryMic')}
            </Button>
          )}
        </>
      )}
    </AdultSettings>
  )

  if (phase === 'rest' || cooldownMs > 0) {
    return (
      <div className={styles.screen}>
        <PageHeader title={t('blowTitle')} back="/exercises" />
        <div className={styles.rest} role="status" data-reach>
          {kind === 'child' ? <Musicha state="calm" size={160} calm title="" /> : null}
          <p className={styles.restTitle}>{tc('rest')}</p>
          <p className={styles.muted}>{cooldownMs > 0 ? t('restCooldown', { m: formatNumber(minutesLeft(cooldownMs), uiLang, 0) }) : t('restText')}</p>
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
          <MicOverlay
            status={micStatus === 'asking' ? 'asking' : 'calibrating'}
            onNoMic={() => {
              stopMic()
              setMode('hold')
              setNoMic(false)
            }}
            onCancel={() => {
              stopMic()
              setPhase('intro')
            }}
          />
        )}
        {done && (
          <div className={styles.overlay} role="status">
            <p className={styles.doneText}>{t('sceneDone')}</p>
            <Button size="lg" variant="warm" onActivate={again}>
              {tc('again')}
            </Button>
          </div>
        )}
      </div>

      <div className={styles.controls} data-reach>
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
            <div className={styles.micBlock}>
              <VoiceMeter read={readMeter} active />
              <p className={styles.micStatus}>
                <Mic aria-hidden="true" className={styles.micIcon} />
                <span>{t('micOn')}</span>
              </p>
              {noisy && (
                <p className={styles.adultNote} role="status">
                  {t('noisyRoom')}
                </p>
              )}
            </div>
          )
        )}
      </div>
    </div>
  )
}

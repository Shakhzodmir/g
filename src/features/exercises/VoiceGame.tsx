import { Hand, Mic, RotateCcw, Volume2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router'
import { playSfx } from '../../audio/sfx'
import { speak } from '../../audio/speech'
import { useMotionPreset } from '../../design/motion'
import { COMMON } from '../../i18n/common'
import { useStrings } from '../../i18n'
import { logEvent } from '../../store/events'
import { useProfileStore } from '../../store/profile'
import { Button } from '../../ui/Button'
import { Slider } from '../../ui/controls'
import { Musicha, type MascotState } from '../../ui/mascot/Musicha'
import { PageHeader } from '../../ui/PageHeader'
import { SymbolImg } from '../../ui/SymbolImg'
import styles from './exercises.module.css'
import { AdultSettings, HoldButton, MicOverlay } from './parts'
import { useMic } from './sensors/useMic'
import { createFlight, STAR_HEIGHTS } from './sensors/voiceFlight'
import { createVoiceActivity } from './sensors/voiceActivity'
import { useExerciseSettings } from './settings'
import { bi, S } from './strings'
import { VoiceMeter } from './VoiceMeter'

export { STAR_HEIGHTS }
const HOLD_LEVEL = 0.6

export default function VoiceGame() {
  const t = useStrings(S)
  const tc = useStrings(COMMON)
  const navigate = useNavigate()
  const preset = useMotionPreset()
  const adult = useProfileStore((s) => s.profile.kind === 'adult')
  const sensitivity = useExerciseSettings((s) => s.voiceSensitivity)
  const setSettings = useExerciseSettings((s) => s.set)

  const [phase, setPhase] = useState<'intro' | 'live'>('intro')
  const [mode, setMode] = useState<'mic' | 'hold'>('mic')
  const [noMic, setNoMic] = useState(false)
  const [collected, setCollected] = useState(0)
  const [mascot, setMascot] = useState<MascotState>('idle')
  const [beak, setBeak] = useState(0)

  const va = useRef(createVoiceActivity(sensitivity))
  const level = useRef(0)
  const flight = useRef(createFlight())
  const bird = useRef<HTMLDivElement>(null)
  const happyUntil = useRef(0)

  useEffect(() => va.current.setSensitivity(sensitivity), [sensitivity])
  /** The voice level for the "we hear you" bar (the bar smooths it itself). */
  const readMeter = useCallback(() => level.current, [])

  const { status: micStatus, start: startMic, stop: stopMic, noisy } = useMic(
    (f) => {
      level.current = va.current.update(f.rms, f.dt)
    },
    (floor) => va.current.setFloor(floor),
  )

  useEffect(() => {
    if (micStatus === 'denied' || micStatus === 'unavailable') {
      setMode('hold')
      setNoMic(true)
    }
  }, [micStatus])

  const done = collected >= STAR_HEIGHTS.length
  const listening = phase === 'live' && !done && (mode === 'hold' || micStatus === 'running')

  // Flight loop: sound lifts Musicha, silence lets her glide down gently. Stars are collected whenever she
  // reaches (or passes) the next one, in either direction (see sensors/voiceFlight.ts).
  useEffect(() => {
    if (!listening) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(100, now - last)
      last = now
      const l = level.current
      const s = flight.current.step(l, dt)
      bird.current?.style.setProperty('--y', s.y.toFixed(4))

      const talking = l > 0.05
      setBeak(talking ? Math.round(l * 10) / 10 : 0)
      setMascot(now < happyUntil.current ? 'happy' : talking ? 'speak' : 'listen')

      if (s.gained > 0) {
        happyUntil.current = now + 900
        setCollected(s.collected)
        if (s.collected >= STAR_HEIGHTS.length) {
          stopMic()
          setMascot('happy')
          playSfx('chime')
          logEvent('exercise', 'voice', { mode })
          return
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [listening, mode, stopMic])

  const reset = useCallback(() => {
    flight.current.reset()
    level.current = 0
    bird.current?.style.setProperty('--y', '0')
    setCollected(0)
    setMascot('idle')
  }, [])

  const begin = (withMic: boolean) => {
    reset()
    setPhase('live')
    if (withMic) {
      setMode('mic')
      setNoMic(false)
      void startMic()
    } else {
      setMode('hold')
    }
  }

  const again = () => {
    reset()
    if (mode === 'mic') void startMic()
  }

  const retryMic = () => {
    reset()
    setMode('mic')
    setNoMic(false)
    void startMic()
  }

  const instrKey = adult ? 'voiceInstrAdult' : 'voiceInstr'
  const calibrating = phase === 'live' && mode === 'mic' && (micStatus === 'asking' || micStatus === 'calibrating')
  const star = STAR_HEIGHTS[collected]

  return (
    <div className={styles.screen}>
      <PageHeader title={adult ? t('voiceTitleAdult') : t('voiceTitle')} back="/exercises" />

      <div className={styles.sky}>
        <ol className={styles.tray} aria-label={t('stars', { n: collected, total: STAR_HEIGHTS.length })}>
          {STAR_HEIGHTS.map((_, i) => (
            <li key={i} className={styles.traySlot} data-on={i < collected || undefined}>
              <SymbolImg id="star" />
            </li>
          ))}
        </ol>

        {star !== undefined && (
          <div key={collected} className={styles.star} style={{ '--h': star } as CSSProperties} data-fade={!preset.movement || undefined} aria-hidden="true">
            <SymbolImg id="glowing_star" />
          </div>
        )}

        <div ref={bird} className={styles.bird} style={{ '--y': 0 } as CSSProperties}>
          {adult ? <SymbolImg id="balloon" /> : <Musicha state={done ? 'happy' : mascot} level={beak} size={160} calm={!preset.idleLoops} title="" />}
        </div>

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
            <p className={styles.doneText}>{t('allStars')}</p>
            <div className={styles.startButtons}>
              <Button size="lg" variant="warm" onActivate={again}>
                {tc('again')}
              </Button>
              <Button size="lg" variant="soft" onActivate={() => navigate('/exercises')}>
                {t('toExercises')}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className={styles.controls} data-reach>
        <div className={styles.instrRow}>
          {/* Adults hear the adult wording (x.voice_adult), children the child clip (x.voice): text and sound match. */}
          <Button
            variant="soft"
            iconOnly
            icon={<Volume2 />}
            label={tc('listen')}
            onActivate={() => void speak({ key: adult ? 'x.voice_adult' : 'x.voice', text: bi(instrKey) })}
          >
            {tc('listen')}
          </Button>
          <p className={styles.instr}>{t(instrKey)}</p>
          <AdultSettings>
            {(close) => (
              <>
                <Slider label={t('sensitivity')} hint={t('voiceSensitivityHint')} value={sensitivity} min={1} max={10} onChange={(n) => setSettings({ voiceSensitivity: n })} />
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
        </div>

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
            <HoldButton onHoldChange={(held) => (level.current = held ? HOLD_LEVEL : 0)} />
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

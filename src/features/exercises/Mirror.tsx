import { Camera, CameraOff, Check, Volume2 } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import type { FaceLandmarker } from '@mediapipe/tasks-vision'
import { playSfx } from '../../audio/sfx'
import { speak, stopSpeaking } from '../../audio/speech'
import { ARTICULATION } from '../../content/exercises'
import type { ArticulationExercise, OgizchaPose } from '../../content/types'
import { COMMON } from '../../i18n/common'
import { formatNumber, useLabel, useStrings } from '../../i18n'
import { useDevice } from '../../store/device'
import { logEvent } from '../../store/events'
import { Button } from '../../ui/Button'
import { Slider } from '../../ui/controls'
import { Ogizcha } from '../../ui/mascot/Ogizcha'
import { Page } from '../../ui/Page'
import { PageHeader } from '../../ui/PageHeader'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import { Tile } from '../../ui/Tile'
import styles from './exercises.module.css'
import { AdultSettings, ProgressRing } from './parts'
import { baselineOf, metricValue, poseActive } from './sensors/blendMetric'
import { detectBlendshapes, loadFaceLandmarker, openFrontCamera, stopStream } from './sensors/face'
import { createHoldCounter } from './sensors/holdCounter'
import { micErrorStatus } from './sensors/useMic'
import { useExerciseSettings } from './settings'
import { S } from './strings'

export const CALIBRATION_MS = 2000
/** ~15 fps is enough for slow articulation poses and keeps old phones cool. */
const DETECT_INTERVAL_MS = 66

/** List of articulation warm-ups. */
export function MirrorList() {
  const t = useStrings(S)
  const label = useLabel()
  const navigate = useNavigate()
  return (
    <div className={styles.frame}>
      <PageHeader title={t('mirrorTitle')} back="/exercises" symbol={<SymbolImg id="mirror" />} />
      <Page width="normal" className={styles.hub}>
      <p className={styles.lead}>{t('mirrorIntro')}</p>
      <ul className={styles.exGrid} role="list" data-reach>
        {ARTICULATION.map((ex) => (
          <li key={ex.id}>
            <Tile
              art={<Ogizcha pose={ex.pose} size={112} animate={false} title="" />}
              title={label(ex.title)}
              label={label(ex.title)}
              subtitle={ex.metric ? t('cameraTracked') : t('adultConfirms')}
              tone={ex.metric ? 'primary' : 'calm'}
              onActivate={() => navigate(`/exercises/mirror/${ex.id}`)}
            />
          </li>
        ))}
      </ul>
      <p className={styles.note}>{t('warmupNote')}</p>
      </Page>
    </div>
  )
}

export function MirrorExercise() {
  const { id } = useParams()
  const ex = ARTICULATION.find((e) => e.id === id)
  if (!ex) return <Navigate to="/exercises/mirror" replace />
  return <ExerciseView key={ex.id} ex={ex} />
}

/** Short model animation shown after a tap: the face moves into the pose (tongue clock swings). */
function demoSequence(ex: ArticulationExercise): Array<[OgizchaPose, number]> {
  if (ex.id === 'clock') return [['clock-left', 700], ['clock-right', 700], ['clock-left', 700], ['clock-right', 700], ['clock-left', 0]]
  if (ex.id === 'horse') return [['neutral', 450], ['horse', 450], ['neutral', 450], ['horse', 450], ['neutral', 450], ['horse', 0]]
  return [['neutral', 600], [ex.pose, 0]]
}

type CamState = 'off' | 'asking' | 'on' | 'denied' | 'unavailable'
type DetState = 'none' | 'loading' | 'failed' | 'calibrating' | 'tracking'

function ExerciseView({ ex }: { ex: ArticulationExercise }) {
  const t = useStrings(S)
  const tc = useStrings(COMMON)
  const label = useLabel()
  const navigate = useNavigate()
  const threshold = useExerciseSettings((s) => s.mirrorThreshold)
  const setSettings = useExerciseSettings((s) => s.set)
  const board = useDevice((s) => s.boardMode)

  const [cam, setCam] = useState<CamState>('off')
  const [det, setDet] = useState<DetState>('none')
  const [face, setFace] = useState(true)
  const [progress, setProgress] = useState(0)
  const [reps, setReps] = useState(0)
  const [checkKey, setCheckKey] = useState(0)
  const [pose, setPose] = useState<OgizchaPose>(ex.pose)

  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const lm = useRef<FaceLandmarker | null>(null)
  const counter = useRef(createHoldCounter({ holdMs: ex.holdSec * 1000 }))
  const calib = useRef<{ start: number | null; values: number[] }>({ start: null, values: [] })
  const baseline = useRef(0)
  const thr = useRef(threshold)
  const demo = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const camToken = useRef(0)

  useEffect(() => {
    thr.current = threshold
  }, [threshold])

  const done = reps >= ex.reps

  const stopCamera = useCallback(() => {
    camToken.current++
    stopStream(stream.current)
    stream.current = null
    if (video.current) video.current.srcObject = null
  }, [])

  // Unmount / navigation: the camera tracks stop synchronously (layout cleanup), so the browser's camera
  // indicator goes off at once instead of a moment later.
  useLayoutEffect(
    () => () => {
      stopCamera()
      demo.current.forEach(clearTimeout)
      stopSpeaking()
    },
    [stopCamera],
  )

  const beginCalibration = useCallback(() => {
    calib.current = { start: null, values: [] }
    counter.current.reset()
    setProgress(0)
    setDet('calibrating')
  }, [])

  const startCamera = async () => {
    const my = ++camToken.current
    setCam('asking')
    let s: MediaStream
    try {
      s = await openFrontCamera()
    } catch (e) {
      if (my === camToken.current) setCam(micErrorStatus(e))
      return
    }
    if (my !== camToken.current) {
      stopStream(s)
      return
    }
    stream.current = s
    // The camera can stop by itself (unplugged, permission revoked, taken by another app): the picture would
    // freeze while the tracker keeps reading stale frames. Switch off and fall back to the adult-confirm mode.
    s.getVideoTracks()[0]?.addEventListener('ended', () => {
      if (my !== camToken.current) return
      stopCamera()
      setDet('none')
      setProgress(0)
      setCam('unavailable')
    })
    setCam('on')
    if (!ex.metric) return
    setDet('loading')
    try {
      lm.current = await loadFaceLandmarker()
      if (my === camToken.current) beginCalibration()
    } catch {
      if (my === camToken.current) setDet('failed')
    }
  }

  const turnOff = () => {
    resumeCamera.current = false
    stopCamera()
    setCam('off')
    setDet('none')
    setProgress(0)
  }

  // Page hidden (tab switch, screen off): release the camera; on return open it again and measure the face again.
  const resumeCamera = useRef(false)
  const startCameraRef = useRef<() => Promise<void>>(async () => undefined)
  startCameraRef.current = startCamera
  useEffect(() => {
    const hide = () => {
      if (stream.current && !resumeCamera.current) {
        resumeCamera.current = true
        stopCamera()
        setCam('off')
        setDet('none')
        setProgress(0)
      }
    }
    const show = () => {
      if (document.hidden || !resumeCamera.current) return
      resumeCamera.current = false
      void startCameraRef.current()
    }
    const onVis = () => (document.hidden ? hide() : show())
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', hide)
    window.addEventListener('pageshow', show)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', hide)
      window.removeEventListener('pageshow', show)
    }
  }, [stopCamera])

  // Attach the live stream to the mirrored <video> (shown only, never recorded).
  useEffect(() => {
    const v = video.current
    if (cam !== 'on' || !v || !stream.current) return
    v.srcObject = stream.current
    void v.play().catch(() => undefined)
  }, [cam])

  const addRep = useCallback(() => {
    setReps((r) => r + 1)
    setCheckKey((k) => k + 1)
    playSfx('soft')
  }, [])

  // Face tracking loop.
  const tracking = (det === 'calibrating' || det === 'tracking') && cam === 'on' && !done
  useEffect(() => {
    if (!tracking) return
    let raf = 0
    let last = 0
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (now - last < DETECT_INTERVAL_MS) return
      last = now
      const v = video.current
      const model = lm.current
      if (!v || !model) return
      let value: number | null = null
      try {
        value = metricValue(ex.metric, detectBlendshapes(model, v, now))
      } catch {
        value = null
      }
      setFace(value !== null)
      const c = calib.current
      if (det === 'calibrating') {
        if (value === null) return
        if (c.start === null) c.start = now
        c.values.push(value)
        if (now - c.start >= CALIBRATION_MS && c.values.length >= 8) {
          baseline.current = baselineOf(c.values)
          counter.current.reset()
          setDet('tracking')
        }
        return
      }
      const st = counter.current.update(poseActive(value, baseline.current, thr.current), now)
      setProgress(Math.round(st.progress * 40) / 40)
      if (st.counted) addRep()
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [tracking, det, ex.metric, addRep])

  // Finished: switch the camera off and note it for the adult's progress view.
  useEffect(() => {
    if (!done) return
    stopCamera()
    setCam('off')
    setDet('none')
    logEvent('exercise', ex.id, { reps, camera: !!ex.metric })
  }, [done])

  const showMe = () => {
    void speak({ key: `x.${ex.id}`, text: ex.instruction })
    demo.current.forEach(clearTimeout)
    demo.current = []
    let at = 0
    for (const [p, ms] of demoSequence(ex)) {
      demo.current.push(setTimeout(() => setPose(p), at))
      at += ms
    }
  }

  const idx = ARTICULATION.findIndex((e) => e.id === ex.id)
  const next = ARTICULATION[(idx + 1) % ARTICULATION.length]

  let status = ''
  if (cam === 'on' && det === 'loading') status = t('loadingModel')
  else if (cam === 'on' && det === 'calibrating') status = face ? t('neutral') : t('noFace')
  else if (cam === 'on' && det === 'tracking') status = !face ? t('noFace') : progress > 0 ? t('holdIt') : ''

  // Board mode: the "camera on" button moves from the picture into the reach zone, next to the other actions.
  const cameraOnButton = (
    <Button icon={<Camera />} disabled={cam === 'asking'} onActivate={() => void startCamera()}>
      {t('mirrorOn')}
    </Button>
  )

  const settings = (
    <AdultSettings>
      <Slider
        label={t('threshold')}
        hint={t('thresholdHint')}
        value={threshold}
        min={0.1}
        max={0.6}
        step={0.05}
        format={(v) => formatNumber(v, useDevice.getState().uiLang, 2)}
        onChange={(v) => setSettings({ mirrorThreshold: v })}
      />
      {ex.metric && cam === 'on' && (det === 'tracking' || det === 'calibrating') && (
        <Button variant="soft" onActivate={beginCalibration}>
          {t('recalibrate')}
        </Button>
      )}
    </AdultSettings>
  )

  return (
    <div className={styles.screen}>
      <PageHeader title={label(ex.title)} back="/exercises/mirror" />

      {done ? (
        <div className={styles.rest} role="status" data-reach>
          <span className={styles.doneStar} aria-hidden="true">
            <SymbolImg id="glowing_star" />
          </span>
          <p className={styles.restTitle}>{t('exerciseDone')}</p>
          <div className={styles.startButtons}>
            <Button size="lg" onActivate={() => navigate('/exercises/voice')}>
              {t('nowVoice')}
            </Button>
            <Button size="lg" variant="secondary" onActivate={() => navigate(`/exercises/mirror/${next.id}`)}>
              {t('nextExercise')}
            </Button>
            <Button size="lg" variant="soft" onActivate={() => navigate('/exercises/mirror')}>
              {t('allExercises')}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.mirrorGrid}>
            <figure className={styles.panel} aria-label={t('model')}>
              <Pressable className={styles.modelBtn} label={`${tc('listen')}: ${label(ex.title)}`} onActivate={showMe}>
                <Ogizcha pose={pose} size={320} title="" className={styles.modelArt} />
              </Pressable>
            </figure>

            <figure className={styles.panel} aria-label={t('mirror')}>
              {cam === 'on' ? (
                <>
                  <video ref={video} className={styles.video} playsInline muted autoPlay aria-label={t('mirror')} />
                  {det === 'tracking' && (
                    <span className={styles.ringCorner}>
                      <ProgressRing value={progress} size={60} />
                    </span>
                  )}
                  {checkKey > 0 && (
                    <span key={checkKey} className={styles.softCheck} aria-hidden="true">
                      <Check />
                    </span>
                  )}
                  {status && <span className={styles.mirrorStatus}>{status}</span>}
                </>
              ) : (
                <div className={styles.mirrorOff}>
                  <SymbolImg id="mirror" size={56} />
                  {(cam === 'denied' || cam === 'unavailable') && (
                    <p className={styles.adultNote} role="status">
                      {tc('noCamera')}
                    </p>
                  )}
                  {/* Stays available after a denial or a camera that stopped: permission can be asked again. */}
                  {!board && cameraOnButton}
                </div>
              )}
            </figure>
          </div>

          <div className={styles.controls} data-reach>
            <div className={styles.instrRow}>
              <Button variant="soft" iconOnly icon={<Volume2 />} label={tc('listen')} onActivate={showMe}>
                {tc('listen')}
              </Button>
              <p className={styles.instr}>{label(ex.instruction)}</p>
            </div>
            {(!ex.metric || det === 'failed') && <p className={styles.adultNote}>{det === 'failed' ? t('modelFailed') : t('tongueNote')}</p>}
            {(cam === 'off' || cam === 'asking') && <p className={styles.small}>{t('cameraPrivacy')}</p>}
            <div className={styles.repRow}>
              <ol className={styles.reps} aria-label={t('reps', { n: reps, total: ex.reps })}>
                {Array.from({ length: ex.reps }, (_, i) => (
                  <li key={i} className={styles.rep} data-on={i < reps || undefined} />
                ))}
              </ol>
              <Button size="lg" variant="warm" icon={<Check />} onActivate={addRep}>
                {tc('gotIt')}
              </Button>
              {board && cam !== 'on' && cameraOnButton}
              {cam === 'on' && (
                <Button variant="ghost" iconOnly icon={<CameraOff />} label={t('mirrorOff')} onActivate={turnOff}>
                  {t('mirrorOff')}
                </Button>
              )}
              {ex.metric && settings}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

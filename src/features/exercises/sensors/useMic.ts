import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { analyzeFrame, type AudioFeatures } from './audioFeatures'
import { assessCalibration, type CalibrationResult } from './blowDetector'

/*
 * Microphone for the warm-ups. Started only after a tap (AudioContext needs a user gesture),
 * processed only on this device: nothing is recorded, stored or sent.
 * Browser processing is switched off so a blow is not "cleaned away" as noise.
 *
 * Lifecycle: the microphone is released when the page is hidden (tab switch, screen off, app switch) and when
 * the screen unmounts (synchronously, so the browser's recording indicator goes off at once); on return it is
 * opened again and the room is measured again.
 */

export type MicStatus = 'idle' | 'asking' | 'calibrating' | 'running' | 'denied' | 'unavailable'

export interface MicFrame extends AudioFeatures {
  /** ms timestamp (performance.now). */
  t: number
  /** ms since the previous frame. */
  dt: number
}

export const CALIBRATION_MS = 1500
/** If the first measurement was spoiled (continuous blowing, a very loud burst) it is repeated this many times. */
export const MAX_CALIBRATION_TRIES = 2
/** Analyse at ~30 fps; plenty for a breath, cheap on old phones. */
const FRAME_INTERVAL_MS = 33

export const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  video: false,
}

export function micErrorStatus(e: unknown): 'denied' | 'unavailable' {
  const name = (e as { name?: string } | null)?.name
  return name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError' ? 'denied' : 'unavailable'
}

type AudioCtor = typeof AudioContext

/** True while the page is hidden (tab in the background, screen off); also reports pagehide. */
export function usePageHidden(): boolean {
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden)
  useEffect(() => {
    const update = () => setHidden(document.hidden)
    const hide = () => setHidden(true)
    document.addEventListener('visibilitychange', update)
    window.addEventListener('pagehide', hide)
    window.addEventListener('pageshow', update)
    return () => {
      document.removeEventListener('visibilitychange', update)
      window.removeEventListener('pagehide', hide)
      window.removeEventListener('pageshow', update)
    }
  }, [])
  return hidden
}

export function useMic(onFrame: (f: MicFrame) => void, onCalibrated?: (floor: number) => void) {
  const [status, setStatus] = useState<MicStatus>('idle')
  /** Result of the last calibration (null before the first one). */
  const [calibration, setCalibration] = useState<CalibrationResult | null>(null)
  const frameCb = useRef(onFrame)
  const calCb = useRef(onCalibrated)
  useEffect(() => {
    frameCb.current = onFrame
    calCb.current = onCalibrated
  })
  const live = useRef<{ stream: MediaStream; ctx: AudioContext; raf: number } | null>(null)
  const token = useRef(0)
  /** The owner wants the microphone on (set by start, cleared by stop); the page may still have hidden it. */
  const wanted = useRef(false)
  const suspended = useRef(false)

  /** Releases the stream and the audio graph right now (tracks are stopped synchronously). */
  const teardown = useCallback(() => {
    token.current++
    const l = live.current
    live.current = null
    if (!l) return
    cancelAnimationFrame(l.raf)
    l.stream.getTracks().forEach((t) => t.stop())
    void l.ctx.close().catch(() => undefined)
  }, [])

  const stop = useCallback(() => {
    wanted.current = false
    suspended.current = false
    teardown()
    // Keep 'denied' / 'unavailable' (they explain why there is no microphone); everything else is simply off.
    setStatus((s) => (s === 'denied' || s === 'unavailable' ? s : 'idle'))
  }, [teardown])

  const start = useCallback(async () => {
    teardown()
    wanted.current = true
    suspended.current = false
    const my = ++token.current
    const Ctor: AudioCtor | undefined = globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext
    if (!navigator.mediaDevices?.getUserMedia || !Ctor) {
      setStatus('unavailable')
      return
    }
    setStatus('asking')
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS)
    } catch (e) {
      if (my === token.current) setStatus(micErrorStatus(e))
      return
    }
    if (my !== token.current) {
      stream.getTracks().forEach((t) => t.stop())
      return
    }
    let ctx: AudioContext
    try {
      ctx = new Ctor()
      await ctx.resume().catch(() => undefined)
    } catch {
      stream.getTracks().forEach((t) => t.stop())
      setStatus('unavailable')
      return
    }
    if (my !== token.current) {
      stream.getTracks().forEach((t) => t.stop())
      void ctx.close().catch(() => undefined)
      return
    }
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0
    source.connect(analyser) // never connected to the speakers: no echo, no feedback
    const buf = new Float32Array(analyser.fftSize)
    let calibration: AudioFeatures[] = []
    let t0 = performance.now()
    let last = t0
    let calibrated = false
    let tries = 1
    setCalibration(null)
    setStatus('calibrating')

    const tick = (now: number) => {
      if (!live.current || my !== token.current) return
      live.current.raf = requestAnimationFrame(tick)
      if (now - last < FRAME_INTERVAL_MS) return
      const dt = now - last
      last = now
      analyser.getFloatTimeDomainData(buf)
      const f = analyzeFrame(buf, ctx.sampleRate)
      if (!calibrated) {
        calibration.push(f)
        if (now - t0 >= CALIBRATION_MS) {
          const result = assessCalibration(calibration)
          if (result.blowing && tries < MAX_CALIBRATION_TRIES) {
            // Somebody was blowing during the "quiet" measurement: measure once more instead of trusting it.
            tries++
            calibration = []
            t0 = now
            return
          }
          calibrated = true
          setCalibration(result)
          calCb.current?.(result.floor)
          setStatus('running')
        }
        return
      }
      frameCb.current({ ...f, t: now, dt })
    }
    live.current = { stream, ctx, raf: requestAnimationFrame(tick) }
    // A track can end on its own (device unplugged, permission revoked).
    stream.getAudioTracks()[0]?.addEventListener('ended', () => {
      if (my === token.current) {
        teardown()
        wanted.current = false
        setStatus('unavailable')
      }
    })
  }, [teardown])

  // Release the microphone when the page is hidden; open it again (with a fresh calibration) when it returns.
  useEffect(() => {
    const hide = () => {
      if (!wanted.current || suspended.current) return
      suspended.current = true
      teardown()
      setStatus((s) => (s === 'denied' || s === 'unavailable' ? s : 'idle'))
    }
    const show = () => {
      if (!suspended.current || document.hidden) return
      suspended.current = false
      if (wanted.current) void start()
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
  }, [start, teardown])

  // Unmount (also route changes): stop the tracks synchronously so the recording indicator goes off at once.
  useLayoutEffect(
    () => () => {
      wanted.current = false
      teardown()
    },
    [teardown],
  )

  return { status, start, stop, setStatus, calibration, noisy: calibration?.noisy ?? false }
}

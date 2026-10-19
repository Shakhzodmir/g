import { useCallback, useEffect, useRef, useState } from 'react'
import { analyzeFrame, type AudioFeatures } from './audioFeatures'
import { estimateFloor } from './blowDetector'

/*
 * Microphone for the warm-ups. Started only after a tap (AudioContext needs a user gesture),
 * processed only on this device: nothing is recorded, stored or sent.
 * Browser processing is switched off so a blow is not "cleaned away" as noise.
 */

export type MicStatus = 'idle' | 'asking' | 'calibrating' | 'running' | 'denied' | 'unavailable'

export interface MicFrame extends AudioFeatures {
  /** ms timestamp (performance.now). */
  t: number
  /** ms since the previous frame. */
  dt: number
}

export const CALIBRATION_MS = 1500
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

export function useMic(onFrame: (f: MicFrame) => void, onCalibrated?: (floor: number) => void) {
  const [status, setStatus] = useState<MicStatus>('idle')
  const frameCb = useRef(onFrame)
  const calCb = useRef(onCalibrated)
  useEffect(() => {
    frameCb.current = onFrame
    calCb.current = onCalibrated
  })
  const live = useRef<{ stream: MediaStream; ctx: AudioContext; raf: number } | null>(null)
  const token = useRef(0)

  const stop = useCallback(() => {
    token.current++
    const l = live.current
    live.current = null
    if (!l) return
    setStatus('idle')
    cancelAnimationFrame(l.raf)
    l.stream.getTracks().forEach((t) => t.stop())
    void l.ctx.close().catch(() => undefined)
  }, [])

  const start = useCallback(async () => {
    stop()
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
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0
    source.connect(analyser) // never connected to the speakers: no echo, no feedback
    const buf = new Float32Array(analyser.fftSize)
    const calibration: number[] = []
    const t0 = performance.now()
    let last = t0
    let calibrated = false
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
        calibration.push(f.rms)
        if (now - t0 >= CALIBRATION_MS) {
          calibrated = true
          calCb.current?.(estimateFloor(calibration))
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
        stop()
        setStatus('unavailable')
      }
    })
  }, [stop])

  useEffect(() => stop, [stop])

  return { status, start, stop, setStatus }
}

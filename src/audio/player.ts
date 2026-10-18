/**
 * Single shared audio pipeline: <audio> → MediaElementSource → Analyser → destination.
 * The analyser drives the mascot's beak (speech level 0..1).
 */
type LevelListener = (level: number) => void

const listeners = new Set<LevelListener>()
let ctx: AudioContext | null = null
let analyser: AnalyserNode | null = null
let current: HTMLAudioElement | null = null
let raf = 0

export function onLevel(cb: LevelListener): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function emitLevel(level: number): void {
  listeners.forEach((l) => l(level))
}

/** Creates/resumes the AudioContext; call from a user gesture (autoplay policies). */
export function audioContext(): AudioContext | null {
  const AC = globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) {
    try {
      ctx = new AC()
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined)
  return ctx
}

function trackLevel() {
  if (!analyser) return
  const buf = new Uint8Array(analyser.fftSize)
  const loop = () => {
    if (!analyser || !current || current.paused) {
      emitLevel(0)
      return
    }
    analyser.getByteTimeDomainData(buf)
    let sum = 0
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128
      sum += v * v
    }
    emitLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4))
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
}

export function stopPlayback(): void {
  cancelAnimationFrame(raf)
  if (current) {
    current.pause()
    current.src = ''
    current = null
  }
  emitLevel(0)
}

/** Plays a URL (clip or recording object URL). Resolves when finished; rejects if it cannot play. */
export function playUrl(url: string, opts: { volume?: number; rate?: number } = {}): Promise<void> {
  stopPlayback()
  return new Promise((resolve, reject) => {
    const el = new Audio()
    el.crossOrigin = 'anonymous'
    el.preload = 'auto'
    el.src = url
    el.volume = Math.max(0, Math.min(1, opts.volume ?? 1))
    el.playbackRate = opts.rate ?? 1
    ;(el as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true
    current = el
    const c = audioContext()
    if (c) {
      try {
        const src = c.createMediaElementSource(el)
        analyser = c.createAnalyser()
        analyser.fftSize = 512
        src.connect(analyser)
        analyser.connect(c.destination)
      } catch {
        analyser = null
      }
    }
    el.onended = () => {
      if (current === el) current = null
      emitLevel(0)
      resolve()
    }
    el.onerror = () => {
      if (current === el) current = null
      emitLevel(0)
      reject(new Error(`cannot play ${url}`))
    }
    el.play()
      .then(() => trackLevel())
      .catch((e: unknown) => {
        if (current === el) current = null
        reject(e instanceof Error ? e : new Error(String(e)))
      })
  })
}

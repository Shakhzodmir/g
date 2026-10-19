import { effectiveSensory } from '../lib/sensory'
import { getProfile } from '../store/profile'
import { audioContext } from './player'

export type Sfx = 'tap' | 'pop' | 'chime' | 'soft' | 'whoosh'

// Soft synthesized sounds (no files): low volume, no sharp attacks, nothing that could startle.
const SHAPES: Record<Sfx, Array<{ f: number; t: number; d: number; type?: OscillatorType }>> = {
  tap: [{ f: 520, t: 0, d: 0.06, type: 'sine' }],
  pop: [{ f: 660, t: 0, d: 0.09, type: 'sine' }, { f: 880, t: 0.05, d: 0.08, type: 'sine' }],
  chime: [{ f: 523.25, t: 0, d: 0.35 }, { f: 659.25, t: 0.12, d: 0.35 }, { f: 783.99, t: 0.24, d: 0.5 }],
  soft: [{ f: 392, t: 0, d: 0.4 }, { f: 523.25, t: 0.15, d: 0.5 }],
  whoosh: [{ f: 300, t: 0, d: 0.25, type: 'triangle' }],
}

export function playSfx(name: Sfx): void {
  const p = getProfile()
  // prefers-reduced-motion counts as the calm level: no effects except the gentle 'soft' one.
  if (effectiveSensory(p.sensory) === 'calm' && name !== 'soft') return
  const vol = p.voice.sfxVolume
  if (vol <= 0) return
  const ctx = audioContext()
  if (!ctx) return
  const now = ctx.currentTime
  for (const n of SHAPES[name]) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = n.type ?? 'sine'
    osc.frequency.value = n.f
    const peak = 0.12 * vol
    gain.gain.setValueAtTime(0.0001, now + n.t)
    gain.gain.exponentialRampToValueAtTime(peak, now + n.t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now + n.t)
    osc.stop(now + n.t + n.d + 0.05)
  }
}

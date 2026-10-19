/* Deterministic synthetic signals for the sensor unit tests. */

export const SR = 48000
export const FRAME = 2048
/** Duration of one analysis frame in ms. */
export const FRAME_MS = (FRAME / SR) * 1000

export function prng(seed = 1): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** White noise passed through a one-pole low-pass: broadband "wind" with low-frequency weight. */
export function lowNoise(samples: number, amp = 0.3, cutoffHz = 600, seed = 7): Float32Array {
  const rnd = prng(seed)
  const out = new Float32Array(samples)
  const a = Math.exp((-2 * Math.PI * cutoffHz) / SR)
  let y = 0
  for (let i = 0; i < samples; i++) {
    y = (1 - a) * (rnd() * 2 - 1) + a * y
    out[i] = y
  }
  // normalise to the requested RMS-ish amplitude
  let s = 0
  for (let i = 0; i < samples; i++) s += out[i] * out[i]
  const k = amp / Math.sqrt(s / samples || 1)
  for (let i = 0; i < samples; i++) out[i] *= k
  return out
}

export function whiteNoise(samples: number, amp = 0.001, seed = 3): Float32Array {
  const rnd = prng(seed)
  const out = new Float32Array(samples)
  for (let i = 0; i < samples; i++) out[i] = (rnd() * 2 - 1) * amp * Math.SQRT2 * 1.22
  return out
}

export function sine(samples: number, hz = 440, amp = 0.3, offset = 0): Float32Array {
  const out = new Float32Array(samples)
  for (let i = 0; i < samples; i++) out[i] = amp * Math.sin((2 * Math.PI * hz * (i + offset)) / SR)
  return out
}

/** Voiced "a-a-a"-like tone: f0 with decaying harmonics. */
export function voiced(samples: number, f0 = 220, amp = 0.3): Float32Array {
  const out = new Float32Array(samples)
  for (let h = 1; h <= 12; h++) {
    const g = amp / h
    for (let i = 0; i < samples; i++) out[i] += g * Math.sin((2 * Math.PI * f0 * h * i) / SR)
  }
  return out
}

export function add(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(a.length)
  for (let i = 0; i < a.length; i++) out[i] = a[i] + (b[i] ?? 0)
  return out
}

/** Splits a long signal into consecutive analysis frames. */
export function frames(x: Float32Array, size = FRAME): Float32Array[] {
  const out: Float32Array[] = []
  for (let i = 0; i + size <= x.length; i += size) out.push(x.subarray(i, i + size))
  return out
}

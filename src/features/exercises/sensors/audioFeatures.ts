/*
 * Pure audio features for the microphone warm-ups (no Web Audio here, so they are unit-tested with
 * synthetic signals). The live code feeds them `AnalyserNode.getFloatTimeDomainData()` frames.
 */

/** Root mean square of a time-domain frame (−1..1 samples). */
export function rms(x: ArrayLike<number>): number {
  const n = x.length
  if (!n) return 0
  let s = 0
  for (let i = 0; i < n; i++) s += x[i] * x[i]
  return Math.sqrt(s / n)
}

const hannCache = new Map<number, Float32Array>()
function hann(n: number): Float32Array {
  let w = hannCache.get(n)
  if (!w) {
    w = new Float32Array(n)
    for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))
    hannCache.set(n, w)
  }
  return w
}

/** In-place iterative radix-2 FFT. `re.length` must be a power of two. */
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wr = Math.cos(ang)
    const wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1
      let ci = 0
      for (let k = 0; k < len / 2; k++) {
        const a = i + k
        const b = a + len / 2
        const tr = re[b] * cr - im[b] * ci
        const ti = re[b] * ci + im[b] * cr
        re[b] = re[a] - tr
        im[b] = im[a] - ti
        re[a] += tr
        im[a] += ti
        const nr = cr * wr - ci * wi
        ci = cr * wi + ci * wr
        cr = nr
      }
    }
  }
}

function largestPow2(n: number): number {
  let p = 1
  while (p * 2 <= n) p *= 2
  return p
}

/** Hann-windowed power spectrum, bins 0..N/2 (N = largest power of two ≤ frame length). */
export function powerSpectrum(x: ArrayLike<number>): Float64Array {
  const n = largestPow2(x.length)
  const w = hann(n)
  const re = new Float64Array(n)
  const im = new Float64Array(n)
  for (let i = 0; i < n; i++) re[i] = x[i] * w[i]
  fft(re, im)
  const out = new Float64Array(n / 2 + 1)
  for (let k = 0; k <= n / 2; k++) out[k] = re[k] * re[k] + im[k] * im[k]
  return out
}

function binOf(hz: number, sampleRate: number, bins: number): number {
  const fftSize = (bins - 1) * 2
  return Math.max(1, Math.min(bins - 1, Math.round((hz * fftSize) / sampleRate)))
}

/**
 * Share of spectral energy below `cutoffHz` (DC excluded). Blowing into a microphone is mostly
 * low-frequency wind rumble; speech and whistles carry much more energy higher up.
 */
export function lowBandRatio(power: Float64Array, sampleRate: number, cutoffHz = 1000): number {
  const cut = binOf(cutoffHz, sampleRate, power.length)
  let low = 0
  let total = 0
  for (let k = 1; k < power.length; k++) {
    total += power[k]
    if (k <= cut) low += power[k]
  }
  return total > 0 ? low / total : 0
}

/**
 * Spectral flatness (geometric mean / arithmetic mean of power) inside [loHz, hiHz]:
 * close to 1 for noise (blowing), close to 0 for tones and voiced sounds.
 */
export function spectralFlatness(power: Float64Array, sampleRate: number, loHz = 60, hiHz = 1500): number {
  const a = binOf(loHz, sampleRate, power.length)
  const b = binOf(hiHz, sampleRate, power.length)
  let logSum = 0
  let sum = 0
  let n = 0
  for (let k = a; k <= b; k++) {
    const p = power[k] + 1e-20
    logSum += Math.log(p)
    sum += p
    n++
  }
  if (!n || sum <= 1e-18) return 0
  return Math.exp(logSum / n) / (sum / n)
}

export interface AudioFeatures {
  rms: number
  lowRatio: number
  flatness: number
}

export function analyzeFrame(x: ArrayLike<number>, sampleRate: number): AudioFeatures {
  const p = powerSpectrum(x)
  return { rms: rms(x), lowRatio: lowBandRatio(p, sampleRate), flatness: spectralFlatness(p, sampleRate) }
}

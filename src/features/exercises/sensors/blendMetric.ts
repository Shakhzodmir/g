import type { BlendMetric } from '../../../content/types'

/* Turns MediaPipe face blendshapes into one number per exercise and compares it with the child's neutral face. */

export interface BlendCategory {
  categoryName: string
  score: number
}

/** Value of the exercise metric for one frame, or null when the face/blendshapes are missing. */
export function metricValue(metric: BlendMetric, categories: BlendCategory[] | undefined): number | null {
  if (!metric || !categories?.length) return null
  const get = (name: string) => categories.find((c) => c.categoryName === name)?.score
  if (metric.kind === 'single') return get(metric.name) ?? null
  const vals = metric.names.map(get).filter((v): v is number => typeof v === 'number')
  if (!vals.length) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

/** Neutral baseline: mean of the calibration frames (missing frames are skipped). */
export function baselineOf(values: Array<number | null>): number {
  const v = values.filter((x): x is number => typeof x === 'number')
  if (!v.length) return 0
  return v.reduce((a, b) => a + b, 0) / v.length
}

/** Is the pose shown? Value must rise above the neutral face by at least `threshold`. */
export function poseActive(value: number | null, baseline: number, threshold: number): boolean {
  return value !== null && value - baseline >= threshold
}

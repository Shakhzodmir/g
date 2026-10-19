import { useEffect, useState } from 'react'

export const MAX_PHOTO_PX = 512

/** Scales (w, h) down so the longer side is at most `max`, keeping the aspect ratio. Never upscales. */
export function fitWithin(w: number, h: number, max = MAX_PHOTO_PX): { width: number; height: number } {
  if (w <= 0 || h <= 0) return { width: 0, height: 0 }
  const k = Math.min(1, max / Math.max(w, h))
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) }
}

/** Widest/tallest frame a card photo keeps: a 4:3 landscape or 3:4 portrait. Anything more extreme is centre-cropped. */
export const MAX_ASPECT = 4 / 3

/** Source rectangle (centre crop) so the result is never more extreme than 4:3 / 3:4. Normal photos are returned whole. */
export function cropFrame(w: number, h: number, maxAspect = MAX_ASPECT): { sx: number; sy: number; sw: number; sh: number } {
  if (w <= 0 || h <= 0) return { sx: 0, sy: 0, sw: Math.max(0, w), sh: Math.max(0, h) }
  if (w / h > maxAspect) {
    const sw = Math.round(h * maxAspect)
    return { sx: Math.round((w - sw) / 2), sy: 0, sw, sh: h }
  }
  if (h / w > maxAspect) {
    const sh = Math.round(w * maxAspect)
    return { sx: 0, sy: Math.round((h - sh) / 2), sw: w, sh }
  }
  return { sx: 0, sy: 0, sw: w, sh: h }
}

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() }
    } catch {
      /* fall back to <img> (older Safari, HEIC handled by the OS picker) */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) }
  } catch (e) {
    URL.revokeObjectURL(url)
    throw e
  }
}

/** Centre-crops extreme shapes, downscales to ≤512 px and re-encodes as JPEG (white behind transparency). Runs locally. */
export async function resizePhoto(file: Blob, max = MAX_PHOTO_PX, quality = 0.85): Promise<Blob> {
  const img = await decode(file)
  try {
    // Centre-crop extreme shapes (panoramas, tall strips) to a usable frame; EXIF rotation is already applied by decode().
    const crop = cropFrame(img.width, img.height)
    const { width, height } = fitWithin(crop.sw, crop.sh, max)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no canvas')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, width, height)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img.source, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, width, height)
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', quality))
  } finally {
    img.close()
  }
}

/** Object URL for a blob that is revoked when the blob changes or the component unmounts. */
export function useObjectUrl(blob: Blob | null | undefined): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob || typeof blob.size !== 'number') {
      setUrl(undefined)
      return
    }
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

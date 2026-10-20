import type { FaceLandmarker } from '@mediapipe/tasks-vision'
import type { BlendCategory } from './blendMetric'

/*
 * Front camera + MediaPipe Face Landmarker for "Oyna". Everything runs in the browser:
 * the video is only drawn on screen and analysed frame by frame — never recorded or uploaded.
 * The module (wasm + model, ~15 MB) is loaded lazily, only when an exercise with a camera metric starts. It ships WITH
 * the app (public/mediapipe, see scripts/fetch-mediapipe.mjs) and is cached by the service worker ('mediapipe',
 * CacheFirst), so the exercise works offline and nothing is requested from a third party. The CDN is only a fallback
 * for a build that lacks the local files.
 */

export const MP_VERSION = '1.0.1'
/** Self-hosted copies, resolved against the page so they work under any sub-path. */
export const LOCAL_WASM_URL = (): string => new URL(`${import.meta.env.BASE_URL}mediapipe/wasm`, document.baseURI).href
export const LOCAL_MODEL_URL = (): string => new URL(`${import.meta.env.BASE_URL}mediapipe/face_landmarker.task`, document.baseURI).href
/** CDN fallback (used only when the local files cannot be loaded). */
export const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`
export const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

export const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15, max: 30 } },
}

let landmarker: Promise<FaceLandmarker> | null = null

export function loadFaceLandmarker(): Promise<FaceLandmarker> {
  if (!landmarker) {
    landmarker = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
      const create = async (wasmUrl: string, modelUrl: string): Promise<FaceLandmarker> => {
        const fileset = await FilesetResolver.forVisionTasks(wasmUrl)
        const options = (delegate: 'GPU' | 'CPU') => ({
          baseOptions: { modelAssetPath: modelUrl, delegate },
          runningMode: 'VIDEO' as const,
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: false,
        })
        try {
          return await FaceLandmarker.createFromOptions(fileset, options('GPU'))
        } catch {
          return await FaceLandmarker.createFromOptions(fileset, options('CPU'))
        }
      }
      try {
        return await create(LOCAL_WASM_URL(), LOCAL_MODEL_URL())
      } catch {
        return await create(WASM_URL, MODEL_URL)
      }
    })()
    // Let a later attempt retry (e.g. the first one failed offline).
    landmarker.catch(() => {
      landmarker = null
    })
  }
  return landmarker
}

/** Blendshapes of the first face in the current video frame, or undefined (no face). */
export function detectBlendshapes(lm: FaceLandmarker, video: HTMLVideoElement, tMs: number): BlendCategory[] | undefined {
  if (video.readyState < 2 || !video.videoWidth) return undefined
  const res = lm.detectForVideo(video, tMs)
  return res.faceBlendshapes?.[0]?.categories
}

export async function openFrontCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('unsupported'), { name: 'NotFoundError' })
  return navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS)
}

export function stopStream(s: MediaStream | null | undefined): void {
  s?.getTracks().forEach((t) => t.stop())
}

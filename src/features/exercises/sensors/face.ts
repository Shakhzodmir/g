import type { FaceLandmarker } from '@mediapipe/tasks-vision'
import type { BlendCategory } from './blendMetric'

/*
 * Front camera + MediaPipe Face Landmarker for "Oyna". Everything runs in the browser:
 * the video is only drawn on screen and analysed frame by frame — never recorded or uploaded.
 * The ~7 MB module is loaded lazily, only when an exercise with a camera metric starts.
 */

export const MP_VERSION = '1.0.1'
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
      const fileset = await FilesetResolver.forVisionTasks(WASM_URL)
      const options = (delegate: 'GPU' | 'CPU') => ({
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
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

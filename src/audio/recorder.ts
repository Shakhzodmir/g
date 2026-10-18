import type { AudioKey } from '../content/types'
import type { SpeechLang } from '../i18n/types'
import { db, dbAvailable } from '../store/db'
import { getProfile } from '../store/profile'
import { recordingId } from './speech'

export const MAX_RECORDING_MS = 10_000

function pickMime(): string {
  const options = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus']
  const MR = globalThis.MediaRecorder
  return options.find((m) => MR?.isTypeSupported?.(m)) ?? ''
}

export type RecorderError = 'unsupported' | 'denied' | 'unavailable'

export interface ActiveRecording {
  stop: () => Promise<Blob>
  cancel: () => void
}

/** Starts recording from the microphone (stops automatically after 10 s). */
export async function startRecording(): Promise<ActiveRecording> {
  if (!navigator.mediaDevices?.getUserMedia || !globalThis.MediaRecorder) throw Object.assign(new Error('unsupported'), { code: 'unsupported' as RecorderError })
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
  } catch (e) {
    const name = (e as DOMException)?.name
    throw Object.assign(new Error(name || 'unavailable'), { code: (name === 'NotAllowedError' ? 'denied' : 'unavailable') as RecorderError })
  }
  const mime = pickMime()
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
  const chunks: BlobPart[] = []
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  const finished = new Promise<Blob>((resolve) => {
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      resolve(new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' }))
    }
  })
  rec.start()
  const auto = setTimeout(() => rec.state !== 'inactive' && rec.stop(), MAX_RECORDING_MS)
  return {
    stop: () => {
      clearTimeout(auto)
      if (rec.state !== 'inactive') rec.stop()
      return finished
    },
    cancel: () => {
      clearTimeout(auto)
      if (rec.state !== 'inactive') rec.stop()
    },
  }
}

/** Stores a recording so speak() prefers it for this key and language. */
export async function saveRecording(key: AudioKey, lang: SpeechLang, blob: Blob): Promise<boolean> {
  if (!(await dbAvailable())) return false
  const profileId = getProfile().id
  try {
    await db.recordings.put({ id: recordingId(profileId, key, lang), profileId, targetKey: key, lang, blob, mime: blob.type, createdAt: Date.now() })
    return true
  } catch {
    return false
  }
}

export async function deleteRecording(key: AudioKey, lang: SpeechLang): Promise<void> {
  if (!(await dbAvailable())) return
  await db.recordings.delete(recordingId(getProfile().id, key, lang)).catch(() => undefined)
}

export async function hasRecording(key: AudioKey, lang: SpeechLang): Promise<boolean> {
  if (!(await dbAvailable())) return false
  return !!(await db.recordings.get(recordingId(getProfile().id, key, lang)).catch(() => undefined))
}

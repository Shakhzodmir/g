import { Mic, Play, Square, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { playUrl, stopPlayback } from '../../audio/player'
import { MAX_RECORDING_MS, startRecording, type ActiveRecording, type RecorderError } from '../../audio/recorder'
import { COMMON } from '../../i18n/common'
import { useStrings } from '../../i18n'
import { useProfileStore } from '../../store/profile'
import { Button } from '../../ui/Button'
import styles from './parent.module.css'
import { useT } from './shared'

/** Records up to 10 s from the microphone into a draft blob; the parent decides when to save it. */
export function VoiceRecorder({ value, onChange }: { value: Blob | null; onChange: (b: Blob | null) => void }) {
  const t = useT()
  const tc = useStrings(COMMON)
  const volume = useProfileStore((s) => s.profile.voice.volume)
  const [rec, setRec] = useState<ActiveRecording | null>(null)
  const [startedAt, setStartedAt] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<RecorderError | null>(null)
  const active = useRef<ActiveRecording | null>(null)

  useEffect(
    () => () => {
      active.current?.cancel()
      stopPlayback()
    },
    [],
  )

  const finish = async (r: ActiveRecording) => {
    if (active.current !== r) return
    active.current = null
    setRec(null)
    const blob = await r.stop()
    if (blob.size > 0) onChange(blob)
  }

  useEffect(() => {
    if (!rec) return
    const iv = setInterval(() => {
      const ms = Date.now() - startedAt
      setElapsed(Math.min(MAX_RECORDING_MS, ms))
      if (ms >= MAX_RECORDING_MS) void finish(rec)
    }, 200)
    return () => clearInterval(iv)
  }, [rec, startedAt])

  const start = async () => {
    setError(null)
    stopPlayback()
    try {
      const r = await startRecording()
      active.current = r
      setStartedAt(Date.now())
      setElapsed(0)
      setRec(r)
    } catch (e) {
      setError((e as { code?: RecorderError }).code ?? 'unavailable')
    }
  }

  const play = () => {
    if (!value) return
    const url = URL.createObjectURL(value)
    void playUrl(url, { volume })
      .catch(() => undefined)
      .finally(() => URL.revokeObjectURL(url))
  }

  const secs = Math.floor(elapsed / 1000)
  const errorText = error === 'denied' ? t('recDenied') : error === 'unsupported' ? t('recUnsupported') : error ? t('recUnavailable') : null

  return (
    <div className={styles.recorder}>
      <p className={styles.hint}>{t('recHint')}</p>
      {rec ? (
        <>
          <div className={styles.meter} role="progressbar" aria-valuemin={0} aria-valuemax={10} aria-valuenow={secs} aria-label={t('recSeconds', { s: secs })}>
            <div className={styles.meterFill} style={{ width: `${(elapsed / MAX_RECORDING_MS) * 100}%` }} />
          </div>
          <div className={styles.spread}>
            <span aria-live="polite">{t('recSeconds', { s: secs })}</span>
            <Button variant="primary" icon={<Square />} onActivate={() => void finish(rec)}>
              {tc('stopRecording')}
            </Button>
          </div>
        </>
      ) : (
        <div className={styles.row}>
          <Button variant={value ? 'soft' : 'primary'} icon={<Mic />} onActivate={() => void start()}>
            {value ? tc('again') : t('recStart')}
          </Button>
          {value && (
            <>
              <Button variant="soft" icon={<Play />} onActivate={play}>
                {t('recPlay')}
              </Button>
              <Button variant="ghost" icon={<Trash2 />} onActivate={() => onChange(null)}>
                {t('recDelete')}
              </Button>
            </>
          )}
          {!value && <span className={styles.muted}>{t('recNone')}</span>}
        </div>
      )}
      {errorText && (
        <p className={styles.notice} role="status">
          {errorText}
        </p>
      )}
    </div>
  )
}

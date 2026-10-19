import { Camera, Check, ImageIcon, ImageOff } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { deleteRecording, saveRecording } from '../../audio/recorder'
import { recordingId } from '../../audio/speech'
import { TOPICS } from '../../content/topics'
import type { Fitz, TopicId } from '../../content/types'
import { COMMON } from '../../i18n/common'
import { normalizeUz } from '../../i18n/orthography'
import { useI18n, useStrings, type SpeechLang } from '../../i18n'
import { db, newId, type CustomCard } from '../../store/db'
import { useProfileStore } from '../../store/profile'
import { Button } from '../../ui/Button'
import { Segmented } from '../../ui/controls'
import { Dialog } from '../../ui/Dialog'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import { resizePhoto, useObjectUrl } from './image'
import styles from './parent.module.css'
import { FITZ, useT, useTk } from './shared'
import { VoiceRecorder } from './VoiceRecorder'

async function loadRecording(profileId: string, key: string, lang: SpeechLang): Promise<Blob | null> {
  try {
    return (await db.recordings.get(recordingId(profileId, key, lang)))?.blob ?? null
  } catch {
    return null
  }
}

/** Loads the saved recording for (key, lang) as an editable draft and saves only what changed. */
export function useVoiceDraft(key: string | null, lang: SpeechLang) {
  const pid = useProfileStore((s) => s.profile.id)
  const [saved, setSaved] = useState<Blob | null>(null)
  const [draft, setDraft] = useState<Blob | null>(null)
  useEffect(() => {
    let alive = true
    setSaved(null)
    setDraft(null)
    if (!key) return
    void loadRecording(pid, key, lang).then((b) => {
      if (!alive) return
      setSaved(b)
      setDraft(b)
    })
    return () => {
      alive = false
    }
  }, [pid, key, lang])
  const commit = async (finalKey = key) => {
    if (!finalKey || draft === saved) return true
    if (!draft) {
      await deleteRecording(finalKey, lang)
      return true
    }
    return saveRecording(finalKey, lang, draft)
  }
  return { saved, draft, setDraft, commit, dirty: draft !== saved }
}

export function LangPicker({ value, onChange }: { value: SpeechLang; onChange: (l: SpeechLang) => void }) {
  const t = useT()
  return (
    <Segmented
      label={t('recLang')}
      value={value}
      onChange={onChange}
      options={[
        { value: 'uz', label: t('langUz') },
        { value: 'ru', label: t('langRu') },
      ]}
    />
  )
}

/** Add / edit a custom card: labels uz+ru, photo (≤512 px JPEG), own voice (≤10 s), topic and colour. */
export function CardEditor({ open, card, defaultTopic, onClose }: { open: boolean; card: CustomCard | null; defaultTopic: TopicId; onClose: () => void }) {
  const t = useT()
  const tk = useTk()
  const tc = useStrings(COMMON)
  const { ui } = useI18n()
  const pid = useProfileStore((s) => s.profile.id)
  const speechLang = useProfileStore((s) => s.profile.speechLang)
  const uid = useId()
  const [id, setId] = useState(() => card?.id ?? newId())
  const [uz, setUz] = useState('')
  const [ru, setRu] = useState('')
  const [topic, setTopic] = useState<TopicId>(defaultTopic)
  const [fitz, setFitz] = useState<Fitz>('thing')
  const [image, setImage] = useState<Blob | null>(null)
  const [photoError, setPhotoError] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [voiceLang, setVoiceLang] = useState<SpeechLang>(speechLang)
  const [busy, setBusy] = useState(false)
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const voice = useVoiceDraft(open ? `c.${id}` : null, voiceLang)
  const photoUrl = useObjectUrl(image)

  useEffect(() => {
    if (!open) return
    const firstTopic = card?.topic ?? defaultTopic
    setId(card?.id ?? newId())
    setUz(card?.uz ?? '')
    setRu(card?.ru ?? '')
    setTopic(firstTopic)
    setFitz(card?.fitz ?? TOPICS.find((x) => x.id === firstTopic)?.fitz ?? 'thing')
    setImage(card?.image ?? null)
    setPhotoError(false)
    setSaveError(false)
    setVoiceLang(speechLang)
  }, [open, card, defaultTopic, speechLang])

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setPhotoError(false)
    try {
      setImage(await resizePhoto(file))
    } catch {
      setPhotoError(true)
    }
  }

  const canSave = (uz.trim() || ru.trim()) && !busy

  const save = async () => {
    if (!canSave) return
    setBusy(true)
    setSaveError(false)
    const row: CustomCard = {
      id,
      profileId: pid,
      topic,
      fitz,
      uz: normalizeUz(uz.trim()),
      ru: ru.trim(),
      image,
      symbol: image ? undefined : (card?.symbol ?? TOPICS.find((x) => x.id === topic)?.symbol),
      hidden: card?.hidden ?? false,
      createdAt: card?.createdAt ?? Date.now(),
    }
    try {
      await db.cards.put(row)
      const ok = await voice.commit()
      if (!ok) throw new Error('voice')
      onClose()
    } catch {
      setSaveError(true)
    } finally {
      setBusy(false)
    }
  }

  const cancel = () => {
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={cancel}
      title={card ? t('editCard') : t('newCard')}
      footer={
        <>
          <Button variant="ghost" onActivate={cancel}>
            {tc('cancel')}
          </Button>
          <Button onActivate={() => void save()} disabled={!canSave}>
            {tc('save')}
          </Button>
        </>
      }
    >
      <div className={styles.fields2}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t('labelUz')}</span>
          <input className={styles.input} value={uz} maxLength={40} autoComplete="off" lang="uz-Latn" onChange={(e) => setUz(e.target.value)} onBlur={() => setUz((v) => normalizeUz(v))} />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t('labelRu')}</span>
          <input className={styles.input} value={ru} maxLength={40} autoComplete="off" lang="ru" onChange={(e) => setRu(e.target.value)} />
        </label>
      </div>
      <p className={styles.hint}>{t('labelHint')}</p>

      <div className={styles.field}>
        <span className={styles.fieldLabel}>{t('photo')}</span>
        <div className={styles.photoBox}>
          {photoUrl ? (
            <img src={photoUrl} alt="" className={styles.photoPreview} />
          ) : (
            <SymbolImg id={TOPICS.find((x) => x.id === topic)?.symbol ?? 'framed_picture'} className={styles.photoPreview} />
          )}
          <div className={styles.row}>
            <Button variant="soft" icon={<Camera />} onActivate={() => camera.current?.click()}>
              {t('takePhoto')}
            </Button>
            <Button variant="soft" icon={<ImageIcon />} onActivate={() => gallery.current?.click()}>
              {t('pickPhoto')}
            </Button>
            {image && (
              <Button variant="ghost" icon={<ImageOff />} onActivate={() => setImage(null)}>
                {t('removePhoto')}
              </Button>
            )}
          </div>
        </div>
        <input
          ref={camera}
          className={styles.fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            void onFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <input
          ref={gallery}
          className={styles.fileInput}
          type="file"
          accept="image/*"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            void onFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        {photoError && <p className={styles.notice}>{t('photoError')}</p>}
      </div>

      <div className={styles.field}>
        <span className={styles.fieldLabel}>{t('voice')}</span>
        <LangPicker value={voiceLang} onChange={setVoiceLang} />
        <VoiceRecorder value={voice.draft} onChange={voice.setDraft} />
      </div>

      <label className={styles.field} htmlFor={`${uid}-topic`}>
        <span className={styles.fieldLabel}>{t('topic')}</span>
        <select id={`${uid}-topic`} className={styles.input} value={topic} onChange={(e) => setTopic(e.target.value as TopicId)}>
          {TOPICS.map((tp) => (
            <option key={tp.id} value={tp.id}>
              {ui(tp)}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.field} role="group" aria-labelledby={`${uid}-fitz`}>
        <span className={styles.fieldLabel} id={`${uid}-fitz`}>
          {t('colour')}
        </span>
        <ul className={styles.chips}>
          {FITZ.map((f) => (
            <li key={f}>
              <Pressable
                className={styles.fitzChip}
                style={{ '--fitz-bg': `var(--fitz-${f}-bg)`, '--fitz-border': `var(--fitz-${f}-border)` } as React.CSSProperties}
                label={tk(`fitz_${f}`)}
                pressed={fitz === f}
                onActivate={() => setFitz(f)}
              >
                {fitz === f && <Check aria-hidden="true" />}
                <span>{tk(`fitz_${f}`)}</span>
              </Pressable>
            </li>
          ))}
        </ul>
      </div>
      {saveError && <p className={styles.notice}>{t('saveFailed')}</p>}
    </Dialog>
  )
}

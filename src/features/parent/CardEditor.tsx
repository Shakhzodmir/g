import { Camera, Check, ImageIcon, ImageOff } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { deleteRecording, saveRecording } from '../../audio/recorder'
import { recordingId } from '../../audio/speech'
import { TOPICS } from '../../content/topics'
import type { Fitz, TopicId } from '../../content/types'
import { COMMON } from '../../i18n/common'
import { normalizeUz, uzCyrlToLatn } from '../../i18n/orthography'
import { useI18n, useStrings, type SpeechLang } from '../../i18n'
import { db, dbAvailable, newId, type CustomCard } from '../../store/db'
import { useProfileStore } from '../../store/profile'
import { Button } from '../../ui/Button'
import { Segmented } from '../../ui/controls'
import { Dialog } from '../../ui/Dialog'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import { resizePhoto, useObjectUrl } from './image'
import { cleanText, FITZ, MAX_LABEL_LEN, storageProblem } from './model'
import styles from './parent.module.css'
import { DiscardDialog, useT, useTk } from './shared'
import { VoiceRecorder } from './VoiceRecorder'

const LANGS: SpeechLang[] = ['uz', 'ru']

async function loadRecording(profileId: string, key: string, lang: SpeechLang): Promise<Blob | null> {
  try {
    return (await db.recordings.get(recordingId(profileId, key, lang)))?.blob ?? null
  } catch {
    return null
  }
}

type DraftPair = { saved: Blob | null; draft: Blob | null }
const EMPTY: Record<SpeechLang, DraftPair> = { uz: { saved: null, draft: null }, ru: { saved: null, draft: null } }

/**
 * One editable recording draft PER LANGUAGE for a target key. Switching the language in the picker keeps the
 * other language's unsaved recording; `commit()` writes (or deletes) only what changed.
 */
export function useVoiceDrafts(key: string | null) {
  const pid = useProfileStore((s) => s.profile.id)
  const [state, setState] = useState<Record<SpeechLang, DraftPair>>(EMPTY)
  useEffect(() => {
    let alive = true
    setState(EMPTY)
    if (!key) return
    void Promise.all(LANGS.map((l) => loadRecording(pid, key, l))).then(([uz, ru]) => {
      if (alive) setState({ uz: { saved: uz, draft: uz }, ru: { saved: ru, draft: ru } })
    })
    return () => {
      alive = false
    }
  }, [pid, key])
  const setDraft = useCallback((lang: SpeechLang, blob: Blob | null) => setState((s) => ({ ...s, [lang]: { ...s[lang], draft: blob } })), [])
  const dirty = LANGS.some((l) => state[l].draft !== state[l].saved)
  const commit = async (finalKey = key) => {
    if (!finalKey) return true
    let ok = true
    for (const lang of LANGS) {
      const { saved, draft } = state[lang]
      if (draft === saved) continue
      if (!draft) await deleteRecording(finalKey, lang)
      else if (!(await saveRecording(finalKey, lang, draft))) ok = false
    }
    return ok
  }
  return { state, setDraft, commit, dirty }
}

export function LangPicker({ value, onChange, has }: { value: SpeechLang; onChange: (l: SpeechLang) => void; has?: Partial<Record<SpeechLang, boolean>> }) {
  const t = useT()
  return (
    <Segmented
      label={t('recLang')}
      value={value}
      onChange={onChange}
      options={[
        { value: 'uz', label: `${t('langUz')}${has?.uz ? ' ●' : ''}` },
        { value: 'ru', label: `${t('langRu')}${has?.ru ? ' ●' : ''}` },
      ]}
    />
  )
}

const topicFitz = (topic: TopicId): Fitz => TOPICS.find((x) => x.id === topic)?.fitz ?? 'thing'

/**
 * What gets stored for the two labels. At least one must be filled; Cyrillic Uzbek typed in the uz field becomes
 * canonical Latin; an empty label is filled with the same text, so the card is never blank in the other language.
 */
export function finalLabels(uzRaw: string, ruRaw: string): { uz: string; ru: string } | null {
  const uzTyped = cleanText(uzRaw, MAX_LABEL_LEN)
  const ru = cleanText(ruRaw, MAX_LABEL_LEN)
  const uz = uzTyped ? normalizeUz(uzCyrlToLatn(uzTyped)) : ''
  if (!uz && !ru) return null
  return { uz: uz || ru, ru: ru || uz }
}

/** Add / edit a custom card: labels uz+ru, photo (centre-cropped, ≤512 px JPEG), own voice (≤10 s per language), topic and colour. */
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
  const [fitzPicked, setFitzPicked] = useState(false)
  const [image, setImage] = useState<Blob | null>(null)
  const [photoError, setPhotoError] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [voiceLang, setVoiceLang] = useState<SpeechLang>(speechLang)
  const [busy, setBusy] = useState(false)
  const [tried, setTried] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const initial = useRef('')
  const initialImage = useRef<Blob | null>(null)
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const voice = useVoiceDrafts(open ? `c.${id}` : null)
  const photoUrl = useObjectUrl(image)

  useEffect(() => {
    if (!open) return
    const firstTopic = card?.topic ?? defaultTopic
    const firstFitz = card?.fitz ?? topicFitz(firstTopic)
    setId(card?.id ?? newId())
    setUz(card?.uz ?? '')
    setRu(card?.ru ?? '')
    setTopic(firstTopic)
    setFitz(firstFitz)
    // An existing card keeps its colour; a new one follows the topic until the person picks a colour.
    setFitzPicked(!!card && card.fitz !== topicFitz(firstTopic))
    setImage(card?.image ?? null)
    initialImage.current = card?.image ?? null
    initial.current = JSON.stringify([card?.uz ?? '', card?.ru ?? '', firstTopic, firstFitz])
    setPhotoError(false)
    setSaveError(null)
    setTried(false)
    setConfirmClose(false)
    setVoiceLang(speechLang)
  }, [open, card, defaultTopic, speechLang])

  const dirty = useMemo(
    () => open && (JSON.stringify([uz, ru, topic, fitz]) !== initial.current || image !== initialImage.current || voice.dirty),
    [open, uz, ru, topic, fitz, image, voice.dirty],
  )

  const requestClose = () => {
    if (busy) return
    if (dirty) setConfirmClose(true)
    else onClose()
  }

  const onTopic = (next: TopicId) => {
    setTopic(next)
    if (!fitzPicked) setFitz(topicFitz(next))
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setPhotoError(false)
    try {
      setImage(await resizePhoto(file))
    } catch {
      setPhotoError(true)
    }
  }

  const labels = finalLabels(uz, ru)
  const labelMissing = labels === null

  const save = async () => {
    setTried(true)
    if (!labels || busy) return
    setBusy(true)
    setSaveError(null)
    const row: CustomCard = {
      id,
      profileId: pid,
      topic,
      fitz,
      uz: labels.uz,
      ru: labels.ru,
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
    } catch (e) {
      const p = storageProblem(e, await dbAvailable())
      setSaveError(p === 'unavailable' ? t('storageUnavailable') : p === 'quota' ? t('saveFailedQuota') : t('saveFailed'))
    } finally {
      setBusy(false)
    }
  }

  const has = { uz: !!voice.state.uz.draft, ru: !!voice.state.ru.draft }

  return (
    <>
      <Dialog
        open={open}
        // While the "unsaved changes" question is up, Escape/scrim act on that question only.
        onClose={confirmClose ? () => undefined : requestClose}
        title={card ? t('editCard') : t('newCard')}
        footer={
          <>
            <Button variant="ghost" onActivate={requestClose}>
              {tc('cancel')}
            </Button>
            <Button onActivate={() => void save()} disabled={busy}>
              {tc('save')}
            </Button>
          </>
        }
      >
        <div className={styles.fields2}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t('labelUz')}</span>
            <input
              className={styles.input}
              value={uz}
              maxLength={MAX_LABEL_LEN}
              autoComplete="off"
              lang="uz"
              onChange={(e) => setUz(e.target.value)}
              onBlur={() => setUz((v) => (v.trim() ? normalizeUz(uzCyrlToLatn(cleanText(v, MAX_LABEL_LEN))) : ''))}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t('labelRu')}</span>
            <input className={styles.input} value={ru} maxLength={MAX_LABEL_LEN} autoComplete="off" lang="ru" onChange={(e) => setRu(e.target.value)} />
          </label>
        </div>
        <p className={tried && labelMissing ? styles.errorText : styles.hint} role={tried && labelMissing ? 'alert' : undefined}>
          {tried && labelMissing ? t('labelNeeded') : t('labelHint')}
        </p>

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
            data-testid="card-photo"
            onChange={(e) => {
              void onFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          {photoError && <p className={styles.notice}>{t('photoError')}</p>}
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t('voice')}</span>
          <LangPicker value={voiceLang} onChange={setVoiceLang} has={has} />
          <VoiceRecorder key={voiceLang} value={voice.state[voiceLang].draft} onChange={(b) => voice.setDraft(voiceLang, b)} />
        </div>

        <label className={styles.field} htmlFor={`${uid}-topic`}>
          <span className={styles.fieldLabel}>{t('topic')}</span>
          <select id={`${uid}-topic`} className={styles.input} value={topic} onChange={(e) => onTopic(e.target.value as TopicId)}>
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
                  onActivate={() => {
                    setFitz(f)
                    setFitzPicked(true)
                  }}
                >
                  {fitz === f && <Check aria-hidden="true" />}
                  <span>{tk(`fitz_${f}`)}</span>
                </Pressable>
              </li>
            ))}
          </ul>
        </div>
        {saveError && <p className={styles.notice}>{saveError}</p>}
      </Dialog>
      <DiscardDialog
        open={confirmClose}
        onKeep={() => setConfirmClose(false)}
        onDiscard={() => {
          setConfirmClose(false)
          onClose()
        }}
      />
    </>
  )
}

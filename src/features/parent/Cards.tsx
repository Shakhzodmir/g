import { Eye, EyeOff, Mic, Pencil, Plus, Trash2, Volume2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { deleteRecording } from '../../audio/recorder'
import { speak } from '../../audio/speech'
import type { TopicId, Word } from '../../content/types'
import { wordsByTopic } from '../../content/vocab'
import { shy } from '../../lib/hyphenate'
import { COMMON } from '../../i18n/common'
import { renderBi, useI18n, useLabel, useStrings, type Bi, type SpeechLang } from '../../i18n'
import { db, type CustomCard } from '../../store/db'
import { useProfileStore } from '../../store/profile'
import { Button } from '../../ui/Button'
import { Segmented } from '../../ui/controls'
import { Dialog } from '../../ui/Dialog'
import { Page } from '../../ui/Page'
import { PageHeader } from '../../ui/PageHeader'
import { CardEditor, LangPicker, useVoiceDrafts } from './CardEditor'
import { useObjectUrl } from './image'
import styles from './parent.module.css'
import { ConfirmDialog, DiscardDialog, Section, StorageBanner, TopicChips, useCustomCards, useT } from './shared'
import { VoiceRecorder } from './VoiceRecorder'
import { SymbolImg } from '../../ui/SymbolImg'

/** Keys (`${lang}:${targetKey}`) of the profile's own recordings, live. */
function useRecordingKeys(): Set<string> {
  const pid = useProfileStore((s) => s.profile.id)
  const ids = useLiveQuery(() => db.recordings.where('profileId').equals(pid).primaryKeys().catch(() => [] as string[]), [pid])
  return useMemo(() => new Set((ids ?? []).map((id) => String(id).slice(pid.length + 1))), [ids, pid])
}

/** The other-language form, shown small under the main label. */
function useSecondary() {
  const speechLang = useProfileStore((s) => s.profile.speechLang)
  const { uzScript } = useI18n()
  return (bi: Bi) => (speechLang === 'ru' ? renderBi(bi, uzScript === 'cyrl' ? 'uzc' : 'uz', uzScript) : bi.ru)
}

/** `lang` of the other-language form (WCAG 3.1.2): Uzbek in the chosen script when the speech language is Russian, else Russian. */
function useSecondaryLang(): string {
  const speechLang = useProfileStore((s) => s.profile.speechLang)
  const { uzScript } = useI18n()
  return speechLang === 'ru' ? (uzScript === 'cyrl' ? 'uz-Cyrl' : 'uz-Latn') : 'ru'
}

/** Built-in words break at syllables (soft hyphens) instead of mid-syllable. */
function useShy() {
  const { uiLang } = useI18n()
  return (text: string) => shy(text, uiLang === 'ru' ? 'ru' : 'uz')
}

function WordVoiceDialog({ word, onClose }: { word: Word | null; onClose: () => void }) {
  const t = useT()
  const tc = useStrings(COMMON)
  const label = useLabel()
  const speechLang = useProfileStore((s) => s.profile.speechLang)
  const [lang, setLang] = useState<SpeechLang>(speechLang)
  const key = word ? `w.${word.id}` : null
  const voice = useVoiceDrafts(key)
  const [busy, setBusy] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  useEffect(() => {
    if (word) {
      setLang(speechLang)
      setConfirmClose(false)
    }
  }, [word, speechLang])
  const save = async () => {
    setBusy(true)
    await voice.commit()
    setBusy(false)
    onClose()
  }
  const requestClose = () => (voice.dirty ? setConfirmClose(true) : onClose())
  const cur = voice.state[lang]
  return (
    <>
    <Dialog
      open={!!word}
      onClose={confirmClose ? () => undefined : requestClose}
      title={word ? t('voiceLabel', { word: label(word) }) : ''}
      footer={
        <>
          <Button variant="ghost" onActivate={requestClose}>
            {tc('cancel')}
          </Button>
          <Button onActivate={() => void save()} disabled={!voice.dirty || busy}>
            {tc('save')}
          </Button>
        </>
      }
    >
      <p className={styles.hint}>{t('wordVoiceHint')}</p>
      <LangPicker value={lang} onChange={setLang} has={{ uz: !!voice.state.uz.draft, ru: !!voice.state.ru.draft }} />
      <VoiceRecorder key={lang} value={cur.draft} onChange={(b) => voice.setDraft(lang, b)} />
      {word && (
        <div className={styles.row}>
          <Button variant="ghost" icon={<Volume2 />} onActivate={() => void speak({ key: `w.${word.id}`, text: word }, lang)}>
            {t('listenNow')}
          </Button>
          {cur.saved && <span className={styles.badgeOn}>{t('recHas')}</span>}
        </div>
      )}
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

function CustomRow({ card, voiceLangs, onEdit, onDelete }: { card: CustomCard; voiceLangs: string; onEdit: () => void; onDelete: () => void }) {
  const t = useT()
  const label = useLabel()
  const secondary = useSecondary()
  const secondaryLang = useSecondaryLang()
  const url = useObjectUrl(card.image ?? null)
  const bi = { uz: card.uz || card.ru, ru: card.ru || card.uz }
  const name = label(bi)
  return (
    <li className={styles.itemRow} data-hidden={card.hidden || undefined} data-wide="">
      <SymbolImg id={card.symbol ?? 'framed_picture'} src={url} className={styles.itemSym} />
      <span className={styles.itemText}>
        <span className={styles.itemMain}>{name}</span>
        <span className={styles.itemSub} lang={secondaryLang}>{secondary(bi)}</span>
        <span className={styles.badges}>
          {voiceLangs && (
            <span className={styles.badgeOn}>
              <Mic aria-hidden="true" />
              {t('ownVoice')}: {voiceLangs}
            </span>
          )}
          {card.hidden && <span className={styles.badge}>{t('hiddenBadge')}</span>}
        </span>
      </span>
      <span className={styles.actions}>
        <Button variant="ghost" iconOnly icon={<Pencil />} label={t('editLabel', { word: name })} onActivate={onEdit}>
          {t('editLabel', { word: name })}
        </Button>
        <Button
          variant="ghost"
          iconOnly
          icon={card.hidden ? <EyeOff /> : <Eye />}
          label={card.hidden ? t('showLabel', { word: name }) : t('hideLabel', { word: name })}
          pressed={!card.hidden}
          onActivate={() => void db.cards.update(card.id, { hidden: !card.hidden }).catch(() => undefined)}
        >
          {card.hidden ? t('showLabel', { word: name }) : t('hideLabel', { word: name })}
        </Button>
        <Button variant="ghost" iconOnly icon={<Trash2 />} label={t('deleteLabel', { word: name })} onActivate={onDelete}>
          {t('deleteLabel', { word: name })}
        </Button>
      </span>
    </li>
  )
}

function WordRow({ word, hidden, voiceLangs, onToggle, onVoice }: { word: Word; hidden: boolean; voiceLangs: string; onToggle: () => void; onVoice: () => void }) {
  const t = useT()
  const label = useLabel()
  const secondary = useSecondary()
  const secondaryLang = useSecondaryLang()
  const soft = useShy()
  const name = label(word)
  return (
    <li className={styles.itemRow} data-hidden={hidden || undefined} data-wide="">
      <SymbolImg id={word.symbol} className={styles.itemSym} />
      <span className={styles.itemText}>
        <span className={[styles.itemMain, styles.itemFixed].join(' ')}>{soft(name)}</span>
        <span className={[styles.itemSub, styles.itemFixed].join(' ')} lang={secondaryLang}>{soft(secondary(word))}</span>
        <span className={styles.badges}>
          {word.core && <span className={styles.badge}>{t('levelBadge', { n: word.core.level })}</span>}
          {voiceLangs && (
            <span className={styles.badgeOn}>
              <Mic aria-hidden="true" />
              {t('ownVoice')}: {voiceLangs}
            </span>
          )}
          {hidden && <span className={styles.badge}>{t('hiddenBadge')}</span>}
        </span>
      </span>
      <span className={styles.actions}>
        <Button variant="ghost" iconOnly icon={<Mic />} label={t('voiceLabel', { word: name })} onActivate={onVoice}>
          {t('voiceLabel', { word: name })}
        </Button>
        <Button
          variant="ghost"
          iconOnly
          icon={hidden ? <EyeOff /> : <Eye />}
          label={hidden ? t('showLabel', { word: name }) : t('hideLabel', { word: name })}
          pressed={!hidden}
          onActivate={onToggle}
        >
          {hidden ? t('showLabel', { word: name }) : t('hideLabel', { word: name })}
        </Button>
      </span>
    </li>
  )
}

export default function Cards() {
  const t = useT()
  const tc = useStrings(COMMON)
  const label = useLabel()
  const aac = useProfileStore((s) => s.profile.aac)
  const update = useProfileStore((s) => s.update)
  const [topic, setTopic] = useState<TopicId>('core')
  const [editing, setEditing] = useState<CustomCard | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [voiceFor, setVoiceFor] = useState<Word | null>(null)
  const [deleting, setDeleting] = useState<CustomCard | null>(null)
  const cards = useCustomCards()
  const recKeys = useRecordingKeys()
  const words = useMemo(() => wordsByTopic(topic), [topic])
  const mine = (cards ?? []).filter((c) => c.topic === topic).sort((a, b) => a.createdAt - b.createdAt)
  const hidden = new Set(aac.hiddenWordIds)
  /** Languages that have the person's own recording for this key: `UZ`, `RU`, `UZ · RU` or empty. */
  const voiceLangs = (key: string) => ([recKeys.has(`uz:${key}`) && 'UZ', recKeys.has(`ru:${key}`) && 'RU'].filter(Boolean) as string[]).join(' · ')

  const toggleWord = (id: string) => {
    const next = hidden.has(id) ? aac.hiddenWordIds.filter((x) => x !== id) : [...aac.hiddenWordIds, id]
    void update({ aac: { hiddenWordIds: next } })
  }

  const openEditor = (card: CustomCard | null) => {
    setEditing(card)
    setEditorOpen(true)
  }

  const confirmDelete = async () => {
    const c = deleting
    setDeleting(null)
    if (!c) return
    await db.cards.delete(c.id).catch(() => undefined)
    await Promise.all([deleteRecording(`c.${c.id}`, 'uz'), deleteRecording(`c.${c.id}`, 'ru')])
  }

  return (
    <>
      <PageHeader title={t('secCards')} back="/parent" />
      <Page width="normal">
        <StorageBanner />
        <Section>
          <Segmented
            label={t('levelTitle')}
            value={String(aac.level) as '1' | '2' | '3'}
            options={[
              { value: '1', label: t('level1') },
              { value: '2', label: t('level2') },
              { value: '3', label: t('level3') },
            ]}
            onChange={(v) => void update({ aac: { level: Number(v) as 1 | 2 | 3 } })}
            wrap
          />
          <p className={styles.hint}>{t('levelHint')}</p>
        </Section>

        <Section>
          <TopicChips value={topic} onChange={setTopic} label={t('topicsTitle')} />
        </Section>

        <Section title={t('myCards')}>
          {mine.length ? (
            <ul className={styles.list}>
              {mine.map((c) => (
                <CustomRow key={c.id} card={c} voiceLangs={voiceLangs(`c.${c.id}`)} onEdit={() => openEditor(c)} onDelete={() => setDeleting(c)} />
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>{t('noMyCards')}</p>
          )}
          <div className={styles.row}>
            <Button variant="soft" icon={<Plus />} onActivate={() => openEditor(null)}>
              {t('addCard')}
            </Button>
          </div>
        </Section>

        <Section title={t('builtIn')}>
          <div className={styles.spread}>
            {topic === 'core' ? <p className={styles.hint}>{t('coreNote')}</p> : <span />}
            {aac.hiddenWordIds.length > 0 && (
              <div className={styles.row}>
                <span className={styles.hint}>{t('hiddenCount', { n: aac.hiddenWordIds.length })}</span>
                <Button variant="ghost" icon={<Eye />} onActivate={() => void update({ aac: { hiddenWordIds: [] } })}>
                  {t('showAll')}
                </Button>
              </div>
            )}
          </div>
          <ul className={styles.list}>
            {words.map((w) => (
              <WordRow key={w.id} word={w} hidden={hidden.has(w.id)} voiceLangs={voiceLangs(`w.${w.id}`)} onToggle={() => toggleWord(w.id)} onVoice={() => setVoiceFor(w)} />
            ))}
          </ul>
        </Section>
      </Page>

      <CardEditor open={editorOpen} card={editing} defaultTopic={topic} onClose={() => setEditorOpen(false)} />
      <WordVoiceDialog word={voiceFor} onClose={() => setVoiceFor(null)} />
      <ConfirmDialog
        open={!!deleting}
        title={t('deleteLabel', { word: deleting ? label({ uz: deleting.uz || deleting.ru, ru: deleting.ru || deleting.uz }) : '' })}
        text={t('deleteCardQ', { word: deleting ? label({ uz: deleting.uz || deleting.ru, ru: deleting.ru || deleting.uz }) : '' })}
        confirm={tc('delete')}
        onConfirm={() => void confirmDelete()}
        onClose={() => setDeleting(null)}
      />
    </>
  )
}

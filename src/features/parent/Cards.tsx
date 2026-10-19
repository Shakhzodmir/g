import { Eye, EyeOff, Mic, Pencil, Plus, Trash2, Volume2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
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
import { CardEditor, LangPicker, useVoiceDraft } from './CardEditor'
import { useObjectUrl } from './image'
import styles from './parent.module.css'
import { ConfirmDialog, Section, TopicChips, useCustomCards, useT } from './shared'
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
  const voice = useVoiceDraft(key, lang)
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    await voice.commit()
    setBusy(false)
    onClose()
  }
  return (
    <Dialog
      open={!!word}
      onClose={onClose}
      title={word ? t('voiceLabel', { word: label(word) }) : ''}
      footer={
        <>
          <Button variant="ghost" onActivate={onClose}>
            {tc('cancel')}
          </Button>
          <Button onActivate={() => void save()} disabled={!voice.dirty || busy}>
            {tc('save')}
          </Button>
        </>
      }
    >
      <p className={styles.hint}>{t('wordVoiceHint')}</p>
      <LangPicker value={lang} onChange={setLang} />
      <VoiceRecorder value={voice.draft} onChange={voice.setDraft} />
      {word && (
        <div className={styles.row}>
          <Button variant="ghost" icon={<Volume2 />} onActivate={() => void speak({ key: `w.${word.id}`, text: word }, lang)}>
            {t('listenNow')}
          </Button>
          {voice.saved && <span className={styles.badgeOn}>{t('recHas')}</span>}
        </div>
      )}
    </Dialog>
  )
}

function CustomRow({ card, hasVoice, onEdit, onDelete }: { card: CustomCard; hasVoice: boolean; onEdit: () => void; onDelete: () => void }) {
  const t = useT()
  const label = useLabel()
  const secondary = useSecondary()
  const url = useObjectUrl(card.image ?? null)
  const bi = { uz: card.uz || card.ru, ru: card.ru || card.uz }
  const name = label(bi)
  return (
    <li className={styles.itemRow} data-hidden={card.hidden || undefined} data-wide="">
      <SymbolImg id={card.symbol ?? 'framed_picture'} src={url} className={styles.itemSym} />
      <span className={styles.itemText}>
        <span className={styles.itemMain}>{name}</span>
        <span className={styles.itemSub}>{secondary(bi)}</span>
        <span className={styles.badges}>
          {hasVoice && (
            <span className={styles.badgeOn}>
              <Mic aria-hidden="true" />
              {t('ownVoice')}
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

function WordRow({ word, hidden, hasVoice, onToggle, onVoice }: { word: Word; hidden: boolean; hasVoice: boolean; onToggle: () => void; onVoice: () => void }) {
  const t = useT()
  const label = useLabel()
  const secondary = useSecondary()
  const soft = useShy()
  const name = label(word)
  return (
    <li className={styles.itemRow} data-hidden={hidden || undefined}>
      <SymbolImg id={word.symbol} className={styles.itemSym} />
      <span className={styles.itemText}>
        <span className={[styles.itemMain, styles.itemFixed].join(' ')}>{soft(name)}</span>
        <span className={[styles.itemSub, styles.itemFixed].join(' ')}>{soft(secondary(word))}</span>
        <span className={styles.badges}>
          {word.core && <span className={styles.badge}>{t('levelBadge', { n: word.core.level })}</span>}
          {hasVoice && (
            <span className={styles.badgeOn}>
              <Mic aria-hidden="true" />
              {t('ownVoice')}
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
  const persistent = useProfileStore((s) => s.persistent)
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
  const hasVoice = (key: string) => recKeys.has(`uz:${key}`) || recKeys.has(`ru:${key}`)

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
        {!persistent && <p className={styles.notice}>{t('noStorage')}</p>}
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
                <CustomRow key={c.id} card={c} hasVoice={hasVoice(`c.${c.id}`)} onEdit={() => openEditor(c)} onDelete={() => setDeleting(c)} />
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
              <WordRow key={w.id} word={w} hidden={hidden.has(w.id)} hasVoice={hasVoice(`w.${w.id}`)} onToggle={() => toggleWord(w.id)} onVoice={() => setVoiceFor(w)} />
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

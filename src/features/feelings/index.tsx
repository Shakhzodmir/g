import { ArrowRight, Check, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { Route, Routes, useNavigate, useParams } from 'react-router'
import { speak, speakSequence } from '../../audio/speech'
import { FEELINGS, type Feeling, type Helper } from '../../content/feelings'
import { VOICE_LINES } from '../../content/voiceLines'
import { COMMON } from '../../i18n/common'
import { useLabel, useStrings } from '../../i18n'
import { shy } from '../../lib/hyphenate'
import { logEvent } from '../../store/events'
import { useProfileStore } from '../../store/profile'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { EmptyState } from '../../ui/misc'
import { PageHeader } from '../../ui/PageHeader'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import styles from './Feelings.module.css'
import { feelingById, helperById, helpersFor } from './helpers'
import { S } from './strings'

/** Only very long single words get soft hyphens, so ordinary labels still wrap at spaces. */
const shyLong = (text: string, lang: 'uz' | 'ru') => text.replace(/[\p{L}ʻʼ]{10,}/gu, (w) => shy(w, lang))

function voiceLine(id: string) {
  const v = VOICE_LINES.find((l) => l.id === id)
  return { key: `v.${id}`, text: { uz: v?.uz ?? '', ru: v?.ru ?? '' } }
}

const feelingItem = (f: Feeling) => ({ key: `f.${f.id}`, text: { uz: f.uz, ru: f.ru } })
const helperItem = (h: Helper) => ({ key: `h.${h.id}`, text: { uz: h.uz, ru: h.ru } })

/** A speaker button next to a written question: the question is heard only when tapped. */
function Ask({ text, listen, line, as: As = 'p', id }: { text: string; listen: string; line: string; as?: 'p' | 'h2'; id?: string }) {
  return (
    <div className={styles.ask}>
      <Button variant="soft" iconOnly icon={<Volume2 />} label={listen} onActivate={() => void speak(voiceLine(line))}>
        {listen}
      </Button>
      <As id={id} className={styles.askText}>
        {text}
      </As>
    </div>
  )
}

function FeelingGrid() {
  const t = useStrings(S)
  const lang = useProfileStore((s) => s.profile.speechLang)
  const label = useLabel()
  const navigate = useNavigate()
  return (
    <div className={styles.page}>
      <PageHeader title={t('title')} />
      <div className={styles.body}>
        <Ask text={t('ask')} listen={t('listenAsk')} line="feel_ask" />
        <ul className={styles.feelings} role="list" data-reach>
          {FEELINGS.map((f) => {
            const name = label(f)
            return (
              <li key={f.id}>
                <Pressable
                  className={styles.feeling}
                  label={name}
                  scanGroup="feelings"
                  onActivate={() => {
                    void speak(feelingItem(f))
                    logEvent('aac_phrase', `feeling:${f.id}`)
                    navigate(f.id)
                  }}
                >
                  <span className={styles.face} aria-hidden="true">
                    <SymbolImg id={f.symbol} />
                  </span>
                  <span className={styles.feelingLabel}>{shyLong(name, lang)}</span>
                </Pressable>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function FeelingDetail() {
  const { id } = useParams()
  const feeling = feelingById(id)
  const t = useStrings(S)
  const navigate = useNavigate()
  if (!feeling) {
    return (
      <div className={styles.page}>
        <PageHeader title={t('title')} back="/feelings" />
        <EmptyState symbol="compass" title={t('notFound')} action={<Button onActivate={() => navigate('/feelings')}>{t('toFeelings')}</Button>} />
      </div>
    )
  }
  return <FeelingHelp key={feeling.id} feeling={feeling} />
}

function FeelingHelp({ feeling }: { feeling: Feeling }) {
  const t = useStrings(S)
  const tc = useStrings(COMMON)
  const label = useLabel()
  const lang = useProfileStore((s) => s.profile.speechLang)
  const [chosen, setChosen] = useState<string | null>(null)
  const [summary, setSummary] = useState(false)
  const helpers = helpersFor(feeling)
  const chosenHelper = helperById(chosen)
  const feelingName = label(feeling)

  return (
    <div className={styles.page}>
      <PageHeader title={t('title')} back="/feelings" />
      <div className={styles.body}>
        <Pressable className={styles.hero} label={feelingName} onActivate={() => void speak(feelingItem(feeling))}>
          <span className={styles.heroFace} aria-hidden="true">
            <SymbolImg id={feeling.symbol} />
          </span>
          <span className={styles.heroLabel}>{shyLong(feelingName, lang)}</span>
          <Volume2 className={styles.heroSpeaker} aria-hidden="true" />
        </Pressable>

        <div className={styles.reach} data-reach>
        <section className={styles.helpBox} aria-labelledby="feel-help">
          <Ask as="h2" id="feel-help" text={t('helpTitle')} listen={t('listenHelp')} line="feel_help" />
          <ul className={styles.helpers} role="list">
            {helpers.map((h) => {
              const name = label(h)
              const on = chosen === h.id
              return (
                <li key={h.id}>
                  <Pressable
                    className={styles.helper}
                    label={name}
                    pressed={on}
                    scanGroup="feel-helpers"
                    onActivate={() => {
                      setChosen(h.id)
                      void speak(helperItem(h))
                      logEvent('aac_phrase', `helper:${h.id}`, { feeling: feeling.id })
                    }}
                  >
                    <span className={styles.helperArt} aria-hidden="true">
                      <SymbolImg id={h.symbol} />
                    </span>
                    <span className={styles.helperLabel}>{shyLong(name, lang)}</span>
                    {on && <Check className={styles.check} aria-hidden="true" />}
                  </Pressable>
                </li>
              )
            })}
          </ul>
        </section>

        <div className={styles.adultRow}>
          <Button variant="secondary" size="lg" icon={<SymbolImg id="speaking_head" size={30} />} onActivate={() => setSummary(true)}>
            {t('showAdult')}
          </Button>
        </div>
        </div>
      </div>

      <Dialog
        open={summary}
        onClose={() => setSummary(false)}
        title={t('summaryTitle')}
        footer={
          <>
            <Button
              variant="soft"
              icon={<Volume2 />}
              onActivate={() => void speakSequence(chosenHelper ? [feelingItem(feeling), helperItem(chosenHelper)] : [feelingItem(feeling)])}
            >
              {t('listenAll')}
            </Button>
            <Button onActivate={() => setSummary(false)}>{tc('close')}</Button>
          </>
        }
      >
        <div className={styles.summary}>
          <figure className={styles.summaryItem}>
            <SymbolImg id={feeling.symbol} size={112} />
            <figcaption>
              <span className={styles.summaryCaption}>{t('summaryFeel')}</span>
              <strong className={styles.summaryValue}>{feelingName}</strong>
            </figcaption>
          </figure>
          <ArrowRight className={styles.summaryArrow} aria-hidden="true" />
          {chosenHelper ? (
            <figure className={styles.summaryItem}>
              <SymbolImg id={chosenHelper.symbol} size={112} />
              <figcaption>
                <span className={styles.summaryCaption}>{t('summaryHelps')}</span>
                <strong className={styles.summaryValue}>{label(chosenHelper)}</strong>
              </figcaption>
            </figure>
          ) : (
            <p className={styles.summaryEmpty}>{t('summaryNoHelper')}</p>
          )}
        </div>
      </Dialog>
    </div>
  )
}

export default function Feelings() {
  return (
    <Routes>
      <Route index element={<FeelingGrid />} />
      <Route path=":id" element={<FeelingDetail />} />
    </Routes>
  )
}

import { Coffee, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { PHRASES } from '../content/phrases'
import type { Phrase } from '../content/types'
import { useI18n, useLabel, useStrings } from '../i18n'
import { COMMON } from '../i18n/common'
import { shy } from '../lib/hyphenate'
import { phraseEntry } from '../features/aac/entry'
import { aacSpeak } from '../features/aac/speak'
import { logEvent } from '../store/events'
import { useProfileStore, type Profile } from '../store/profile'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Page } from '../ui/Page'
import { Pressable } from '../ui/Pressable'
import { SymbolImg } from '../ui/SymbolImg'
import { BoardHint } from './BoardHint'
import { ContinueCard, useResume } from './ContinueCard'
import { FEATURES } from './features'
import styles from './Home.module.css'
import { ParentLock } from './ParentLock'
import { MODES } from './strings'

/**
 * The eight everyday phrases on top of the adult home, in this order. If one is ever renamed, the strip is
 * filled up from the other adult phrases, so it always has eight buttons.
 */
export const QUICK_PHRASE_IDS = ['greeting', 'thank_you', 'wait_answer', 'speak_slowly', 'thirsty', 'toilet_adult', 'medicine', 'call_nurse'] as const
export const QUICK_COUNT = 8

const isPain = (p: Phrase) => /^pain_\d+$/.test(p.id) || p.id === 'hurts_here'

/** The phrases of the quick strip: the curated ids first, then any other adult/both phrase. */
export function quickPhrases(all: readonly Phrase[] = PHRASES): Phrase[] {
  const ok = (p: Phrase) => (p.audience === 'adult' || p.audience === 'both') && !isPain(p)
  const byId = new Map(all.filter(ok).map((p) => [p.id, p]))
  const picked: Phrase[] = []
  for (const id of QUICK_PHRASE_IDS) {
    const p = byId.get(id)
    if (p) picked.push(p)
  }
  for (const p of byId.values()) {
    if (picked.length >= QUICK_COUNT) break
    if (!picked.includes(p)) picked.push(p)
  }
  return picked.slice(0, QUICK_COUNT)
}

interface Tool {
  id: string
  symbol: string
  title: string
  hint: string
  path: string
}

function useTools(): Tool[] {
  const t = useStrings(MODES)
  return [
    { id: 'talk', symbol: FEATURES.aac.symbol, title: t('toolTalk'), hint: t('toolTalkHint'), path: FEATURES.aac.path },
    { id: 'keyboard', symbol: 'keyboard', title: t('toolKeyboard'), hint: t('toolKeyboardHint'), path: `${FEATURES.aac.path}?mode=keyboard` },
    { id: 'phrases', symbol: 'speech_balloon', title: t('toolPhrases'), hint: t('toolPhrasesHint'), path: `${FEATURES.aac.path}?mode=phrases` },
    { id: 'pain', symbol: 'pain', title: t('toolPain'), hint: t('toolPainHint'), path: `${FEATURES.aac.path}?mode=pain` },
    { id: 'day', symbol: FEATURES.schedule.symbol, title: t('toolDay'), hint: t('toolDayHint'), path: FEATURES.schedule.path },
    { id: 'training', symbol: FEATURES.games.symbol, title: t('toolTraining'), hint: t('toolTrainingHint'), path: FEATURES.games.path },
    { id: 'voice', symbol: FEATURES.exercises.symbol, title: t('toolVoice'), hint: t('toolVoiceHint'), path: FEATURES.exercises.path },
    { id: 'timer', symbol: FEATURES.timer.symbol, title: t('toolTimer'), hint: t('toolTimerHint'), path: FEATURES.timer.path },
    { id: 'calm', symbol: FEATURES.calm.symbol, title: t('toolCalm'), hint: t('toolCalmHint'), path: FEATURES.calm.path },
    { id: 'check', symbol: 'clipboard', title: t('toolCheck'), hint: t('toolCheckHint'), path: `${FEATURES.parent.path}/check` },
  ]
}

const avatarOf = (p: Pick<Profile, 'avatar'>) => (!p.avatar || p.avatar === 'musicha' ? 'adult' : p.avatar)

/** Quick access to another profile (the people who share this device). */
function ProfileSwitch() {
  const t = useStrings(MODES)
  const tc = useStrings(COMMON)
  const navigate = useNavigate()
  const profiles = useProfileStore((s) => s.profiles)
  const current = useProfileStore((s) => s.profile)
  const switchTo = useProfileStore((s) => s.switchTo)
  const [open, setOpen] = useState(false)
  const list = profiles.length ? profiles : [current]
  const name = (p: Profile) => p.name.trim() || tc('appName')
  return (
    <>
      <Button variant="ghost" icon={<UserRound />} label={t('profileSwitch', { name: name(current) })} onActivate={() => setOpen(true)}>
        {name(current)}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('profileSwitchTitle')}
        footer={
          <Button
            variant="ghost"
            onActivate={() => {
              setOpen(false)
              navigate(`${FEATURES.parent.path}/profiles`)
            }}
          >
            {t('profileManage')}
          </Button>
        }
      >
        <ul className={styles.profileList}>
          {list.map((p) => (
            <li key={p.id}>
              <Pressable
                className={styles.profileRow}
                label={name(p)}
                pressed={p.id === current.id}
                onActivate={() => {
                  setOpen(false)
                  if (p.id !== current.id) void switchTo(p.id)
                }}
              >
                <span className={styles.profileIcon} aria-hidden="true">
                  <SymbolImg id={avatarOf(p)} />
                </span>
                <span>{name(p)}</span>
                {p.id === current.id && <span className={styles.profileNow}>{t('profileCurrent')}</span>}
              </Pressable>
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  )
}

/**
 * Adult home: no mascot, no plates, no stickers. A neutral greeting, the everyday phrases one tap away,
 * then a compact grid of tools.
 */
export function HomeAdult() {
  const t = useStrings(MODES)
  const { uiLang } = useI18n()
  const label = useLabel()
  const navigate = useNavigate()
  const name = useProfileStore((s) => s.profile.name).trim()
  const hy = uiLang === 'ru' ? 'ru' : 'uz'
  const phrases = useMemo(() => quickPhrases(), [])
  const tools = useTools()
  const resume = useResume()
  return (
    <Page width="normal" className={styles.home} gap="tight">
      <header className={styles.adultTop}>
        <h1 className={styles.adultTitle}>{name ? t('helloAdult', { name: shy(name, /[а-яёўқғҳ]/i.test(name) ? 'ru' : hy) }) : t('helloAdultNoName')}</h1>
        <div className={styles.adultActions}>
          <ProfileSwitch />
          <Button variant="ghost" icon={<Coffee />} label={t('pauseLabel')} onActivate={() => navigate(FEATURES.calm.path)}>
            {t('pause')}
          </Button>
          <ParentLock />
        </div>
      </header>

      <BoardHint />

      <section className={styles.adultSection} aria-labelledby="home-quick">
        <div className={styles.sectionHead}>
          <h2 id="home-quick" className={styles.sectionTitle}>
            {t('quickTitle')}
          </h2>
          <p className={styles.sectionHint}>{t('quickHint')}</p>
        </div>
        <ul className={styles.quickGrid} role="list" aria-label={t('quickAria')} data-testid="quick-phrases">
          {phrases.map((p) => {
            const e = phraseEntry(p)
            const text = label(e.text)
            return (
              <li key={p.id}>
                <Pressable
                  className={styles.quick}
                  label={text}
                  onActivate={() => {
                    aacSpeak({ key: e.key, text: e.text })
                    logEvent('aac_phrase', e.ref)
                  }}
                >
                  <span className={styles.quickIcon} aria-hidden="true">
                    <SymbolImg id={p.symbol} />
                  </span>
                  <span className={styles.quickText}>{text}</span>
                </Pressable>
              </li>
            )
          })}
        </ul>
      </section>

      <ContinueCard variant="adult" resume={resume} />

      <section className={styles.adultSection} aria-labelledby="home-tools">
        <div className={styles.sectionHead}>
          <h2 id="home-tools" className={styles.sectionTitle}>
            {t('toolsTitle')}
          </h2>
        </div>
        <ul className={styles.toolGrid} role="list">
          {tools.map((it) => (
            <li key={it.id}>
              <Pressable className={styles.tool} label={it.title} onActivate={() => navigate(it.path)} data-tool={it.id}>
                <span className={styles.toolIcon} aria-hidden="true">
                  <SymbolImg id={it.symbol} />
                </span>
                <span className={styles.toolText}>
                  <span className={styles.toolTitle}>{shy(it.title, hy)}</span>
                  <span className={styles.toolHint}>{it.hint}</span>
                </span>
              </Pressable>
            </li>
          ))}
        </ul>
      </section>
    </Page>
  )
}

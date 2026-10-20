import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { speak } from '../audio/speech'
import { useI18n, useStrings } from '../i18n'
import { useDevice } from '../store/device'
import { useProfileStore } from '../store/profile'
import { shy } from '../lib/hyphenate'
import { Musicha } from '../ui/mascot/Musicha'
import { Page } from '../ui/Page'
import { Pressable } from '../ui/Pressable'
import { useMotionPreset } from '../design/motion'
import { Tile } from '../ui/Tile'
import { useSpeechLevel } from '../ui/useSpeechLevel'
import { BoardHint } from './BoardHint'
import { ContinueCard, useResume } from './ContinueCard'
import { HomeAdult } from './HomeAdult'
import { ParentLock } from './ParentLock'
import { FEATURES, type FeatureId } from './features'
import styles from './Home.module.css'
import { SHELL } from './strings'
import { initTimerWatcher } from '../features/timer/watcher'

/** A name this long no longer fits one line at display size: the greeting drops a size and may wrap (2 lines max). */
export function isLongName(name: string): boolean {
  return name.trim().length > 10
}

/** "Salom, {name}!" with the name made wrap-safe: soft hyphens at syllables, so a long name wraps cleanly. */
export function greeting(t: (k: 'greeting' | 'greetingName', v?: Record<string, string>) => string, name: string, hy: 'ru' | 'uz'): string {
  const n = name.trim()
  if (!n) return t('greeting')
  return t('greetingName', { name: shy(n, /[а-яёўқғҳ]/i.test(n) ? 'ru' : hy) })
}

const MAIN: FeatureId[] = ['aac', 'schedule', 'games', 'exercises']
const SMALL: FeatureId[] = ['timer', 'tokens', 'stories', 'feelings']
const TONES = ['primary', 'warm', 'secondary', 'calm'] as const

export function HomeChild() {
  const t = useStrings(SHELL)
  const { ui, uiLang } = useI18n()
  const navigate = useNavigate()
  const name = useProfileStore((s) => s.profile.name)
  const preset = useMotionPreset()
  const level = useSpeechLevel()
  const resume = useResume()
  const [state, setState] = useState<'idle' | 'speak' | 'happy'>('idle')
  const hy = uiLang === 'ru' ? 'ru' : 'uz'

  const greet = () => {
    setState('speak')
    void speak({ key: 'ui.greeting', text: { uz: 'Salom! Men Musicha.', ru: 'Привет! Я Муся.' } }).finally(() => setState('idle'))
  }

  return (
    <Page width="normal" className={styles.home}>
      <header className={styles.top}>
        <Pressable className={styles.mascotBtn} label={ui({ uz: 'Musicha bilan salomlashish', ru: 'Поздороваться с Мусей' })} onActivate={greet}>
          <Musicha state={state} level={level} size={112} calm={!preset.idleLoops} title="" />
        </Pressable>
        <div className={styles.hello}>
          <h1 className={styles.title} data-long={isLongName(name) || undefined}>
            {greeting(t, name, hy)}
          </h1>
          <p className={styles.slogan}>{t('slogan')}</p>
        </div>
      </header>

      <BoardHint />

      {/* The tiles are what children press: one block, which is the reach zone on a whiteboard. */}
      <div className={styles.zone} data-reach data-resume={resume ? '' : undefined}>
      <ContinueCard variant="child" resume={resume} />
      <ul className={styles.plates} role="list">
        {MAIN.map((id, i) => (
          <li key={id}>
            <Tile navigates shape="plate" tone={TONES[i]} symbol={FEATURES[id].symbol} title={shy(ui(FEATURES[id].title), hy)} label={ui(FEATURES[id].title)} onActivate={() => navigate(FEATURES[id].path)} />
          </li>
        ))}
      </ul>

      <ul className={styles.small} role="list">
        {SMALL.map((id) => (
          <li key={id}>
            <Tile navigates shape="card" tone="neutral" symbol={FEATURES[id].symbol} title={shy(ui(FEATURES[id].title), hy)} label={ui(FEATURES[id].title)} onActivate={() => navigate(FEATURES[id].path)} />
          </li>
        ))}
      </ul>

      <div className={styles.lock}>
        <ParentLock withText />
      </div>
      </div>
    </Page>
  )
}

export function Home() {
  // The timer's end signal works from every screen; the watcher is idempotent (main.tsx also starts it).
  useEffect(() => {
    initTimerWatcher()
  }, [])
  const kind = useProfileStore((s) => s.profile.kind)
  useDevice((s) => s.uiLang)
  return kind === 'adult' ? <HomeAdult /> : <HomeChild />
}

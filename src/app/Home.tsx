import { Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { speak } from '../audio/speech'
import { useI18n, useStrings } from '../i18n'
import { useDevice } from '../store/device'
import { useProfileStore } from '../store/profile'
import { shy } from '../lib/hyphenate'
import { Button } from '../ui/Button'
import { Musicha } from '../ui/mascot/Musicha'
import { Page } from '../ui/Page'
import { Pressable } from '../ui/Pressable'
import { useMotionPreset } from '../design/motion'
import { markParentUnlocked } from '../features/parent/unlock'
import { ParentGate } from '../ui/ParentGate'
import { Tile } from '../ui/Tile'
import { useSpeechLevel } from '../ui/useSpeechLevel'
import { BoardHint } from './BoardHint'
import { FEATURES, type FeatureId } from './features'
import styles from './Home.module.css'
import { SHELL } from './strings'
import { initTimerWatcher } from '../features/timer/watcher'

/** A name this long no longer fits one line at display size: the greeting drops a size and may wrap (2 lines max). */
export function isLongName(name: string): boolean {
  return name.trim().length > 10
}

/** "Salom, {name}!" with the name made wrap-safe: soft hyphens at syllables, so a long name wraps cleanly. */
function greeting(t: (k: 'greeting' | 'greetingName', v?: Record<string, string>) => string, name: string, hy: 'ru' | 'uz'): string {
  const n = name.trim()
  if (!n) return t('greeting')
  return t('greetingName', { name: shy(n, /[а-яёўқғҳ]/i.test(n) ? 'ru' : hy) })
}

function ParentLock({ withText }: { withText?: boolean }) {
  const t = useStrings(SHELL)
  const navigate = useNavigate()
  const [gate, setGate] = useState(false)
  return (
    <>
      <Button variant="ghost" iconOnly={!withText} icon={<Lock />} label={t('parentsLock')} onActivate={() => setGate(true)}>
        {t('parentsLock')}
      </Button>
      <ParentGate
        open={gate}
        onCancel={() => setGate(false)}
        onUnlock={() => {
          setGate(false)
          markParentUnlocked()
          navigate(FEATURES.parent.path)
        }}
      />
    </>
  )
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
      <div className={styles.zone} data-reach>
      <ul className={styles.plates} role="list">
        {MAIN.map((id, i) => (
          <li key={id}>
            <Tile shape="plate" tone={TONES[i]} symbol={FEATURES[id].symbol} title={shy(ui(FEATURES[id].title), hy)} label={ui(FEATURES[id].title)} onActivate={() => navigate(FEATURES[id].path)} />
          </li>
        ))}
      </ul>

      <ul className={styles.small} role="list">
        {SMALL.map((id) => (
          <li key={id}>
            <Tile shape="card" tone="neutral" symbol={FEATURES[id].symbol} title={shy(ui(FEATURES[id].title), hy)} label={ui(FEATURES[id].title)} onActivate={() => navigate(FEATURES[id].path)} />
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

export function HomeAdult() {
  const t = useStrings(SHELL)
  const { ui, uiLang } = useI18n()
  const hy = uiLang === 'ru' ? 'ru' : 'uz'
  const navigate = useNavigate()
  const name = useProfileStore((s) => s.profile.name)
  const items: Array<{ id: string; symbol: string; title: string; path: string }> = [
    { id: 'talk', symbol: FEATURES.aac.symbol, title: ui(FEATURES.aac.title), path: '/talk' },
    { id: 'keyboard', symbol: 'keyboard', title: t('adultKeyboard'), path: '/talk?mode=keyboard' },
    { id: 'phrases', symbol: 'speech_balloon', title: t('adultPhrases'), path: '/talk?mode=phrases' },
    { id: 'pain', symbol: 'pain', title: t('adultPain'), path: '/talk?mode=pain' },
    { id: 'day', symbol: FEATURES.schedule.symbol, title: ui(FEATURES.schedule.title), path: FEATURES.schedule.path },
    { id: 'ex', symbol: FEATURES.exercises.symbol, title: ui(FEATURES.exercises.title), path: FEATURES.exercises.path },
  ]
  return (
    <Page width="normal" className={styles.home}>
      <header className={styles.topAdult}>
        <h1 className={styles.title} data-long={isLongName(name) || undefined}>
          {name ? greeting(t, name, hy) : t('adultTitle')}
        </h1>
        <ParentLock />
      </header>
      <BoardHint />
      <ul className={styles.adultGrid} role="list">
        {items.map((it) => (
          <li key={it.id}>
            <Tile shape="card" tone="neutral" symbol={it.symbol} title={shy(it.title, hy)} label={it.title} onActivate={() => navigate(it.path)} />
          </li>
        ))}
      </ul>
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

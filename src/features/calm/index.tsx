import { ArrowLeft, Check, Volume2, VolumeX, Wind, Square } from 'lucide-react'
import { useScreenTitle } from '../../app/adultTitles'
import { useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { speak, stopSpeaking } from '../../audio/speech'
import { HELPERS } from '../../content/feelings'
import { VOICE_LINES } from '../../content/voiceLines'
import { useLabel, useStrings } from '../../i18n'
import { shy } from '../../lib/hyphenate'
import { useDevice } from '../../store/device'
import { logEvent } from '../../store/events'
import { useProfileStore } from '../../store/profile'
import { Button } from '../../ui/Button'
import headerStyles from '../../ui/PageHeader.module.css'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import { breathAt, type BreathPhase } from './breath'
import styles from './Calm.module.css'
import { calmExit } from './leave'
import { S } from './strings'
import { COMMON } from '../../i18n/common'

/** Helpers offered in the calm corner, most common first. */
const CALM_HELPER_IDS = ['hug', 'water', 'quiet_place', 'headphones', 'rest', 'with_mom', 'toy', 'music']
const CALM_HELPERS = CALM_HELPER_IDS.map((id) => HELPERS.find((h) => h.id === id)).filter((h) => !!h)

/** Voice guidance stops by itself after this many breaths, so it never runs on endlessly. */
const GUIDED_CYCLES = 5

function voiceLine(id: string) {
  const v = VOICE_LINES.find((l) => l.id === id)
  return { key: `v.${id}`, text: { uz: v?.uz ?? '', ru: v?.ru ?? '' } }
}

function Lotus() {
  return (
    <svg className={styles.lotus} viewBox="-100 -100 200 200" aria-hidden="true" focusable="false">
      <circle className={styles.halo} r="98" />
      {Array.from({ length: 8 }, (_, i) => (
        <ellipse key={i} className={styles.petal} cx="0" cy="-46" rx="25" ry="44" transform={`rotate(${i * 45})`} />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <ellipse key={`in${i}`} className={styles.petalInner} cx="0" cy="-30" rx="15" ry="28" transform={`rotate(${i * 45 + 22.5})`} />
      ))}
      <circle className={styles.core} r="24" />
    </svg>
  )
}

export default function Calm() {
  const t = useStrings(S)
  const title = useScreenTitle('calm', t('title'))
  const tc = useStrings(COMMON)
  const label = useLabel()
  const navigate = useNavigate()
  const location = useLocation()
  const sensory = useProfileStore((s) => s.profile.sensory)
  const lang = useProfileStore((s) => s.profile.speechLang)
  const reduced = useReducedMotion() ?? false
  const board = useDevice((s) => s.boardMode)
  // Calm level / reduced motion: everything is static except the breathing shape's size.
  const still = sensory === 'calm' || reduced

  const [voiceOn, setVoiceOn] = useState(false)
  const [guided, setGuided] = useState(false)
  const [phase, setPhase] = useState<BreathPhase>('in')
  const [helper, setHelper] = useState<string | null>(null)

  const shapeRef = useRef<HTMLDivElement>(null)
  const origin = useRef(0)
  const lastPhase = useRef<BreathPhase | null>(null)
  const guidedRef = useRef(false)

  useEffect(() => {
    origin.current = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const s = breathAt(now - origin.current)
      shapeRef.current?.style.setProperty('--breath', s.scale.toFixed(4))
      if (s.phase !== lastPhase.current) {
        lastPhase.current = s.phase
        setPhase(s.phase)
        if (guidedRef.current) {
          if (s.cycle >= GUIDED_CYCLES) {
            guidedRef.current = false
            setGuided(false)
          } else {
            void speak(voiceLine(s.phase === 'in' ? 'breathe_in' : 'breathe_out'))
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      if (guidedRef.current) stopSpeaking()
      guidedRef.current = false
    }
  }, [])

  const stopGuide = useCallback(() => {
    if (guidedRef.current) stopSpeaking()
    guidedRef.current = false
    setGuided(false)
  }, [])

  const startGuide = () => {
    // Restart the breath so the voice and the shape begin together with an inhale.
    origin.current = performance.now()
    lastPhase.current = 'in'
    setPhase('in')
    guidedRef.current = true
    setGuided(true)
    void speak(voiceLine('breathe_in'))
  }

  // "I am ready" and the back arrow both return to where the Break button was pressed (one step back in history).
  const leave = () => {
    stopGuide()
    const exit = calmExit({ idx: (window.history.state as { idx?: unknown } | null)?.idx, from: (location.state as { from?: unknown } | null)?.from })
    if (exit.kind === 'back') navigate(-1)
    else navigate(exit.path, { replace: true })
  }

  const toggleVoice = () => {
    if (voiceOn) stopGuide()
    setVoiceOn(!voiceOn)
  }

  const chooseHelper = (id: string, text: { uz: string; ru: string }) => {
    setHelper(id)
    void speak({ key: `h.${id}`, text })
    logEvent('aac_phrase', `helper:${id}`)
  }

  return (
    <div className={styles.page} data-still={still || undefined}>
      {!still && (
        <div className={styles.lava} aria-hidden="true">
          <span className={styles.blob} style={{ '--i': 0 } as CSSProperties} />
          <span className={styles.blob} style={{ '--i': 1 } as CSSProperties} />
          <span className={styles.blob} style={{ '--i': 2 } as CSSProperties} />
        </div>
      )}

      {/* Same markup and styles as PageHeader, but the back arrow leaves the way "I am ready" does. */}
      <header className={headerStyles.header} data-no-print>
        <Button className={headerStyles.back} variant="soft" iconOnly icon={<ArrowLeft />} label={tc('back')} onActivate={leave}>
          {tc('back')}
        </Button>
        <h1 className={headerStyles.title}>{title}</h1>
        <div className={headerStyles.actions}>
          <Button
            variant={voiceOn ? 'primary' : 'soft'}
            iconOnly
            icon={voiceOn ? <Volume2 /> : <VolumeX />}
            label={t('voiceGuide')}
            pressed={voiceOn}
            onActivate={toggleVoice}
          >
            {t('voiceGuide')}
          </Button>
        </div>
      </header>

      <div className={styles.body}>
        <section className={styles.stage}>
          <div className={styles.shape} ref={shapeRef} role="img" aria-label={t('breathShape')}>
            <Lotus />
          </div>
          <p className={styles.phase} aria-hidden="true">
            {phase === 'in' ? t('inhale') : t('exhale')}
          </p>
          <div className={styles.guide}>
            {voiceOn &&
              (guided ? (
                <Button variant="soft" size="lg" icon={<Square />} onActivate={stopGuide}>
                  {t('stop')}
                </Button>
              ) : (
                <Button variant="soft" size="lg" icon={<Wind />} onActivate={startGuide}>
                  {t('start')}
                </Button>
              ))}
          </div>
        </section>

        {/* Everything a child presses: one block, bottom-aligned in the reach zone on a whiteboard. */}
        <div className={styles.reach} data-reach>
        <section className={styles.helpersBox} aria-labelledby="calm-helpers">
          <h2 id="calm-helpers" className={styles.helpersTitle}>
            {t('helpersTitle')}
          </h2>
          <ul className={styles.helpers} role="list">
            {CALM_HELPERS.map((h) => {
              const name = label(h)
              const on = helper === h.id
              return (
                <li key={h.id}>
                  <Pressable
                    className={styles.helper}
                    label={name}
                    pressed={on}
                    scanGroup="calm-helpers"
                    onActivate={() => chooseHelper(h.id, { uz: h.uz, ru: h.ru })}
                  >
                    <span className={styles.helperArt} aria-hidden="true">
                      <SymbolImg id={h.symbol} />
                    </span>
                    <span className={styles.helperLabel}>{shy(name, lang)}</span>
                    {on && <Check className={styles.check} aria-hidden="true" />}
                  </Pressable>
                </li>
              )
            })}
          </ul>
        </section>

        <div className={styles.readyRow}>
          <Button
            size={board ? 'lg' : 'xl'}
            block
            icon={<SymbolImg id="thumbs_up" size={36} />}
            onActivate={leave}
          >
            {t('ready')}
          </Button>
        </div>
        </div>
      </div>
    </div>
  )
}

import { Check, Volume2, VolumeX, Wind, Square } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router'
import { speak, stopSpeaking } from '../../audio/speech'
import { HELPERS } from '../../content/feelings'
import { VOICE_LINES } from '../../content/voiceLines'
import { useLabel, useStrings } from '../../i18n'
import { useDevice } from '../../store/device'
import { logEvent } from '../../store/events'
import { useProfileStore } from '../../store/profile'
import { Button } from '../../ui/Button'
import { PageHeader } from '../../ui/PageHeader'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import { breathAt, type BreathPhase } from './breath'
import styles from './Calm.module.css'
import { S } from './strings'

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
  const label = useLabel()
  const navigate = useNavigate()
  const sensory = useProfileStore((s) => s.profile.sensory)
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

      <PageHeader
        title={t('title')}
        actions={
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
        }
      />

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
                    <span className={styles.helperLabel}>{name}</span>
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
            onActivate={() => {
              stopGuide()
              navigate('/')
            }}
          >
            {t('ready')}
          </Button>
        </div>
      </div>
    </div>
  )
}

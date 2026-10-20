import { Pause, Play, Plus, RotateCcw, X } from 'lucide-react'
import { useScreenTitle } from '../../app/adultTitles'
import { useEffect, useState } from 'react'
import { speak, speakSequence } from '../../audio/speech'
import { useMotionPreset } from '../../design/motion'
import { useLabel, useStrings } from '../../i18n'
import { useProfileStore } from '../../store/profile'
import { Button } from '../../ui/Button'
import { Slider } from '../../ui/controls'
import { Page } from '../../ui/Page'
import { PageHeader } from '../../ui/PageHeader'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import { resolveCard, useCustomCards, voice } from '../schedule/cards'
import { CardArt, CardPicker } from '../schedule/CardPicker'
import { Dial } from './Dial'
import { useTimer } from './store'
import { useWakeLock } from './wakeLock'
import { S } from './strings'
import styles from './Timer.module.css'
import { clampMinutes, formatClock, fractionLeft, MAX_MINUTES, MIN_MINUTES, pause, PRESET_MINUTES, remainingMs, reset, start } from './timerLogic'
import { checkTimerNow, initTimerWatcher } from './watcher'

/**
 * Re-renders with the current time while the timer runs: every animation frame for a smooth sector,
 * or once per second in calm / reduced-motion mode. Date-based, so throttled tabs stay correct.
 */
function useNow(running: boolean, smooth: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    setNow(Date.now())
    if (!running) return
    let raf = 0
    let lastSec = -1
    const frame = () => {
      const n = Date.now()
      const sec = Math.floor(n / 1000)
      if (smooth || sec !== lastSec) {
        lastSec = sec
        setNow(n)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    // rAF pauses in background tabs; a coarse interval and visibility changes keep the end on time.
    const iv = setInterval(() => setNow(Date.now()), 1000)
    const onVis = () => setNow(Date.now())
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelAnimationFrame(raf)
      clearInterval(iv)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [running, smooth])
  return now
}

export default function Timer() {
  const t = useStrings(S)
  const title = useScreenTitle('timer', t('title'))
  const label = useLabel()
  const preset = useMotionPreset()
  const adult = useProfileStore((s) => s.profile.kind === 'adult')
  const { timer, minutes, showDigits, nextRef, setTimer, setMinutes, setShowDigits, setNextRef } = useTimer()
  const digits = showDigits ?? adult
  const custom = useCustomCards()
  const next = nextRef ? resolveCard(nextRef, custom) : null
  const [picking, setPicking] = useState(false)

  const running = timer.status === 'running'
  useWakeLock(running)
  const now = useNow(running, preset.movement)

  // The end signal (chime, voice, toast) comes from the global watcher so it also plays when this screen is closed.
  // Here it is only nudged once the on-screen clock reaches the end, so the dial and the state never disagree.
  useEffect(() => {
    initTimerWatcher()
  }, [])
  useEffect(() => {
    if (running && timer.endsAt !== null && now >= timer.endsAt) checkTimerNow()
  }, [running, now, timer.endsAt])

  const left = remainingMs(timer, now)
  const fraction = fractionLeft(timer, now)
  const done = timer.status === 'done'
  const clock = formatClock(left)

  const toggle = () => {
    if (running) setTimer(pause(timer, Date.now()))
    else {
      setTimer(start(timer, Date.now()))
      if (timer.status !== 'paused') void speak(voice('timer_start'))
    }
  }

  const mainLabel = running ? t('pause') : timer.status === 'paused' ? t('resume') : t('start')

  return (
    <>
      <PageHeader title={title} symbol={<SymbolImg id="hourglass" />} />
      <Page width="normal">
        <div className={styles.layout}>
          <section className={styles.display} aria-live="off">
            <Dial fraction={done ? 0 : fraction} done={done} label={done ? t('timeUp') : t('timeLeft', { time: clock })} />
            {digits && (
              <p className={styles.digits} aria-hidden="true">
                {clock}
              </p>
            )}
            <p className={styles.status} role="status">
              {done ? t('timeUp') : ''}
            </p>
            {next && (
              <div className={styles.next} data-done={done || undefined}>
                <span className={styles.nextHead}>{t('next')}</span>
                <Pressable
                  className={styles.nextCard}
                  label={`${t('next')}: ${label(next.label)}`}
                  onActivate={() => void speakSequence([voice('sched_then'), next.speech])}
                >
                  <span className={styles.nextArt} aria-hidden="true">
                    <CardArt card={next} />
                  </span>
                  <span className={styles.nextName}>{label(next.label)}</span>
                </Pressable>
              </div>
            )}
          </section>

          <section className={styles.controls} data-reach>
            <div className={styles.mainRow}>
              <Button size="xl" icon={running ? <Pause /> : <Play />} onActivate={toggle} className={styles.mainBtn}>
                {mainLabel}
              </Button>
              <Button
                size="xl"
                variant="soft"
                iconOnly
                icon={<RotateCcw />}
                label={t('reset')}
                disabled={timer.status === 'idle'}
                onActivate={() => setTimer(reset(timer))}
              >
                {t('reset')}
              </Button>
            </div>

            <div className={styles.presets} role="group" aria-label={t('presets')}>
              {PRESET_MINUTES.map((m) => (
                <Pressable
                  key={m}
                  className={styles.preset}
                  label={t('minutesLong', { n: m })}
                  pressed={minutes === m}
                  disabled={running}
                  onActivate={() => setMinutes(m)}
                >
                  <span className={styles.presetNum}>{m}</span>
                  <span className={styles.presetUnit} aria-hidden="true">
                    {t('unit')}
                  </span>
                </Pressable>
              ))}
            </div>

            <div className={styles.adult} data-disabled={running || undefined}>
              <Slider
                label={t('custom')}
                value={minutes}
                min={MIN_MINUTES}
                max={MAX_MINUTES}
                format={(v) => t('minutes', { n: v })}
                onChange={(v) => !running && setMinutes(clampMinutes(v))}
              />
              <Pressable className={styles.digitToggle} label={t('digits')} pressed={digits} onActivate={() => setShowDigits(!digits)}>
                <span className={styles.digitText}>
                  <span className={styles.digitLabel}>{t('digits')}</span>
                  <span className={styles.digitHint}>{t('digitsHint')}</span>
                </span>
                <span className={styles.switch} aria-hidden="true">
                  <span className={styles.knob} />
                </span>
              </Pressable>
              <div className={styles.nextTools}>
                <Button variant="soft" icon={<Plus />} onActivate={() => setPicking(true)}>
                  {t('pickNext')}
                </Button>
                {next && (
                  <Button variant="ghost" iconOnly icon={<X />} label={t('clearNext')} onActivate={() => setNextRef(null)}>
                    {t('clearNext')}
                  </Button>
                )}
              </div>
            </div>
          </section>
        </div>
        <CardPicker open={picking} onClose={() => setPicking(false)} onPick={setNextRef} title={t('pickNextTitle')} />
      </Page>
    </>
  )
}

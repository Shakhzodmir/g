import { Delete, Square, Volume2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { stopSpeaking } from '../../audio/speech'
import { useMotionPreset } from '../../design/motion'
import { useLabel, useStrings } from '../../i18n'
import { logEvent } from '../../store/events'
import type { AacSettings } from '../../store/profile'
import { Button } from '../../ui/Button'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import styles from './Aac.module.css'
import { fitzVars } from './Cell'
import { useSpeechHtmlLang } from './lang'
import { MESSAGE_LIMIT } from './message'
import { useMessage } from './store'
import { aacSpeakSequence } from './speak'
import { S } from './strings'

/**
 * Message bar: the symbols tapped so far. Tap it to hear the whole message (tap again, or the Stop pill, to
 * stop); ⌫ removes the last, ✕ clears — both also stop a sentence that is being spoken. The message is kept
 * per profile for the session, so a reload does not lose it.
 */
export function MessageBar({ aac, modeling, extra, compact }: { aac: AacSettings; modeling: boolean; extra?: ReactNode; compact?: boolean }) {
  const t = useStrings(S)
  const label = useLabel()
  const htmlLang = useSpeechHtmlLang()
  const preset = useMotionPreset()
  const items = useMessage((s) => s.items)
  const change = useMessage((s) => s.change)
  const fullTaps = useMessage((s) => s.fullTaps)
  const dispatch = useMessage((s) => s.dispatch)
  const strip = useRef<HTMLSpanElement>(null)
  const [moreBefore, setMoreBefore] = useState(false)
  const [playing, setPlaying] = useState(false)
  const run = useRef(0)
  const full = items.length >= MESSAGE_LIMIT

  // The newest symbol is always in view: the strip starts at its END (horizontal on wide screens, wrapped rows on phones).
  const measure = useCallback(() => {
    const el = strip.current
    if (el) setMoreBefore(el.scrollLeft > 2 || el.scrollTop > 2)
  }, [])
  useLayoutEffect(() => {
    const el = strip.current
    if (el) {
      el.scrollLeft = el.scrollWidth
      el.scrollTop = el.scrollHeight
    }
    measure()
  }, [items.length, measure])
  useEffect(() => {
    const el = strip.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      el.scrollLeft = el.scrollWidth
      el.scrollTop = el.scrollHeight
      measure()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure])
  // Leaving the screen ends the sentence (the shell also stops speech on every route change).
  useEffect(
    () => () => {
      run.current++
    },
    [],
  )

  const sentence = items.map((i) => label(i.text)).join(' ')
  const stop = () => {
    run.current++
    stopSpeaking()
    setPlaying(false)
  }
  const speakAll = () => {
    if (playing) return stop()
    if (!items.length) return
    const mine = ++run.current
    setPlaying(true)
    logEvent('aac_speak', 'bar', {
      refs: items.map((i) => i.key),
      n: items.length,
    })
    void aacSpeakSequence(items.map((i) => ({ key: i.key, text: i.text }))).finally(() => {
      if (run.current === mine) setPlaying(false)
    })
  }

  const hint = modeling ? t('modelingOn') : t('barEmpty')
  // The accessible name starts with what is visible (WCAG 2.5.3): the hint when empty, "Stop" while speaking.
  const name = playing ? `${t('stop')}: ${sentence}` : items.length ? `${t('sayMessage')}: ${sentence}` : `${hint}. ${t('sayMessage')}`

  const announce =
    change?.type === 'add' && change.item
      ? t('announceAdded', { word: label(change.item.text) })
      : change?.type === 'backspace' && change.item
        ? t('announceRemoved', { word: label(change.item.text) })
        : change?.type === 'clear'
          ? t('announceCleared')
          : ''

  return (
    <div className={styles.barRow}>
      <Pressable
        as="div"
        className={styles.bar}
        label={name}
        lang={htmlLang}
        scanGroup="bar"
        data-modeling={modeling ? 'true' : undefined}
        data-empty={items.length ? undefined : 'true'}
        data-full={full ? 'true' : undefined}
        data-playing={playing ? 'true' : undefined}
        onActivate={speakAll}
      >
        {full && (
          <span className={styles.barReady} aria-hidden="true">
            {t('barFull')}
          </span>
        )}
        {moreBefore && (
          <span className={styles.barMore} aria-hidden="true">
            …
          </span>
        )}
        <span ref={strip} className={styles.chips} data-more-before={moreBefore || undefined} onScroll={measure}>
          {items.length === 0 && <span className={styles.barHint}>{hint}</span>}
          <AnimatePresence initial={false}>
            {items.map((i) => (
              <motion.span
                key={i.uid}
                className={styles.chip}
                style={aac.colorCoding ? fitzVars(i.fitz) : undefined}
                data-color={aac.colorCoding ? 'true' : 'false'}
                initial={preset.movement ? { opacity: 0, y: 18, scale: 0.85 } : { opacity: 0 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={preset.pop}
              >
                <span className={styles.chipSymbol} aria-hidden="true">
                  <SymbolImg id={i.symbol} src={i.src} />
                </span>
                {aac.showLabels && <span className={styles.chipLabel}>{label(i.text)}</span>}
              </motion.span>
            ))}
          </AnimatePresence>
        </span>
        {playing && (
          <span className={styles.barStopLabel} aria-hidden="true">
            {t('stop')}
          </span>
        )}
        <span className={styles.barSpeak} data-stop={playing || undefined} aria-hidden="true">
          {playing ? <Square /> : <Volume2 />}
        </span>
      </Pressable>
      <div className={styles.barTools} data-compact={compact || undefined}>
        {extra}

        <Button
          variant="soft"
          size={compact ? 'md' : 'lg'}
          iconOnly
          icon={<Delete />}
          label={t('backspace')}
          scanGroup="bar"
          disabled={!items.length}
          onActivate={() => {
            if (playing) stop()
            dispatch({ type: 'backspace' })
          }}
        >
          {t('backspace')}
        </Button>
        <Button
          variant="soft"
          size={compact ? 'md' : 'lg'}
          iconOnly
          icon={<X />}
          label={t('clear')}
          scanGroup="bar"
          disabled={!items.length}
          onActivate={() => {
            if (playing) stop()
            dispatch({ type: 'clear' })
          }}
        >
          {t('clear')}
        </Button>
      </div>
      <span className="visually-hidden" role="status" aria-live="polite">
        {announce}
      </span>
      <span className="visually-hidden" role="status" aria-live="polite">
        {full && <span key={fullTaps}>{t('barFull')}</span>}
      </span>
    </div>
  )
}

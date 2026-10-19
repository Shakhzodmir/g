import { Delete, Volume2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { speakSequence } from '../../audio/speech'
import { useMotionPreset } from '../../design/motion'
import { useLabel, useStrings } from '../../i18n'
import { logEvent } from '../../store/events'
import type { AacSettings } from '../../store/profile'
import { Button } from '../../ui/Button'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import styles from './Aac.module.css'
import { fitzVars } from './Cell'
import { MESSAGE_LIMIT } from './message'
import { useMessage } from './store'
import { S } from './strings'

/** Message bar: the symbols tapped so far. Tap it to hear the whole message; ⌫ removes the last, ✕ clears. */
export function MessageBar({ aac, modeling, extra, compact }: { aac: AacSettings; modeling: boolean; extra?: ReactNode; compact?: boolean }) {
  const t = useStrings(S)
  const label = useLabel()
  const preset = useMotionPreset()
  const items = useMessage((s) => s.items)
  const dispatch = useMessage((s) => s.dispatch)
  const strip = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = strip.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [items.length])

  const sentence = items.map((i) => label(i.text)).join(' ')
  const speakAll = () => {
    if (!items.length) return
    void speakSequence(items.map((i) => ({ key: i.key, text: i.text })))
    logEvent('aac_speak', 'bar', { refs: items.map((i) => i.key), n: items.length })
  }

  return (
    <div className={styles.barRow}>
      <Pressable
        as="div"
        className={styles.bar}
        label={sentence ? `${t('sayMessage')}: ${sentence}` : t('sayMessage')}
        scanGroup="bar"
        data-modeling={modeling ? 'true' : undefined}
        data-empty={items.length ? undefined : 'true'}
        onActivate={speakAll}
      >
        <span ref={strip} className={styles.chips}>
          {items.length === 0 && <span className={styles.barHint}>{modeling ? t('modelingOn') : t('barEmpty')}</span>}
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
        <span className={styles.barSpeak} aria-hidden="true">
          <Volume2 />
        </span>
      </Pressable>
      <div className={styles.barTools} data-compact={compact || undefined}>
        {extra}
        <Button variant="soft" size={compact ? 'md' : 'lg'} iconOnly icon={<Delete />} label={t('backspace')} scanGroup="bar" disabled={!items.length} onActivate={() => dispatch({ type: 'backspace' })}>
          {t('backspace')}
        </Button>
        <Button variant="soft" size={compact ? 'md' : 'lg'} iconOnly icon={<X />} label={t('clear')} scanGroup="bar" disabled={!items.length} onActivate={() => dispatch({ type: 'clear' })}>
          {t('clear')}
        </Button>
      </div>
      <span className="visually-hidden" aria-live="polite">
        {items.length >= MESSAGE_LIMIT ? t('barFull') : ''}
      </span>
    </div>
  )
}

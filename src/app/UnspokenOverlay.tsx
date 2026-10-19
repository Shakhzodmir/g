import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { onUnspoken, type UnspokenInfo } from '../audio/speech'
import { useMotionPreset } from '../design/motion'
import { labelNow, useStrings } from '../i18n'
import styles from './UnspokenOverlay.module.css'
import { SHELL } from './strings'

const SHOW_MS = 2500

/** Built-in items (w.*, p.*, …) have a bundled clip; only the family's own cards (c.*) can be recorded. */
const isCustom = (key: string) => key.startsWith('c.')

/**
 * When no voice exists for a word (e.g. a custom Uzbek card or typed keyboard text on Android), show it big
 * instead of silence. It never blocks the board: it is docked under the header (over the message bar, which
 * a tap passes through to), ignores pointers and leaves by itself.
 */
export function UnspokenOverlay() {
  const t = useStrings(SHELL)
  const preset = useMotionPreset()
  const [shown, setShown] = useState<UnspokenInfo | null>(null)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const off = onUnspoken((info) => {
      setShown(info)
      clearTimeout(timer)
      timer = setTimeout(() => setShown(null), SHOW_MS)
    })
    return () => {
      off()
      clearTimeout(timer)
    }
  }, [])
  // Same script as everything else on screen: Uzbek follows the device's script (Latin / Cyrillic / 2026), Russian stays Russian.
  const text = shown ? labelNow({ uz: shown.text, ru: shown.text }, shown.lang) : ''
  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          key="unspoken"
          className={styles.toast}
          role="status"
          aria-live="polite"
          lang={shown.lang === 'ru' ? 'ru' : undefined}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={preset.dialog}
        >
          <p className={styles.big}>{text}</p>
          {isCustom(shown.key) && <p className={styles.hint}>{t('unspokenHint')}</p>}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

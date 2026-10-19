import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { onUnspoken } from '../audio/speech'
import { useMotionPreset } from '../design/motion'
import { useStrings } from '../i18n'
import styles from './UnspokenOverlay.module.css'
import { SHELL } from './strings'

/** When no voice exists for a word (e.g. a custom Uzbek card on Android), show it big instead of silence. */
export function UnspokenOverlay() {
  const t = useStrings(SHELL)
  const preset = useMotionPreset()
  const [text, setText] = useState<string | null>(null)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const off = onUnspoken((s) => {
      setText(s)
      clearTimeout(timer)
      timer = setTimeout(() => setText(null), 3500)
    })
    return () => {
      off()
      clearTimeout(timer)
    }
  }, [])
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          className={styles.toast}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={preset.dialog}
          onClick={() => setText(null)}
        >
          <p className={styles.big}>{text}</p>
          <p className={styles.hint}>{t('unspokenHint')}</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

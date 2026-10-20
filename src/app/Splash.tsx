import { useEffect, useState } from 'react'
import { useStrings } from '../i18n'
import styles from './Splash.module.css'
import { SHELL_EXTRA } from './strings'

/** Shown while the profile loads: never a blank page. Static under reduced motion / calm. */
export function Splash({ inline }: { inline?: boolean } = {}) {
  const t = useStrings(SHELL_EXTRA)
  return (
    <div className={inline ? `${styles.splash} ${styles.inline}` : styles.splash} role="status" aria-live="polite">
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.name}>Gapimiz</span>
      <span className="visually-hidden">{t('splash')}</span>
    </div>
  )
}

/** Suspense fallback for a lazy screen: nothing for the first 300 ms (a cached chunk resolves faster, no flash), then the calm splash. */
export function DelayedSplash({ after = 300 }: { after?: number }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShow(true), after)
    return () => clearTimeout(t)
  }, [after])
  return show ? <Splash inline /> : <div className={styles.pending} aria-busy="true" />
}

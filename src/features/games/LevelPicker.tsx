import { Settings } from 'lucide-react'
import { useId, useState } from 'react'
import { useStrings } from '../../i18n'
import { COMMON } from '../../i18n/common'
import { useProfileStore } from '../../store/profile'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { useAdultUnlock } from '../schedule/useAdultUnlock'
import styles from './Games.module.css'
import { LEVELS, type Level } from './logic/rounds'
import type { GameSession } from './session'
import { S } from './strings'

/** Three radio buttons, each named "Daraja N / Уровень N" (the visible digit alone says nothing to a screen reader). */
export function LevelRadios({ value, onChange, large }: { value: Level; onChange: (l: Level) => void; large?: boolean }) {
  const t = useStrings(S)
  const name = useId()
  return (
    <fieldset className={styles.levelSet}>
      <legend className="visually-hidden">{t('level')}</legend>
      <div className={styles.levelSegs} data-large={large || undefined}>
        {LEVELS.map((l) => (
          <label key={l} className={styles.levelSeg} data-checked={l === value || undefined}>
            <input
              type="radio"
              name={name}
              value={l}
              checked={l === value}
              onChange={() => onChange(l)}
              className="visually-hidden"
              aria-label={t('levelLabel', { n: l })}
              data-scan=""
            />
            <span aria-hidden="true">{l}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/**
 * Difficulty control. On a CHILD profile a stray tap must never change the game, so the control sits behind the
 * adult gate (a small gear opens a dialog after the 3 s hold). Adult profiles see the radios directly. A new level
 * starts with the next round: the round in progress is never thrown away.
 */
export function LevelControl({ session }: { session: GameSession }) {
  const t = useStrings(S)
  const tc = useStrings(COMMON)
  const adult = useProfileStore((s) => s.profile.kind === 'adult')
  const { requestUnlock, gate } = useAdultUnlock()
  const [open, setOpen] = useState(false)
  const pending = session.nextLevel !== session.level

  if (adult) {
    return (
      <div className={styles.level}>
        <span className={styles.levelLabel} aria-hidden="true">
          {t('level')}
        </span>
        <LevelRadios value={session.nextLevel} onChange={session.setLevel} />
        {pending && (
          <span className={styles.levelNote} role="status">
            {t('levelNext')}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={styles.level}>
      <Button variant="ghost" iconOnly icon={<Settings />} label={t('levelSettings')} onActivate={() => requestUnlock(() => setOpen(true))}>
        {t('levelSettings')}
      </Button>
      {gate}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('level')}
        footer={<Button onActivate={() => setOpen(false)}>{tc('done')}</Button>}
      >
        <LevelRadios value={session.nextLevel} onChange={session.setLevel} large />
        <p className={styles.levelNote}>{t('levelNext')}</p>
      </Dialog>
    </div>
  )
}

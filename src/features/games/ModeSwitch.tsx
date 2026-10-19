import type { ReactNode } from 'react'
import { Button } from '../../ui/Button'
import styles from './Games.module.css'

export interface ModeOption<T extends string> {
  value: T
  label: string
  icon: ReactNode
}

/** Picture-first mode buttons (a toggle group); the chosen one stays visibly pressed. */
export function ModeSwitch<T extends string>({ label, options, value, onChange }: { label: string; options: Array<ModeOption<T>>; value: T; onChange: (v: T) => void }) {
  return (
    <div className={styles.modes} role="group" aria-label={label}>
      {options.map((o) => (
        <Button
          key={o.value}
          variant={o.value === value ? 'primary' : 'soft'}
          icon={o.icon}
          pressed={o.value === value}
          onActivate={() => o.value !== value && onChange(o.value)}
          scanGroup="modes"
        >
          {o.label}
        </Button>
      ))}
    </div>
  )
}

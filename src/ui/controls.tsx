import { useId, type ReactNode } from 'react'
import styles from './controls.module.css'

/** On/off switch with a visible label (role="switch"). */
export function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId()
  return (
    <div className={styles.row}>
      <span className={styles.labels}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        {hint && <span className={styles.hint}>{hint}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className={styles.switch}
        data-scan=""
        onClick={() => onChange(!checked)}
      >
        <span className={styles.knob} />
      </button>
    </div>
  )
}

/** Range input with label and formatted value. */
export function Slider({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  format = (v) => String(v),
  onChange,
  disabled,
}: {
  label: string
  hint?: string
  value: number
  min: number
  max: number
  step?: number
  format?: (v: number) => string
  onChange: (v: number) => void
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className={styles.stack}>
      <div className={styles.row}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        <output htmlFor={id} className={styles.value}>
          {format(value)}
        </output>
      </div>
      {hint && <span className={styles.hint}>{hint}</span>}
      <input
        id={id}
        className={styles.range}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
}

/** Single-choice segmented control (radio group). */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  wrap,
}: {
  label: string
  options: Array<SegmentOption<T>>
  value: T
  onChange: (v: T) => void
  wrap?: boolean
}) {
  const name = useId()
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.label}>{label}</legend>
      <div className={[styles.segments, wrap && styles.wrap].filter(Boolean).join(' ')}>
        {options.map((o) => (
          <label key={o.value} className={styles.segment} data-checked={o.value === value || undefined}>
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
              className="visually-hidden"
            />
            {o.icon && <span aria-hidden="true">{o.icon}</span>}
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

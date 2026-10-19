import { Minus, Plus } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { useStrings } from '../i18n'
import { Button } from './Button'
import styles from './controls.module.css'
import { UI } from './strings'

/** Rounds to the precision of `step` so 0.1 + 0.2 style drift never reaches the profile. */
function snap(v: number, step: number, min: number, max: number): number {
  const decimals = (String(step).split('.')[1] ?? '').length
  const n = Number(v.toFixed(decimals))
  return Math.min(max, Math.max(min, n))
}

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
  const tu = useStrings(UI)
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
      {/* The native range stays for pointer and keyboard; the − / + pair makes it reachable by switch scanning. */}
      <div className={styles.sliderRow}>
        <Button
          variant="soft"
          iconOnly
          icon={<Minus />}
          label={`${tu('decrease')}: ${label}`}
          disabled={disabled || value <= min}
          onActivate={() => onChange(snap(value - step, step, min, max))}
        >
          {tu('decrease')}
        </Button>
        <input
          id={id}
          className={styles.range}
          style={{ '--fill': `${max > min ? ((value - min) / (max - min)) * 100 : 0}%` } as React.CSSProperties}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-valuetext={format(value)}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <Button
          variant="soft"
          iconOnly
          icon={<Plus />}
          label={`${tu('increase')}: ${label}`}
          disabled={disabled || value >= max}
          onActivate={() => onChange(snap(value + step, step, min, max))}
        >
          {tu('increase')}
        </Button>
      </div>
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
          <label key={o.value} className={styles.segment} data-checked={o.value === value || undefined} data-scan="">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
              className="visually-hidden"
            />
            {o.icon && <span aria-hidden="true">{o.icon}</span>}
            <span className={styles.check} aria-hidden="true">
              ✓
            </span>
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

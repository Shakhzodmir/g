import { Check, SkipForward } from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { useStrings } from '../../../i18n'
import { Button } from '../../../ui/Button'
import { ChoiceCard } from '../ChoiceCard'
import styles from '../Games.module.css'
import ad from './Adult.module.css'
import { A } from './strings'
import { TextOption } from './ui'

export interface RoundOption {
  id: string
  correct: boolean
  /** Accessible name (also the printed text of a text option). */
  label: string
  /** Picture options: symbol id and optional printed caption. */
  symbol?: string
  caption?: string
  /** Text options: printed content (defaults to `label`). */
  text?: ReactNode
}

export interface RoundResult {
  ok: boolean
  wrong: number
  hints: number
}

/**
 * One multiple-choice item: pictures or text rows. A wrong pick is only dimmed (no sound, no colour of failure) and may be
 * tried again; "hint" dims one wrong option; after the right pick the person moves on with "Next" (never a timer).
 */
export function ChoiceRound({
  options,
  layout,
  onPick,
  onSolved,
  solvedNote,
  footer,
  onFinish,
  allowHint = true,
  columns,
}: {
  options: RoundOption[]
  layout: 'pictures' | 'text' | 'textGrid'
  /** Called on every pick (speak the word…); the result says whether it was the right one. */
  onPick?: (o: RoundOption, right: boolean) => void
  /** Called once when the right option is picked. */
  onSolved?: (o: RoundOption) => void
  /** Shown above the buttons once solved (e.g. «Turkum: Meva»). */
  solvedNote?: ReactNode
  /** Replaces the "Next" button once solved (e.g. «Aytdim» in the situations game). Receives `finish`. */
  footer?: (finish: () => void) => ReactNode
  onFinish: (r: RoundResult) => void
  allowHint?: boolean
  /** Picture grid: force a column count class (defaults to the number of options). */
  columns?: number
}) {
  const t = useStrings(A)
  const [wrong, setWrong] = useState<Record<string, number>>({})
  const [dimmed, setDimmed] = useState<string[]>([])
  const [solved, setSolved] = useState<string | null>(null)
  const [hints, setHints] = useState(0)
  const wrongCount = Object.keys(wrong).length

  const pick = (o: RoundOption) => {
    if (solved) return
    onPick?.(o, o.correct)
    if (!o.correct) {
      setWrong((w) => ({ ...w, [o.id]: (w[o.id] ?? 0) + 1 }))
      setDimmed((d) => (d.includes(o.id) ? d : [...d, o.id]))
      return
    }
    setSolved(o.id)
    onSolved?.(o)
  }

  const hint = () => {
    const left = options.filter((o) => !o.correct && !dimmed.includes(o.id))
    if (!left.length) return
    setDimmed((d) => [...d, left[0].id])
    setHints((h) => h + 1)
  }

  const finish = () => onFinish({ ok: wrongCount === 0 && hints === 0, wrong: wrongCount, hints })
  const state = (o: RoundOption) => (solved ? (o.id === solved ? 'right' : 'dim') : dimmed.includes(o.id) ? 'dim' : 'idle')
  const canHint = allowHint && !solved && options.filter((o) => !o.correct && !dimmed.includes(o.id)).length > 1

  return (
    <>
      {layout === 'pictures' ? (
        <ul
          className={styles.choices}
          role="list"
          data-reach
          data-n={options.length}
          data-many={options.length > 4 || undefined}
          style={{ '--n': columns ?? options.length } as CSSProperties}
        >
          {options.map((o) => (
            <li key={o.id}>
              <ChoiceCard symbol={o.symbol ?? 'puzzle_piece'} caption={o.caption} label={o.label} state={state(o)} wiggle={wrong[o.id] ?? 0} onActivate={() => pick(o)} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className={[ad.textList, layout === 'textGrid' && ad.textGrid].filter(Boolean).join(' ')} role="list" data-reach>
          {options.map((o) => (
            <li key={o.id}>
              <TextOption label={o.label} state={state(o)} center={layout === 'textGrid'} onActivate={() => pick(o)}>
                {o.text ?? o.label}
              </TextOption>
            </li>
          ))}
        </ul>
      )}

      {solved && solvedNote}

      <div className={ad.footer}>
        {solved ? (
          footer ? (
            footer(finish)
          ) : (
            <Button variant="primary" size="lg" icon={<Check />} onActivate={finish} autoFocus>
              {t('next')}
            </Button>
          )
        ) : (
          <>
            {allowHint && (
              <Button variant="soft" size="lg" onActivate={hint} disabled={!canHint}>
                {t('hint')}
              </Button>
            )}
            <Button variant="ghost" size="lg" icon={<SkipForward />} onActivate={() => onFinish({ ok: false, wrong: wrongCount, hints })}>
              {t('skip')}
            </Button>
          </>
        )}
      </div>
    </>
  )
}

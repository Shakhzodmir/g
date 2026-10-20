import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { speakSequence, type SpeakItem } from '../../audio/speech'
import { playSfx } from '../../audio/sfx'
import { useStrings } from '../../i18n'
import { ChoiceCard, type ChoiceState } from './ChoiceCard'
import styles from './Games.module.css'
import { PromptBar } from './PromptBar'
import { useHint, wait, type GameSession } from './session'
import { S } from './strings'

/** One card of a pick step. Give `symbol` or a drawn `visual`. */
export interface PickOpt {
  id: string
  /** Accessible name (always the spoken word / short description). */
  label: string
  /** Visible caption (optional). */
  caption?: string
  symbol?: string
  visual?: ReactNode
  /** Spoken when this card is the right one (may be empty). */
  speak?: SpeakItem[]
}

/** One item of a round: a spoken prompt and cards; the child taps `answers` in order (usually one). */
export interface PickStep {
  sid: string
  prompt: SpeakItem[]
  promptText: string
  /** Shown between the prompt and the cards; receives how many answers are done. */
  header?: (progress: number) => ReactNode
  options: PickOpt[]
  answers: string[]
  /** Tell the adult-visible log whether the step was solved without a miss. */
  detail?: Record<string, unknown>
}

/**
 * The shared "question and cards" round of the children's games. Errorless: a wrong card only wiggles, and after a few
 * seconds the right one glows. The prompt is spoken when an item appears (the child already started the round) and
 * again from the speaker button. Nothing is timed.
 */
export function PickRound({ session, steps, reach = true }: { session: GameSession; steps: PickStep[]; reach?: boolean }) {
  const t = useStrings(S)
  const [index, setIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [chosen, setChosen] = useState<string[]>([])
  const [solved, setSolved] = useState(false)
  const [wiggles, setWiggles] = useState<Record<string, number>>({})
  const [bobs, setBobs] = useState<Record<string, number>>({})
  const missed = useRef(false)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const cur = steps[index]
  useEffect(() => {
    const c = steps[index]
    if (c) void speakSequence(c.prompt)
  }, [index, steps])
  const hint = useHint(`${index}.${progress}`, !solved)
  if (!cur) return null

  const ask = () => void speakSequence(cur.prompt)

  const pick = async (o: PickOpt) => {
    if (solved || chosen.includes(o.id)) return
    if (o.id !== cur.answers[progress]) {
      missed.current = true
      setWiggles((w) => ({ ...w, [o.id]: (w[o.id] ?? 0) + 1 }))
      return
    }
    const nextProgress = progress + 1
    setChosen((c) => [...c, o.id])
    setBobs((b) => ({ ...b, [o.id]: (b[o.id] ?? 0) + 1 }))
    playSfx('pop')
    if (nextProgress < cur.answers.length) {
      setProgress(nextProgress)
      if (o.speak?.length) void speakSequence(o.speak)
      return
    }
    setProgress(nextProgress)
    setSolved(true)
    if (o.speak?.length) await speakSequence(o.speak)
    await wait(450)
    if (!alive.current) return
    const ok = !missed.current
    missed.current = false
    session.itemDone(ok, cur.detail)
    if (index + 1 < steps.length) {
      setIndex(index + 1)
      setProgress(0)
      setChosen([])
      setSolved(false)
      setWiggles({})
    }
  }

  const n = cur.options.length
  return (
    <div className={styles.seek} data-hdr={cur.header ? '' : undefined}>
      <PromptBar text={cur.promptText} listenLabel={t('listenAgain')} onListen={ask} />
      {cur.header?.(progress)}
      <ul className={styles.choices} role="list" data-reach={reach || undefined} data-n={n} data-many={n > 4 || undefined} style={{ '--n': n } as CSSProperties}>
        {cur.options.map((o) => {
          const isChosen = chosen.includes(o.id)
          const next = o.id === cur.answers[progress]
          const state: ChoiceState = isChosen ? 'right' : next && hint && !solved ? 'hint' : solved ? 'dim' : 'idle'
          return (
            <li key={o.id}>
              <ChoiceCard symbol={o.symbol} visual={o.visual} caption={o.caption} label={o.label} state={state} wiggle={wiggles[o.id] ?? 0} bob={bobs[o.id] ?? 0} onActivate={() => void pick(o)} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

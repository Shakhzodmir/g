import { Fragment, useMemo } from 'react'
import { useLabel, useStrings } from '../../i18n'
import { SymbolImg } from '../../ui/SymbolImg'
import { GameShell } from './GameShell'
import { gameLine, hasWord, kidWord, lastTarget, lineBi, lineItem, setLastTarget, wordItem } from './kidCommon'
import { K } from './kidStrings'
import styles from './Kid.module.css'
import { makeRoutineRound } from './logic/routine'
import { PickRound, type PickStep } from './PickRound'
import { useGameSession, type GameSession } from './session'

/** «Nima keyin? / Что дальше?»: everyday routines as picture cards. Pick the next step, or put the steps in order. */
export default function RoutineGame() {
  const t = useStrings(K)
  const session = useGameSession('routine')
  return (
    <GameShell session={session} title={t('routine')} symbol="sunrise">
      <Round key={`${session.round}-${session.level}`} session={session} />
    </GameShell>
  )
}

function Round({ session }: { session: GameSession }) {
  const label = useLabel()
  const t = useStrings(K)
  const level = session.level
  const items = useMemo(() => {
    const r = makeRoutineRound(level, hasWord, Math.random, 5, lastTarget('routine'))
    setLastTarget('routine', r[r.length - 1]?.steps.join())
    return r
  }, [level])
  const steps = useMemo<PickStep[]>(() => {
    const line = gameLine(level === 1 ? 'g.routine.next' : 'g.routine.order')
    return items.map((it) => ({
      sid: it.steps.join(),
      prompt: [lineItem(line)],
      promptText: label(lineBi(line)),
      answers: it.answers,
      detail: { routine: it.steps.join('>') },
      header: (progress: number) => {
        const placed = [...it.shown, ...it.answers.slice(0, progress)]
        return (
          <ol className={styles.steps} aria-label={t('stepN', { n: placed.length })}>
            {it.steps.map((id, i) => {
              const w = kidWord(id)!
              const filled = i < placed.length
              return (
                <Fragment key={`${id}.${i}`}>
                  {i > 0 && (
                    <li className={styles.arrow} aria-hidden="true">
                      ›
                    </li>
                  )}
                  <li className={styles.step}>
                    <span className={styles.stepPic} data-empty={filled ? undefined : ''} aria-label={filled ? label(w) : t('emptyStep')} role="img">
                      {filled ? <SymbolImg id={w.symbol} /> : i + 1}
                    </span>
                    {filled && <span className={styles.stepName}>{label(w)}</span>}
                  </li>
                </Fragment>
              )
            })}
          </ol>
        )
      },
      options: it.options.map((id) => {
        const w = kidWord(id)!
        return { id, label: label(w), caption: label(w), symbol: w.symbol, speak: [wordItem(w)] }
      }),
    }))
  }, [items, label, level, t])
  return <PickRound session={session} steps={steps} />
}

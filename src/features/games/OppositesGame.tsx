import { useMemo } from 'react'
import { useLabel, useStrings } from '../../i18n'
import { GameShell } from './GameShell'
import { gameLine, hasWord, kidWord, lastTarget, lineBi, lineItem, setLastTarget, wordItem } from './kidCommon'
import { K } from './kidStrings'
import { OppPicture } from './kidVisuals'
import styles from './Kid.module.css'
import { makeOppRound } from './logic/opposite'
import { PickRound, type PickStep } from './PickRound'
import { useGameSession, type GameSession } from './session'

/** «Qarama-qarshi / Наоборот»: one side of a pair is shown and said (big); the child finds the opposite. */
export default function OppositesGame() {
  const t = useStrings(K)
  const session = useGameSession('opposite')
  return (
    <GameShell session={session} title={t('opposite')} symbol="left_right_arrow">
      <Round key={`${session.round}-${session.level}`} session={session} />
    </GameShell>
  )
}

function Round({ session }: { session: GameSession }) {
  const label = useLabel()
  const t = useStrings(K)
  const level = session.level
  const items = useMemo(() => {
    const r = makeOppRound(level, hasWord, Math.random, 5, lastTarget('opposite'))
    setLastTarget('opposite', r[r.length - 1]?.pair.id)
    return r
  }, [level])
  const steps = useMemo<PickStep[]>(() => {
    const ask = gameLine('g.opp.ask')
    return items.map((it) => {
      const shown = kidWord(it.shown.word)!
      return {
        sid: it.shown.id,
        prompt: [wordItem(shown), lineItem(ask)],
        promptText: label(lineBi(ask)),
        answers: [it.correct.id],
        detail: { pair: it.pair.id },
        header: () => (
          <div className={styles.header}>
            <div className={styles.bigPicCaption}>
              {!it.hideShown && (
                <span className={styles.bigPic} role="img" aria-label={`${t('shownWord')}: ${label(shown)}`}>
                  <OppPicture visual={it.shown.visual} />
                </span>
              )}
              <span>{label(shown)}</span>
            </div>
          </div>
        ),
        options: it.options.map((o) => {
          const w = kidWord(o.word)!
          return { id: o.id, label: label(w), caption: label(w), visual: <OppPicture visual={o.visual} />, speak: [wordItem(w)] }
        }),
      }
    })
  }, [items, label, t])
  return <PickRound session={session} steps={steps} />
}

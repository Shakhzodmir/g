import { useMemo } from 'react'
import { useLabel, useStrings } from '../../i18n'
import { GameShell } from './GameShell'
import { kidWord, kidWords, lastTarget, lineBi, lineItem, setLastTarget, wordItem } from './kidCommon'
import { K } from './kidStrings'
import { makePointRound } from './logic/pointto'
import { PickRound, type PickStep } from './PickRound'
import { useGameSession, type GameSession } from './session'

/**
 * «Eshit va koʻrsat / Послушай и покажи»: a short sentence, then the matching picture among 2–3;
 * on level 3 a two-step instruction («Avval olmani, keyin sutni koʻrsat») — tap the two pictures in the spoken order.
 */
export default function ListenPointGame() {
  const t = useStrings(K)
  const session = useGameSession('point')
  return (
    <GameShell session={session} title={t('point')} symbol="headphone">
      <Round key={`${session.round}-${session.level}`} session={session} />
    </GameShell>
  )
}

function Round({ session }: { session: GameSession }) {
  const label = useLabel()
  const level = session.level
  const items = useMemo(() => {
    const r = makePointRound(kidWords(), level, Math.random, 5, lastTarget('point'))
    setLastTarget('point', r[r.length - 1]?.line.key)
    return r
  }, [level])
  const steps = useMemo<PickStep[]>(
    () =>
      items.map((it) => ({
        sid: it.line.key,
        prompt: [lineItem(it.line)],
        promptText: label(lineBi(it.line)),
        answers: it.answers,
        detail: { line: it.line.key },
        // Pictures only: the child has to listen. The name is on the card's accessible label.
        options: it.options.map((id) => {
          const w = kidWord(id)!
          return { id, label: label(w), symbol: w.symbol, speak: [wordItem(w)] }
        }),
      })),
    [items, label],
  )
  return <PickRound session={session} steps={steps} />
}

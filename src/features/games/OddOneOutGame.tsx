import { useMemo } from 'react'
import { useLabel, useStrings } from '../../i18n'
import { GameShell } from './GameShell'
import { gameLine, kidWord, lineBi, lineItem, wordItem } from './kidCommon'
import { K } from './kidStrings'
import { makeOddRound } from './logic/oddone'
import { PickRound, type PickStep } from './PickRound'
import { useGameSession, type GameSession } from './session'

const symbolOf = (id: string) => kidWord(id)?.symbol

/** «Nima ortiqcha? / Что лишнее?»: three or four pictures, one does not belong. */
export default function OddOneOutGame() {
  const t = useStrings(K)
  const session = useGameSession('odd')
  return (
    <GameShell session={session} title={t('odd')} symbol="detective">
      <Round key={`${session.round}-${session.level}`} session={session} />
    </GameShell>
  )
}

function Round({ session }: { session: GameSession }) {
  const label = useLabel()
  const level = session.level
  const items = useMemo(() => makeOddRound(level, symbolOf), [level])
  const steps = useMemo<PickStep[]>(() => {
    const ask = gameLine('g.odd.ask')
    return items.map((it) => ({
      sid: `${it.group}.${it.odd}`,
      prompt: [lineItem(ask)],
      promptText: label(lineBi(ask)),
      answers: [it.odd],
      detail: { group: it.group, odd: it.odd },
      options: it.options.map((id) => {
        const w = kidWord(id)!
        return { id, label: label(w), caption: label(w), symbol: w.symbol, speak: [wordItem(w)] }
      }),
    }))
  }, [items, label])
  return <PickRound session={session} steps={steps} />
}

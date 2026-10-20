import { useMemo } from 'react'
import { useLabel, useStrings } from '../../../i18n'
import { GameShell } from '../GameShell'
import { useGameSession, type GameSession } from '../session'
import { S } from '../strings'
import ad from './Adult.module.css'
import { ChoiceRound, type RoundOption } from './ChoiceRound'
import { oddRound, type OddItem } from './logic/oddone'
import { A } from './strings'
import { AdultPrompt, sayItem, useItemFlow } from './ui'

export default function OddOneGame() {
  const t = useStrings(S)
  const session = useGameSession('oddone')
  return (
    <GameShell session={session} title={t('oddone')} symbol="white_question_mark">
      <Odd key={`${session.round}-${session.level}`} session={session} />
    </GameShell>
  )
}

function Odd({ session }: { session: GameSession }) {
  const items = useMemo(() => oddRound(session.level, Math.random, session.total), [session.level, session.total])
  const { index, cur, finish } = useItemFlow(session, items)
  if (!cur) return null
  return <OddView key={`${index}-${cur.odd.id}`} item={cur} onFinish={finish} />
}

function OddView({ item, onFinish }: { item: OddItem; onFinish: (ok: boolean, detail?: Record<string, unknown>) => void }) {
  const a = useStrings(A)
  const label = useLabel()
  const options: RoundOption[] = item.options.map((o) => ({ id: o.id, correct: o.id === item.odd.id, label: label(o), symbol: o.symbol, caption: label(o) }))
  return (
    <div className={ad.col}>
      <AdultPrompt text={a('oddTask')} />
      <ChoiceRound
        options={options}
        layout="pictures"
        onPick={(o) => {
          const it = item.options.find((x) => x.id === o.id)
          if (it) void sayItem(it)
        }}
        solvedNote={<p className={ad.reveal}>{a('oddReveal', { cat: label(item.cat.title) })}</p>}
        onFinish={(r) => onFinish(r.ok, { cat: item.cat.id, odd: item.odd.id, wrong: r.wrong, hints: r.hints })}
      />
    </div>
  )
}

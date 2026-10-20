import { Check, Volume2 } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { SITUATIONS, sitKey } from '../../../content/adultgamedata'
import { useLabel, useStrings } from '../../../i18n'
import { Button } from '../../../ui/Button'
import { SymbolImg } from '../../../ui/SymbolImg'
import { GameShell } from '../GameShell'
import { useGameSession, type GameSession } from '../session'
import { S } from '../strings'
import ad from './Adult.module.css'
import { ChoiceRound, type RoundOption } from './ChoiceRound'
import { situationRound, type SituationItem } from './logic/situations'
import { A } from './strings'
import { sayText, useItemFlow } from './ui'

export default function SituationsGame() {
  const t = useStrings(S)
  const session = useGameSession('situations')
  return (
    <GameShell session={session} title={t('situations')} symbol="speech_balloon">
      <Situations key={`${session.round}-${session.level}`} session={session} />
    </GameShell>
  )
}

function Situations({ session }: { session: GameSession }) {
  const items = useMemo(() => situationRound(session.level, Math.random, Math.min(session.total, SITUATIONS.length)), [session.level, session.total])
  const { index, cur, finish } = useItemFlow(session, items)
  if (!cur) return null
  return <SituationView key={`${index}-${cur.sit.id}`} item={cur} onFinish={finish} />
}

function SituationView({ item, onFinish }: { item: SituationItem; onFinish: (ok: boolean, detail?: Record<string, unknown>) => void }) {
  const a = useStrings(A)
  const label = useLabel()
  const { sit } = item
  const scene = () => void sayText(sitKey(sit.id, 'ctx'), sit.ctx)

  useEffect(() => {
    scene()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sit.id])

  const options: RoundOption[] = item.options.map((o, i) => ({ id: `${o.key}-${i}`, correct: o.good, label: label(o.text), text: label(o.text) }))
  const textOf = (id: string) => item.options.find((o, i) => `${o.key}-${i}` === id)

  return (
    <div className={ad.col}>
      <div className={ad.scene}>
        <span className={ad.scenePic} aria-hidden="true">
          <SymbolImg id={sit.symbol} />
        </span>
        <p className={ad.sceneLabel}>{a('sitScene')}</p>
        <p className={ad.sceneText}>{label(sit.ctx)}</p>
        <span className={ad.sceneHear}>
          <Button variant="soft" size="lg" iconOnly icon={<Volume2 />} label={a('hearAgain')} onActivate={scene}>
            {a('hearAgain')}
          </Button>
        </span>
      </div>
      <p className={ad.task}>{a('sitTask')}</p>
      <ChoiceRound
        options={options}
        layout="text"
        allowHint
        onPick={(o) => {
          const opt = textOf(o.id)
          if (opt) void sayText(opt.key, opt.text)
        }}
        solvedNote={
          <p className={ad.reveal} role="status">
            {a('sitFit')} {a('sitSay')}
          </p>
        }
        footer={(finish) => (
          <Button variant="primary" size="lg" icon={<Check />} onActivate={finish} autoFocus>
            {a('said')}
          </Button>
        )}
        onFinish={(r) => onFinish(r.ok, { sit: sit.id, wrong: r.wrong, hints: r.hints })}
      />
    </div>
  )
}

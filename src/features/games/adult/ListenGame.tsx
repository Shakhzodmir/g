import { Check, Eye, EyeOff, SkipForward } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLabel, useStrings } from '../../../i18n'
import { Button } from '../../../ui/Button'
import { ChoiceCard } from '../ChoiceCard'
import { GameShell } from '../GameShell'
import styles from '../Games.module.css'
import { useGameSession, type GameSession } from '../session'
import { S } from '../strings'
import ad from './Adult.module.css'
import { ChoiceRound, type RoundOption } from './ChoiceRound'
import { listenRound, type ListenItem } from './logic/listening'
import { A } from './strings'
import { AdultPrompt, sayItem, sayText, useItemFlow } from './ui'

export default function ListenGame() {
  const t = useStrings(S)
  const session = useGameSession('listen')
  return (
    <GameShell session={session} title={t('listen')} symbol="ear">
      <Listen key={`${session.round}-${session.level}`} session={session} />
    </GameShell>
  )
}

function Listen({ session }: { session: GameSession }) {
  const items = useMemo(() => listenRound(session.level, Math.random, session.total), [session.level, session.total])
  const { index, cur, finish } = useItemFlow(session, items)
  if (!cur) return null
  return <ListenView key={`${index}-${cur.id}`} item={cur} level={session.level} onFinish={finish} />
}

type Finish = (ok: boolean, detail?: Record<string, unknown>) => void

function ListenView({ item, level, onFinish }: { item: ListenItem; level: number; onFinish: Finish }) {
  const a = useStrings(A)
  const label = useLabel()
  // The question is spoken; its words are also shown (hidden by default at level 3 so the ear does the work).
  const [showText, setShowText] = useState(level < 3)
  const ask = () => void sayText(item.key, item.prompt)

  useEffect(() => {
    ask()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  const detail = (r: { wrong: number; hints: number }) => ({ kind: item.kind, q: item.id, wrong: r.wrong, hints: r.hints })

  return (
    <div className={ad.col}>
      <AdultPrompt
        text={showText ? label(item.prompt) : undefined}
        sub={showText ? undefined : a('listenTask')}
        onListen={ask}
        listenLabel={a('hearAgain')}
        extra={
          <Button variant="ghost" size="lg" iconOnly icon={showText ? <EyeOff /> : <Eye />} pressed={showText} label={showText ? a('hideText') : a('showText')} onActivate={() => setShowText((v) => !v)}>
            {showText ? a('hideText') : a('showText')}
          </Button>
        }
      />

      {(item.kind === 'cat' || item.kind === 'word' || item.kind === 'qa') && (
        <ChoiceRound
          options={item.options.map<RoundOption>((o) => ({ id: o.id, correct: o.id === item.answer, label: label(o), symbol: o.symbol, caption: label(o) }))}
          layout="pictures"
          onSolved={(o) => {
            const it = item.options.find((x) => x.id === o.id)
            if (it) void sayItem(it)
          }}
          onFinish={(r) => onFinish(r.ok, detail(r))}
        />
      )}

      {item.kind === 'place' && (
        <ChoiceRound
          layout="textGrid"
          options={item.places.map<RoundOption>((p) => ({ id: p.id, correct: p.id === item.answer, label: label(p.text) }))}
          allowHint={false}
          onPick={(o) => {
            const p = item.places.find((x) => x.id === o.id)
            if (p) void sayText(`g.ad.loc.${p.id}`, p.text)
          }}
          onFinish={(r) => onFinish(r.ok, detail(r))}
        />
      )}

      {item.kind === 'yesno' && (
        <ChoiceRound
          layout="textGrid"
          allowHint={false}
          options={[
            { id: 'yes', correct: item.yes, label: a('yes') },
            { id: 'no', correct: !item.yes, label: a('no') },
          ]}
          onPick={(o) => void sayText(o.id === 'yes' ? 'g.ad.yes' : 'g.ad.no', o.id === 'yes' ? { uz: 'Ha', ru: 'Да' } : { uz: 'Yoʻq', ru: 'Нет' })}
          onFinish={(r) => onFinish(r.ok, detail(r))}
        />
      )}

      {item.kind === 'command' && <Command item={item} showText={showText} onFinish={(r) => onFinish(r.ok, detail(r))} />}
    </div>
  )
}

/** Two-step command: both pictures must be chosen, in the spoken order. A wrong pick is only dimmed. */
function Command({ item, onFinish }: { item: Extract<ListenItem, { kind: 'command' }>; showText: boolean; onFinish: (r: { ok: boolean; wrong: number; hints: number }) => void }) {
  const a = useStrings(A)
  const label = useLabel()
  const [chosen, setChosen] = useState<string[]>([])
  const [wrong, setWrong] = useState<Record<string, number>>({})
  const [miss, setMiss] = useState(0)
  const done = chosen.length === 2

  const pick = (id: string) => {
    if (done || chosen.includes(id)) return
    const want = item.order[chosen.length]
    if (id === want) {
      setChosen([...chosen, id])
      const it = item.options.find((o) => o.id === id)
      if (it) void sayItem(it)
    } else {
      setWrong((w) => ({ ...w, [id]: (w[id] ?? 0) + 1 }))
      setMiss((m) => m + 1)
    }
  }

  return (
    <>
      <p className={ad.status}>{done ? a('cmdProgress', { n: 2 }) : `${a('cmdOrder')} ${a('cmdProgress', { n: chosen.length })}`}</p>
      <ul className={styles.choices} role="list" data-reach data-n={item.options.length} data-many data-cmd style={{ '--n': 3 } as React.CSSProperties}>
        {item.options.map((o) => (
          <li key={o.id}>
            <ChoiceCard
              symbol={o.symbol}
              caption={label(o)}
              label={label(o)}
              state={chosen.includes(o.id) ? 'right' : done ? 'dim' : 'idle'}
              wiggle={wrong[o.id] ?? 0}
              onActivate={() => pick(o.id)}
            />
          </li>
        ))}
      </ul>
      <div className={ad.footer}>
        {done ? (
          <Button variant="primary" size="lg" icon={<Check />} onActivate={() => onFinish({ ok: miss === 0, wrong: miss, hints: 0 })} autoFocus>
            {a('next')}
          </Button>
        ) : (
          <Button variant="ghost" size="lg" icon={<SkipForward />} onActivate={() => onFinish({ ok: false, wrong: miss, hints: 0 })}>
            {a('skip')}
          </Button>
        )}
      </div>
    </>
  )
}


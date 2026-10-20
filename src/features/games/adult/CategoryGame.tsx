import { Check, Eye, ListChecks, Minus, Plus, SkipForward, Volume2 } from 'lucide-react'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { catItems, type CatDef } from '../../../content/adultgamedata'
import { useLabel, useStrings } from '../../../i18n'
import { Button } from '../../../ui/Button'
import { SymbolImg } from '../../../ui/SymbolImg'
import { ChoiceCard } from '../ChoiceCard'
import { GameShell } from '../GameShell'
import styles from '../Games.module.css'
import { say, useGameSession, type GameSession } from '../session'
import { S } from '../strings'
import { ModeSwitch } from '../ModeSwitch'
import ad from './Adult.module.css'
import { categoryRounds, namingCategories, type CategoryRound } from './logic/category'
import { A } from './strings'
import { AdultPrompt, sayItem, useItemFlow } from './ui'

type Mode = 'find' | 'say'

export default function CategoryGame() {
  const t = useStrings(S)
  const a = useStrings(A)
  const session = useGameSession('category')
  const [mode, setMode] = useState<Mode>('find')

  const resultMain = mode === 'say' ? (s: GameSession) => a('catCount', { n: (s.summary?.details ?? []).reduce((sum, d) => sum + (typeof d.count === 'number' ? d.count : 0), 0) }) : undefined

  return (
    <GameShell
      session={session}
      title={t('category')}
      symbol="card_index_dividers"
      resultMain={resultMain}
      toolbar={
        <ModeSwitch<Mode>
          label={t('mode')}
          value={mode}
          onChange={(m) => {
            setMode(m)
            session.nextRound()
          }}
          options={[
            { value: 'find', label: a('catFind'), icon: <ListChecks /> },
            { value: 'say', label: a('catSay'), icon: <Volume2 /> },
          ]}
        />
      }
    >
      {mode === 'find' ? (
        <FindAll key={`${session.round}-${session.level}`} session={session} />
      ) : (
        <SayMany key={`${session.round}-say`} session={session} />
      )}
    </GameShell>
  )
}

function sayCat(cat: CatDef) {
  void say(`g.ad.c.${cat.id}`, { uz: cat.find.uz, ru: cat.find.ru })
}

function FindAll({ session }: { session: GameSession }) {
  const rounds = useMemo(() => categoryRounds(session.level, Math.random, session.total), [session.level, session.total])
  const { cur, finish } = useItemFlow(session, rounds)
  if (!cur) return null
  return <FindAllItem key={`${cur.cat.id}-${cur.cards.map((c) => c.id).join('')}`} round={cur} onFinish={finish} />
}

function FindAllItem({ round, onFinish }: { round: CategoryRound; onFinish: (ok: boolean, detail?: Record<string, unknown>) => void }) {
  const a = useStrings(A)
  const label = useLabel()
  const [picked, setPicked] = useState<string[]>([])
  const [checked, setChecked] = useState(false)
  const [solved, setSolved] = useState(false)
  const [checks, setChecks] = useState(0)
  const [wiggle, setWiggle] = useState<Record<string, number>>({})
  const { cat, cards, targets } = round

  useEffect(() => {
    sayCat(cat)
  }, [cat])

  const missed = targets.filter((id) => !picked.includes(id))
  const extra = picked.filter((id) => !targets.includes(id))

  const toggle = (id: string) => {
    if (solved) return
    setChecked(false)
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }

  const check = () => {
    setChecks((n) => n + 1)
    setChecked(true)
    if (!missed.length && !extra.length) setSolved(true)
    else setWiggle((w) => Object.fromEntries([...Object.entries(w), ...extra.map((id) => [id, (w[id] ?? 0) + 1] as const)]))
  }

  return (
    <div className={ad.col}>
      <AdultPrompt text={label(cat.find)} sub={a('catPickTask')} onListen={() => sayCat(cat)} listenLabel={a('hearAgain')} />
      <ul
        className={styles.choices}
        role="list"
        data-reach
        data-n={cards.length}
        data-many={cards.length > 4 || undefined}
        style={{ '--n': 3 } as CSSProperties}
      >
        {cards.map((c) => {
          const on = picked.includes(c.id)
          const isMissed = checked && !solved && missed.includes(c.id)
          return (
            <li key={c.id}>
              <ChoiceCard
                symbol={c.symbol}
                caption={label(c)}
                label={label(c)}
                pressed={on}
                state={solved && targets.includes(c.id) ? 'right' : 'idle'}
                wiggle={wiggle[c.id] ?? 0}
                className={[on && ad.picked, isMissed && ad.missed].filter(Boolean).join(' ')}
                onActivate={() => {
                  toggle(c.id)
                  if (!on) void sayItem(c)
                }}
                badge={
                  on ? (
                    <span className={ad.pickedMark} aria-hidden="true">
                      <Check size={18} />
                    </span>
                  ) : undefined
                }
              />
            </li>
          )
        })}
      </ul>

      <p className={ad.status} role="status">
        <span className={solved ? ad.statusOk : undefined}>
          {solved
            ? a('catAll')
            : checked
              ? `${a('catMissed', { n: missed.length })} · ${a('catExtra', { n: extra.length })}`
              : a('catSelected', { n: picked.length })}
        </span>
      </p>

      <div className={ad.footer}>
        {solved ? (
          <Button variant="primary" size="lg" icon={<Check />} onActivate={() => onFinish(checks === 1, { cat: cat.id, checks, picked: picked.length })} autoFocus>
            {a('next')}
          </Button>
        ) : (
          <>
            <Button variant="primary" size="lg" icon={<Check />} onActivate={check} disabled={picked.length === 0}>
              {a('check')}
            </Button>
            <Button variant="ghost" size="lg" icon={<SkipForward />} onActivate={() => onFinish(false, { cat: cat.id, checks, skipped: true })}>
              {a('skip')}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

function SayMany({ session }: { session: GameSession }) {
  const cats = useMemo(() => namingCategories(Math.random, session.total), [session.total])
  const { cur, index, finish } = useItemFlow(session, cats)
  if (!cur) return null
  return <SayItem key={`${index}-${cur.id}`} cat={cur} onFinish={finish} />
}

function SayItem({ cat, onFinish }: { cat: CatDef; onFinish: (ok: boolean, detail?: Record<string, unknown>) => void }) {
  const a = useStrings(A)
  const label = useLabel()
  const [count, setCount] = useState(0)
  const [examples, setExamples] = useState(false)
  const shown = useMemo(() => catItems(cat.id).slice(0, 6), [cat.id])

  useEffect(() => {
    sayCat(cat)
  }, [cat])

  return (
    <div className={ad.col}>
      <AdultPrompt text={label(cat.title)} sub={a('catSayTask')} big onListen={() => sayCat(cat)} listenLabel={a('hearAgain')} />
      <div className={ad.grow}>
        <div className={ad.counter} role="group" aria-label={a('catCount', { n: count })}>
          <Button variant="soft" size="xl" iconOnly icon={<Minus />} label={a('catMinus')} onActivate={() => setCount((n) => Math.max(0, n - 1))} disabled={count === 0}>
            {a('catMinus')}
          </Button>
          <p className={ad.counterValue} aria-live="polite">
            {count}
          </p>
          <Button variant="primary" size="xl" iconOnly icon={<Plus />} label={a('catPlus')} onActivate={() => setCount((n) => n + 1)}>
            {a('catPlus')}
          </Button>
        </div>
        <p className={ad.status}>{a('catCount', { n: count })}</p>

        {examples && (
          <ul className={ad.examples} role="list">
            {shown.map((it) => (
              <li key={it.id} className={ad.example}>
                <span aria-hidden="true">
                  <SymbolImg id={it.symbol} />
                </span>
                <span>{label(it)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className={ad.footer}>
          <Button variant="soft" size="lg" icon={<Eye />} pressed={examples} onActivate={() => setExamples((v) => !v)}>
            {a('catExamples')}
          </Button>
          <Button variant="primary" size="lg" icon={<Check />} onActivate={() => onFinish(count > 0, { cat: cat.id, count, examples })}>
            {a('catFinish')}
          </Button>
        </div>
      </div>
    </div>
  )
}

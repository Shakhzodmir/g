import { Ear, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { speakSequence } from '../../audio/speech'
import { playSfx } from '../../audio/sfx'
import { SOUND_MAKERS } from '../../content/animals'
import type { SoundMaker } from '../../content/types'
import { useLabel, useStrings } from '../../i18n'
import type { Bi } from '../../i18n/types'
import { ChoiceCard } from './ChoiceCard'
import { GameShell } from './GameShell'
import styles from './Games.module.css'
import { makeRound, optionCount, type Level } from './logic/rounds'
import { ModeSwitch } from './ModeSwitch'
import { PromptBar } from './PromptBar'
import { item, say, useGameSession, useHint, wait, type GameSession } from './session'
import { S } from './strings'

/* Fewer, familiar animals at lower levels: fewer things on screen is calmer. */
const LEVEL_SETS: Record<Level, string[]> = {
  1: ['cat', 'dog', 'cow', 'rooster', 'duck', 'car'],
  2: ['cat', 'dog', 'cow', 'rooster', 'duck', 'car', 'sheep', 'horse', 'chicken', 'frog', 'train', 'airplane'],
  3: SOUND_MAKERS.map((s) => s.id),
}

function poolFor(level: Level): SoundMaker[] {
  const ids = new Set(LEVEL_SETS[level])
  return SOUND_MAKERS.filter((s) => ids.has(s.id))
}

const nameItem = (s: SoundMaker) => item(`s.${s.id}`, { uz: s.uz, ru: s.ru })
const soundItem = (s: SoundMaker) => item(`o.${s.id}`, s.sound)
const askText = (s: SoundMaker): Bi => ({ uz: `Kim ${s.sound.uz} deydi?`, ru: `Кто говорит ${s.sound.ru}?` })

let lastTarget: string | undefined

type Mode = 'explore' | 'seek'

export default function AnimalsGame() {
  const t = useStrings(S)
  const session = useGameSession('animals')
  const [mode, setMode] = useState<Mode>('explore')

  return (
    <GameShell
      session={session}
      title={t('animals')}
      symbol="cow"
      showProgress={mode === 'seek'}
      toolbar={
        <ModeSwitch<Mode>
          label={t('mode')}
          value={mode}
          onChange={(m) => {
            setMode(m)
            session.nextRound()
          }}
          options={[
            { value: 'explore', label: t('explore'), icon: <Ear /> },
            { value: 'seek', label: t('seek'), icon: <Search /> },
          ]}
        />
      }
    >
      {mode === 'explore' ? <Explore level={session.level} /> : <Seek key={`${session.round}-${session.level}`} session={session} />}
    </GameShell>
  )
}

function Explore({ level }: { level: Level }) {
  const label = useLabel()
  const [bobs, setBobs] = useState<Record<string, number>>({})
  const pool = poolFor(level)
  return (
    <ul className={styles.exploreGrid} role="list" data-reach>
      {pool.map((s) => (
        <li key={s.id}>
          <ChoiceCard
            symbol={s.symbol}
            caption={label(s)}
            label={label(s)}
            bob={bobs[s.id] ?? 0}
            onActivate={() => {
              setBobs((b) => ({ ...b, [s.id]: (b[s.id] ?? 0) + 1 }))
              void speakSequence([soundItem(s), nameItem(s)])
            }}
          />
        </li>
      ))}
    </ul>
  )
}

function Seek({ session }: { session: GameSession }) {
  const t = useStrings(S)
  const label = useLabel()
  const level = session.level
  const items = useMemo(() => {
    const r = makeRound(poolFor(level), { options: optionCount('animals', level), previous: lastTarget })
    lastTarget = r[r.length - 1]?.target.id
    return r
  }, [level])
  const [index, setIndex] = useState(0)
  const [solved, setSolved] = useState(false)
  const [wiggles, setWiggles] = useState<Record<string, number>>({})
  const [bob, setBob] = useState(0)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const cur = items[index]
  const ask = () => cur && void say(`g.animals.${cur.target.id}`, askText(cur.target))
  // The child started this round with a tap, so the short question is spoken for each new item.
  useEffect(() => {
    const c = items[index]
    if (c) void say(`g.animals.${c.target.id}`, askText(c.target))
  }, [index, items])
  const hint = useHint(`${index}`, !solved)
  if (!cur) return null

  const pick = async (o: SoundMaker) => {
    if (solved) return
    if (o.id !== cur.target.id) {
      setWiggles((w) => ({ ...w, [o.id]: (w[o.id] ?? 0) + 1 }))
      return
    }
    setSolved(true)
    setBob((b) => b + 1)
    playSfx('pop')
    await speakSequence([soundItem(o), nameItem(o)])
    await wait(350)
    if (!alive.current) return
    session.itemDone()
    if (index + 1 < items.length) {
      setIndex(index + 1)
      setSolved(false)
      setWiggles({})
    }
  }

  return (
    <div className={styles.seek}>
      <PromptBar text={label(askText(cur.target))} listenLabel={t('listenAgain')} onListen={ask} />
      <ul className={styles.choices} role="list" data-reach data-n={cur.options.length} style={{ '--n': cur.options.length } as React.CSSProperties}>
        {cur.options.map((o) => {
          const right = o.id === cur.target.id
          return (
            <li key={o.id}>
              <ChoiceCard
                symbol={o.symbol}
                caption={label(o)}
                label={label(o)}
                state={right && solved ? 'right' : right && hint ? 'hint' : solved ? 'dim' : 'idle'}
                wiggle={wiggles[o.id] ?? 0}
                bob={right ? bob : 0}
                onActivate={() => void pick(o)}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

import { LayoutGrid, MessageCircle, Search, SkipForward, Volume2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { speakSequence } from '../../audio/speech'
import { playSfx } from '../../audio/sfx'
import { TOPICS } from '../../content/topics'
import type { TopicId, Word } from '../../content/types'
import { WORDS } from '../../content/vocab'
import { useLabel, useStrings } from '../../i18n'
import type { Bi } from '../../i18n/types'
import { Button } from '../../ui/Button'
import { SymbolImg } from '../../ui/SymbolImg'
import { Tile } from '../../ui/Tile'
import { ChoiceCard } from './ChoiceCard'
import { AdultBar, GameShell } from './GameShell'
import styles from './Games.module.css'
import { FIND_TOPICS, pictureWords } from './logic/pools'
import { makeRound, optionCount } from './logic/rounds'
import { ModeSwitch } from './ModeSwitch'
import { PromptBar } from './PromptBar'
import { item, praise, say, useGameSession, useHint, wait, type GameSession } from './session'
import { S } from './strings'

type Mode = 'seek' | 'say'

const wordItem = (w: Word) => item(`w.${w.id}`, { uz: w.uz, ru: w.ru })
const askText = (w: Word): Bi => ({ uz: `Qani ${w.uz}?`, ru: `Где ${w.ru}?` })

let lastTarget: string | undefined

export default function FindGame() {
  const t = useStrings(S)
  const label = useLabel()
  const session = useGameSession('find')
  const [topic, setTopic] = useState<TopicId | null>(null)
  const [mode, setMode] = useState<Mode>('seek')
  const topicDef = TOPICS.find((x) => x.id === topic)

  const toolbar = (
    <>
      <ModeSwitch<Mode>
        label={t('mode')}
        value={mode}
        onChange={(m) => {
          setMode(m)
          session.nextRound()
        }}
        options={[
          { value: 'seek', label: t('seek'), icon: <Search /> },
          { value: 'say', label: t('say'), icon: <MessageCircle /> },
        ]}
      />
      {topicDef && (
        <Button variant="soft" icon={<LayoutGrid />} label={`${t('topic')}: ${label(topicDef)}`} onActivate={() => setTopic(null)}>
          <span className={styles.topicBtn}>
            <SymbolImg id={topicDef.symbol} size={28} />
            {label(topicDef)}
          </span>
        </Button>
      )}
    </>
  )

  return (
    <GameShell
      session={session}
      title={t('find')}
      symbol="magnifying_glass_tilted_left"
      toolbar={toolbar}
      showLevel={mode === 'seek'}
      showProgress={!!topic}
    >
      {!topic ? (
        <TopicChooser
          onPick={(id) => {
            setTopic(id)
            session.nextRound()
          }}
        />
      ) : mode === 'seek' ? (
        <Seek key={`${session.round}-${session.level}-${topic}`} session={session} topic={topic} />
      ) : (
        <SayIt key={`${session.round}-${topic}`} session={session} topic={topic} />
      )}
    </GameShell>
  )
}

function TopicChooser({ onPick }: { onPick: (t: TopicId) => void }) {
  const t = useStrings(S)
  const label = useLabel()
  return (
    <section className={styles.chooser} aria-label={t('chooseTopic')}>
      <h2 className={styles.chooserTitle}>{t('chooseTopic')}</h2>
      <ul className={styles.topicGrid} role="list">
        {FIND_TOPICS.map((id) => {
          const def = TOPICS.find((x) => x.id === id)!
          return (
            <li key={id}>
              <Tile shape="card" tone="neutral" symbol={def.symbol} title={label(def)} label={label(def)} onActivate={() => onPick(id)} />
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function useAlive() {
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  return alive
}

function Seek({ session, topic }: { session: GameSession; topic: TopicId }) {
  const t = useStrings(S)
  const label = useLabel()
  const level = session.level
  const items = useMemo(() => {
    const r = makeRound(pictureWords(WORDS, topic), { options: optionCount('find', level), previous: lastTarget })
    lastTarget = r[r.length - 1]?.target.id
    return r
  }, [level, topic])
  const [index, setIndex] = useState(0)
  const [solved, setSolved] = useState(false)
  const [wiggles, setWiggles] = useState<Record<string, number>>({})
  const [bob, setBob] = useState(0)
  const alive = useAlive()
  const cur = items[index]

  useEffect(() => {
    const c = items[index]
    if (c) void say(`g.find.${c.target.id}`, askText(c.target))
  }, [index, items])
  const hint = useHint(`${index}`, !solved)
  if (!cur) return null
  const ask = () => void say(`g.find.${cur.target.id}`, askText(cur.target))

  const pick = async (o: Word) => {
    if (solved) return
    if (o.id !== cur.target.id) {
      setWiggles((w) => ({ ...w, [o.id]: (w[o.id] ?? 0) + 1 }))
      return
    }
    setSolved(true)
    setBob((b) => b + 1)
    playSfx('pop')
    await speakSequence([wordItem(o)])
    await wait(450)
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
      <ul className={styles.choices} role="list" data-n={cur.options.length} data-many={cur.options.length > 4 || undefined} style={{ '--n': cur.options.length } as React.CSSProperties}>
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

/** "Say it yourself": the child names the picture, the adult confirms. Every attempt moves on calmly. */
function SayIt({ session, topic }: { session: GameSession; topic: TopicId }) {
  const t = useStrings(S)
  const label = useLabel()
  const items = useMemo(() => {
    const r = makeRound(pictureWords(WORDS, topic), { options: 1, previous: lastTarget })
    lastTarget = r[r.length - 1]?.target.id
    return r
  }, [topic])
  const [index, setIndex] = useState(0)
  const [praised, setPraised] = useState(0)
  const [busy, setBusy] = useState(false)
  const alive = useAlive()
  const cur = items[index]
  if (!cur) return null
  const w = cur.target

  const advance = async (confirmed: boolean) => {
    if (busy) return
    setBusy(true)
    if (confirmed) {
      setPraised((p) => p + 1)
      playSfx('soft')
      await speakSequence([praise()])
    }
    await wait(250)
    if (!alive.current) return
    session.itemDone()
    if (index + 1 < items.length) setIndex(index + 1)
    setBusy(false)
  }

  return (
    <div className={styles.say}>
      <ChoiceCard symbol={w.symbol} caption={label(w)} label={label(w)} bob={praised} className={styles.sayCard} onActivate={() => void speakSequence([wordItem(w)])} />
      <AdultBar
        onConfirm={() => void advance(true)}
        before={
          <Button variant="soft" icon={<Volume2 />} onActivate={() => void speakSequence([wordItem(w)])}>
            {t('hear')}
          </Button>
        }
        after={
          <Button variant="ghost" icon={<SkipForward />} onActivate={() => void advance(false)}>
            {t('next')}
          </Button>
        }
      />
    </div>
  )
}

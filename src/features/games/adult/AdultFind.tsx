import { LayoutGrid } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CAT_BY_ID, CAT_SYMBOL, catItems, usableCats, type CatId, type GItem } from '../../../content/adultgamedata'
import { useLabel, useStrings } from '../../../i18n'
import { shy } from '../../../lib/hyphenate'
import { Button } from '../../../ui/Button'
import { SymbolImg } from '../../../ui/SymbolImg'
import { Tile } from '../../../ui/Tile'
import { GameShell } from '../GameShell'
import styles from '../Games.module.css'
import { makeRound, optionCount } from '../logic/rounds'
import { useGameSession, type GameSession } from '../session'
import { S } from '../strings'
import ad from './Adult.module.css'
import { ChoiceRound, type RoundOption } from './ChoiceRound'
import { A } from './strings'
import { AdultPrompt, sayItem, useItemFlow, useSpeechLang } from './ui'

let lastTarget: string | undefined

/** "Find it" for adult profiles: pick a topic, hear or read a word, point to the picture. Adult topics, plain wording, no mascot. */
export default function AdultFind() {
  const t = useStrings(S)
  const a = useStrings(A)
  const label = useLabel()
  const session = useGameSession('find')
  const [topic, setTopic] = useState<CatId | null>(null)
  const def = topic ? CAT_BY_ID[topic] : null

  const toolbar = def ? (
    <Button variant="soft" icon={<LayoutGrid />} label={`${t('topic')}: ${label(def.title)}`} onActivate={() => setTopic(null)}>
      <span className={styles.topicBtn}>
        <SymbolImg id={CAT_SYMBOL[def.id]} size={28} />
        {label(def.title)}
      </span>
    </Button>
  ) : undefined

  return (
    <GameShell session={session} title={t('findAdult')} symbol="magnifying_glass_tilted_left" toolbar={toolbar} showProgress={!!topic}>
      {!def ? (
        <Chooser
          title={a('findChoose')}
          onPick={(id) => {
            setTopic(id)
            session.nextRound()
          }}
        />
      ) : (
        <Seek key={`${session.round}-${session.level}-${def.id}`} session={session} topic={def.id} />
      )}
    </GameShell>
  )
}

function Chooser({ title, onPick }: { title: string; onPick: (id: CatId) => void }) {
  const label = useLabel()
  const lang = useSpeechLang()
  return (
    <section className={styles.chooser} aria-label={title}>
      <h2 className={styles.chooserTitle}>{title}</h2>
      <ul className={styles.topicGrid} role="list" data-reach>
        {usableCats(6).map((c) => (
          <li key={c.id}>
            <Tile shape="card" tone="neutral" symbol={CAT_SYMBOL[c.id]} title={shy(label(c.title), lang)} label={label(c.title)} onActivate={() => onPick(c.id)} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function Seek({ session, topic }: { session: GameSession; topic: CatId }) {
  const items = useMemo(() => {
    const r = makeRound<GItem>(catItems(topic), { options: optionCount('find', session.level), size: session.total, previous: lastTarget })
    lastTarget = r[r.length - 1]?.target.id
    return r
  }, [session.level, session.total, topic])
  const { index, cur, finish } = useItemFlow(session, items)
  const a = useStrings(A)
  const label = useLabel()
  if (!cur) return null
  const target = cur.target
  const options: RoundOption[] = cur.options.map((o) => ({ id: o.id, correct: o.id === target.id, label: label(o), symbol: o.symbol, caption: label(o) }))
  return (
    <div className={ad.col} key={`${index}-${target.id}`}>
      <SeekPrompt target={target} text={a('findShow', { w: label(target) })} />
      <ChoiceRound
        key={`${index}-${target.id}`}
        options={options}
        layout="pictures"
        onSolved={() => void sayItem(target)}
        onFinish={(r) => finish(r.ok, { w: target.id, wrong: r.wrong, hints: r.hints })}
      />
    </div>
  )
}

function SeekPrompt({ target, text }: { target: GItem; text: string }) {
  const a = useStrings(A)
  // The word is spoken as the picture set appears and on request.
  useEffect(() => {
    void sayItem(target)
  }, [target])
  return <AdultPrompt text={text} onListen={() => void sayItem(target)} listenLabel={a('hearAgain')} />
}

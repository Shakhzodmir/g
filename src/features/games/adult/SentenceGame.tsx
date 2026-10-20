import { Check, Eraser, LifeBuoy, SkipForward, Undo2, Volume2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLabel, useStrings } from '../../../i18n'
import { Button } from '../../../ui/Button'
import { Pressable } from '../../../ui/Pressable'
import { GameShell } from '../GameShell'
import type { GameSession } from '../session'
import { say, useGameSession } from '../session'
import { S } from '../strings'
import ad from './Adult.module.css'
import { hintIndex, isRightOrder, scramble, sentenceRound, sentenceText, type SentenceItem } from './logic/sentence'
import { A } from './strings'
import { AdultPrompt, useItemFlow, useSpeechLang } from './ui'

export default function SentenceGame() {
  const t = useStrings(S)
  const session = useGameSession('sentence')
  return (
    <GameShell session={session} title={t('sentence')} symbol="memo">
      <Sentences key={`${session.round}-${session.level}`} session={session} />
    </GameShell>
  )
}

function Sentences({ session }: { session: GameSession }) {
  const items = useMemo(() => sentenceRound(session.level, Math.random, session.total), [session.level, session.total])
  const { cur, finish } = useItemFlow(session, items)
  if (!cur) return null
  return <SentenceItemView key={cur.id} item={cur} level={session.level} onFinish={finish} />
}

function SentenceItemView({ item, level, onFinish }: { item: SentenceItem; level: number; onFinish: (ok: boolean, detail?: Record<string, unknown>) => void }) {
  const a = useStrings(A)
  const label = useLabel()
  const lang = useSpeechLang()
  const chunks = lang === 'ru' ? item.ru : item.uz
  const order = useMemo(() => scramble(chunks.length), [chunks.length])
  const [placed, setPlaced] = useState<number[]>([])
  const [solved, setSolved] = useState(false)
  const [wrongChecks, setWrongChecks] = useState(0)
  const [hints, setHints] = useState(0)
  const [listened, setListened] = useState(0)
  const [message, setMessage] = useState('')

  const full = sentenceText(item, lang)
  const model = () => {
    setListened((n) => n + 1)
    void say(item.key, { uz: sentenceText(item, 'uz'), ru: sentenceText(item, 'ru') })
  }

  // Level 1 plays the model once as the sentence appears (errorless start); higher levels only on request.
  useEffect(() => {
    if (level === 1) void say(item.key, { uz: sentenceText(item, 'uz'), ru: sentenceText(item, 'ru') })
  }, [item, level])

  const pool = order.filter((i) => !placed.includes(i))

  const place = (i: number) => {
    if (solved) return
    const next = [...placed, i]
    setPlaced(next)
    setMessage('')
    if (next.length === chunks.length) {
      if (isRightOrder(next, chunks)) {
        setSolved(true)
        setMessage(a('sentenceYes'))
        void say(item.key, { uz: sentenceText(item, 'uz'), ru: sentenceText(item, 'ru') })
      } else {
        setWrongChecks((n) => n + 1)
        setMessage(a('sentenceNo'))
      }
    }
  }

  const removeAt = (pos: number) => {
    if (solved) return
    setPlaced(placed.filter((_, k) => k !== pos))
    setMessage('')
  }

  const hint = () => {
    if (solved) return
    // Keep the correct beginning, drop the rest, then add the next right card.
    let k = 0
    while (k < placed.length && chunks[placed[k]] === chunks[k]) k++
    const keep = placed.slice(0, k)
    const rest = order.filter((i) => !keep.includes(i))
    const next = hintIndex(keep, chunks, rest)
    if (next === null) return
    setHints((h) => h + 1)
    const all = [...keep, next]
    setPlaced(all)
    setMessage('')
    if (all.length === chunks.length && isRightOrder(all, chunks)) {
      setSolved(true)
      setMessage(a('sentenceYes'))
      void say(item.key, { uz: sentenceText(item, 'uz'), ru: sentenceText(item, 'ru') })
    }
  }

  const finish = (ok: boolean) => onFinish(ok, { s: item.id, hints, wrong: wrongChecks, listened })

  return (
    <div className={ad.col}>
      <AdultPrompt text={a('sentenceTask')} onListen={model} listenLabel={a('listenModel')} />

      <p className={ad.slotsLabel}>{a('yourSentence')}</p>
      <div className={ad.slots} aria-label={a('yourSentence')} data-reach>
        {placed.length === 0 && <p className={ad.slotsEmpty}>{a('sentenceEmpty')}</p>}
        {placed.map((ci, pos) => (
          <Pressable
            key={ci}
            className={[ad.chunk, ad.chunkPlaced, solved && ad.chunkOk].filter(Boolean).join(' ')}
            label={a('chunkAria', { n: pos + 1, t: label({ uz: chunks[ci], ru: chunks[ci] }) })}
            onActivate={() => removeAt(pos)}
            scanGroup="placed"
          >
            {label({ uz: chunks[ci], ru: chunks[ci] })}
          </Pressable>
        ))}
      </div>

      <p className={ad.status} role="status" data-ok={solved || undefined}>
        <span className={solved ? ad.statusOk : undefined}>{message}</span>
      </p>

      <div className={ad.pool} data-reach>
        {pool.map((ci) => (
          <Pressable key={ci} className={ad.chunk} label={label({ uz: chunks[ci], ru: chunks[ci] })} onActivate={() => place(ci)} scanGroup="pool">
            {label({ uz: chunks[ci], ru: chunks[ci] })}
          </Pressable>
        ))}
      </div>

      <div className={ad.footer}>
        {solved ? (
          <>
            <Button variant="soft" size="lg" icon={<Volume2 />} onActivate={model}>
              {a('hearAgain')}
            </Button>
            <Button variant="primary" size="lg" icon={<Check />} onActivate={() => finish(hints === 0 && wrongChecks === 0)} autoFocus>
              {a('next')}
            </Button>
          </>
        ) : (
          <>
            <Button variant="soft" icon={<LifeBuoy />} onActivate={hint}>
              {a('hint')}
            </Button>
            <Button variant="soft" icon={<Undo2 />} onActivate={() => removeAt(placed.length - 1)} disabled={placed.length === 0}>
              {a('undo')}
            </Button>
            <Button variant="soft" icon={<Eraser />} onActivate={() => setPlaced([])} disabled={placed.length === 0}>
              {a('clearAll')}
            </Button>
            <Button variant="ghost" icon={<SkipForward />} onActivate={() => finish(false)}>
              {a('skip')}
            </Button>
          </>
        )}
      </div>
      <span className="visually-hidden" aria-live="polite">
        {solved ? full : ''}
      </span>
    </div>
  )
}

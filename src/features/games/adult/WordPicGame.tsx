import { BookOpen, Image as ImageIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { GItem } from '../../../content/adultgamedata'
import { useLabel, useStrings } from '../../../i18n'
import { SymbolImg } from '../../../ui/SymbolImg'
import { GameShell } from '../GameShell'
import { ModeSwitch } from '../ModeSwitch'
import { useGameSession, type GameSession } from '../session'
import { S } from '../strings'
import ad from './Adult.module.css'
import { ChoiceRound, type RoundOption } from './ChoiceRound'
import { matchRound, type MatchDirection, type MatchItem } from './logic/matching'
import { A } from './strings'
import { AdultPrompt, sayItem, useItemFlow, useSpeechLang } from './ui'

let lastTarget: string | undefined

export default function WordPicGame() {
  const t = useStrings(S)
  const a = useStrings(A)
  const session = useGameSession('wordpic')
  const [dir, setDir] = useState<MatchDirection>('word-to-picture')
  return (
    <GameShell
      session={session}
      title={t('wordpic')}
      symbol="framed_picture"
      toolbar={
        <ModeSwitch<MatchDirection>
          label={a('wpMode')}
          value={dir}
          onChange={(d) => {
            setDir(d)
            session.nextRound()
          }}
          options={[
            { value: 'word-to-picture', label: a('wpWordToPic'), icon: <BookOpen /> },
            { value: 'picture-to-word', label: a('wpPicToWord'), icon: <ImageIcon /> },
          ]}
        />
      }
    >
      <Matching key={`${session.round}-${session.level}-${dir}`} session={session} dir={dir} />
    </GameShell>
  )
}

function Matching({ session, dir }: { session: GameSession; dir: MatchDirection }) {
  const lang = useSpeechLang()
  const items = useMemo(() => {
    const r = matchRound(session.level, lang, Math.random, session.total, lastTarget)
    lastTarget = r[r.length - 1]?.target.id
    return r
  }, [session.level, session.total, lang])
  const { cur, finish } = useItemFlow(session, items)
  if (!cur) return null
  return <MatchItemView key={cur.target.id} item={cur} dir={dir} level={session.level} onFinish={finish} />
}

function MatchItemView({ item, dir, level, onFinish }: { item: MatchItem; dir: MatchDirection; level: number; onFinish: (ok: boolean, detail?: Record<string, unknown>) => void }) {
  const a = useStrings(A)
  const label = useLabel()
  const { target } = item
  const w2p = dir === 'word-to-picture'
  const options: RoundOption[] = item.options.map((o: GItem) =>
    w2p
      ? { id: o.id, correct: o.id === target.id, label: label(o), symbol: o.symbol }
      : { id: o.id, correct: o.id === target.id, label: label(o), text: label(o) },
  )
  return (
    <div className={ad.col}>
      <AdultPrompt text={w2p ? label(target) : undefined} sub={w2p ? a('wpTaskW2P') : a('wpTaskP2W')} big={w2p} onListen={() => void sayItem(target)} listenLabel={a('hear')}>
        {!w2p && (
          <span className={ad.bigPic} aria-hidden="true">
            <SymbolImg id={target.symbol} />
          </span>
        )}
      </AdultPrompt>
      <ChoiceRound
        options={options}
        layout={w2p ? 'pictures' : 'text'}
        onSolved={() => void sayItem(target)}
        onFinish={(r) => onFinish(r.ok, { w: target.id, dir: w2p ? 'w2p' : 'p2w', level, wrong: r.wrong, hints: r.hints })}
      />
    </div>
  )
}

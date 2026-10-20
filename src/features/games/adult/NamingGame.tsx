import { Check, Keyboard, LifeBuoy, SkipForward, Volume2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { cueFirst, cueKey, FRAMES, frameIdOf, frameKey, itemSyllables, type GItem } from '../../../content/adultgamedata'
import { useLabel, useStrings } from '../../../i18n'
import { shy } from '../../../lib/hyphenate'
import { Button } from '../../../ui/Button'
import { SymbolImg } from '../../../ui/SymbolImg'
import { GameShell } from '../GameShell'
import { say, useGameSession, type GameSession } from '../session'
import { S } from '../strings'
import ad from './Adult.module.css'
import { matchesTyped, namingRound, nextCue, summarizeNaming, type CueLevel, type NamingResult } from './logic/naming'
import { A } from './strings'
import { AdultPrompt, sayItem, useItemFlow, useSpeechLang } from './ui'

let lastTarget: string | undefined

export default function NamingGame() {
  const t = useStrings(S)
  const a = useStrings(A)
  const session = useGameSession('naming')

  const resultMain = (s: GameSession) => {
    const sum = summarizeNaming(detailsOf(s))
    return a('namingUnaided', { n: sum.unaided, total: sum.total })
  }
  const resultNote = (s: GameSession) => {
    const sum = summarizeNaming(detailsOf(s))
    const cueName: Record<number, string> = { 1: a('cueOne'), 2: a('cueTwo'), 3: a('cueThree'), 4: a('cueFour') }
    return (
      <ul className={ad.resultList}>
        {([1, 2, 3, 4] as const).filter((c) => sum.cued[c] > 0).map((c) => (
          <li key={c}>{a('namingCueLine', { c: cueName[c], n: sum.cued[c] })}</li>
        ))}
        {sum.skipped > 0 && <li>{a('namingSkipped', { n: sum.skipped })}</li>}
      </ul>
    )
  }

  return (
    <GameShell session={session} title={t('naming')} symbol="microphone" resultMain={resultMain} resultNote={resultNote}>
      <Naming key={`${session.round}-${session.level}`} session={session} />
    </GameShell>
  )
}

function detailsOf(s: GameSession): NamingResult[] {
  return (s.summary?.details ?? []).map((d) => ({ item: String(d.w ?? ''), cue: (d.cue as CueLevel) ?? 0, ok: !!d.ok, mode: d.mode === 'typed' ? 'typed' : 'said' }))
}

type Done = { cue: CueLevel; mode: 'said' | 'typed' }

function Naming({ session }: { session: GameSession }) {
  const lang = useSpeechLang()
  const items = useMemo(() => {
    const r = namingRound(session.level, lang, Math.random, session.total, lastTarget)
    lastTarget = r[r.length - 1]?.id
    return r
  }, [session.level, session.total, lang])
  const { index, cur, finish } = useItemFlow(session, items)
  if (!cur) return null
  void index
  return <NamingItem key={cur.id} item={cur} onFinish={finish} />
}

function NamingItem({ item, onFinish }: { item: GItem; onFinish: (ok: boolean, detail?: Record<string, unknown>) => void }) {
  const a = useStrings(A)
  const label = useLabel()
  const lang = useSpeechLang()
  const [cue, setCue] = useState<CueLevel>(0)
  const [done, setDone] = useState<Done | null>(null)
  const [typing, setTyping] = useState(false)
  const [text, setText] = useState('')
  const [status, setStatus] = useState('')
  const shownStatus = status || (cue === 0 ? a('cueSteps') : '')
  const inputRef = useRef<HTMLInputElement>(null)
  const started = useRef(Date.now())

  useEffect(() => {
    if (typing) inputRef.current?.focus()
  }, [typing])

  const first = cueFirst(item, lang)
  const frameId = frameIdOf(item)
  const frame = frameId ? FRAMES[frameId] : null
  const upcoming = nextCue(item, cue)
  const oneSyllable = itemSyllables(item, lang).length < 2

  const speakCue = (c: CueLevel) => {
    if (c === 2) {
      const uz = itemSyllables(item, 'uz')[0]
      const ru = itemSyllables(item, 'ru')[0]
      void say(cueKey(item), { uz, ru })
    } else if (c === 3 && frameId && frame) void say(frameKey(frameId), { uz: frame.uz, ru: frame.ru })
    else if (c === 4) void sayItem(item)
  }

  const takeCue = () => {
    const n = nextCue(item, cue)
    if (n === null) return
    setCue(n)
    setStatus(n === 4 ? a('repeatNow') : '')
    speakCue(n)
  }

  const succeed = (mode: 'said' | 'typed') => setDone({ cue, mode })

  const check = () => {
    if (matchesTyped(text, item)) {
      setStatus(a('typedYes'))
      succeed('typed')
    } else setStatus(a('typedNo'))
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    check()
  }

  const next = (ok: boolean, d: Done | null) =>
    onFinish(ok, { w: item.id, cue: d?.cue ?? cue, mode: d?.mode ?? 'said', ms: Date.now() - started.current })

  const cueRows: Array<{ c: CueLevel; name: string; body: string; again?: boolean }> = []
  if (cue >= 1) cueRows.push({ c: 1, name: oneSyllable ? a('cueOneLetter') : a('cueOne'), body: `${label({ uz: first, ru: first })}…` })
  if (cue >= 2) cueRows.push({ c: 2, name: a('cueTwo'), body: label({ uz: itemSyllables(item, 'uz')[0], ru: itemSyllables(item, 'ru')[0] }), again: true })
  if (cue >= 3 && frame) cueRows.push({ c: 3, name: a('cueThree'), body: label({ uz: frame.uz, ru: frame.ru }), again: true })
  if (cue >= 4) cueRows.push({ c: 4, name: a('cueFour'), body: label(item), again: true })

  return (
    <div className={ad.col}>
      <AdultPrompt text={a('namingTask')} />
      <div className={ad.grow}>
        <div className={ad.namingPic} aria-hidden="true">
          <span>
            <SymbolImg id={item.symbol} />
          </span>
        </div>

        {done ? (
          <>
            <p className={ad.namingWord}>{shy(label(item), lang)}</p>
            <div className={ad.footer}>
              <Button variant="soft" size="lg" icon={<Volume2 />} onActivate={() => void sayItem(item)}>
                {a('hear')}
              </Button>
              <Button variant="primary" size="lg" icon={<Check />} onActivate={() => next(true, done)} autoFocus>
                {a('next')}
              </Button>
            </div>
          </>
        ) : (
          <>
            {cueRows.length > 0 && (
              <ol className={ad.cues} aria-label={a('cueLadder', { n: cue })}>
                {cueRows.map((r) => (
                  <li key={r.c} className={ad.cue}>
                    <span className={ad.cueStep}>{r.c}</span>
                    <span className={ad.cueText}>
                      <span className="visually-hidden">{r.name}: </span>
                      {r.body}
                    </span>
                    {r.again && (
                      <Button variant="ghost" iconOnly icon={<Volume2 />} label={a('hearAgain')} onActivate={() => speakCue(r.c)}>
                        {a('hearAgain')}
                      </Button>
                    )}
                  </li>
                ))}
              </ol>
            )}

            {typing && (
              <form className={ad.typeRow} onSubmit={submit}>
                <input
                  ref={inputRef}
                  className={ad.input}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  aria-label={a('typeLabel')}
                  placeholder={a('typeLabel')}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-scan=""
                />
                <Button variant="primary" size="md" onActivate={check}>
                  {a('typeGo')}
                </Button>
              </form>
            )}

            <p className={ad.status} role="status">
              {shownStatus}
            </p>

            <div className={ad.footer}>
              <Button variant="primary" size="lg" icon={<Check />} onActivate={() => succeed('said')}>
                {a('said')}
              </Button>
              <Button variant="soft" size="lg" icon={<LifeBuoy />} onActivate={takeCue} disabled={upcoming === null}>
                {a('hint')}
              </Button>
              <Button variant="soft" size="lg" icon={<Keyboard />} pressed={typing} onActivate={() => setTyping((v) => !v)}>
                {a('typeIt')}
              </Button>
              <Button variant="ghost" size="lg" icon={<SkipForward />} onActivate={() => next(false, null)}>
                {a('skip')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

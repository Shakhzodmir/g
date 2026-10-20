import { useMemo } from 'react'
import { COLORS, type ColorId } from '../../content/gamedata'
import { useLabel, useStrings } from '../../i18n'
import { GameShell } from './GameShell'
import { askBi, askItem, hasWord, kidWord, lastTarget, setLastTarget, wordItem } from './kidCommon'
import { K } from './kidStrings'
import { Swatch } from './kidVisuals'
import { makeColorRound, wordOfColor } from './logic/colors'
import { PickRound, type PickStep } from './PickRound'
import { useGameSession, type GameSession } from './session'

/** «Rangni top / Найди цвет»: point to the named colour (swatches, then real things of that colour). */
export default function ColorsGame() {
  const t = useStrings(K)
  const session = useGameSession('colors')
  return (
    <GameShell session={session} title={t('colors')} symbol="artist_palette">
      <Round key={`${session.round}-${session.level}`} session={session} />
    </GameShell>
  )
}

function Round({ session }: { session: GameSession }) {
  const label = useLabel()
  const level = session.level
  const items = useMemo(() => {
    const r = makeColorRound(level, hasWord, Math.random, lastTarget('colors') as ColorId | undefined)
    setLastTarget('colors', r[r.length - 1]?.target)
    return r
  }, [level])
  const steps = useMemo<PickStep[]>(
    () =>
      items.map((it) => {
        const w = kidWord(wordOfColor(it.target))!
        return {
          sid: it.target,
          prompt: [askItem(w)],
          promptText: label(askBi(w)),
          answers: [it.target],
          detail: { color: it.target },
          options: it.options.map((o) => {
            const name = kidWord(COLORS.find((c) => c.id === o.color)!.word)!
            return {
              id: o.color,
              label: label(name),
              caption: o.symbol ? undefined : label(name),
              symbol: o.symbol,
              visual: o.symbol ? undefined : <Swatch color={o.color} />,
              speak: [wordItem(name)],
            }
          }),
        }
      }),
    [items, label],
  )
  return <PickRound session={session} steps={steps} />
}

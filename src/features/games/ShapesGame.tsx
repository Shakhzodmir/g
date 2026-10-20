import { useMemo } from 'react'
import { SHAPES, type ShapeId } from '../../content/gamedata'
import { useLabel, useStrings } from '../../i18n'
import { GameShell } from './GameShell'
import { askBi, askItem, hasWord, kidWord, lastTarget, setLastTarget, wordItem } from './kidCommon'
import { K } from './kidStrings'
import { ShapeSvg } from './kidVisuals'
import { makeShapeRound, wordOfShape } from './logic/shapes'
import { PickRound, type PickStep } from './PickRound'
import { useGameSession, type GameSession } from './session'

/** «Shaklni top / Найди фигуру»: the named shape among drawn shapes, then in real objects. */
export default function ShapesGame() {
  const t = useStrings(K)
  const session = useGameSession('shapes')
  return (
    <GameShell session={session} title={t('shapes')} symbol="kg_blue_diamond">
      <Round key={`${session.round}-${session.level}`} session={session} />
    </GameShell>
  )
}

function Round({ session }: { session: GameSession }) {
  const label = useLabel()
  const level = session.level
  const items = useMemo(() => {
    const r = makeShapeRound(level, hasWord, Math.random, lastTarget('shapes') as ShapeId | undefined)
    setLastTarget('shapes', r[r.length - 1]?.target)
    return r
  }, [level])
  const steps = useMemo<PickStep[]>(
    () =>
      items.map((it) => {
        const w = kidWord(wordOfShape(it.target))!
        return {
          sid: it.target,
          prompt: [askItem(w)],
          promptText: label(askBi(w)),
          answers: [it.target],
          detail: { shape: it.target },
          options: it.options.map((o) => {
            const name = kidWord(SHAPES.find((s) => s.id === o.shape)!.word)!
            return {
              id: o.shape,
              label: label(name),
              // Level 3 shows real objects: no caption, so the picture alone has to be matched with the heard name.
              caption: o.symbol ? undefined : label(name),
              symbol: o.symbol,
              visual: o.symbol ? undefined : <ShapeSvg shape={o.shape} />,
              speak: [wordItem(name)],
            }
          }),
        }
      }),
    [items, label],
  )
  return <PickRound session={session} steps={steps} />
}

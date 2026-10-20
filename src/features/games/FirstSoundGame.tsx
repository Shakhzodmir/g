import { useMemo } from 'react'
import { useLabel, useStrings } from '../../i18n'
import { useProfileStore } from '../../store/profile'
import { SymbolImg } from '../../ui/SymbolImg'
import { GameShell } from './GameShell'
import { gameLine, kidWords, lastTarget, lineBi, lineItem, setLastTarget, wordItem } from './kidCommon'
import { K } from './kidStrings'
import styles from './Kid.module.css'
import { makeSoundRound } from './logic/sound'
import { PickRound, type PickStep } from './PickRound'
import { useGameSession, type GameSession } from './session'

/**
 * «Qaysi tovush? / Какой звук?»: the child hears a word and picks the picture that begins the same way.
 * The first sounds differ between Uzbek and Russian, so the pictures are chosen from the spelling in the speech language.
 */
export default function FirstSoundGame() {
  const t = useStrings(K)
  const session = useGameSession('sound')
  return (
    <GameShell session={session} title={t('sound')} symbol="ear">
      <Round key={`${session.round}-${session.level}`} session={session} />
    </GameShell>
  )
}

function Round({ session }: { session: GameSession }) {
  const label = useLabel()
  const t = useStrings(K)
  const lang = useProfileStore((s) => s.profile.speechLang)
  const level = session.level
  const items = useMemo(() => {
    const r = makeSoundRound(kidWords(), lang, level, Math.random, 5, lastTarget('sound'))
    setLastTarget('sound', r[r.length - 1]?.sound)
    return r
  }, [level, lang])
  const steps = useMemo<PickStep[]>(() => {
    const ask = gameLine('g.sound.ask')
    return items.map((it) => ({
      sid: `${it.sound}.${it.target.id}`,
      // The word first, then the question: always a whole phrase, never a bare letter.
      prompt: [wordItem(it.target), lineItem(ask)],
      promptText: label(lineBi(ask)),
      answers: [it.correct.id],
      detail: { sound: it.sound, target: it.target.id },
      // Levels 1 and 2 show the heard word as a picture; level 3 is listening only.
      header: level < 3
        ? () => (
            <div className={styles.header}>
              <div className={styles.bigPicCaption}>
                <span className={styles.bigPic} role="img" aria-label={`${t('soundHeard')}: ${label(it.target)}`}>
                  <SymbolImg id={it.target.symbol} />
                </span>
              </div>
            </div>
          )
        : undefined,
      options: it.options.map((w) => ({ id: w.id, label: label(w), caption: label(w), symbol: w.symbol, speak: [wordItem(w)] })),
    }))
  }, [items, label, level, t])
  return <PickRound session={session} steps={steps} />
}

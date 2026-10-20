import { Volume2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { GItem } from '../../../content/adultgamedata'
import { useLabel } from '../../../i18n'
import type { Bi } from '../../../i18n/types'
import { shy } from '../../../lib/hyphenate'
import { useProfileStore } from '../../../store/profile'
import { Button } from '../../../ui/Button'
import { Pressable, type PressableProps } from '../../../ui/Pressable'
import { say, type GameSession } from '../session'
import ad from './Adult.module.css'

/** Speech language of the profile ('uz' covers both scripts). */
export function useSpeechLang(): 'uz' | 'ru' {
  return useProfileStore((s) => s.profile.speechLang) === 'ru' ? 'ru' : 'uz'
}

/** Speaks an item's name (its own clip). */
export function sayItem(it: Pick<GItem, 'key' | 'uz' | 'ru'>): Promise<void> {
  return say(it.key, { uz: it.uz, ru: it.ru })
}

/** Speaks a bilingual text under an audio key. */
export function sayText(key: string, text: Bi): Promise<void> {
  return say(key, { uz: text.uz, ru: text.ru })
}

/** The prompt of an adult game: plain surface, no mascot, a listen button on the right. */
export function AdultPrompt({
  text,
  sub,
  big,
  onListen,
  listenLabel,
  extra,
  children,
}: {
  text?: string
  sub?: string
  big?: boolean
  onListen?: () => void
  listenLabel?: string
  /** Extra control(s) next to the listen button (e.g. show/hide the question text). */
  extra?: ReactNode
  children?: ReactNode
}) {
  const lang = useSpeechLang()
  return (
    <div className={ad.prompt}>
      <div className={ad.promptBody}>
        {text !== undefined && (
          <p className={[ad.promptText, big && ad.promptBig].filter(Boolean).join(' ')} aria-live="polite">
            {shy(text, lang)}
          </p>
        )}
        {sub && <p className={ad.promptSub}>{sub}</p>}
        {children}
      </div>
      {extra}
      {onListen && listenLabel && (
        <Button variant="soft" size="lg" iconOnly icon={<Volume2 />} label={listenLabel} onActivate={onListen}>
          {listenLabel}
        </Button>
      )}
    </div>
  )
}

export type OptionState = 'idle' | 'right' | 'dim'

/** A wide text option (word, phrase, place, yes/no). */
export function TextOption({
  children,
  state = 'idle',
  center,
  mark,
  label,
  className,
  ...rest
}: Omit<PressableProps, 'children' | 'label'> & { children: ReactNode; state?: OptionState; center?: boolean; mark?: ReactNode; label: string }) {
  return (
    <Pressable {...rest} label={label} className={[ad.textOption, center && ad.textOptionCenter, className].filter(Boolean).join(' ')} data-state={state}>
      {mark && (
        <span className={ad.optionMark} aria-hidden="true">
          {mark}
        </span>
      )}
      <span>{children}</span>
    </Pressable>
  )
}

/** A bilingual text rendered in the speech language / script. */
export function useBiText() {
  const label = useLabel()
  return (b: Bi) => label(b)
}

/**
 * Walks through the items of a round: `finish` records the result in the session and moves to the next item
 * (the last one ends the round, which unmounts the game).
 */
export function useItemFlow<T>(session: GameSession, items: readonly T[]) {
  const [index, setIndex] = useState(0)
  const finish = (ok: boolean, detail?: Record<string, unknown>) => {
    const last = index + 1 >= items.length
    session.itemDone(ok, detail)
    // A pool that cannot fill a whole set still ends the round after its last item.
    if (last && items.length < session.total) session.finishRound()
    if (!last) setIndex(index + 1)
  }
  return { index, cur: items[index] as T | undefined, finish, count: items.length }
}

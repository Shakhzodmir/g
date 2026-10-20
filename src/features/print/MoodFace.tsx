export type Mood = 'good' | 'ok' | 'hard'

const MOUTH: Record<Mood, string> = {
  good: 'M7.5 13.8Q12 18.6 16.5 13.8',
  ok: 'M8 15.6H16',
  hard: 'M7.5 17.2Q12 12.6 16.5 17.2',
}

/**
 * Outline face for the diary: a smile, a straight mouth, a frown. The three differ by SHAPE, never by colour, so they stay
 * apart on a grey printout and for colour-blind readers. Decorative: the legend next to them carries the words.
 */
export function MoodFace({ mood, className }: { mood: Mood; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10.4" fill="none" stroke="#111" strokeWidth="1.3" />
      <circle cx="8.6" cy="9.6" r="1.25" fill="#111" />
      <circle cx="15.4" cy="9.6" r="1.25" fill="#111" />
      <path d={MOUTH[mood]} fill="none" stroke="#111" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

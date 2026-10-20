import { ArrowRight, Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { S as GAMES } from '../features/games/strings'
import { loadLevel } from '../features/games/logic/levelKey'
import type { GameId } from '../features/games/logic/rounds'
import { useI18n, useStrings } from '../i18n'
import { shy } from '../lib/hyphenate'
import { recentEvents } from '../store/events'
import { useProfileStore } from '../store/profile'
import { Pressable } from '../ui/Pressable'
import { SymbolImg } from '../ui/SymbolImg'
import { ADULT_TITLES } from './adultTitles'
import { CONTINUE } from './continueStrings'
import { needsPoses, resolveResume, type Resume } from './continue'
import styles from './Continue.module.css'
import { FEATURES } from './features'

/** How many of the newest events are looked at to find something one can go back to. */
const LOOKBACK = 120

/**
 * The last thing the active profile did, or null (nothing yet, nothing that still exists, or still loading).
 * Read once when the screen opens: coming back Home after a game is a fresh visit, so it is up to date.
 */
export function useResume(): Resume | null {
  const profileId = useProfileStore((s) => s.profile.id)
  const kind = useProfileStore((s) => s.profile.kind)
  const [resume, setResume] = useState<Resume | null>(null)
  useEffect(() => {
    let alive = true
    setResume(null)
    void (async () => {
      const rows = await recentEvents(profileId, LOOKBACK)
      // The mirror poses are a lazy-only chunk: fetched only when the history has a mirror exercise in it.
      const poses = needsPoses(rows) ? (await import('../content/exercises')).ARTICULATION : []
      if (!alive) return
      const r = resolveResume(rows, kind, poses)
      // A game opens on the level the profile chose last, which may be newer than the round that was logged.
      setResume(r && r.kind === 'game' ? { ...r, level: loadLevel(profileId, r.ref as GameId) } : r)
    })()
    return () => {
      alive = false
    }
  }, [profileId, kind])
  return resume
}

/**
 * "Davom etamiz": one big button back to the last activity. Child home: a wide, calm card above the plates (symbol, name,
 * play arrow; no progress bar, no streak). Adult home: a compact row. Nothing at all when there is nothing to go back to.
 */
export function ContinueCard({ variant, resume }: { variant: 'child' | 'adult'; resume: Resume | null }) {
  const t = useStrings(CONTINUE)
  const g = useStrings(GAMES)
  const { ui, uiLang } = useI18n()
  const navigate = useNavigate()
  if (!resume) return null

  const adult = variant === 'adult'
  const title = ui(resume.title)
  const kind =
    resume.kind === 'game'
      ? adult
        ? ui(ADULT_TITLES.games)
        : t('kindGame')
      : resume.kind === 'exercise'
        ? adult
          ? ui(ADULT_TITLES.exercises)
          : t('kindExercise')
        : resume.kind === 'talk'
          ? ui(FEATURES.aac.title)
          : ''
  const level = resume.kind === 'game' && resume.level ? g('levelN', { n: resume.level }) : ''
  const meta = [kind, level].filter(Boolean).join(' · ')
  const kicker = adult ? t('kickerAdult') : t('kicker')

  return (
    <div className={styles.resume} data-variant={variant} data-testid="continue">
      <Pressable className={styles.card} label={`${kicker}: ${title}${meta ? `, ${meta}` : ''}`} onActivate={() => navigate(resume.to)} data-resume={resume.kind}>
        <span className={styles.art} aria-hidden="true">
          <SymbolImg id={resume.symbol} />
        </span>
        <span className={styles.text}>
          <span className={styles.kicker}>{kicker}</span>
          <span className={styles.title}>{shy(title, uiLang === 'ru' ? 'ru' : 'uz')}</span>
          {meta && <span className={styles.meta}>{meta}</span>}
        </span>
        <span className={styles.go} aria-hidden="true">
          {adult ? <ArrowRight /> : <Play fill="currentColor" />}
        </span>
      </Pressable>
    </div>
  )
}

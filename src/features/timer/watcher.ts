import { playSfx } from '../../audio/sfx'
import { speakSequence, type SpeakItem } from '../../audio/speech'
import { db, dbAvailable } from '../../store/db'
import { useProfileStore } from '../../store/profile'
import { resolveCard, voice } from '../schedule/cards'
import { getSlot, useTimerStore, type TimerSlot } from './store'
import { tick } from './timerLogic'

/*
 * Global end-of-timer detection. The timer is wall-clock based (see timerLogic.ts); this module arms a real
 * setTimeout for the end time and re-checks whenever the page comes back (visibilitychange / focus / pageshow),
 * so the calm end signal plays from ANY screen, exactly once.
 *
 * "Once": the running -> done transition is written to the persisted store BEFORE anything is signalled, so a
 * reload never repeats it. "Calm": a soft chime and one gentle sentence, no alarm. If the end passed while the
 * page was closed or throttled for longer than LATE_MS, nothing is played; a quiet card is shown on next open.
 */

/** Later than this after the end, a sound would be confusing: show the quiet card instead. */
export const LATE_MS = 5000
/** setTimeout stores its delay in 32 bits. */
const MAX_DELAY = 2_000_000_000
/** Small cushion so the timeout never fires a hair before the wall-clock end. */
const CUSHION_MS = 25

export type EndKind = 'live' | 'late'

export interface WatcherDeps {
  now: () => number
  activeProfileId: () => string
  getSlot: (profileId: string) => TimerSlot
  patch: (profileId: string, patch: Partial<TimerSlot>) => void
  /** Called once per ended timer, after the new state is stored. `quiet` = leave a card for the next time the page is seen. */
  onEnd: (e: { profileId: string; kind: EndKind; nextRef: string | null; endsAt: number }) => void
  isHidden: () => boolean
  setTimer: (fn: () => void, ms: number) => unknown
  clearTimer: (h: unknown) => void
}

export interface TimerWatcher {
  /** Looks at the active profile's timer now and (re)arms the timeout. Safe to call at any time, any number of times. */
  check: () => void
  dispose: () => void
}

export function createTimerWatcher(deps: WatcherDeps): TimerWatcher {
  let handle: unknown = null
  let armedFor: number | null = null

  const disarm = () => {
    if (handle !== null) deps.clearTimer(handle)
    handle = null
    armedFor = null
  }

  const check = () => {
    const profileId = deps.activeProfileId()
    const slot = deps.getSlot(profileId)
    const t = slot.timer
    if (t.status !== 'running' || t.endsAt === null) {
      disarm()
      return
    }
    const now = deps.now()
    if (now < t.endsAt) {
      // Already armed for this very end time: nothing to do.
      if (handle !== null && armedFor === t.endsAt) return
      disarm()
      armedFor = t.endsAt
      handle = deps.setTimer(() => {
        handle = null
        armedFor = null
        check()
      }, Math.min(MAX_DELAY, t.endsAt - now + CUSHION_MS))
      return
    }
    disarm()
    const done = tick(t, now)
    const late = now - t.endsAt > LATE_MS
    // Hidden page: the sound may play to nobody, so also leave the quiet card for when the page is seen again.
    const leaveCard = late || deps.isHidden()
    // Persist first: a reload (or a second call) now sees 'done' and never signals again.
    deps.patch(profileId, { timer: done, notice: leaveCard ? t.endsAt : slot.notice })
    deps.onEnd({ profileId, kind: late ? 'late' : 'live', nextRef: slot.nextRef, endsAt: t.endsAt })
  }

  return { check, dispose: disarm }
}

/* ---------- App wiring ---------- */

/** Ephemeral (not persisted) "time is up" toast, shown when the end arrives while the page is in view. */
interface LiveToast {
  at: number
}
type Listener = (t: LiveToast | null) => void
let liveToast: LiveToast | null = null
const toastListeners = new Set<Listener>()

function setLiveToast(t: LiveToast | null): void {
  liveToast = t
  toastListeners.forEach((l) => l(t))
}

export function getLiveToast(): LiveToast | null {
  return liveToast
}

export function subscribeLiveToast(l: Listener): () => void {
  toastListeners.add(l)
  return () => toastListeners.delete(l)
}

export function dismissLiveToast(): void {
  setLiveToast(null)
}

async function resolveNext(ref: string | null) {
  if (!ref) return null
  if (!ref.startsWith('c.')) return resolveCard(ref)
  try {
    if (await dbAvailable()) {
      const c = await db.cards.get(ref.slice(2))
      if (c && !c.hidden) return resolveCard(ref, new Map([[c.id, c]]))
    }
  } catch {
    /* no custom card */
  }
  return null
}

const onTimerScreen = () => typeof location !== 'undefined' && /^#\/timer(\/|\?|$)/.test(location.hash)

function signalEnd(e: { kind: EndKind; nextRef: string | null }): void {
  if (e.kind === 'late') return // the persisted card is the only signal
  playSfx('soft')
  void (async () => {
    const items: SpeakItem[] = [voice('timer_done')]
    const next = await resolveNext(e.nextRef)
    if (next) items.push(voice('sched_then'), next.speech)
    // A short pause after the chime so the voice does not overlap it.
    setTimeout(() => void speakSequence(items), 450)
  })()
  // The Timer screen shows its own pulse + check; anywhere else a small toast says it.
  if (!document.hidden && !onTimerScreen()) setLiveToast({ at: Date.now() })
}

let watcher: TimerWatcher | null = null
let teardown: (() => void) | null = null

/** Starts the global watcher (idempotent). Returns nothing to clean up: it lives as long as the page. */
export function initTimerWatcher(): void {
  if (watcher || typeof window === 'undefined') return
  watcher = createTimerWatcher({
    now: () => Date.now(),
    activeProfileId: () => useProfileStore.getState().profile.id,
    getSlot,
    patch: (id, p) => useTimerStore.getState().patch(id, p),
    onEnd: signalEnd,
    isHidden: () => document.hidden,
    setTimer: (fn, ms) => setTimeout(fn, ms),
    clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
  })
  const check = () => watcher?.check()
  const unsubTimer = useTimerStore.subscribe(check)
  const unsubProfile = useProfileStore.subscribe((s, prev) => {
    if (s.profile.id !== prev.profile.id) check()
  })
  document.addEventListener('visibilitychange', check)
  window.addEventListener('focus', check)
  window.addEventListener('pageshow', check)
  teardown = () => {
    unsubTimer()
    unsubProfile()
    document.removeEventListener('visibilitychange', check)
    window.removeEventListener('focus', check)
    window.removeEventListener('pageshow', check)
    watcher?.dispose()
    watcher = null
  }
  check()
  // The toast / quiet card lives in its own React root, so it works on every screen without touching the app shell.
  void import('./TimerNotice').then((m) => m.mountTimerNotice())
}

/** Re-checks right now (used by the Timer screen when its own clock reaches the end). */
export function checkTimerNow(): void {
  watcher?.check()
}

/** For tests. */
export function stopTimerWatcher(): void {
  teardown?.()
  teardown = null
  setLiveToast(null)
}

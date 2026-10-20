// Demo rows for the `checks` table (Nutq tekshiruvi), written straight into IndexedDB by seedApp({ rows }).
// Plain JS on purpose (no src imports), like seed.mjs. The shapes mirror src/features/check/types.ts (CheckRow).

const DAY = 86_400_000

/** `YYYY-MM-DD` of the local date `back` days before `now`. */
export function dayKeyBack(back, now = Date.now()) {
  const d = new Date(now - back * DAY)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function result(id, ts, over, bands, extra = {}) {
  const fr = Object.fromEntries(Object.entries(bands).map(([k, b]) => [k, b === 'good' ? 1 : b === 'watch' ? 0.67 : 0.17]))
  return { id, ts, stage: 'full', age: '3-4', concerns: ['unsure'], retest: false, answers: {}, fr, bands, overall: over, cfg: 1, ...extra }
}

const CHILD_BANDS = { vocab: 'watch', sounds: 'attention', understanding: 'good', fluency: 'attention', attention: 'good', articulation: 'watch' }
const ASD_BANDS = { joint: 'watch', name: 'good', pointing: 'attention', imitation: 'watch', play: 'good', sensory: 'good' }
const ADULT_BANDS = { understanding: 'good', words: 'attention', clarity: 'watch', fluency: 'watch', reading: 'good', memory: 'good' }

/**
 * Three screenings of one profile:
 *  - child: baseline 9 days ago and a repeat check yesterday that improved; ticks the last two days (streak 2, today still open);
 *  - asd:   baseline 16 days ago and one repeat on day 8, so the day-14 mark is DUE (the in-app banner shows);
 *  - adult: a first check today with a word-finding domain that needs attention.
 */
export function demoCheckRows(profileId = 'p-test', now = Date.now()) {
  const row = (kind, results, plan, ticks) => ({ id: `${profileId}:${kind}`, profileId, kind, results, plan, ticks, updatedAt: now })
  const child = row(
    'child',
    [
      result('r-c0', now - 9 * DAY, 'attention', CHILD_BANDS),
      result('r-c1', now - 1 * DAY, 'watch', { ...CHILD_BANDS, sounds: 'watch', fluency: 'watch' }, { retest: true }),
    ],
    { startedTs: now - 9 * DAY, baselineResultId: 'r-c0', focus: ['vocab', 'sounds', 'fluency'] },
    { [dayKeyBack(2, now)]: ['child.vocab.t1', 'child.sounds.a1'], [dayKeyBack(1, now)]: ['child.fluency.t1'] },
  )
  const asd = row(
    'asd',
    [
      result('r-a0', now - 16 * DAY, 'watch', ASD_BANDS, { age: '2-3', concerns: [] }),
      result('r-a1', now - 8 * DAY, 'watch', ASD_BANDS, { age: '2-3', concerns: [], retest: true }),
    ],
    { startedTs: now - 16 * DAY, baselineResultId: 'r-a0', focus: ['pointing', 'joint', 'imitation'] },
    {},
  )
  const adult = row(
    'adult',
    [result('r-d0', now - 60_000, 'watch', ADULT_BANDS, { age: null, concerns: [] })],
    { startedTs: now - 60_000, baselineResultId: 'r-d0', focus: ['words', 'clarity', 'fluency'] },
    {},
  )
  return { checks: [child, asd, adult] }
}

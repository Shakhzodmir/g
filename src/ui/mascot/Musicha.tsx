import { useEffect, useId, useState, type JSX } from 'react'
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionStyle,
  type Transition,
} from 'motion/react'

/**
 * Musicha, the turtle-dove mascot (Uzbek "musicha").
 *
 * Pure SVG in a 240×240 viewBox, built from a few large, soft shapes so the
 * silhouette (round body, big head, one dark eye, small coral beak) reads at
 * 48 px and the details (glazed flight feathers, neck patch, cere) reward 400 px.
 *
 * States (one gentle movement at a time, never a flash):
 * - `idle`   slow blink every 4–6 s and very gentle breathing (scale 1 → 1.015, 4 s);
 * - `listen` small head tilt, eye turns to the viewer;
 * - `speak`  lower beak follows `level` (0..1) through a soft spring;
 * - `happy`  one small hop with the wing lifted once, smiling eye;
 * - `calm`   eyes closed, head lowered, nothing loops;
 * - `think`  eye looks up, head tilts back a little.
 *
 * With `calm` (sensory level) or `prefers-reduced-motion` nothing loops and
 * pose changes are instant; only eye shapes cross-fade (≤ 180 ms).
 */
export type MascotState = 'idle' | 'listen' | 'speak' | 'happy' | 'calm' | 'think'

export interface MusichaProps {
  state?: MascotState
  /** Rendered width and height in CSS px. */
  size?: number
  /** 0..1 lower-beak openness while speaking (e.g. from a speech level meter). */
  level?: number
  /** Calm sensory level: no loops, no hop. */
  calm?: boolean
  className?: string
  /** Accessible name; `''` hides the mascot from assistive technology. */
  title?: string
}

/** Lower-beak rotation in degrees at `level = 1`. */
const BEAK_MAX_DEG = 24
/** Lower-beak hinge and tip (viewBox units). */
const HINGE = { x: 186, y: 101 }
const LOWER_TIP_LEN = 14.5
const UPPER_TIP = { x: 202, y: 101 }

/** Pivot for rotate/scale in viewBox units. */
function pivot(x: number, y: number): MotionStyle {
  return { transformBox: 'view-box', originX: `${x}px`, originY: `${y}px` }
}

const P_ROOT = pivot(120, 224)
const P_HEAD = pivot(128, 128)
const P_EYE = pivot(156, 82)
const P_WING = pivot(104, 128)
const P_TAIL = pivot(62, 166)

// One-shot "happy" hop: small crouch, lift, soft landing. No flapping.
const HOP: Transition = { duration: 0.9, times: [0, 0.15, 0.42, 0.66, 0.84, 1], ease: 'easeInOut' }
const HOP_BODY = { y: [0, 2, -12, 0, -1.5, 0], scaleY: [1, 0.97, 1.02, 0.98, 1, 1] }
const HOP_SHADOW = { scale: [1, 1.03, 0.82, 1.02, 0.98, 1], opacity: [1, 1, 0.65, 1, 1, 1] }
const HOP_WING = { rotate: [0, 0, -12, 2, 0, 0] }
const HOP_TAIL = { rotate: [0, -2, 7, -2, 0, 0] }
const REST_BODY = { y: 0, scaleY: 1 }
const REST_SHADOW = { scale: 1, opacity: 1 }
const REST_ROT = { rotate: 0 }

const BREATHE = { scale: [1, 1.015, 1] }
const BREATHE_T: Transition = { duration: 4, repeat: Infinity, ease: 'easeInOut' }
const STILL_SCALE = { scale: 1 }

const INSTANT: Transition = { duration: 0 }
const SETTLE: Transition = { duration: 0.35, ease: 'easeOut' }
const FADE: Transition = { duration: 0.18, ease: 'easeOut' }

function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0
}

/** Blink flag: closes for ~150 ms every 4–6 s while `enabled`. */
function useBlink(enabled: boolean): boolean {
  const [closed, setClosed] = useState(false)
  useEffect(() => {
    if (!enabled) return
    let open: number | undefined
    let close: number | undefined
    const schedule = () => {
      close = window.setTimeout(
        () => {
          setClosed(true)
          open = window.setTimeout(() => {
            setClosed(false)
            schedule()
          }, 150)
        },
        4000 + Math.random() * 2000,
      )
    }
    schedule()
    return () => {
      window.clearTimeout(open)
      window.clearTimeout(close)
    }
  }, [enabled])
  return enabled && closed
}

export function Musicha({
  state = 'idle',
  size = 160,
  level = 0,
  calm = false,
  className,
  title = 'Musicha',
}: MusichaProps): JSX.Element {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const id = (name: string) => `mu-${uid}-${name}`
  const url = (name: string) => `url(#${id(name)})`

  const reduced = useReducedMotion() ?? false
  const still = calm || reduced
  const asleep = state === 'calm'
  const happy = state === 'happy'
  const eyeMode: 'open' | 'closed' | 'happy' = asleep ? 'closed' : happy ? 'happy' : 'open'

  const blinking = useBlink(!still && eyeMode === 'open')
  const breathing = !still && !asleep
  const hop = !still && happy

  // Lower beak: a spring follows the speech level so the beak never jitters.
  const beakTarget = state === 'speak' ? clamp01(level) * BEAK_MAX_DEG : 0
  const beakRaw = useMotionValue(beakTarget)
  const beakSpring = useSpring(beakRaw, { stiffness: 700, damping: 38, mass: 0.6 })
  useEffect(() => {
    beakRaw.set(beakTarget)
  }, [beakRaw, beakTarget])
  const beak = still ? beakRaw : beakSpring
  // Mouth wedge between the fixed upper beak and the rotating lower beak.
  const mouthD = useTransform(beak, (deg: number) => {
    const a = (deg * Math.PI) / 180
    const lx = HINGE.x + LOWER_TIP_LEN * Math.cos(a)
    const ly = HINGE.y + LOWER_TIP_LEN * Math.sin(a)
    return `M${HINGE.x} ${HINGE.y}L${UPPER_TIP.x} ${UPPER_TIP.y}Q${(UPPER_TIP.x + lx) / 2 + 1} ${(UPPER_TIP.y + ly) / 2 + 1} ${lx.toFixed(2)} ${ly.toFixed(2)}Z`
  })

  const head =
    state === 'listen'
      ? { rotate: 8, y: 0 }
      : state === 'think'
        ? { rotate: -6, y: -1 }
        : asleep
          ? { rotate: 5, y: 2 }
          : { rotate: 0, y: 0 }
  const headT: Transition = still ? INSTANT : { type: 'spring', stiffness: 120, damping: 18 }

  const look = state === 'think' ? { x: 1.5, y: -3 } : state === 'listen' ? { x: -0.5, y: 0.8 } : { x: 0.8, y: 0.6 }

  const hidden = title === ''

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 240 240"
      role={hidden ? undefined : 'img'}
      aria-label={hidden ? undefined : title}
      aria-hidden={hidden ? true : undefined}
      focusable="false"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={id('shadow')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#4a3a35" stopOpacity="0.22" />
          <stop offset="0.6" stopColor="#4a3a35" stopOpacity="0.1" />
          <stop offset="1" stopColor="#4a3a35" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('body')} cx="0.42" cy="0.28" r="0.85">
          <stop offset="0" stopColor="#f6ebe2" />
          <stop offset="0.48" stopColor="#ead7c8" />
          <stop offset="0.85" stopColor="#d4b6a2" />
          <stop offset="1" stopColor="#c3a28d" />
        </radialGradient>
        <radialGradient id={id('breast')} cx="0.5" cy="0.45" r="0.5">
          <stop offset="0" stopColor="#f3cfc5" stopOpacity="0.9" />
          <stop offset="1" stopColor="#f3cfc5" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('head')} cx="0.4" cy="0.28" r="0.8">
          <stop offset="0" stopColor="#f8f0ec" />
          <stop offset="0.55" stopColor="#eddcd5" />
          <stop offset="1" stopColor="#d2b7ab" />
        </radialGradient>
        <radialGradient id={id('neckShade')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#9a7462" stopOpacity="0.42" />
          <stop offset="1" stopColor="#a07c69" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('coverts')} x1="0.75" y1="0" x2="0.2" y2="1">
          <stop offset="0" stopColor="#e3cdbd" />
          <stop offset="1" stopColor="#c4a18c" />
        </linearGradient>
        <linearGradient id={id('glaze')} x1="0.7" y1="0" x2="0.15" y2="1">
          <stop offset="0" stopColor="#a9dfe0" />
          <stop offset="0.55" stopColor="#6fbfc5" />
          <stop offset="1" stopColor="#3f98a2" />
        </linearGradient>
        <linearGradient id={id('tail')} x1="64" y1="0" x2="8" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#c4a693" />
          <stop offset="0.7" stopColor="#a58673" />
          <stop offset="1" stopColor="#d9c8bb" />
        </linearGradient>
        <radialGradient id={id('iris')} cx="0.42" cy="0.7" r="0.7">
          <stop offset="0" stopColor="#3d4a68" />
          <stop offset="1" stopColor="#1e2633" />
        </radialGradient>
        <linearGradient id={id('beakUp')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2a690" />
          <stop offset="1" stopColor="#d97b66" />
        </linearGradient>
        <linearGradient id={id('beakLo')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#df8a76" />
          <stop offset="1" stopColor="#c56c5a" />
        </linearGradient>
        <radialGradient id={id('cheek')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#eb9a94" stopOpacity="0.7" />
          <stop offset="1" stopColor="#eb9a94" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('gloss')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <clipPath id={id('wingClip')}>
          <path d={WING} />
        </clipPath>
      </defs>

      {/* Ground shadow (stays on the ground during the hop) */}
      <motion.ellipse
        cx="120"
        cy="224"
        rx="66"
        ry="9"
        fill={url('shadow')}
        style={P_ROOT}
        initial={false}
        animate={hop ? HOP_SHADOW : REST_SHADOW}
        transition={hop ? HOP : INSTANT}
      />

      <motion.g style={P_ROOT} initial={false} animate={hop ? HOP_BODY : REST_BODY} transition={hop ? HOP : INSTANT}>
        <motion.g
          style={P_ROOT}
          initial={false}
          animate={breathing ? BREATHE : STILL_SCALE}
          transition={breathing ? BREATHE_T : still ? INSTANT : SETTLE}
        >
          {/* Tail */}
          <motion.g style={P_TAIL} initial={false} animate={hop ? HOP_TAIL : REST_ROT} transition={hop ? HOP : INSTANT}>
            <path d={TAIL} fill={url('tail')} />
            <path d="M60 160C46 154 32 150 20 150M62 167C48 166 34 164 18 160" fill="none" stroke="#8f7263" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" />
          </motion.g>

          {/* Feet */}
          <g fill="#de907c">
            <path d="M96 219c0-4 4-6 7.5-4.6 3.3-1.6 7.5.3 7.5 4.6 0 3.4-2.5 5.4-5 5-1 .8-2.4.9-3.4 0-1 .8-2.4.8-3.4 0C97.5 224.5 96 222 96 219Z" />
            <path d="M130 219.5c0-4 4-6 7.5-4.6 3.3-1.6 7.5.3 7.5 4.6 0 3.4-2.5 5.4-5 5-1 .8-2.4.9-3.4 0-1 .8-2.4.8-3.4 0C131.5 225 130 222.5 130 219.5Z" />
          </g>

          {/* Body */}
          <path d={BODY} fill={url('body')} />
          <ellipse cx="158" cy="168" rx="34" ry="42" fill={url('breast')} />
          <ellipse cx="136" cy="131" rx="48" ry="12" fill={url('neckShade')} />
          <path d="M184 186C176 204 156 216 128 219" fill="none" stroke="#fff6ef" strokeOpacity="0.28" strokeWidth="4" strokeLinecap="round" />

          {/* Wing: sand coverts over turquoise-glazed flight feathers */}
          <motion.g style={P_WING} initial={false} animate={hop ? HOP_WING : REST_ROT} transition={hop ? HOP : INSTANT}>
            <path d={WING} fill={url('glaze')} />
            <g clipPath={url('wingClip')}>
              <g stroke="#e9f7f7" strokeOpacity="0.45" strokeWidth="1.3" strokeLinecap="round" fill="none">
                <path d="M112 196Q109 206 103 216" />
                <path d="M94 188Q89 200 80 212" />
                <path d="M76 178Q70 192 58 204" />
              </g>
              <path d={COVERTS} fill={url('coverts')} />
              <path
                d="M128 186Q113 194 110 182M108 178Q96 186 93 173M90 167Q79 174 76 162"
                fill="none"
                stroke="#a9846f"
                strokeOpacity="0.28"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path d={COVERTS_EDGE} fill="none" stroke="#fff8f1" strokeOpacity="0.5" strokeWidth="1.4" />
            </g>
            {/* Rishtan four-petal flower */}
            <g transform="translate(104 150) rotate(20) scale(0.85)" opacity="0.9">
              <g fill="#a6dcde">
                <ellipse cx="0" cy="-5.2" rx="3.1" ry="4.6" />
                <ellipse cx="0" cy="5.2" rx="3.1" ry="4.6" />
                <ellipse cx="-5.2" cy="0" rx="4.6" ry="3.1" />
                <ellipse cx="5.2" cy="0" rx="4.6" ry="3.1" />
              </g>
              <circle r="2.3" fill="#3a5bbd" />
            </g>
            <path d={WING} fill="none" stroke="#9c7865" strokeOpacity="0.28" strokeWidth="1.8" />
          </motion.g>

          {/* Head */}
          <motion.g style={P_HEAD} initial={false} animate={head} transition={headT}>
            <ellipse cx="140" cy="86" rx="50" ry="47" fill={url('head')} />
            <ellipse cx="124" cy="60" rx="24" ry="13" fill={url('gloss')} transform="rotate(-18 124 60)" />

            {/* Turtle-dove neck patch: three soft slate bars on a pale wash */}
            <ellipse cx="118" cy="117" rx="11" ry="8" transform="rotate(-48 118 117)" fill="#f7f0ea" opacity="0.75" />
            <g stroke="#67718e" strokeWidth="2.6" strokeLinecap="round" opacity="0.75">
              <path d="M110 116.5 117 109" />
              <path d="M113 121.5 121.5 112.5" />
              <path d="M117.5 125 124.5 117.5" />
            </g>

            {/* Cheek */}
            <motion.ellipse
              cx="168"
              cy="107"
              rx="11.5"
              ry="7.5"
              fill={url('cheek')}
              initial={false}
              animate={{ opacity: happy ? 1 : 0.8 }}
              transition={FADE}
            />

            {/* Eye */}
            <motion.g
              style={P_EYE}
              initial={false}
              animate={{ opacity: eyeMode === 'open' ? 1 : 0, scaleY: blinking ? 0.08 : 1 }}
              transition={{ opacity: FADE, scaleY: { duration: 0.075 } }}
            >
              <ellipse cx="156" cy="82" rx="13.2" ry="14.8" fill="#f7ece4" />
              <motion.g initial={false} animate={look} transition={still ? INSTANT : { duration: 0.6, ease: 'easeInOut' }}>
                <ellipse cx="156" cy="82" rx="11" ry="12.6" fill={url('iris')} />
                <circle cx="160.4" cy="76.6" r="4.2" fill="#ffffff" />
                <circle cx="151.8" cy="88" r="1.7" fill="#ffffff" opacity="0.75" />
              </motion.g>
            </motion.g>
            <motion.path
              d="M144.5 83Q156 92 167.5 83"
              fill="none"
              stroke="#2c2a36"
              strokeWidth="3.4"
              strokeLinecap="round"
              initial={false}
              animate={{ opacity: eyeMode === 'closed' ? 1 : 0 }}
              transition={FADE}
            />
            <motion.path
              d="M144.5 87Q156 77 167.5 87"
              fill="none"
              stroke="#2c2a36"
              strokeWidth="3.6"
              strokeLinecap="round"
              initial={false}
              animate={{ opacity: eyeMode === 'happy' ? 1 : 0 }}
              transition={FADE}
            />

            {/* Beak: mouth wedge, hinged lower half, fixed upper half with cere */}
            <motion.path d={mouthD} fill="#9e5560" />
            <motion.g style={{ ...pivot(HINGE.x, HINGE.y), rotate: beak }}>
              <path d={LOWER_BEAK} fill={url('beakLo')} />
            </motion.g>
            <path d={UPPER_BEAK} fill={url('beakUp')} />
            <ellipse cx="189.5" cy="91.6" rx="4.6" ry="2.6" fill="#f7e0d7" opacity="0.95" />
          </motion.g>
        </motion.g>
      </motion.g>
    </svg>
  )
}

const BODY = 'M120 102C162 102 192 130 192 166C192 201 162 222 120 222C80 222 42 204 40 170C38 134 76 102 120 102Z'
const WING =
  'M106 122C132 124 146 150 140 178C134 204 108 216 80 212C60 209 44 200 38 192C52 186 62 176 68 160C76 138 88 122 106 122Z'
const COVERTS = 'M30 96H170V200L132 198Q117 207 112 194Q98 201 94 186Q80 192 76 176Q62 181 58 164L30 156Z'
const COVERTS_EDGE = 'M132 198Q117 207 112 194Q98 201 94 186Q80 192 76 176Q62 181 58 164'
const TAIL = 'M66 150C52 140 32 134 18 138C6 142 6 158 14 165C26 175 48 178 68 173Z'
const UPPER_BEAK = 'M184 90C192 87 201 90 206 97C207 99 205.5 101 202 101L186 101C183 98 182 93 184 90Z'
const LOWER_BEAK = 'M186 101L200.5 101C200 104 195 106.5 190.5 106.5C187.5 106.5 185.5 104 186 101Z'

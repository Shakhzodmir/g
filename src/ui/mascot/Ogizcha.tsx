import { useId, type JSX } from 'react'
import { motion, useReducedMotion, type Transition } from 'motion/react'
import type { OgizchaPose } from '../../content/types'

/**
 * Ogʻizcha, the articulation helper: a calm, gender-neutral child's face whose
 * mouth (lips, teeth, tongue, cheeks, jaw) shows each articulation pose.
 *
 * Every mouth part is a path with a fixed command structure, so `motion` can
 * morph smoothly between poses. Sides are given from the viewer's point of
 * view: `clock-left` points the tongue to the left edge of the screen, like a
 * mirror the child copies.
 */
export interface OgizchaProps {
  pose: OgizchaPose
  /** Rendered width and height in CSS px. */
  size?: number
  /** Morph between poses (default true). Reduced motion always switches instantly. */
  animate?: boolean
  className?: string
  /** Accessible name; `''` hides the face from assistive technology. */
  title?: string
}

const CX = 120
const CY = 160
/** The mouth is drawn a little larger than life so each pose reads clearly. */
const MOUTH_SCALE = 1.22

interface MouthShape {
  /** Mouth width (corner to corner). */
  w: number
  /** Corner lift above CY (positive = corners up, a smile). */
  lift: number
  /** Upper edge centre above CY (negative = below). */
  top: number
  /** Lower edge centre below CY. */
  bottom: number
  /** 0 = lens with soft corners, 1 = round. */
  r: number
  /** Lip thickness (stroke width). */
  lip: number
}

interface Tongue {
  /** Root centre. */
  bx: number
  by: number
  /** Tip. */
  tx: number
  ty: number
  /** Half-width at the root. */
  bw: number
  /** Tip roundness (handle length across the tip). */
  tw: number
  /** How far the root bulges back from the root line. */
  back: number
  /** Drawn over the lips (sticks out) or kept inside the mouth. */
  out: boolean
  /** Visible at all. */
  show: boolean
}

interface Pose {
  mouth: MouthShape
  tongue: Tongue
  /** Lower edge of the upper teeth (absolute y). */
  upperTeeth: number
  /** Upper edge of the lower teeth (absolute y). */
  lowerTeeth: number
  face: 'rest' | 'puff' | 'jaw'
  /** Frenulum line under a raised tongue (horse). */
  frenulum: boolean
}

const HIDDEN_TONGUE: Tongue = { bx: CX, by: CY + 1, tx: CX, ty: CY + 3, bw: 4, tw: 3, back: 2, out: false, show: false }
const NO_UPPER = CY - 40
const NO_LOWER = CY + 40

const POSES: Record<OgizchaPose, Pose> = {
  neutral: {
    mouth: { w: 36, lift: 1.5, top: 1, bottom: 2.5, r: 0, lip: 6 },
    tongue: HIDDEN_TONGUE,
    upperTeeth: NO_UPPER,
    lowerTeeth: NO_LOWER,
    face: 'rest',
    frenulum: false,
  },
  smile: {
    mouth: { w: 60, lift: 7, top: -1.5, bottom: 3, r: 0, lip: 6 },
    tongue: HIDDEN_TONGUE,
    upperTeeth: NO_UPPER,
    lowerTeeth: NO_LOWER,
    face: 'rest',
    frenulum: false,
  },
  fence: {
    mouth: { w: 62, lift: 5, top: 5.5, bottom: 10, r: 0.2, lip: 6 },
    tongue: HIDDEN_TONGUE,
    upperTeeth: CY + 2,
    lowerTeeth: CY + 2,
    face: 'rest',
    frenulum: false,
  },
  tube: {
    mouth: { w: 22, lift: 0, top: 8, bottom: 8, r: 1, lip: 12 },
    tongue: HIDDEN_TONGUE,
    upperTeeth: NO_UPPER,
    lowerTeeth: NO_LOWER,
    face: 'rest',
    frenulum: false,
  },
  open: {
    mouth: { w: 44, lift: 1, top: 14, bottom: 22, r: 0.9, lip: 6 },
    tongue: { bx: CX, by: CY + 20, tx: CX, ty: CY + 9, bw: 18, tw: 15, back: 6, out: false, show: true },
    upperTeeth: CY - 8,
    lowerTeeth: NO_LOWER,
    face: 'jaw',
    frenulum: false,
  },
  cheeks: {
    mouth: { w: 20, lift: 0, top: 1.8, bottom: 2.4, r: 0.3, lip: 8 },
    tongue: HIDDEN_TONGUE,
    upperTeeth: NO_UPPER,
    lowerTeeth: NO_LOWER,
    face: 'puff',
    frenulum: false,
  },
  'clock-left': {
    mouth: { w: 48, lift: 4, top: 9, bottom: 13, r: 0.5, lip: 6 },
    tongue: { bx: CX + 4, by: CY + 7, tx: CX - 50, ty: CY + 1, bw: 6, tw: 3.5, back: 3, out: true, show: true },
    upperTeeth: CY - 3,
    lowerTeeth: CY + 9,
    face: 'rest',
    frenulum: false,
  },
  'clock-right': {
    mouth: { w: 48, lift: 4, top: 9, bottom: 13, r: 0.5, lip: 6 },
    tongue: { bx: CX - 4, by: CY + 7, tx: CX + 50, ty: CY + 1, bw: 6, tw: 3.5, back: 3, out: true, show: true },
    upperTeeth: CY - 3,
    lowerTeeth: CY + 9,
    face: 'rest',
    frenulum: false,
  },
  spatula: {
    mouth: { w: 52, lift: 2, top: 9, bottom: 13, r: 0.6, lip: 6 },
    tongue: { bx: CX, by: CY + 3, tx: CX, ty: CY + 27, bw: 20, tw: 16, back: 3, out: true, show: true },
    upperTeeth: CY - 3,
    lowerTeeth: NO_LOWER,
    face: 'rest',
    frenulum: false,
  },
  needle: {
    mouth: { w: 40, lift: 1, top: 9, bottom: 13, r: 0.7, lip: 6 },
    tongue: { bx: CX, by: CY + 4, tx: CX, ty: CY + 30, bw: 9, tw: 1.6, back: 3, out: true, show: true },
    upperTeeth: CY - 3,
    lowerTeeth: NO_LOWER,
    face: 'rest',
    frenulum: false,
  },
  horse: {
    mouth: { w: 46, lift: 1, top: 16, bottom: 20, r: 0.95, lip: 6 },
    tongue: { bx: CX, by: CY + 7, tx: CX, ty: CY - 13, bw: 19, tw: 16, back: 4, out: false, show: true },
    upperTeeth: NO_UPPER,
    lowerTeeth: CY + 14,
    face: 'jaw',
    frenulum: true,
  },
  jam: {
    mouth: { w: 56, lift: 2, top: 10, bottom: 15, r: 0.55, lip: 6 },
    tongue: { bx: CX, by: CY + 9, tx: CX - 2, ty: CY - 18, bw: 14, tw: 15, back: 3, out: true, show: true },
    upperTeeth: NO_UPPER,
    lowerTeeth: CY + 8,
    face: 'rest',
    frenulum: false,
  },
}

const f = (n: number) => Math.round(n * 100) / 100

/** Closed mouth outline: 4 cubic segments (left corner → top → right corner → bottom → left). */
function mouthPath({ w, lift, top, bottom, r }: MouthShape): string {
  const lx = CX - w / 2
  const rx = CX + w / 2
  const cy = CY - lift
  const ty = CY - top
  const by = CY + bottom
  const inset = (1 - r) * w * 0.22
  const hx = w * (0.25 + 0.03 * r)
  return [
    `M${f(lx)} ${f(cy)}`,
    `C${f(lx + inset)} ${f(cy + (ty - cy) * 0.6)} ${f(CX - hx)} ${f(ty)} ${f(CX)} ${f(ty)}`,
    `C${f(CX + hx)} ${f(ty)} ${f(rx - inset)} ${f(cy + (ty - cy) * 0.6)} ${f(rx)} ${f(cy)}`,
    `C${f(rx - inset)} ${f(cy + (by - cy) * 0.6)} ${f(CX + hx)} ${f(by)} ${f(CX)} ${f(by)}`,
    `C${f(CX - hx)} ${f(by)} ${f(lx + inset)} ${f(cy + (by - cy) * 0.6)} ${f(lx)} ${f(cy)}Z`,
  ].join('')
}

/** Tongue outline: root-left → tip → root-right → back → root-left (4 cubic segments). */
function tonguePath({ bx, by, tx, ty, bw, tw, back }: Tongue): string {
  const dx = tx - bx
  const dy = ty - by
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const px = -uy
  const py = ux
  const L = { x: bx + px * bw, y: by + py * bw }
  const R = { x: bx - px * bw, y: by - py * bw }
  const K = { x: bx - ux * back, y: by - uy * back }
  const reach = len * 0.62
  return [
    `M${f(L.x)} ${f(L.y)}`,
    `C${f(L.x + ux * reach)} ${f(L.y + uy * reach)} ${f(tx + px * tw)} ${f(ty + py * tw)} ${f(tx)} ${f(ty)}`,
    `C${f(tx - px * tw)} ${f(ty - py * tw)} ${f(R.x + ux * reach)} ${f(R.y + uy * reach)} ${f(R.x)} ${f(R.y)}`,
    `C${f(R.x - ux * back * 0.6)} ${f(R.y - uy * back * 0.6)} ${f(K.x - px * bw * 0.6)} ${f(K.y - py * bw * 0.6)} ${f(K.x)} ${f(K.y)}`,
    `C${f(K.x + px * bw * 0.6)} ${f(K.y + py * bw * 0.6)} ${f(L.x - ux * back * 0.6)} ${f(L.y - uy * back * 0.6)} ${f(L.x)} ${f(L.y)}Z`,
  ].join('')
}

/** Faint groove along the tongue's middle. */
function groovePath({ bx, by, tx, ty }: Tongue): string {
  return `M${f(bx + (tx - bx) * 0.1)} ${f(by + (ty - by) * 0.1)}L${f(bx + (tx - bx) * 0.62)} ${f(by + (ty - by) * 0.62)}`
}

const FACE: Record<Pose['face'], string> = {
  rest: 'M120 40C163 40 192 72 192 118C192 170 160 204 120 204C80 204 48 170 48 118C48 72 77 40 120 40Z',
  puff: 'M120 40C163 40 194 70 197 116C202 176 164 208 120 208C76 208 38 176 43 116C46 70 77 40 120 40Z',
  jaw: 'M120 40C163 40 192 72 192 118C192 172 160 209 120 209C80 209 48 172 48 118C48 72 77 40 120 40Z',
}

const HAIR =
  'M45 124C35 64 74 25 120 25C166 25 205 64 195 124C192 106 186 94 176 86Q168 97 156 89Q146 97 134 87Q122 97 108 87Q96 96 84 88C70 94 54 106 45 124Z'

export function Ogizcha({ pose, size = 200, animate = true, className, title = 'Ogʻizcha' }: OgizchaProps): JSX.Element {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const id = (name: string) => `og-${uid}-${name}`
  const url = (name: string) => `url(#${id(name)})`

  const reduced = useReducedMotion() ?? false
  const t: Transition = animate && !reduced ? { duration: 0.42, ease: [0.4, 0, 0.2, 1] } : { duration: 0 }
  const fade: Transition = animate && !reduced ? { duration: 0.2, ease: 'easeOut' } : { duration: 0 }

  const p = POSES[pose] ?? POSES.neutral
  const mouthD = mouthPath(p.mouth)
  const tongueD = tonguePath(p.tongue)
  const puff = p.face === 'puff'
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
    >
      <defs>
        <radialGradient id={id('skin')} cx="0.42" cy="0.36" r="0.72">
          <stop offset="0" stopColor="#f3d0b3" />
          <stop offset="0.6" stopColor="#e8b996" />
          <stop offset="1" stopColor="#d9a17f" />
        </radialGradient>
        <linearGradient id={id('hair')} x1="0.2" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#4a3f45" />
          <stop offset="1" stopColor="#231d21" />
        </linearGradient>
        <linearGradient id={id('shirt')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a5dcdf" />
          <stop offset="1" stopColor="#74c2c7" />
        </linearGradient>
        <linearGradient id={id('cavity')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a2f38" />
          <stop offset="1" stopColor="#7a434b" />
        </linearGradient>
        <radialGradient id={id('tongue')} cx="0.5" cy="0.4" r="0.65">
          <stop offset="0" stopColor="#f6b9bb" />
          <stop offset="0.7" stopColor="#ea9da2" />
          <stop offset="1" stopColor="#d9868e" />
        </radialGradient>
        <radialGradient id={id('blush')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ec9a8e" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ec9a8e" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('gloss')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <clipPath id={id('mouth')}>
          <motion.path initial={false} animate={{ d: mouthD }} transition={t} />
        </clipPath>
      </defs>

      {/* Shoulders and neck */}
      <path d="M28 240C32 217 60 205 92 203C104 213 136 213 148 203C180 205 208 217 212 240Z" fill={url('shirt')} />
      <path d="M92 203C104 213 136 213 148 203" fill="none" stroke="#0a7584" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
      <path d="M103 190V208C110 213 130 213 137 208V190Z" fill="#d9a07d" />

      {/* Ears */}
      <g fill="#e3ad8a">
        <ellipse cx="48" cy="124" rx="13" ry="16" />
        <ellipse cx="192" cy="124" rx="13" ry="16" />
      </g>
      <g fill="#cf9473" opacity="0.6">
        <ellipse cx="49" cy="125" rx="6" ry="9" />
        <ellipse cx="191" cy="125" rx="6" ry="9" />
      </g>

      {/* Face */}
      <motion.path initial={false} animate={{ d: FACE[p.face] }} transition={t} fill={url('skin')} />

      {/* Hair */}
      <path d={HAIR} fill={url('hair')} />
      <path d="M68 60C82 42 102 34 124 34" fill="none" stroke="#8a7a82" strokeOpacity="0.4" strokeWidth="6" strokeLinecap="round" />

      {/* Brows, eyes, nose */}
      <g fill="none" stroke="#3a3034" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round">
        <path d="M84 99Q94 94 104 98" />
        <path d="M136 98Q146 94 156 99" />
      </g>
      <g fill="#2a2630">
        <ellipse cx="94" cy="116" rx="7.5" ry="9" />
        <ellipse cx="146" cy="116" rx="7.5" ry="9" />
      </g>
      <g fill="#ffffff">
        <circle cx="96.6" cy="112.4" r="2.8" />
        <circle cx="148.6" cy="112.4" r="2.8" />
      </g>
      <path d="M115.5 138Q120 141.5 124.5 138" fill="none" stroke="#c4876a" strokeWidth="2.6" strokeLinecap="round" />

      {/* Cheeks (puff up in the "cheeks" pose) */}
      <motion.g initial={false} animate={{ scale: puff ? 1.25 : 1, opacity: puff ? 1 : 0.85 }} transition={t} style={{ transformBox: 'view-box', originX: '120px', originY: '146px' }}>
        <ellipse cx="78" cy="146" rx="15" ry="9.5" fill={url('blush')} />
        <ellipse cx="162" cy="146" rx="15" ry="9.5" fill={url('blush')} />
      </motion.g>
      <motion.g initial={false} animate={{ opacity: puff ? 1 : 0 }} transition={fade}>
        <ellipse cx="72" cy="140" rx="9" ry="6" fill={url('gloss')} />
        <ellipse cx="168" cy="140" rx="9" ry="6" fill={url('gloss')} />
      </motion.g>

      {/* Mouth: cavity, teeth and tongue inside, then lips, then a tongue that sticks out */}
      <g transform={`translate(${CX} ${CY}) scale(${MOUTH_SCALE}) translate(${-CX} ${-CY})`}>
      <motion.path initial={false} animate={{ d: mouthD }} transition={t} fill={url('cavity')} />
      <g clipPath={url('mouth')}>
        <motion.rect
          x={CX - 40}
          width="80"
          rx="4"
          fill="#fbf8f2"
          initial={false}
          animate={{ y: p.upperTeeth - 40, height: 40 }}
          transition={t}
        />
        <motion.rect x={CX - 40} width="80" height="40" rx="4" fill="#f3efe7" initial={false} animate={{ y: p.lowerTeeth }} transition={t} />
        <motion.path
          initial={false}
          animate={{ d: tongueD, opacity: p.tongue.show ? 1 : 0 }}
          transition={{ default: t, opacity: fade }}
          fill={url('tongue')}
        />
        <motion.path
          d={`M${CX} ${CY - 6}L${CX} ${CY + 4}`}
          stroke="#b5636c"
          strokeWidth="2"
          strokeLinecap="round"
          initial={false}
          animate={{ opacity: p.frenulum ? 0.8 : 0 }}
          transition={fade}
        />
      </g>
      <motion.path
        initial={false}
        animate={{ d: mouthD, strokeWidth: p.mouth.lip }}
        transition={t}
        fill="none"
        stroke="#c97c77"
        strokeLinejoin="round"
      />
      <motion.path
        initial={false}
        animate={{ d: tongueD, opacity: p.tongue.show && p.tongue.out ? 1 : 0 }}
        transition={{ default: t, opacity: fade }}
        fill={url('tongue')}
        stroke="#bf6f78"
        strokeOpacity="0.55"
        strokeWidth="1.2"
      />
      <motion.path
        initial={false}
        animate={{
          d: groovePath(p.tongue),
          opacity: p.tongue.show && p.tongue.bw > 14 && !p.frenulum ? 0.45 : 0,
        }}
        transition={{ default: t, opacity: fade }}
        fill="none"
        stroke="#bf6c74"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
        <motion.path
          d={`M${CX + 13} ${CY - 12}C${CX + 17} ${CY - 15} ${CX + 24} ${CY - 13} ${CX + 23} ${CY - 9}C${CX + 22} ${CY - 6} ${CX + 15} ${CY - 6} ${CX + 13} ${CY - 12}Z`}
          fill="#f2b04a"
          initial={false}
          animate={{ opacity: pose === 'jam' ? 0.95 : 0 }}
          transition={fade}
        />
      </g>
    </svg>
  )
}

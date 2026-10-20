// Generates the adult body-map pictograms public/symbols/custom/body_*.svg: a calm slate silhouette with the
// region the person points at highlighted in amber (never red). Front view for most parts, back view for back/neck.
// Also draws: number tiles (num_*), weekday calendar tiles (day_*), table, door_plain and the «without ...» diet pictograms (no_*,
// which need `node scripts/fetch-symbols.mjs` to have downloaded salt / cookie / butter first).
// Run: node scripts/gen-custom-symbols.adult.mjs
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'symbols', 'custom')
mkdirSync(OUT, { recursive: true })

const SIL = '#8f9bab'
const SIL_DARK = '#76839a'
const HI = '#f0a43a'
const HI_EDGE = '#c9760f'

/** The silhouette (front or back) drawn with the same simple shapes everywhere so the highlight is the only difference. */
function figure(back) {
  const limb = (pts, w) => `<polyline points="${pts}" fill="none" stroke="${SIL}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
  return [
    `<ellipse cx="128" cy="236" rx="52" ry="7" fill="#3b4656" opacity="0.14"/>`,
    limb('84,96 66,138 58,180', 17),
    limb('172,96 190,138 198,180', 17),
    limb('112,180 108,222', 27),
    limb('144,180 148,222', 27),
    `<ellipse cx="106" cy="230" rx="15" ry="7" fill="${SIL}"/>`,
    `<ellipse cx="150" cy="230" rx="15" ry="7" fill="${SIL}"/>`,
    `<path d="M86 94 Q86 80 102 80 H154 Q170 80 170 94 L165 170 Q164 184 150 184 H106 Q92 184 91 170 Z" fill="${SIL}"/>`,
    `<rect x="117" y="60" width="22" height="24" rx="8" fill="${SIL}"/>`,
    `<circle cx="128" cy="42" r="22" fill="${SIL}"/>`,
    back ? `<path d="M128 70 V176" stroke="${SIL_DARK}" stroke-width="4" stroke-linecap="round" stroke-dasharray="1 9"/>` : '',
  ].join('\n')
}

/** A highlight: soft halo plus amber fill. */
const hi = {
  ellipse: (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx + 7}" ry="${ry + 7}" fill="${HI}" opacity="0.28"/><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${HI}" stroke="${HI_EDGE}" stroke-width="3"/>`,
  rect: (x, y, w, h, r) => `<rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" rx="${r + 6}" fill="${HI}" opacity="0.28"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${HI}" stroke="${HI_EDGE}" stroke-width="3"/>`,
  line: (pts, w) => `<polyline points="${pts}" fill="none" stroke="${HI}" stroke-width="${w + 10}" opacity="0.28" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${pts}" fill="none" stroke="${HI}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`,
}

const PARTS = {
  back: { back: true, mark: [hi.rect(97, 84, 62, 94, 14)] },
  throat: { back: false, mark: [hi.ellipse(128, 72, 14, 12)] },
  neck: { back: true, mark: [hi.rect(113, 56, 30, 28, 10)] },
  shoulder: { back: false, mark: [hi.ellipse(90, 92, 15, 13), hi.ellipse(166, 92, 15, 13)] },
  stomach: { back: false, mark: [hi.ellipse(128, 146, 27, 21)] },
  chest: { back: false, mark: [hi.ellipse(128, 114, 30, 19)] },
  side: { back: false, mark: [hi.ellipse(98, 138, 8, 20), hi.ellipse(158, 138, 8, 20)] },
  upper_back: { back: true, mark: [hi.ellipse(128, 108, 34, 18)] },
  lower_back: { back: true, mark: [hi.ellipse(128, 160, 30, 14)] },
  arm: { back: false, mark: [hi.line('84,100 69,134', 17), hi.line('172,100 187,134', 17)] },
  elbow: { back: false, mark: [hi.ellipse(66, 136, 16, 16), hi.ellipse(190, 136, 16, 16)] },
  wrist: { back: false, mark: [hi.ellipse(59, 174, 15, 15), hi.ellipse(197, 174, 15, 15)] },
  hip: { back: false, mark: [hi.ellipse(106, 182, 15, 11), hi.ellipse(150, 182, 15, 11)] },
  knee: { back: false, mark: [hi.ellipse(110, 204, 15, 13), hi.ellipse(146, 204, 15, 13)] },
  ankle: { back: false, mark: [hi.ellipse(108, 224, 15, 10), hi.ellipse(148, 224, 15, 10)] },
}

for (const [name, p] of Object.entries(PARTS)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">\n${figure(p.back)}\n${p.mark.join('\n')}\n</svg>\n`
  writeFileSync(join(OUT, `body_${name}.svg`), svg)
}
console.log(`body_* pictograms: ${Object.keys(PARTS).length}`)

const wrap = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
${body}
</svg>
`
const FONT = 'font-family="Arial, Helvetica, sans-serif" font-weight="700" text-anchor="middle"'

/* number tiles: 20 ... 90, 100, 1000 and a half */
const NUMS = { 20: '20', 30: '30', 40: '40', 50: '50', 60: '60', 70: '70', 80: '80', 90: '90', 100: '100', 1000: '1000', half: '½' }
for (const [id, text] of Object.entries(NUMS)) {
  const size = text.length <= 2 ? 104 : text.length === 3 ? 84 : 66
  writeFileSync(
    join(OUT, `num_${id}.svg`),
    wrap(`<ellipse cx="128" cy="232" rx="70" ry="8" fill="#3b4656" opacity="0.14"/>
<rect x="24" y="28" width="208" height="196" rx="34" fill="#e8eef6" stroke="#9fb3cc" stroke-width="6"/>
<text x="128" y="${128 + size * 0.36}" font-size="${size}" fill="#2f4a6b" ${FONT}>${text}</text>`),
  )
}

/* weekday tiles: a calendar leaf with the ISO weekday number (1 = Monday) */
for (let n = 1; n <= 7; n++) {
  writeFileSync(
    join(OUT, `day_${n}.svg`),
    wrap(`<ellipse cx="128" cy="232" rx="70" ry="8" fill="#3b4656" opacity="0.14"/>
<rect x="30" y="34" width="196" height="190" rx="26" fill="#ffffff" stroke="#b6c3d4" stroke-width="6"/>
<path d="M30 60a26 26 0 0 1 26-26h144a26 26 0 0 1 26 26v28H30z" fill="#5b7fa8"/>
<circle cx="78" cy="34" r="9" fill="#e8eef6" stroke="#3f5f86" stroke-width="4"/><circle cx="178" cy="34" r="9" fill="#e8eef6" stroke="#3f5f86" stroke-width="4"/>
<text x="128" y="190" font-size="96" fill="#2f4a6b" ${FONT}>${n}</text>`),
  )
}

/* table */
writeFileSync(
  join(OUT, 'table.svg'),
  wrap(`<ellipse cx="128" cy="226" rx="86" ry="10" fill="#3b4656" opacity="0.16"/>
<rect x="46" y="104" width="14" height="116" rx="5" fill="#9c6f45"/><rect x="196" y="104" width="14" height="116" rx="5" fill="#9c6f45"/>
<rect x="64" y="104" width="10" height="100" rx="4" fill="#82593a"/><rect x="182" y="104" width="10" height="100" rx="4" fill="#82593a"/>
<rect x="24" y="76" width="208" height="38" rx="12" fill="#c79a6b" stroke="#9c6f45" stroke-width="5"/>
<rect x="36" y="82" width="184" height="9" rx="4.5" fill="#dcb88e" opacity="0.8"/>`),
)

/* plain door */
writeFileSync(
  join(OUT, 'door_plain.svg'),
  wrap(`<ellipse cx="128" cy="232" rx="66" ry="8" fill="#3b4656" opacity="0.16"/>
<rect x="62" y="22" width="132" height="208" rx="10" fill="#8a6a4b"/>
<rect x="74" y="34" width="108" height="196" rx="6" fill="#c79a6b"/>
<rect x="88" y="50" width="80" height="62" rx="6" fill="#b98a5a" stroke="#9c6f45" stroke-width="4"/>
<rect x="88" y="128" width="80" height="84" rx="6" fill="#b98a5a" stroke="#9c6f45" stroke-width="4"/>
<circle cx="160" cy="124" r="9" fill="#e3c25c" stroke="#b39228" stroke-width="3"/>`),
)

/* «without ...»: the food picture with a calm slate ring and slash (never red) */
/* towel and sugar cubes */
writeFileSync(
  join(OUT, 'towel.svg'),
  wrap(`<ellipse cx="128" cy="226" rx="84" ry="9" fill="#3b4656" opacity="0.14"/>
<rect x="40" y="52" width="176" height="162" rx="20" fill="#cfe3f5" stroke="#8fb3d6" stroke-width="6"/>
<rect x="40" y="82" width="176" height="22" fill="#ffffff" opacity="0.85"/><rect x="40" y="168" width="176" height="22" fill="#ffffff" opacity="0.85"/>
<path d="M60 52v162M82 52v162M174 52v162M196 52v162" stroke="#8fb3d6" stroke-width="3" opacity="0.5"/>`),
)
const cube = (x, y, s) => `<path d="M${x} ${y + s * 0.28}l${s * 0.5} -${s * 0.28}l${s * 0.5} ${s * 0.28}v${s * 0.6}l-${s * 0.5} ${s * 0.28}l-${s * 0.5} -${s * 0.28}z" fill="#f3f3f0" stroke="#b9bcc4" stroke-width="4" stroke-linejoin="round"/><path d="M${x} ${y + s * 0.28}l${s * 0.5} ${s * 0.28}l${s * 0.5} -${s * 0.28}M${x + s * 0.5} ${y + s * 0.56}v${s * 0.6}" fill="none" stroke="#b9bcc4" stroke-width="4" stroke-linejoin="round"/><path d="M${x + s * 0.5} ${y + s * 0.56}l${s * 0.5} -${s * 0.28}v${s * 0.6}l-${s * 0.5} ${s * 0.28}z" fill="#dfe1e6"/>`
writeFileSync(
  join(OUT, 'sugar.svg'),
  wrap(`<ellipse cx="128" cy="226" rx="84" ry="9" fill="#3b4656" opacity="0.14"/>${cube(40, 108, 88)}${cube(128, 108, 88)}${cube(84, 50, 88)}`),
)

const WITHOUT = { no_salt: 'salt', no_sugar: 'sugar', no_fat: 'butter' }
for (const [id, base] of Object.entries(WITHOUT)) {
  const src = existsSync(join(OUT, `${base}.svg`)) ? join(OUT, `${base}.svg`) : join(OUT, '..', `${base}.webp`)
  if (!existsSync(src)) {
    console.warn(`skip ${id}: ${base} image missing (run node scripts/fetch-symbols.mjs first)`)
    continue
  }
  const png = await sharp(readFileSync(src)).resize(168, 168, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  writeFileSync(
    join(OUT, `${id}.svg`),
    wrap(`<image x="44" y="44" width="168" height="168" href="data:image/png;base64,${png.toString('base64')}"/>
<circle cx="128" cy="128" r="104" fill="none" stroke="#5d6b7e" stroke-width="14"/>
<line x1="54" y1="54" x2="202" y2="202" stroke="#5d6b7e" stroke-width="14" stroke-linecap="round"/>`),
  )
}
console.log('tiles, table, door and diet pictograms written')

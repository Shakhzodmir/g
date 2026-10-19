// Generates public/symbols/custom/*.svg (static art). Run: node gen-symbols.mjs
import { writeFileSync, mkdirSync } from 'node:fs'

const OUT = 'C:/Users/aigpa/dev/speech-app-uz/public/symbols/custom'
mkdirSync(OUT, { recursive: true })

const f = (n) => Math.round(n * 10) / 10
// deterministic PRNG
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
const svg = (body, defs) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">\n<defs>\n${defs}\n</defs>\n${body}\n</svg>\n`

const shadow = (cx, cy, rx, ry, op = 0.24) => ({
  defs: `<radialGradient id="sh" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#3b2f2c" stop-opacity="${op}"/><stop offset="0.65" stop-color="#3b2f2c" stop-opacity="${op * 0.45}"/><stop offset="1" stop-color="#3b2f2c" stop-opacity="0"/></radialGradient>`,
  body: `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#sh)"/>`,
})

/* ---------------- anor (pomegranate) ---------------- */
{
  const sh = shadow(128, 226, 80, 13)
  const defs = `${sh.defs}
<radialGradient id="fruit" cx="0.36" cy="0.3" r="0.8">
  <stop offset="0" stop-color="#ec9a98"/>
  <stop offset="0.35" stop-color="#cd5e6c"/>
  <stop offset="0.75" stop-color="#a23d55"/>
  <stop offset="1" stop-color="#7c2d45"/>
</radialGradient>
<radialGradient id="rim" cx="0.75" cy="0.85" r="0.45">
  <stop offset="0" stop-color="#f0a0a2" stop-opacity="0.55"/>
  <stop offset="1" stop-color="#f0a0a2" stop-opacity="0"/>
</radialGradient>
<radialGradient id="spec" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0" stop-color="#ffffff" stop-opacity="0.85"/>
  <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
</radialGradient>
<linearGradient id="crown" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#c4596a"/>
  <stop offset="1" stop-color="#8e3349"/>
</linearGradient>
<linearGradient id="leaf" x1="0" y1="1" x2="1" y2="0">
  <stop offset="0" stop-color="#5e9a62"/>
  <stop offset="1" stop-color="#9cc98a"/>
</linearGradient>
<linearGradient id="facet" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
  <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.12"/>
  <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
</linearGradient>
<clipPath id="fc"><path d="M128 64C178 62 214 98 214 146C214 192 178 224 128 224C78 224 42 192 42 146C42 98 78 66 128 64Z"/></clipPath>`
  const body = `${sh.body}
<path d="M128 64C178 62 214 98 214 146C214 192 178 224 128 224C78 224 42 192 42 146C42 98 78 66 128 64Z" fill="url(#fruit)"/>
<g clip-path="url(#fc)">
  <path d="M86 70C70 110 70 180 92 224H112C94 180 94 112 104 66Z" fill="url(#facet)"/>
  <path d="M150 66C164 110 166 180 152 224H170C186 180 184 110 168 70Z" fill="url(#facet)" opacity="0.7"/>
  <ellipse cx="170" cy="196" rx="64" ry="44" fill="url(#rim)"/>
</g>
<ellipse cx="90" cy="108" rx="26" ry="15" transform="rotate(-38 90 108)" fill="url(#spec)"/>
<ellipse cx="74" cy="148" rx="6" ry="10" transform="rotate(-10 74 148)" fill="#ffffff" opacity="0.18"/>
<path d="M108 68C106 58 104 50 100 40L114 49 120 30 128 46 136 30 142 49 156 40C152 50 150 58 148 68C136 74 120 74 108 68Z" fill="url(#crown)" stroke="#a7445a" stroke-width="3" stroke-linejoin="round"/>
<ellipse cx="128" cy="52" rx="13" ry="4.5" fill="#5e2236"/>
<path d="M104 41 112 50M152 41 144 50M120 32 124 45M136 32 132 45" stroke="#e48b93" stroke-width="2.2" stroke-linecap="round" opacity="0.7"/>
<path d="M150 60C160 40 182 30 204 34C198 54 176 66 150 60Z" fill="url(#leaf)"/>
<path d="M152 59C166 50 182 42 201 36" fill="none" stroke="#4d8452" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
<path d="M162 48C172 41 182 38 190 37" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.35"/>`
  writeFileSync(`${OUT}/anor.svg`, svg(body, defs))
}

/* ---------------- non (round bread) ---------------- */
{
  const sh = shadow(128, 206, 112, 18, 0.26)
  const cx = 128
  const cy = 132
  let dots = ''
  // two concentric rings of chekich stamp dots + a centre rosette
  const ring = (n, rx, ry, rr, phase = 0) => {
    for (let i = 0; i < n; i++) {
      const a = phase + (i / n) * Math.PI * 2
      const x = cx + Math.cos(a) * rx
      const y = cy + 4 + Math.sin(a) * ry
      dots += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${rr}" ry="${f(rr * 0.68)}" fill="#b87436" opacity="0.75"/><ellipse cx="${f(x)}" cy="${f(y + 1)}" rx="${f(rr * 0.6)}" ry="${f(rr * 0.35)}" fill="#ffe9bf" opacity="0.6"/>`
    }
  }
  ring(16, 50, 31, 2.7)
  ring(10, 31, 19, 2.5, 0.31)
  ring(6, 13, 8, 2.3)
  dots += `<ellipse cx="${cx}" cy="${cy + 4}" rx="3.2" ry="2.2" fill="#b87436" opacity="0.8"/>`
  // nigella + sesame seeds on the centre
  const r = rng(7)
  let seeds = ''
  for (let i = 0; i < 10; i++) {
    const a = r() * Math.PI * 2
    const d = 0.25 + r() * 0.7
    const x = cx + Math.cos(a) * 58 * d
    const y = cy + 4 + Math.sin(a) * 36 * d
    const rot = Math.floor(r() * 180)
    if (i % 3 === 0) seeds += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="2.2" ry="1.2" fill="#3a2e2a" opacity="0.8" transform="rotate(${rot} ${f(x)} ${f(y)})"/>`
    else seeds += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="2.6" ry="1.5" fill="#fbf0d2" transform="rotate(${rot} ${f(x)} ${f(y)})"/>`
  }
  const defs = `${sh.defs}
<linearGradient id="side" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#b8692c"/>
  <stop offset="1" stop-color="#8a4a1f"/>
</linearGradient>
<radialGradient id="rimg" cx="0.4" cy="0.25" r="0.8">
  <stop offset="0" stop-color="#f6c47e"/>
  <stop offset="0.5" stop-color="#dc9748"/>
  <stop offset="1" stop-color="#b8692c"/>
</radialGradient>
<radialGradient id="center" cx="0.45" cy="0.4" r="0.65">
  <stop offset="0" stop-color="#f8e2b3"/>
  <stop offset="1" stop-color="#e6bf7f"/>
</radialGradient>
<radialGradient id="spec" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0" stop-color="#ffffff" stop-opacity="0.6"/>
  <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
</radialGradient>`
  const body = `${sh.body}
<ellipse cx="${cx}" cy="${cy + 16}" rx="110" ry="62" fill="url(#side)"/>
<ellipse cx="${cx}" cy="${cy}" rx="110" ry="64" fill="url(#rimg)"/>
<ellipse cx="${cx}" cy="${cy + 4}" rx="68" ry="42" fill="#b9732f" opacity="0.55"/>
<ellipse cx="${cx}" cy="${cy + 6}" rx="66" ry="40" fill="url(#center)"/>
${dots}
${seeds}
<ellipse cx="78" cy="94" rx="34" ry="12" transform="rotate(-18 78 94)" fill="url(#spec)"/>
<ellipse cx="190" cy="172" rx="22" ry="7" transform="rotate(-22 190 172)" fill="#ffd9a0" opacity="0.35"/>`
  writeFileSync(`${OUT}/non.svg`, svg(body, defs))
}

/* ---------------- doppi (Chust skullcap) ---------------- */
{
  const sh = shadow(128, 206, 104, 13)
  // white pepper (qalampir): a plump curved pod with a curled stem, ~60 tall at scale 1
  const pepper = (tone) => `
  <path d="M4-28C20-22 26 0 16 20C10 31-2 34-6 26C-9 19-4 12-5 2C-6-8-12-14-14-20C-16-28-6-32 4-28Z" fill="${tone}"/>
  <path d="M0-18C9-12 13 0 8 14" fill="none" stroke="#23252b" stroke-width="2.4" stroke-linecap="round" opacity="0.8"/>
  <path d="M-5-10C-1-4 1 4-1 12" fill="none" stroke="#23252b" stroke-width="1.8" stroke-linecap="round" opacity="0.55"/>
  <path d="M4-28C8-38 18-40 22-33" fill="none" stroke="${tone}" stroke-width="4" stroke-linecap="round"/>`
  const LEFT = 'M128 66C88 68 56 88 44 118C37 136 35 160 35 182L128 202Z'
  const RIGHT = 'M128 66C168 68 200 88 212 118C219 136 221 160 221 182L128 202Z'
  const defs = `${sh.defs}
<linearGradient id="left" x1="0.1" y1="0" x2="0.9" y2="1">
  <stop offset="0" stop-color="#555a66"/>
  <stop offset="0.55" stop-color="#2f323a"/>
  <stop offset="1" stop-color="#1d1f24"/>
</linearGradient>
<linearGradient id="right" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#3a3d46"/>
  <stop offset="1" stop-color="#15161a"/>
</linearGradient>
<linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#2e3139"/>
  <stop offset="1" stop-color="#141519"/>
</linearGradient>
<radialGradient id="spec" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0" stop-color="#ffffff" stop-opacity="0.32"/>
  <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
</radialGradient>
<clipPath id="lc"><path d="${LEFT}"/></clipPath>
<clipPath id="rc"><path d="${RIGHT}"/></clipPath>`
  const body = `${sh.body}
<path d="${LEFT}" fill="url(#left)"/>
<path d="${RIGHT}" fill="url(#right)"/>
<g clip-path="url(#lc)"><g transform="translate(86 124) rotate(-24) scale(1.12)">${pepper('#f4f1ea')}</g></g>
<g clip-path="url(#rc)"><g transform="translate(170 124) scale(-1 1) rotate(-24) scale(1.12)">${pepper('#d9d5cc')}</g></g>
<path d="M128 66V184" stroke="#0e0f12" stroke-width="2.6" opacity="0.55"/>
<path d="M129.6 70V184" stroke="#ffffff" stroke-width="1" opacity="0.14"/>
<path d="M35 160L128 180 221 160 221 182 128 202 35 182Z" fill="url(#band)"/>
<g fill="none" stroke="#f4f1ea" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
  <path d="M37 164 128 184 219 164" opacity="0.9"/>
  <path d="M37 178 128 198 219 178" opacity="0.9"/>
</g>
<g fill="#f4f1ea" opacity="0.85">
${[0.12, 0.3, 0.48, 0.66, 0.84]
  .flatMap((t) => [40 + t * 88, 128 + t * 88])
  .map((x) => {
    const y = x < 128 ? 171 + ((x - 37) / 91) * 20 : 191 - ((x - 128) / 91) * 20
    return `<circle cx="${f(x)}" cy="${f(y)}" r="2.1"/>`
  })
  .join('')}
</g>
<ellipse cx="84" cy="92" rx="34" ry="14" transform="rotate(-30 84 92)" fill="url(#spec)"/>`
  writeFileSync(`${OUT}/doppi.svg`, svg(body, defs))
}

/* ---------------- somsa ---------------- */
{
  const sh = shadow(128, 212, 100, 14)
  const r = rng(11)
  let seeds = ''
  const pts = [
    [128, 92], [114, 108], [142, 110], [100, 132], [128, 124], [156, 130], [86, 160], [112, 150],
    [146, 150], [170, 160], [100, 176], [128, 172], [158, 178], [74, 182], [182, 184],
  ]
  for (const [x, y] of pts) {
    const rot = Math.floor(r() * 180)
    seeds += `<g transform="rotate(${rot} ${x} ${y})"><ellipse cx="${x}" cy="${y + 1.2}" rx="3.6" ry="2" fill="#8a5220" opacity="0.35"/><ellipse cx="${x}" cy="${y}" rx="3.4" ry="1.9" fill="#fdf3d8"/></g>`
  }
  const TRI = 'M128 46C138 46 146 56 152 68L214 176C222 192 212 202 196 202H60C44 202 34 192 42 176L104 68C110 56 118 46 128 46Z'
  const defs = `${sh.defs}
<radialGradient id="crust" cx="0.45" cy="0.42" r="0.68">
  <stop offset="0" stop-color="#ffd890"/>
  <stop offset="0.5" stop-color="#f0b45c"/>
  <stop offset="0.85" stop-color="#d48a3a"/>
  <stop offset="1" stop-color="#b56b28"/>
</radialGradient>
<linearGradient id="side" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#c47a30"/>
  <stop offset="1" stop-color="#94551f"/>
</linearGradient>
<radialGradient id="spec" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0" stop-color="#ffffff" stop-opacity="0.6"/>
  <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
</radialGradient>`
  const body = `${sh.body}
<path d="M42 182C40 200 52 210 66 210H190C204 210 216 200 214 182L210 176C214 190 206 196 196 196H60C50 196 42 190 46 176Z" fill="url(#side)"/>
<path d="${TRI}" fill="url(#crust)"/>
<g fill="none" stroke-linecap="round">
  <path d="M128 144 128 56M128 144 54 194M128 144 202 194" stroke="#a9612a" stroke-width="5" opacity="0.4"/>
  <path d="M130 144 130 58M130 146 204 194M126 146 54 192" stroke="#ffe3a8" stroke-width="2" opacity="0.55"/>
</g>
<circle cx="128" cy="144" r="6" fill="#c27a35" opacity="0.6"/>
${seeds}
<ellipse cx="108" cy="92" rx="22" ry="10" transform="rotate(-58 108 92)" fill="url(#spec)"/>`
  writeFileSync(`${OUT}/somsa.svg`, svg(body, defs))
}

/* ---------------- palov on a Rishtan lagan ---------------- */
{
  const sh = shadow(128, 214, 122, 16, 0.22)
  const cx = 128
  const cy = 162
  // rim decoration: cobalt scallops and turquoise dots around the band
  let rim = ''
  const N = 22
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2
    const x = cx + Math.cos(a) * 104
    const y = cy + Math.sin(a) * 47
    rim += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(3.2 + Math.sin(a) * 0.8)}" fill="#2b4fb5" opacity="0.8"/>`
  }
  // rice grains
  const r = rng(3)
  let rice = ''
  for (let i = 0; i < 110; i++) {
    const a = r() * Math.PI
    const d = Math.sqrt(r())
    const x = cx + Math.cos(a + Math.PI) * 74 * d
    const yTop = cy - 2 - Math.sqrt(Math.max(0, 1 - ((x - cx) / 78) ** 2)) * 62
    const yBot = cy + 26 - ((x - cx) / 82) ** 2 * 22
    const y = yTop + 4 + r() * (yBot - yTop - 8)
    const rot = Math.floor(r() * 180)
    const light = r() > 0.5
    rice += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="3.4" ry="1.5" fill="${light ? '#fff6dc' : '#d9ac63'}" opacity="${light ? 0.85 : 0.55}" transform="rotate(${rot} ${f(x)} ${f(y)})"/>`
  }
  // carrot sticks
  const carrots = [
    [92, 128, -30, '#ef9e4a'], [110, 116, 20, '#f2c14e'], [150, 120, -20, '#ef9e4a'], [168, 136, 35, '#f2c14e'],
    [80, 148, 15, '#f2c14e'], [138, 106, 60, '#ef9e4a'], [176, 152, -10, '#ef9e4a'], [104, 146, 70, '#ef9e4a'],
    [124, 136, -55, '#f2c14e'], [152, 150, 10, '#ef9e4a'], [66, 160, -20, '#ef9e4a'], [190, 162, 25, '#f2c14e'],
  ]
    .map(
      ([x, y, rot, c]) =>
        `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-12" y="-2.6" width="24" height="5.2" rx="2.6" fill="${c}"/><rect x="-10" y="-2.2" width="16" height="1.6" rx="0.8" fill="#ffffff" opacity="0.35"/></g>`,
    )
    .join('')
  const CHUNK = 'M-15 0C-16-7-9-11-1-10 6-12 14-9 15-3 17 4 11 10 3 10-6 12-14 8-15 0Z'
  const meat = [
    [98, 108, -14],
    [160, 110, 16],
    [128, 132, 2],
  ]
    .map(
      ([x, y, rot]) =>
        `<g transform="translate(${x} ${y}) rotate(${rot}) scale(1.2)"><path d="${CHUNK}" fill="#4e2a1c" opacity="0.4" transform="translate(1 4)"/><path d="${CHUNK}" fill="url(#meat)"/><ellipse cx="-5" cy="-5" rx="6" ry="3" fill="#d39a74" opacity="0.45"/></g>`,
    )
    .join('')
  const chick = [
    [84, 122], [172, 120], [140, 92], [116, 90], [190, 146],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.6" fill="url(#pea)"/>`)
    .join('')
  const defs = `${sh.defs}
<linearGradient id="plateSide" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#d6e6e6"/>
  <stop offset="1" stop-color="#a9c4c6"/>
</linearGradient>
<radialGradient id="plate" cx="0.4" cy="0.3" r="0.8">
  <stop offset="0" stop-color="#ffffff"/>
  <stop offset="1" stop-color="#e2eeee"/>
</radialGradient>
<linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#a6dcde"/>
  <stop offset="1" stop-color="#4fa9b1"/>
</linearGradient>
<radialGradient id="rice" cx="0.45" cy="0.3" r="0.75">
  <stop offset="0" stop-color="#fbe8bd"/>
  <stop offset="0.6" stop-color="#edcb88"/>
  <stop offset="1" stop-color="#d4a55b"/>
</radialGradient>
<radialGradient id="meat" cx="0.4" cy="0.35" r="0.75">
  <stop offset="0" stop-color="#a86a4a"/>
  <stop offset="1" stop-color="#6e3b27"/>
</radialGradient>
<radialGradient id="pea" cx="0.35" cy="0.35" r="0.7">
  <stop offset="0" stop-color="#f6dfaa"/>
  <stop offset="1" stop-color="#d1a865"/>
</radialGradient>
<radialGradient id="garlic" cx="0.38" cy="0.32" r="0.75">
  <stop offset="0" stop-color="#ffffff"/>
  <stop offset="1" stop-color="#e3d6c0"/>
</radialGradient>
<radialGradient id="spec" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0" stop-color="#ffffff" stop-opacity="0.8"/>
  <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
</radialGradient>`
  const body = `${sh.body}
<ellipse cx="${cx}" cy="${cy + 10}" rx="118" ry="52" fill="url(#plateSide)"/>
<ellipse cx="${cx}" cy="${cy}" rx="118" ry="54" fill="url(#plate)"/>
<ellipse cx="${cx}" cy="${cy}" rx="112" ry="50.5" fill="url(#band)"/>
<ellipse cx="${cx}" cy="${cy}" rx="112" ry="50.5" fill="none" stroke="#2b4fb5" stroke-width="1.6" opacity="0.6"/>
${rim}
<ellipse cx="${cx}" cy="${cy + 2}" rx="94" ry="41" fill="url(#plate)"/>
<ellipse cx="${cx}" cy="${cy + 2}" rx="94" ry="41" fill="none" stroke="#2b4fb5" stroke-width="2" opacity="0.55"/>
<ellipse cx="${cx}" cy="${cy + 2}" rx="88" ry="37.5" fill="none" stroke="#8fd3d6" stroke-width="2.5" opacity="0.8"/>
<ellipse cx="128" cy="180" rx="84" ry="16" fill="#6b5a3e" opacity="0.2"/>
<path d="M46 162C48 118 86 92 128 92C170 92 208 118 210 162C200 178 168 189 128 189C88 189 56 178 46 162Z" fill="url(#rice)"/>
${rice}
${chick}
${carrots}
${meat}
<g transform="translate(128 84)">
  <path d="M-15 6C-17-6-10-16 0-18 10-16 17-6 15 6 12 14-12 14-15 6Z" fill="url(#garlic)"/>
  <path d="M-5-15C-9-6-9 4-6 11M5-15C9-6 9 4 6 11M0-18V12" fill="none" stroke="#c9b897" stroke-width="1.4" opacity="0.8"/>
  <path d="M-2-18C-2-24 2-24 2-18" fill="#d8c8a8"/>
</g>
<ellipse cx="88" cy="124" rx="22" ry="8" transform="rotate(-30 88 124)" fill="url(#spec)" opacity="0.6"/>
<ellipse cx="50" cy="150" rx="18" ry="6" transform="rotate(-25 50 150)" fill="url(#spec)"/>`
  writeFileSync(`${OUT}/palov.svg`, svg(body, defs))
}
console.log('ok')

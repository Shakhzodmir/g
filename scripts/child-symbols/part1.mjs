// colour discs, shapes, opposites, fruit & vegetables without a Fluent emoji
import { leaf, make, regular, roundPoly, shade } from './lib.mjs'

/* ---- colour discs (same look as the Fluent circles) ---- */
for (const [name, c] of [
  ['color_pink', '#f58fb6'],
  ['color_gray', '#9aa1ab'],
  ['color_light_blue', '#6fcdf5'],
  ['color_turquoise', '#27c4ae'],
  ['color_gold', '#eeb92a'],
]) {
  make(name, (ic) => {
    ic.circle(128, 128, 106, c, { sphere: true, stroke: false })
    ic.shine(94, 84, 46, 26, -32, 0.5)
    if (name === 'color_gold') ic.shine(150, 176, 56, 14, 25, 0.35)
  })
}

/* ---- shapes: one calm lavender so no colour is taught together with a shape ---- */
const SH = '#8d8ee6'
make('shape_circle', (ic) => {
  ic.shadow()
  ic.circle(128, 122, 96, SH, { sphere: true, sw: 3 })
  ic.shine(94, 80, 40, 22, -30, 0.55)
})
make('shape_square', (ic) => {
  ic.shadow()
  ic.rect(36, 32, 184, 184, 24, SH)
  ic.shine(90, 66, 50, 18, -10, 0.5)
})
make('shape_triangle', (ic) => {
  ic.shadow()
  ic.path(roundPoly([[128, 30], [226, 208], [30, 208]], 20), SH)
  ic.shine(106, 110, 30, 16, -55, 0.5)
})
make('shape_rectangle', (ic) => {
  ic.shadow()
  ic.rect(20, 64, 216, 128, 20, SH)
  ic.shine(80, 92, 52, 14, -8, 0.5)
})
make('shape_star', (ic) => {
  ic.shadow()
  const pts = []
  for (let i = 0; i < 10; i++) {
    const R = i % 2 ? 50 : 106
    const a = ((-90 + 36 * i) * Math.PI) / 180
    pts.push([128 + R * Math.cos(a), 128 + R * Math.sin(a) + 4])
  }
  ic.path(roundPoly(pts, 12), SH)
  ic.shine(112, 96, 30, 14, -40, 0.5)
})
make('shape_heart', (ic) => {
  ic.shadow()
  ic.path('M128 214 C36 150 24 104 44 70 C64 38 110 40 128 76 C146 40 192 38 212 70 C232 104 220 150 128 214 Z', SH)
  ic.shine(90, 84, 28, 16, -40, 0.55)
})
make('shape_oval', (ic) => {
  ic.shadow()
  ic.ellipse(128, 124, 108, 68, SH, { sphere: true })
  ic.shine(90, 98, 40, 16, -15, 0.55)
})
make('shape_diamond', (ic) => {
  ic.shadow()
  ic.path(roundPoly([[128, 26], [224, 124], [128, 222], [32, 124]], 16), SH)
  ic.shine(106, 82, 34, 14, -45, 0.5)
})
make('shape_hexagon', (ic) => {
  ic.shadow()
  ic.path(roundPoly(regular(6, 128, 124, 100, 0), 16), SH)
  ic.shine(100, 84, 38, 14, -20, 0.5)
})
make('shape_pentagon', (ic) => {
  ic.shadow()
  ic.path(roundPoly(regular(5, 128, 130, 104), 16), SH)
  ic.shine(104, 82, 36, 14, -25, 0.5)
})
make('shape_crescent', (ic) => {
  ic.shadow()
  ic.path('M170 36 C100 42 60 92 70 150 C80 206 142 226 190 200 C140 196 108 160 112 118 C116 84 140 56 170 36 Z', SH)
  ic.shine(90, 120, 14, 36, 10, 0.5)
})
make('shape_cube', (ic) => {
  ic.shadow(128, 232, 84, 10)
  ic.path('M128 28 L214 74 L128 120 L42 74 Z', shade(SH, 0.3))
  ic.path('M42 74 L128 120 L128 224 L42 176 Z', SH)
  ic.path('M214 74 L128 120 L128 224 L214 176 Z', shade(SH, -0.22))
})
make('shape_cylinder', (ic) => {
  ic.shadow()
  ic.path('M52 66 L52 182 C52 206 204 206 204 182 L204 66 Z', SH, { dir: 'h' })
  ic.ellipse(128, 66, 76, 28, shade(SH, 0.3))
})
make('shape_cone', (ic) => {
  ic.shadow()
  ic.path('M128 28 L212 176 C212 214 44 214 44 176 Z', SH, { dir: 'h' })
  ic.shine(112, 120, 12, 44, 12, 0.45)
})
make('shape_pyramid', (ic) => {
  ic.shadow(128, 232, 90, 10)
  ic.path('M128 28 L40 176 L128 214 Z', SH)
  ic.path('M128 28 L216 176 L128 214 Z', shade(SH, -0.22))
  ic.path('M40 176 L128 214 L216 176 L128 196 Z', shade(SH, -0.35), { sw: 2 })
})
make('shape_arrow', (ic) => {
  ic.shadow()
  ic.path(roundPoly([[24, 98], [136, 98], [136, 52], [232, 128], [136, 204], [136, 158], [24, 158]], 12), SH)
  ic.shine(80, 112, 40, 8, 0, 0.5)
})

/* ---- opposites ---- */
function glass(ic, filled) {
  ic.shadow(128, 228, 62, 9)
  if (filled) {
    ic.path('M64 76 L192 76 L180 214 L76 214 Z', '#5db8ee', { stroke: false })
    ic.ellipse(128, 76, 64, 10, '#8fd2f6', { stroke: false })
  }
  ic.path('M58 50 L198 50 L182 218 L74 218 Z', '#dff4ff', { flat: true, op: filled ? 0.22 : 0.55, strokeColor: '#7ab6d8', sw: 5 })
  ic.line('M80 62 L88 196', '#ffffff', 8, { op: 0.75 })
  if (!filled) ic.ellipse(128, 215, 46, 5, '#c3dff0', { flat: true, stroke: false })
}
make('glass_full', (ic) => glass(ic, true))
make('glass_empty', (ic) => glass(ic, false))

const TEE = 'M82 50 L112 36 C118 52 138 52 144 36 L174 50 L214 88 L190 118 L172 104 L172 216 L84 216 L84 104 L66 118 L42 88 Z'
make('clean_shirt', (ic) => {
  ic.shadow()
  ic.path(TEE, '#7cc4f0')
  ic.line('M112 38 C118 56 138 56 144 38', '#4f93c4', 5)
  const star = (x, y, s, c) => ic.path(`M${x} ${y - s} Q${x + 3} ${y - 3} ${x + s} ${y} Q${x + 3} ${y + 3} ${x} ${y + s} Q${x - 3} ${y + 3} ${x - s} ${y} Q${x - 3} ${y - 3} ${x} ${y - s} Z`, c, { flat: true, sw: 2, strokeColor: '#e0a800' })
  star(212, 52, 22, '#ffe266')
  star(48, 150, 16, '#ffe266')
  star(196, 176, 12, '#fff3a8')
})
make('dirty_shirt', (ic) => {
  ic.shadow()
  ic.path(TEE, '#aab4bd')
  ic.line('M112 38 C118 56 138 56 144 38', '#737d86', 5)
  for (const [x, y, rx, ry] of [[112, 128, 24, 17], [152, 164, 18, 24], [124, 190, 15, 10], [96, 80, 10, 8], [166, 106, 11, 8]])
    ic.ellipse(x, y, rx, ry, '#7a5636', { flat: true, stroke: false, tf: `rotate(-20 ${x} ${y})` })
  for (const [x, y] of [[140, 134], [88, 160], [176, 196], [130, 100]]) ic.circle(x, y, 4, '#7a5636', { flat: true, stroke: false })
})
make('weight_heavy', (ic) => {
  ic.shadow(128, 228, 80, 11, 0.3)
  ic.path('M82 98 C82 30 174 30 174 98', 'none', { flat: true, strokeColor: '#3f4650', sw: 20 })
  ic.circle(128, 156, 74, '#59616d', { sphere: true, strokeColor: '#2c323a' })
  ic.shine(98, 120, 30, 18, -35, 0.5)
  ic.rect(96, 150, 64, 30, 10, '#d7dce2', { sw: 2, strokeColor: '#8a929c' })
  ic.line('M110 165 L146 165', '#59616d', 6)
})

/* ---- fruit & vegetables without a Fluent emoji ---- */
make('apricot', (ic) => {
  ic.shadow()
  ic.circle(128, 142, 82, '#f6a83f', { sphere: true })
  ic.path('M128 62 C112 100 112 170 128 222', 'none', { flat: true, strokeColor: '#d9801e', sw: 4 })
  ic.shine(96, 108, 30, 18, -35, 0.55)
  ic.line('M128 62 L134 40', '#7a5a2e', 7)
  leaf(ic, 134, 46, -20)
})
make('plum', (ic) => {
  ic.shadow()
  ic.ellipse(128, 144, 74, 84, '#7a4aa0', { sphere: true })
  ic.path('M128 62 C112 100 112 186 128 226', 'none', { flat: true, strokeColor: '#5a3380', sw: 4 })
  ic.shine(98, 104, 22, 14, -40, 0.5)
  ic.line('M128 62 L134 38', '#6b4a2a', 7)
  leaf(ic, 134, 44, -25, 0.9)
})
make('fig', (ic) => {
  ic.shadow()
  ic.path('M128 54 C176 64 214 120 196 176 C184 214 160 226 128 226 C96 226 72 214 60 176 C42 120 80 64 128 54 Z', '#7e4d73')
  ic.path('M128 62 C118 110 112 170 128 224', 'none', { flat: true, strokeColor: '#5a3354', sw: 3 })
  ic.path('M150 70 C172 100 184 140 178 190', 'none', { flat: true, strokeColor: '#9a6a8e', sw: 3 })
  ic.shine(100, 120, 20, 30, 15, 0.45)
  ic.line('M128 56 L128 34', '#6b5a2a', 8)
  leaf(ic, 128, 42, -30, 0.8)
})
make('quince', (ic) => {
  ic.shadow()
  ic.path('M128 64 C158 56 176 72 176 94 C220 112 216 190 168 216 C146 228 110 228 88 216 C40 190 36 112 80 94 C80 72 98 56 128 64 Z', '#ebd24a')
  ic.shine(96, 126, 22, 36, 20, 0.55)
  ic.line('M128 66 L132 44', '#7a5a2e', 7)
  leaf(ic, 132, 50, -15, 0.9)
})
make('mulberry', (ic) => {
  ic.shadow()
  for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) ic.circle(96 + c * 22 + (r % 2) * 10, 94 + r * 24, 17, '#5d2c66', { sphere: true, sw: 2 })
  ic.path('M96 70 C110 50 150 50 164 70 C150 82 110 82 96 70 Z', '#6fb35a', { sw: 2.5 })
  ic.line('M130 62 L132 32', '#6b4a2a', 7)
})
make('pumpkin', (ic) => {
  ic.shadow()
  ic.ellipse(128, 146, 104, 76, '#f08a2e', { sphere: true })
  ic.path('M128 72 C100 98 100 190 128 220', 'none', { flat: true, strokeColor: '#c76514', sw: 4 })
  ic.path('M128 72 C156 98 156 190 128 220', 'none', { flat: true, strokeColor: '#c76514', sw: 4 })
  ic.path('M76 86 C50 120 52 176 82 210', 'none', { flat: true, strokeColor: '#d97a1e', sw: 3 })
  ic.path('M180 86 C206 120 204 176 174 210', 'none', { flat: true, strokeColor: '#d97a1e', sw: 3 })
  ic.rect(116, 40, 24, 40, 8, '#6a8a3a')
  ic.shine(86, 118, 26, 16, -35, 0.5)
})
make('cabbage', (ic) => {
  ic.shadow()
  ic.circle(128, 132, 92, '#a6d86f', { sphere: true })
  ic.path('M128 44 C90 80 90 170 128 222', 'none', { flat: true, strokeColor: '#78b043', sw: 4 })
  ic.path('M128 44 C166 80 166 170 128 222', 'none', { flat: true, strokeColor: '#78b043', sw: 4 })
  ic.path('M52 112 C84 128 100 160 104 196', 'none', { flat: true, strokeColor: '#8cc457', sw: 3 })
  ic.path('M204 112 C172 128 156 160 152 196', 'none', { flat: true, strokeColor: '#8cc457', sw: 3 })
  ic.shine(94, 92, 34, 18, -35, 0.5)
})

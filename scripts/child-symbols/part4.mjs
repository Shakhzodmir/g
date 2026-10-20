// position diagrams (ball + box) and body-part pictures (face / body with a bright highlight)
import { make } from './lib.mjs'

const BALL = '#f08a3a'
const BOX = '#58b4c4'
const ball = (ic, x, y, r) => {
  ic.circle(x, y, r, BALL, { sphere: true, strokeColor: '#b05a14', sw: 3 })
  ic.shine(x - r * 0.3, y - r * 0.35, r * 0.4, r * 0.22, -30, 0.55)
}
const box = (ic, x, y, w, h) => {
  ic.rect(x, y, w, h, 10, BOX, { strokeColor: '#2f8494', sw: 3.5 })
  ic.rect(x + 8, y + 10, w - 16, 10, 5, '#3f94a6', { flat: true, stroke: false, op: 0.7 })
}
const arrowHead = (ic, x, y, dir, c = '#3b4656') => {
  const d = { r: [[-14, -10], [0, 0], [-14, 10]], l: [[14, -10], [0, 0], [14, 10]] }[dir]
  ic.line(`M${x + d[0][0]} ${y + d[0][1]} L${x} ${y} L${x + d[2][0]} ${y + d[2][1]}`, c, 7)
}

make('pos_in', (ic) => {
  ic.shadow(128, 232, 90, 9)
  ic.rect(48, 96, 160, 128, 12, '#2f6f7c', { strokeColor: '#1f4f5a', sw: 3 })
  ball(ic, 128, 112, 42)
  ic.rect(44, 140, 168, 84, 12, BOX, { strokeColor: '#2f8494', sw: 3.5 })
  ic.rect(54, 150, 148, 10, 5, '#3f94a6', { flat: true, stroke: false, op: 0.7 })
})
make('pos_on', (ic) => {
  ic.shadow(128, 232, 90, 9)
  ball(ic, 128, 74, 42)
  box(ic, 48, 112, 160, 108)
})
make('pos_under', (ic) => {
  ic.shadow(128, 234, 100, 9)
  ball(ic, 128, 184, 36)
  ic.rect(28, 62, 200, 26, 8, '#d9a666', { strokeColor: '#8f5f2a' })
  ic.rect(46, 88, 16, 146, 4, '#b9814a', { strokeColor: '#8f5f2a', sw: 2.5 })
  ic.rect(194, 88, 16, 146, 4, '#b9814a', { strokeColor: '#8f5f2a', sw: 2.5 })
  ball(ic, 128, 186, 36)
})
make('pos_behind', (ic) => {
  ic.shadow(128, 232, 100, 9)
  ball(ic, 172, 130, 50)
  box(ic, 40, 96, 120, 124)
})
make('pos_front', (ic) => {
  ic.shadow(128, 232, 100, 9)
  box(ic, 100, 50, 130, 130)
  ball(ic, 92, 170, 50)
})
make('pos_next', (ic) => {
  ic.shadow(128, 232, 100, 9)
  box(ic, 26, 100, 110, 120)
  ball(ic, 184, 180, 40)
})
make('pos_between', (ic) => {
  ic.shadow(128, 232, 104, 9)
  box(ic, 14, 112, 82, 108)
  box(ic, 160, 112, 82, 108)
  ball(ic, 128, 184, 34)
})
make('pos_out', (ic) => {
  ic.shadow(128, 232, 104, 9)
  ic.rect(26, 110, 124, 110, 8, '#2f6f7c', { flat: true, stroke: false })
  box(ic, 22, 140, 132, 80)
  ic.line('M70 100 C100 40 170 40 196 130', '#3b4656', 7)
  arrowHead(ic, 196, 134, 'r')
  ball(ic, 204, 190, 34)
})
make('pos_near', (ic) => {
  ic.shadow(128, 232, 100, 9)
  ball(ic, 92, 160, 46)
  ball(ic, 168, 160, 46)
  ic.line('M92 70 L164 70', '#3b4656', 7)
  arrowHead(ic, 168, 70, 'r')
  arrowHead(ic, 88, 70, 'l')
})
make('pos_far', (ic) => {
  ic.shadow(128, 232, 108, 9)
  ball(ic, 38, 160, 28)
  ball(ic, 218, 160, 28)
  ic.line('M30 84 L226 84', '#3b4656', 7, { op: 0.9 })
  arrowHead(ic, 228, 84, 'r')
  arrowHead(ic, 28, 84, 'l')
})
make('pos_middle', (ic) => {
  ic.shadow(128, 232, 108, 9)
  ic.circle(46, 150, 34, '#b9c0ca', { sphere: true, strokeColor: '#7f8996', sw: 3 })
  ic.circle(210, 150, 34, '#b9c0ca', { sphere: true, strokeColor: '#7f8996', sw: 3 })
  ball(ic, 128, 150, 46)
  ic.path('M128 64 L152 96 L104 96 Z', '#3b4656', { flat: true, stroke: false })
})

/* ---- body-part pictures ---- */
const SKIN = '#e2a878'
const HAIR = '#3a2a24'
const HL = '#ffd23f'
const HLS = '#f08a00'
const glow = (ic, fn) => fn(ic)

function face(ic) {
  ic.shadow(128, 234, 70, 8)
  ic.ellipse(46, 128, 14, 22, SKIN, { strokeColor: '#b07a4e', sw: 3 })
  ic.ellipse(210, 128, 14, 22, SKIN, { strokeColor: '#b07a4e', sw: 3 })
  ic.ellipse(128, 128, 82, 96, SKIN, { strokeColor: '#b07a4e', sw: 3.5 })
  ic.path('M44 104 C40 40 100 22 128 22 C156 22 216 40 212 104 C196 70 160 58 128 58 C96 58 60 70 44 104 Z', HAIR, { strokeColor: '#1f1612', sw: 3 })
  ic.ellipse(100, 120, 9, 12, '#2a1c16', { flat: true, stroke: false })
  ic.ellipse(156, 120, 9, 12, '#2a1c16', { flat: true, stroke: false })
  ic.path('M92 94 Q100 88 110 92 M146 92 Q156 88 164 94', 'none', { flat: true, strokeColor: '#3a2a24', sw: 5 })
  ic.path('M128 130 Q120 154 130 158', 'none', { flat: true, strokeColor: '#b07a4e', sw: 4 })
  ic.path('M104 178 Q128 198 152 178', 'none', { flat: true, strokeColor: '#9a4a3a', sw: 6 })
}
const ring = (ic, shape) => ic.add(shape.replace('/>', ` fill="${HL}" fill-opacity="0.55" stroke="${HLS}" stroke-width="7" stroke-dasharray="0"/>`))

make('face_forehead', (ic) => {
  face(ic)
  ring(ic, '<ellipse cx="128" cy="72" rx="62" ry="22"/>')
})
make('face_eyebrow', (ic) => {
  face(ic)
  ring(ic, '<ellipse cx="102" cy="92" rx="26" ry="14"/>')
  ring(ic, '<ellipse cx="154" cy="92" rx="26" ry="14"/>')
})
make('face_cheek', (ic) => {
  face(ic)
  ring(ic, '<circle cx="76" cy="160" r="26"/>')
  ring(ic, '<circle cx="180" cy="160" r="26"/>')
})
make('face_chin', (ic) => {
  face(ic)
  ring(ic, '<ellipse cx="128" cy="212" rx="38" ry="20"/>')
})
make('face_lips', (ic) => {
  face(ic)
  ic.path('M96 180 Q128 168 160 180 Q128 206 96 180 Z', '#d9575f', { strokeColor: '#9a2f38', sw: 3 })
  ring(ic, '<ellipse cx="128" cy="184" rx="44" ry="20"/>')
})

const SHIRT = '#5aa9e6'
const PANTS = '#4a5f8a'
function figure(ic, back = false) {
  ic.shadow(128, 240, 70, 8)
  // legs
  ic.rect(94, 156, 30, 80, 12, PANTS, { strokeColor: '#2f3f60', sw: 3 })
  ic.rect(132, 156, 30, 80, 12, PANTS, { strokeColor: '#2f3f60', sw: 3 })
  // arms
  ic.rect(62, 92, 24, 84, 12, SKIN, { strokeColor: '#b07a4e', sw: 3 })
  ic.rect(170, 92, 24, 84, 12, SKIN, { strokeColor: '#b07a4e', sw: 3 })
  // torso
  ic.rect(82, 84, 92, 86, 24, SHIRT, { strokeColor: '#2f6fa8', sw: 3.5 })
  ic.rect(60, 88, 30, 38, 14, SHIRT, { strokeColor: '#2f6fa8', sw: 3 })
  ic.rect(166, 88, 30, 38, 14, SHIRT, { strokeColor: '#2f6fa8', sw: 3 })
  // neck + head
  ic.rect(116, 66, 24, 24, 8, SKIN, { strokeColor: '#b07a4e', sw: 3 })
  ic.circle(128, 46, 30, SKIN, { strokeColor: '#b07a4e', sw: 3.5 })
  if (back) ic.circle(128, 44, 31, HAIR, { strokeColor: '#1f1612', sw: 3 })
  else {
    ic.path('M98 44 C98 18 158 18 158 44 C150 30 106 30 98 44 Z', HAIR, { strokeColor: '#1f1612', sw: 2.5 })
    ic.circle(118, 50, 3.5, '#2a1c16', { flat: true, stroke: false })
    ic.circle(138, 50, 3.5, '#2a1c16', { flat: true, stroke: false })
    ic.path('M118 60 Q128 68 138 60', 'none', { flat: true, strokeColor: '#9a4a3a', sw: 3 })
  }
}
const spot = (ic, shape) => ic.add(shape.replace('/>', ` fill="${HL}" fill-opacity="0.6" stroke="${HLS}" stroke-width="6"/>`))

make('part_neck', (ic) => {
  figure(ic)
  spot(ic, '<ellipse cx="128" cy="80" rx="22" ry="14"/>')
})
make('part_shoulder', (ic) => {
  figure(ic)
  spot(ic, '<circle cx="80" cy="100" r="20"/>')
  spot(ic, '<circle cx="176" cy="100" r="20"/>')
})
make('part_elbow', (ic) => {
  figure(ic)
  spot(ic, '<circle cx="74" cy="136" r="18"/>')
  spot(ic, '<circle cx="182" cy="136" r="18"/>')
})
make('part_knee', (ic) => {
  figure(ic)
  spot(ic, '<circle cx="109" cy="198" r="19"/>')
  spot(ic, '<circle cx="147" cy="198" r="19"/>')
})
make('part_chest', (ic) => {
  figure(ic)
  spot(ic, '<ellipse cx="128" cy="118" rx="38" ry="24"/>')
})
make('part_back', (ic) => {
  figure(ic, true)
  ic.line('M128 98 L128 160', '#2f6fa8', 3, { op: 0.5 })
  spot(ic, '<ellipse cx="128" cy="128" rx="38" ry="38"/>')
})
void glow

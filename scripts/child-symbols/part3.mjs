// hygiene, nature, clothes, stationery, instruments, sports, holiday, city
import { make } from './lib.mjs'

/* ---- hygiene ---- */
make('kid_towel', (ic) => {
  ic.shadow(128, 228, 96, 10)
  ic.rect(52, 28, 152, 192, 14, '#58bfc6', { strokeColor: '#2f8a92' })
  ic.rect(52, 70, 152, 22, 0, '#f4fbfc', { flat: true, stroke: false })
  ic.rect(52, 100, 152, 14, 0, '#f4fbfc', { flat: true, stroke: false })
  for (let i = 0; i < 12; i++) ic.line(`M${62 + i * 12} 220 L${62 + i * 12} 236`, '#58bfc6', 5)
  ic.shine(86, 44, 24, 8, 0, 0.5)
})
make('toothpaste', (ic) => {
  ic.shadow(128, 228, 90, 9)
  ic.path('M60 150 L196 94 L214 138 L78 194 Z', '#f4f8fc', { strokeColor: '#9fb0cf' })
  ic.path('M60 150 L78 194 L50 206 L34 164 Z', '#3f86d6', { strokeColor: '#2a5fa0' })
  ic.path('M68 140 L180 94', 'none', { flat: true, strokeColor: '#3fb6a8', sw: 9 })
  ic.rect(176, 82, 40, 28, 7, '#3f86d6', { strokeColor: '#2a5fa0', tf: 'rotate(-22 196 96)' })
})
make('comb', (ic) => {
  ic.shadow(128, 218, 96, 9)
  for (let i = 0; i < 17; i++) ic.rect(34 + i * 11.6, 110, 6, 60, 3, '#f0a04b', { strokeColor: '#b36a1c', sw: 1.5 })
  ic.rect(26, 78, 204, 44, 14, '#f0a04b', { strokeColor: '#b36a1c' })
  ic.shine(94, 92, 46, 8, 0, 0.55)
})
make('tissues', (ic) => {
  ic.shadow(128, 228, 90, 10)
  ic.path('M96 128 C90 88 100 60 116 38 C124 60 128 68 134 46 C150 68 158 98 160 128 Z', '#ffffff', { strokeColor: '#b9c9d6', sw: 2.5 })
  ic.path('M126 128 C124 98 130 78 142 60 C152 80 156 104 150 128 Z', '#f4f8fb', { strokeColor: '#b9c9d6', sw: 2 })
  ic.rect(34, 120, 188, 100, 16, '#8ec8ea', { strokeColor: '#4a8ab0' })
  ic.ellipse(128, 122, 62, 9, '#2c556f', { flat: true, stroke: false })
  ic.shine(80, 150, 36, 10, -8, 0.5)
})
make('tap', (ic) => {
  ic.shadow(128, 234, 90, 8)
  ic.path('M40 100 L40 74 C40 52 62 44 100 44 L144 44 C170 44 176 60 176 76 L176 92 L146 92 L146 82 C146 76 140 74 134 74 L72 74 L72 100 Z', '#cfd6e0', { strokeColor: '#7f8996' })
  ic.rect(100, 24, 36, 22, 8, '#e05a4f', { strokeColor: '#a03228' })
  ic.rect(138, 88, 48, 22, 8, '#cfd6e0', { strokeColor: '#7f8996' })
  for (const [x, y, s] of [[162, 136, 1], [162, 178, 0.9], [162, 212, 0.8]]) ic.path(`M${x} ${y - 20 * s} C${x + 14 * s} ${y - 2 * s} ${x + 14 * s} ${y + 14 * s} ${x} ${y + 14 * s} C${x - 14 * s} ${y + 14 * s} ${x - 14 * s} ${y - 2 * s} ${x} ${y - 20 * s} Z`, '#5db8ee', { strokeColor: '#2e86c1', sw: 2.5 })
})

/* ---- nature ---- */
make('river', (ic) => {
  ic.shadow(128, 236, 96, 8)
  ic.rect(18, 24, 220, 204, 24, '#8fcf7a', { strokeColor: '#5c9a47' })
  ic.path('M170 28 C100 60 190 100 118 134 C60 160 130 196 96 226 L66 226 C110 190 40 156 100 120 C170 80 90 56 150 28 Z', '#4fb0ea', { strokeColor: '#2a7fb8', sw: 2.5 })
  ic.line('M150 90 C130 110 140 116 124 134', '#bfe6fa', 5, { op: 0.8 })
  ic.circle(52, 62, 18, '#5fa04a', { sphere: true, sw: 2 })
  ic.rect(49, 76, 6, 16, 2, '#7a5a2e', { flat: true, stroke: false })
  ic.circle(206, 176, 18, '#5fa04a', { sphere: true, sw: 2 })
  ic.rect(203, 190, 6, 16, 2, '#7a5a2e', { flat: true, stroke: false })
})
make('sea_waves', (ic) => {
  ic.shadow(128, 236, 100, 8)
  ic.rect(18, 24, 220, 204, 24, '#cdeefb', { strokeColor: '#6fb4d2' })
  ic.circle(184, 64, 24, '#ffd24a', { sphere: true, sw: 2 })
  ic.path('M18 122 C50 102 78 102 110 122 C142 142 170 142 238 112 L238 204 Q238 228 214 228 L42 228 Q18 228 18 204 Z', '#4fb0ea', { strokeColor: '#2a7fb8', sw: 2.5 })
  ic.path('M18 160 C50 140 78 140 110 160 C142 180 170 180 238 150 L238 204 Q238 228 214 228 L42 228 Q18 228 18 204 Z', '#2f8fd6', { strokeColor: '#1f6aa8', sw: 2.5 })
  ic.line('M44 118 C60 110 74 110 88 118', '#e8f7ff', 5)
  ic.line('M148 150 C164 142 178 142 192 150', '#e8f7ff', 5)
})
make('cotton', (ic) => {
  ic.shadow(128, 234, 90, 9)
  ic.line('M128 150 L128 232', '#6a8a3a', 10)
  ic.path('M128 204 C160 196 180 176 190 150 C160 150 138 172 128 204 Z', '#6fb35a', { sw: 2.5 })
  ic.path('M72 160 C58 150 52 176 76 190 Z M184 160 C198 150 204 176 180 190 Z', '#8b5a2e', { strokeColor: '#5a3416', sw: 2.5 })
  ic.path('M72 170 L184 170 L172 196 C160 212 96 212 84 196 Z', '#8b5a2e', { strokeColor: '#5a3416' })
  for (const [x, y, r] of [[92, 124, 28], [128, 106, 32], [166, 126, 28], [112, 150, 26], [150, 154, 24]]) ic.circle(x, y, r, '#ffffff', { strokeColor: '#d5dde4', sw: 2 })
})

/* ---- clothes ---- */
make('winter_hat', (ic) => {
  ic.shadow(128, 226, 84, 10)
  ic.path('M44 160 C44 80 84 48 128 48 C172 48 212 80 212 160 Z', '#e0555f', { strokeColor: '#9a2f38' })
  ic.rect(36, 150, 184, 52, 20, '#f4f0e8', { strokeColor: '#b5ab98' })
  for (let i = 0; i < 6; i++) ic.line(`M${64 + i * 26} 156 L${64 + i * 26} 196`, '#d8cfbc', 4)
  ic.circle(128, 40, 24, '#f4f0e8', { sphere: true, strokeColor: '#b5ab98', sw: 2.5 })
  ic.shine(96, 86, 26, 12, -35, 0.45)
})
make('sweater', (ic) => {
  ic.shadow()
  ic.path('M84 50 L112 38 C118 56 138 56 144 38 L172 50 L222 100 L222 176 L192 176 L192 126 L172 108 L172 216 L84 216 L84 108 L64 126 L64 176 L34 176 L34 100 Z', '#e8985a', { strokeColor: '#a85a22' })
  ic.rect(84, 196, 88, 20, 6, '#d9803a', { strokeColor: '#a85a22', sw: 2 })
  ic.rect(34, 160, 30, 16, 4, '#d9803a', { strokeColor: '#a85a22', sw: 2 })
  ic.rect(192, 160, 30, 16, 4, '#d9803a', { strokeColor: '#a85a22', sw: 2 })
  for (let i = 0; i < 3; i++) ic.line(`M100 ${110 + i * 26} L156 ${110 + i * 26}`, '#f4c08a', 6)
})
make('pajamas', (ic) => {
  ic.shadow()
  ic.path('M82 34 L112 24 C118 40 138 40 144 24 L174 34 L214 74 L192 100 L174 86 L174 130 L82 130 L82 86 L64 100 L42 74 Z', '#8fb4f0', { strokeColor: '#4a6fb5' })
  ic.path('M82 134 L174 134 L184 232 L136 232 L128 168 L120 232 L72 232 Z', '#8fb4f0', { strokeColor: '#4a6fb5' })
  for (const [x, y] of [[104, 62], [150, 84], [118, 106], [154, 52]]) ic.path(`M${x} ${y - 7} l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z`, '#ffe266', { flat: true, stroke: false })
  ic.circle(196, 44, 18, '#ffe266', { flat: true, stroke: false })
  ic.circle(204, 38, 16, '#8fb4f0', { flat: true, stroke: false })
})
make('skirt', (ic) => {
  ic.shadow()
  ic.path('M84 56 L172 56 L168 84 L226 214 C190 232 66 232 30 214 L88 84 Z', '#c78ad8', { strokeColor: '#8a4fa0' })
  ic.rect(80, 44, 96, 26, 8, '#a45fbd', { strokeColor: '#7a3f90', sw: 2.5 })
  for (const x of [88, 112, 136, 160, 186]) ic.line(`M${128 + (x - 128) * 0.55} 84 L${x + (x - 128) * 0.3} 222`, '#e4b8f0', 4, { op: 0.8 })
})
make('chapan', (ic) => {
  ic.shadow()
  ic.path('M96 26 L160 26 L180 52 L238 160 L214 176 L192 136 L196 226 L60 226 L64 136 L42 176 L18 160 L76 52 Z', '#3f9a8a', { strokeColor: '#216a5c' })
  for (const [i, c] of [[0, '#e0555f'], [1, '#f0c64a'], [2, '#3f6fd0'], [3, '#e0555f'], [4, '#f0c64a'], [5, '#3f6fd0']]) ic.rect(66 + i * 20, 58, 12, 164, 0, c, { flat: true, stroke: false, op: 0.9 })
  ic.path('M96 26 L128 90 L160 26 Z', '#f6f1de', { strokeColor: '#bfb592', sw: 2.5 })
  ic.rect(60, 150, 140, 10, 0, '#f0c64a', { flat: true, stroke: false })
})
make('belt', (ic) => {
  ic.shadow(128, 200, 104, 9)
  ic.rect(14, 104, 228, 44, 12, '#8b5a2e', { strokeColor: '#4a2c14' })
  for (let i = 0; i < 4; i++) ic.circle(36 + i * 22, 126, 4.5, '#2f1c0c', { flat: true, stroke: false })
  ic.rect(150, 88, 64, 76, 12, '#e8c64a', { strokeColor: '#a98010' })
  ic.rect(166, 104, 32, 44, 6, '#8b5a2e', { flat: true, stroke: false })
  ic.rect(176, 112, 54, 8, 4, '#c9a02a', { flat: true, stroke: false })
})
make('apron', (ic) => {
  ic.shadow()
  ic.path('M96 30 L160 30 L166 76 L214 98 L206 222 L50 222 L42 98 L90 76 Z', '#f2c14e', { strokeColor: '#a97a1a' })
  ic.path('M96 30 L128 62 L160 30', 'none', { flat: true, strokeColor: '#a97a1a', sw: 4 })
  ic.rect(88, 148, 80, 50, 10, '#e0a52e', { strokeColor: '#a97a1a', sw: 2.5 })
  ic.path('M42 98 L20 120 M214 98 L236 120', 'none', { flat: true, strokeColor: '#a97a1a', sw: 6 })
})
make('button', (ic) => {
  ic.shadow(128, 222, 84, 10)
  ic.circle(128, 126, 90, '#6aa8e8', { sphere: true, strokeColor: '#3a6fae' })
  ic.circle(128, 126, 66, '#6aa8e8', { flat: true, strokeColor: '#3a6fae', sw: 3, op: 1 })
  for (const [x, y] of [[106, 104], [150, 104], [106, 148], [150, 148]]) ic.circle(x, y, 10, '#2c4f80', { flat: true, stroke: false })
  ic.line('M106 104 L150 148 M150 104 L106 148', '#f4f8ff', 5)
  ic.shine(94, 86, 30, 14, -30, 0.45)
})
make('zipper', (ic) => {
  ic.shadow(128, 234, 60, 8)
  ic.rect(80, 14, 96, 218, 18, '#5a7fbf', { strokeColor: '#2f4f8a' })
  for (let i = 0; i < 12; i++) {
    ic.rect(104, 28 + i * 14, 20, 9, 3, '#d8dee8', { strokeColor: '#8791a3', sw: 1.5 })
    ic.rect(132, 35 + i * 14, 20, 9, 3, '#d8dee8', { strokeColor: '#8791a3', sw: 1.5 })
  }
  ic.rect(108, 74, 40, 40, 10, '#e8c64a', { strokeColor: '#a98010', sw: 3 })
  ic.rect(116, 112, 24, 34, 8, '#e8c64a', { strokeColor: '#a98010', sw: 3 })
  ic.circle(128, 132, 5, '#a98010', { flat: true, stroke: false })
})
make('pocket', (ic) => {
  ic.shadow(128, 228, 84, 9)
  ic.rect(26, 34, 204, 186, 14, '#5a7fbf', { strokeColor: '#2f4f8a' })
  ic.path('M52 70 L204 70 L204 150 C204 186 160 206 128 218 C96 206 52 186 52 150 Z', '#6e92d4', { strokeColor: '#2f4f8a', sw: 3 })
  ic.path('M60 78 L196 78 L196 150 C196 180 158 198 128 208 C98 198 60 180 60 150 Z', 'none', { flat: true, strokeColor: '#f0e2b0', sw: 3 })
  ic.rect(26, 34, 204, 26, 10, '#4a6cab', { strokeColor: '#2f4f8a', sw: 2.5 })
})

/* ---- stationery ---- */
make('eraser', (ic) => {
  ic.shadow(128, 214, 90, 9)
  ic.path('M40 150 L168 70 L226 108 L98 196 Z', '#f4a4bc', { strokeColor: '#c0587a' })
  ic.path('M40 150 L98 196 L72 212 L22 172 Z', '#fbfcff', { strokeColor: '#9fb0cf' })
  ic.path('M98 196 L226 108 L226 130 L112 214 Z', '#d8809b', { strokeColor: '#c0587a', sw: 2.5 })
  ic.shine(124, 110, 34, 8, -32, 0.55)
})
make('pencil_case', (ic) => {
  ic.shadow(128, 228, 100, 10)
  for (const [x, c] of [[70, '#f2c94c'], [100, '#e0555f'], [130, '#4f9ae6'], [160, '#4ab07a']]) {
    ic.path(`M${x} 100 L${x + 10} 40 L${x + 20} 100 Z`, c, { strokeColor: '#5a3a1c', sw: 2 })
    ic.path(`M${x + 6} 56 L${x + 10} 40 L${x + 14} 56 Z`, '#e8c8a0', { flat: true, stroke: false })
  }
  ic.rect(20, 96, 216, 118, 34, '#6ab0d8', { strokeColor: '#2f6f9a' })
  ic.line('M30 130 L226 130', '#2f6f9a', 4)
  ic.rect(110, 118, 36, 22, 8, '#f0c64a', { strokeColor: '#a98010', sw: 2.5 })
  ic.shine(70, 118, 36, 10, 0, 0.5)
  ic.circle(186, 176, 14, '#f4f8ff', { flat: true, stroke: false, op: 0.5 })
})
make('glue', (ic) => {
  ic.shadow(128, 232, 60, 8)
  ic.rect(88, 78, 80, 148, 16, '#f6f8fb', { strokeColor: '#a9b4c4' })
  ic.rect(96, 36, 64, 46, 12, '#f08a3a', { strokeColor: '#b05a14' })
  ic.rect(104, 140, 48, 44, 10, '#4f9ae6', { flat: true, stroke: false })
  ic.circle(128, 162, 12, '#f6f8fb', { flat: true, stroke: false })
  ic.shine(106, 110, 8, 30, 5, 0.6)
})
make('sharpener', (ic) => {
  ic.shadow(128, 214, 92, 9)
  ic.path('M150 176 C176 150 196 190 224 168 C222 196 190 212 150 200 Z', '#e8c070', { flat: true, stroke: false })
  ic.rect(30, 84, 196, 88, 24, '#4f9ae6', { strokeColor: '#2a5fa0' })
  ic.circle(84, 128, 26, '#1d3f6a', { flat: true, stroke: false })
  ic.circle(84, 128, 14, '#0f2a4a', { flat: true, stroke: false })
  ic.rect(130, 100, 70, 14, 5, '#d8dee8', { strokeColor: '#8791a3', sw: 2.5 })
  ic.circle(150, 107, 3.5, '#8791a3', { flat: true, stroke: false })
  ic.circle(180, 107, 3.5, '#8791a3', { flat: true, stroke: false })
  ic.shine(100, 98, 56, 8, -3, 0.5)
})
make('chalk', (ic) => {
  ic.shadow(128, 214, 92, 8)
  ic.rect(36, 108, 184, 46, 18, '#fbfbf6', { strokeColor: '#b9b8a8', tf: 'rotate(-28 128 130)' })
  ic.rect(180, 142, 34, 46, 14, '#e6e4d4', { strokeColor: '#b9b8a8', sw: 2, tf: 'rotate(-28 128 130)' })
  ic.line('M40 214 C70 198 90 222 124 204', '#f4f4ea', 6, { op: 0.9 })
  ic.shine(112, 108, 40, 7, -28, 0.7)
})
make('blackboard', (ic) => {
  ic.shadow(128, 234, 100, 9)
  ic.rect(20, 36, 216, 160, 12, '#2f6f58', { strokeColor: '#8b5a2e', sw: 12 })
  ic.rect(20, 192, 216, 16, 5, '#b98650', { strokeColor: '#7a4f26', sw: 2.5 })
  ic.rect(60, 196, 36, 8, 3, '#fbfbf6', { flat: true, stroke: false })
  ic.line('M52 78 L100 78 M52 104 L120 104 M52 130 L90 130', '#f4f4ea', 6, { op: 0.9 })
  ic.path('M150 140 L174 90 L198 140 Z', 'none', { flat: true, strokeColor: '#f4f4ea', sw: 5 })
  ic.circle(176, 124, 3, '#f4f4ea', { flat: true, stroke: false })
})
make('desk', (ic) => {
  ic.shadow(128, 234, 100, 10)
  ic.rect(30, 70, 196, 20, 6, '#e0b070', { strokeColor: '#8f5f2a' })
  ic.path('M30 70 L58 40 L198 40 L226 70 Z', '#c99058', { strokeColor: '#8f5f2a' })
  ic.rect(46, 90, 12, 134, 4, '#7a8aa0', { strokeColor: '#4a566a', sw: 2.5 })
  ic.rect(198, 90, 12, 134, 4, '#7a8aa0', { strokeColor: '#4a566a', sw: 2.5 })
  ic.rect(58, 150, 140, 14, 5, '#e0b070', { strokeColor: '#8f5f2a', sw: 2.5 })
  ic.rect(58, 124, 140, 14, 5, '#7a8aa0', { strokeColor: '#4a566a', sw: 2.5 })
  ic.shine(100, 76, 38, 4, 0, 0.55)
})

/* ---- instruments ---- */
make('doira', (ic) => {
  ic.shadow(128, 228, 90, 10)
  ic.circle(128, 122, 100, '#b9753a', { strokeColor: '#6a3e1c', sw: 4 })
  ic.circle(128, 122, 80, '#f0d9a8', { strokeColor: '#c9a06a', sw: 3 })
  ic.circle(128, 122, 48, 'none', { flat: true, strokeColor: '#c9a06a', sw: 3 })
  ic.path('M128 98 l8 18 l20 2 l-15 13 l5 19 l-18 -10 l-18 10 l5 -19 l-15 -13 l20 -2 Z', '#d0553f', { flat: true, stroke: false, op: 0.85 })
  for (const a of [20, 80, 140, 200, 260, 320]) {
    const x = 128 + 92 * Math.cos((a * Math.PI) / 180)
    const y = 122 + 92 * Math.sin((a * Math.PI) / 180)
    ic.circle(x, y, 9, '#e8d36a', { strokeColor: '#a98010', sw: 2 })
  }
})
make('dutor', (ic) => {
  ic.shadow(128, 232, 70, 8)
  ic.path('M190 22 L214 34 L150 130 L128 118 Z', '#5a3a1c', { strokeColor: '#2f1c0c', sw: 2.5 })
  ic.path('M200 18 L222 30 L214 44 L192 32 Z', '#8b5a2e', { strokeColor: '#2f1c0c', sw: 2.5 })
  ic.path('M96 120 C52 134 36 190 70 218 C102 240 156 226 164 186 C168 156 144 122 96 120 Z', '#c47a3e', { strokeColor: '#6a3e1c' })
  ic.circle(112, 176, 15, '#2f1c0c', { flat: true, stroke: false })
  ic.line('M114 130 L196 26 M122 138 L204 36', '#f6efe0', 2.5)
  ic.shine(92, 164, 14, 28, 20, 0.45)
})

/* ---- sports ---- */
make('swing', (ic) => {
  ic.shadow(128, 234, 104, 9)
  ic.path('M30 232 L128 30 L226 232', 'none', { flat: true, strokeColor: '#6a7a90', sw: 12 })
  ic.rect(108, 24, 40, 14, 6, '#4f6a90', { strokeColor: '#2f4a70', sw: 2 })
  ic.line('M110 40 L106 168 M146 40 L150 168', '#8a6a3a', 5)
  ic.rect(88, 164, 80, 16, 6, '#e0555f', { strokeColor: '#9a2f38' })
  ic.line('M70 218 L186 218', '#6a7a90', 8)
})

/* ---- holidays ---- */
make('navroz', (ic) => {
  ic.shadow(128, 234, 96, 10)
  ic.circle(196, 52, 26, '#ffd24a', { sphere: true, sw: 2 })
  for (let i = 0; i < 9; i++) {
    const x = 60 + i * 16
    ic.path(`M${x} 150 C${x - 8} 110 ${x + 4} 86 ${x - 2} 56 C${x + 14} 84 ${x + 18} 118 ${x + 8} 150 Z`, i % 2 ? '#7cc45c' : '#5eb04a', { strokeColor: '#3f7f2a', sw: 2 })
  }
  ic.path('M34 150 L222 150 C222 200 180 224 128 224 C76 224 34 200 34 150 Z', '#3f86d6', { strokeColor: '#2a5fa0' })
  ic.path('M52 170 Q128 196 204 170', 'none', { flat: true, strokeColor: '#f6f8ff', sw: 5 })
  ic.circle(128, 190, 8, '#ffe27a', { flat: true, stroke: false })
})

/* ---- city ---- */
make('pharmacy', (ic) => {
  ic.shadow(128, 234, 90, 9)
  ic.rect(36, 70, 184, 154, 10, '#f4f6fa', { strokeColor: '#9fb0cf' })
  ic.path('M26 70 L44 34 L212 34 L230 70 Z', '#4cb070', { strokeColor: '#2a7f4a' })
  ic.circle(128, 126, 40, '#ffffff', { strokeColor: '#4cb070', sw: 6 })
  ic.rect(120, 100, 16, 52, 4, '#4cb070', { flat: true, stroke: false })
  ic.rect(102, 118, 52, 16, 4, '#4cb070', { flat: true, stroke: false })
  ic.rect(104, 172, 48, 52, 6, '#8ac3ea', { strokeColor: '#4a8ab0', sw: 2.5 })
})

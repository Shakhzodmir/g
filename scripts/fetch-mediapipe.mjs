// Self-hosts the MediaPipe Face Landmarker used by the "Oyna" (mirror) exercises, so the camera exercises work
// offline and nothing is requested from a CDN.
//   node scripts/fetch-mediapipe.mjs
// Copies the two wasm variants FilesetResolver.forVisionTasks() can pick (SIMD and no-SIMD; the "_module" variants are only
// used with isModule=true and are not needed) from node_modules/@mediapipe/tasks-vision/wasm to public/mediapipe/wasm,
// and downloads the model to public/mediapipe/face_landmarker.task. Keep the wasm in step with the pinned package version.
import { copyFileSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')
const out = join(root, 'public', 'mediapipe')
mkdirSync(join(out, 'wasm'), { recursive: true })
for (const f of ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm']) {
  copyFileSync(join(src, f), join(out, 'wasm', f))
  console.log('copied', f, `${(statSync(join(out, 'wasm', f)).size / 1e6).toFixed(1)} MB`)
}
const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
const res = await fetch(MODEL)
if (!res.ok) throw new Error(`model download failed: ${res.status}`)
writeFileSync(join(out, 'face_landmarker.task'), Buffer.from(await res.arrayBuffer()))
console.log('model', `${(statSync(join(out, 'face_landmarker.task')).size / 1e6).toFixed(1)} MB`)

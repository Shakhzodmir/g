// Renders the PWA icons from public/icons/icon.svg.
//   node scripts/make-icons.mjs
// Outputs public/icons/icon-192.png, icon-512.png (rounded square, transparent corners)
// maskable-512.png (full-bleed background, art kept inside the central 80% safe zone) and
// apple-touch-icon-180.png (full-bleed, NO alpha channel: iOS paints transparent pixels black and rounds the corners itself).
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const iconsDir = join(root, 'public', 'icons')
mkdirSync(iconsDir, { recursive: true })

const src = readFileSync(join(iconsDir, 'icon.svg'), 'utf8')

function between(tag) {
  const m = src.match(new RegExp(`<!--${tag}-->([\\s\\S]*?)<!--/${tag}-->`))
  if (!m) throw new Error(`icon.svg: missing <!--${tag}--> block`)
  return m[1]
}

const defs = src.match(/<defs>[\s\S]*?<\/defs>/)?.[0]
if (!defs) throw new Error('icon.svg: missing <defs>')
const glow = between('glow')
const art = between('art')

// Maskable: launchers may crop to a circle of radius 40%, so the art is shrunk a little
// around the centre and the background fills the whole square.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
${defs}
<rect width="512" height="512" fill="url(#bg)"/>
${glow}
<g transform="translate(256 256) scale(0.9) translate(-256 -256)">${art}</g>
</svg>`

async function render(svg, size, file, { opaque = false } = {}) {
  // Rasterise at 2× and downsample for smooth edges.
  const density = Math.round((72 * size * 2) / 512)
  let img = sharp(Buffer.from(svg), { density }).resize(size, size)
  // Flatten onto the icon's turquoise (primary) so the file has no alpha channel at all.
  if (opaque) img = img.flatten({ background: '#0a7584' }).removeAlpha()
  await img.png({ compressionLevel: 9 }).toFile(join(iconsDir, file))
  console.log(`icons: ${file} (${size}×${size})`)
}

await render(src, 192, 'icon-192.png')
await render(src, 512, 'icon-512.png')
await render(maskable, 512, 'maskable-512.png')
await render(maskable, 180, 'apple-touch-icon-180.png', { opaque: true })

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import type { OgizchaPose } from '../content/types'
import { Musicha, type MascotState } from '../ui/mascot/Musicha'
import { Ogizcha } from '../ui/mascot/Ogizcha'
import { IkatBand } from '../ui/ornament/IkatBand'
import { RishtanCorner } from '../ui/ornament/RishtanCorner'
import { SuzaniRosette } from '../ui/ornament/SuzaniRosette'

const STATES: MascotState[] = ['idle', 'listen', 'speak', 'happy', 'calm', 'think']
const POSES: OgizchaPose[] = [
  'neutral',
  'smile',
  'tube',
  'open',
  'cheeks',
  'fence',
  'clock-left',
  'clock-right',
  'spatula',
  'needle',
  'horse',
  'jam',
]
const SYMBOLS = ['anor', 'non', 'doppi', 'somsa', 'palov']
const BASE = import.meta.env.BASE_URL

const card: CSSProperties = {
  background: 'var(--surface)',
  borderRadius: 'var(--r-card)',
  boxShadow: 'var(--elev-1)',
  padding: 16,
}
const label: CSSProperties = { font: '600 14px/1.2 var(--font-ui)', color: 'var(--text-muted)' }

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} style={{ display: 'grid', gap: 12, padding: 8 }}>
      <h2 style={{ margin: 0, font: '700 20px/1.2 var(--font-ui)', color: 'var(--text)' }}>{title}</h2>
      {children}
    </section>
  )
}

/** Dev-only gallery (#/dev/art) for reviewing illustrations visually. */
export default function ArtPreview() {
  const [level, setLevel] = useState(0.6)
  const [auto, setAuto] = useState(false)
  const [pose, setPose] = useState<OgizchaPose>('neutral')
  const [state, setState] = useState<MascotState>('idle')
  const [calm, setCalm] = useState(false)

  useEffect(() => {
    if (!auto) return
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const s = (t - t0) / 1000
      setLevel(Math.max(0, Math.sin(s * 9) * 0.5 + Math.sin(s * 3.7) * 0.5))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [auto])

  return (
    <main style={{ padding: 24, display: 'grid', gap: 28, background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)' }}>
      <h1 style={{ margin: 0, font: '800 28px/1.2 var(--font-ui)' }}>Art preview</h1>

      <Section id="musicha" title="Musicha">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', ...label }}>
          <label>
            level {level.toFixed(2)}{' '}
            <input type="range" min={0} max={1} step={0.01} value={level} onChange={(e) => setLevel(Number(e.target.value))} />
          </label>
          <label>
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> auto level
          </label>
          <label>
            <input type="checkbox" checked={calm} onChange={(e) => setCalm(e.target.checked)} /> calm sensory level
          </label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(620px, 1fr))', gap: 12 }}>
          {STATES.map((s) => (
            <div key={s} style={{ ...card, display: 'flex', alignItems: 'flex-end', gap: 16 }}>
              <span style={{ ...label, width: 56 }}>{s}</span>
              <Musicha state={s} size={48} level={level} calm={calm} />
              <Musicha state={s} size={64} level={level} calm={calm} />
              <Musicha state={s} size={160} level={level} calm={calm} />
              <Musicha state={s} size={320} level={level} calm={calm} />
            </div>
          ))}
        </div>
        <div style={{ ...card, display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div data-zoom="musicha-400" style={{ background: 'var(--bg)', borderRadius: 24, padding: 16 }}>
            <Musicha state={state} size={400} level={level} calm={calm} />
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {STATES.map((s) => (
              <label key={s} style={label}>
                <input type="radio" name="mstate" checked={state === s} onChange={() => setState(s)} /> {s}
              </label>
            ))}
          </div>
          <div data-zoom="musicha-small" style={{ display: 'flex', gap: 12, alignItems: 'flex-end', background: 'var(--primary-container)', padding: 12, borderRadius: 16 }}>
            <Musicha size={32} />
            <Musicha size={48} />
            <Musicha size={64} state="happy" />
          </div>
        </div>
      </Section>

      <Section id="ogizcha" title="Ogʻizcha">
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={card}>
            <Ogizcha pose={pose} size={260} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 520 }}>
            {POSES.map((p) => (
              <button key={p} type="button" onClick={() => setPose(p)} style={{ padding: '8px 14px', borderRadius: 999 }}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 232px)', gap: 12 }}>
          {POSES.map((p) => (
            <figure key={p} data-zoom={`og-${p}`} style={{ ...card, margin: 0, display: 'grid', justifyItems: 'center', gap: 4 }}>
              <Ogizcha pose={p} size={200} animate={false} />
              <figcaption style={label}>{p}</figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <Section id="symbols" title="Custom symbols">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {SYMBOLS.map((s) => (
            <figure key={s} style={{ ...card, margin: 0, display: 'flex', alignItems: 'flex-end', gap: 12 }}>
              <img src={`${BASE}symbols/custom/${s}.svg`} width={192} height={192} alt={s} />
              <div style={{ display: 'grid', gap: 8, justifyItems: 'center' }}>
                <img src={`${BASE}symbols/custom/${s}.svg`} width={96} height={96} alt="" />
                <img src={`${BASE}symbols/custom/${s}.svg`} width={48} height={48} alt="" />
                <figcaption style={label}>{s}</figcaption>
              </div>
            </figure>
          ))}
        </div>
      </Section>

      <Section id="ornaments" title="Ornaments">
        <div style={{ ...card, position: 'relative', overflow: 'hidden', minHeight: 260, display: 'grid', placeItems: 'center' }}>
          <RishtanCorner style={{ position: 'absolute', top: 0, left: 0 }} />
          <RishtanCorner corner="bottom-right" style={{ position: 'absolute', bottom: 0, right: 0 }} />
          <SuzaniRosette size={160} />
          <IkatBand style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} />
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ ...card, width: 420, display: 'grid', gap: 12 }}>
            <IkatBand height={16} />
            <IkatBand height={24} opacity={0.5} />
            <IkatBand height={32} opacity={0.8} />
          </div>
          <div style={{ ...card, display: 'flex', gap: 12, alignItems: 'center' }}>
            <SuzaniRosette size={64} opacity={0.6} />
            <SuzaniRosette size={120} opacity={0.9} />
            <RishtanCorner size={120} opacity={0.9} />
          </div>
        </div>
      </Section>

      <Section id="icons" title="Favicon and app icons">
        <div style={{ ...card, display: 'flex', gap: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {[16, 32, 64, 128].map((s) => (
            <img key={s} src={`${BASE}favicon.svg`} width={s} height={s} alt={`favicon ${s}`} />
          ))}
          <img src={`${BASE}icons/icon.svg`} width={192} height={192} alt="icon.svg" />
          <img src={`${BASE}icons/icon-192.png`} width={96} height={96} alt="icon-192.png" />
          <img src={`${BASE}icons/maskable-512.png`} width={192} height={192} alt="maskable" style={{ borderRadius: '50%' }} />
          <img src={`${BASE}icons/maskable-512.png`} width={192} height={192} alt="maskable raw" />
        </div>
      </Section>
    </main>
  )
}

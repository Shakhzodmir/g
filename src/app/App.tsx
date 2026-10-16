import { lazy, Suspense } from 'react'
import { HashRouter, Route, Routes } from 'react-router'
import { APP_NAME } from './brand'

// Dev-only gallery for reviewing illustrations and UI pieces visually (#/dev/art).
const ArtPreview = import.meta.env.DEV ? lazy(() => import('../dev/ArtPreview')) : null

export function App() {
  return (
    <HashRouter>
      <Suspense fallback={null}>
        <Routes>
          {ArtPreview && <Route path="/dev/art" element={<ArtPreview />} />}
          <Route path="*" element={<main style={{ padding: 24 }}>{APP_NAME}</main>} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}

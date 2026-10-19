import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { Album } from './Album'
import { Hub } from './Hub'

const AnimalsGame = lazy(() => import('./AnimalsGame'))
const FindGame = lazy(() => import('./FindGame'))
const MemoryGame = lazy(() => import('./MemoryGame'))
const SyllablesGame = lazy(() => import('./SyllablesGame'))

/** "Oʻyinlar / Игры": gentle, no-fail language games (mounted at /games/*). */
export default function Games() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route index element={<Hub />} />
        <Route path="animals" element={<AnimalsGame />} />
        <Route path="find" element={<FindGame />} />
        <Route path="memory" element={<MemoryGame />} />
        <Route path="syllables" element={<SyllablesGame />} />
        <Route path="stickers" element={<Album />} />
        <Route path="*" element={<Navigate to="/games" replace />} />
      </Routes>
    </Suspense>
  )
}

import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { Album } from './Album'
import { Hub } from './Hub'
import { useProfileStore } from '../../store/profile'
import { GAMES, gamesFor } from './registry'

/** "Oʻyinlar / Игры": gentle, no-fail language games (mounted at /games/*). */
export default function Games() {
  // A profile only reaches the games of its own audience: no animals game for adults, no adult drills for children.
  const kind = useProfileStore((s) => s.profile.kind)
  const allowed = gamesFor(kind)
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route index element={<Hub />} />
        {GAMES.map((g) => (
          <Route key={g.id} path={g.id} element={allowed.includes(g) ? <g.Component /> : <Navigate to="/games" replace />} />
        ))}
        <Route path="stickers" element={kind === 'adult' ? <Navigate to="/games" replace /> : <Album />} />
        <Route path="*" element={<Navigate to="/games" replace />} />
      </Routes>
    </Suspense>
  )
}

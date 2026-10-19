import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'
import { useStrings } from '../i18n'
import { useDevice } from '../store/device'
import { useProfileStore } from '../store/profile'
import { EmptyState } from '../ui/misc'
import { ScanProvider } from '../ui/scan/ScanProvider'
import { Button } from '../ui/Button'
import { AppShell } from './AppShell'
import { FEATURES } from './features'
import { Home } from './Home'
import { SHELL } from './strings'
import { useApplyTheme } from './useApplyTheme'

const Onboarding = lazy(() => import('../features/onboarding/Onboarding'))
const BoardSetup = lazy(() => import('../features/board/BoardSetup'))
// Dev-only gallery for reviewing illustrations and UI pieces visually (#/dev/art).
const ArtPreview = import.meta.env.DEV ? lazy(() => import('../dev/ArtPreview')) : null

function NotFound() {
  const t = useStrings(SHELL)
  const navigate = useNavigate()
  return <EmptyState symbol="compass" title={t('notFound')} action={<Button onActivate={() => navigate('/')}>{t('goHome')}</Button>} />
}

function Gate({ children }: { children: React.ReactNode }) {
  const onboarded = useDevice((s) => s.onboarded)
  const { pathname } = useLocation()
  if (!onboarded && pathname !== '/onboarding' && !pathname.startsWith('/dev')) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function Root() {
  useApplyTheme()
  const load = useProfileStore((s) => s.load)
  const loaded = useProfileStore((s) => s.loaded)
  useEffect(() => {
    void load()
  }, [load])
  if (!loaded) return null
  return (
    <ScanProvider>
      <Gate>
        <Suspense fallback={null}>
          <Routes>
            {ArtPreview && <Route path="/dev/art" element={<ArtPreview />} />}
            <Route path="/onboarding" element={<Onboarding />} />
            <Route element={<AppShell />}>
              <Route index element={<Home />} />
              <Route path="/board-setup" element={<BoardSetup />} />
              {Object.values(FEATURES).map((f) => (
                <Route key={f.id} path={`${f.path}/*`} element={<f.Component />} />
              ))}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </Gate>
    </ScanProvider>
  )
}

export function App() {
  return (
    <HashRouter>
      <Root />
    </HashRouter>
  )
}

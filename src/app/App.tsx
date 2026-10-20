import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'
import { useStrings } from '../i18n'
import { useDevice } from '../store/device'
import { useProfileStore } from '../store/profile'
import { EmptyState } from '../ui/misc'
import { ScanProvider } from '../ui/scan/ScanProvider'
import { Button } from '../ui/Button'
import { AppShell } from './AppShell'
import { FEATURES, featureAllowed, type FeatureDef } from './features'
import { Home } from './Home'
import { MODES, SHELL } from './strings'
import { useApplyTheme } from './useApplyTheme'
import { prefetchLanguagePack } from '../audio/offlinePack'
import { prefetchSymbolsPack } from '../lib/symbolsPack'
import { speakScanCue } from './cue'
import { Splash } from './Splash'
import { useDocumentTitle } from './useDocumentTitle'

const Onboarding = lazy(() => import('../features/onboarding/Onboarding'))
const BoardSetup = lazy(() => import('../features/board/BoardSetup'))
// Dev-only gallery for reviewing illustrations and UI pieces visually (#/dev/art).
const ArtPreview = import.meta.env.DEV ? lazy(() => import('../dev/ArtPreview')) : null

function NotFound() {
  const t = useStrings(SHELL)
  const navigate = useNavigate()
  return <EmptyState symbol="compass" heading={1} title={t('notFound')} action={<Button onActivate={() => navigate('/')}>{t('goHome')}</Button>} />
}

/** A screen of the other mode (e.g. the token board for an adult): a calm note and a way Home, never a dead end. */
function OtherMode({ for: audience }: { for: 'child' | 'adult' }) {
  const t = useStrings(MODES)
  const ts = useStrings(SHELL)
  const navigate = useNavigate()
  return (
    <EmptyState
      symbol="house"
      heading={1}
      title={audience === 'child' ? t('kindOnlyChildTitle') : t('kindOnlyAdultTitle')}
      text={audience === 'child' ? t('kindOnlyChildText') : t('kindOnlyAdultText')}
      action={<Button onActivate={() => navigate('/', { replace: true })}>{ts('goHome')}</Button>}
    />
  )
}

function FeatureRoute({ f }: { f: FeatureDef }) {
  const kind = useProfileStore((s) => s.profile.kind)
  if (!featureAllowed(f, kind)) return <OtherMode for={f.audience === 'adult' ? 'adult' : 'child'} />
  return <f.Component />
}

function Gate({ children }: { children: React.ReactNode }) {
  const onboarded = useDevice((s) => s.onboarded)
  const { pathname } = useLocation()
  if (!onboarded && pathname !== '/onboarding' && !pathname.startsWith('/dev')) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

/** If the profile never finishes loading (broken storage), carry on in memory instead of waiting forever. */
const LOAD_GIVE_UP_MS = 4500

function Root() {
  const { pathname } = useLocation()
  useApplyTheme()
  useDocumentTitle()
  const load = useProfileStore((s) => s.load)
  const loaded = useProfileStore((s) => s.loaded)
  useEffect(() => {
    void load()
  }, [load])
  const speechLang = useProfileStore((s) => s.profile.speechLang)
  const onboarded = useDevice((s) => s.onboarded)
  useEffect(() => {
    if (!loaded || !onboarded) return
    // Let the first screen settle, then fetch the speech pack for offline use.
    // Then the picture symbols (low priority, after the audio pack): together they make the app work fully offline.
    const t = setTimeout(() => void prefetchLanguagePack(speechLang).finally(() => prefetchSymbolsPack().catch(() => undefined)), 4000)
    return () => clearTimeout(t)
  }, [loaded, onboarded, speechLang])
  useEffect(() => {
    if (loaded) return
    const t = setTimeout(() => useProfileStore.setState({ loaded: true, persistent: false }), LOAD_GIVE_UP_MS)
    return () => clearTimeout(t)
  }, [loaded])
  if (!loaded) return <Splash />
  return (
    <ScanProvider onCue={speakScanCue} resetKey={pathname}>
      <Gate>
        <Suspense fallback={<Splash />}>
          <Routes>
            {ArtPreview && <Route path="/dev/art" element={<ArtPreview />} />}
            <Route path="/onboarding" element={<Onboarding />} />
            <Route element={<AppShell />}>
              <Route index element={<Home />} />
              <Route path="/board-setup" element={<BoardSetup />} />
              {Object.values(FEATURES).map((f) => (
                <Route key={f.id} path={`${f.path}/*`} element={<FeatureRoute f={f} />} />
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

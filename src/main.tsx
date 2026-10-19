import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './design/fonts.css'
import './design/tokens.css'
import './design/global.css'
import { App } from './app/App'
import { clearChunkReloadFlag, ErrorBoundary, recoverFromChunkError } from './app/ErrorBoundary'
import { setupServiceWorker } from './lib/swUpdate'

setupServiceWorker()

// Vite reports a failed preload (stale chunk after a deploy) before React sees it; recover the same way.
window.addEventListener('vite:preloadError', (e) => {
  if (recoverFromChunkError()) e.preventDefault()
})
// The app ran fine for a while: a later failure may reload again.
setTimeout(clearChunkReloadFlag, 10_000)

const root = document.getElementById('root')
if (!root) throw new Error('#root not found')

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// The timer's end signal (soft chime, voice, quiet card) must work from every screen, so its watcher starts with the app.
void import('./features/timer/watcher').then((m) => m.initTimerWatcher())

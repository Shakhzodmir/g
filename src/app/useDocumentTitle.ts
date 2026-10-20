import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { COMMON } from '../i18n/common'
import { renderBi, useI18n } from '../i18n'
import { useProfileStore } from '../store/profile'
import { FEATURES, featureTitle } from './features'
import { BOARD } from './strings'

/** Keeps <title> in sync with the current screen: "Gapiriw – Gapimiz" (screen reader users hear it on navigation). */
export function useDocumentTitle(): void {
  const { pathname } = useLocation()
  const { uiLang, uzScript, ui } = useI18n()
  const kind = useProfileStore((s) => s.profile.kind)
  useEffect(() => {
    const app = COMMON.uz.appName
    let screen: string | null = null
    if (pathname.startsWith('/board-setup')) screen = renderBi({ uz: BOARD.uz.title, ru: BOARD.ru.title }, uiLang, uzScript)
    else if (pathname === '/onboarding') screen = renderBi({ uz: 'Xush kelibsiz', ru: 'Добро пожаловать' }, uiLang, uzScript)
    else {
      const f = Object.values(FEATURES).find((x) => pathname === x.path || pathname.startsWith(`${x.path}/`))
      if (f) screen = ui(featureTitle(f, kind))
    }
    document.title = screen ? `${screen} – ${app}` : app
  }, [pathname, uiLang, uzScript, ui, kind])
}

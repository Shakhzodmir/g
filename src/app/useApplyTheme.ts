import { useEffect } from 'react'
import { htmlLangOf } from '../i18n'
import { useDevice } from '../store/device'
import { useProfileStore } from '../store/profile'

const THEME_COLOR: Record<string, string> = {
  bolajon: '#0A7584',
  tun: '#0E1726',
  tinch: '#3C7A82',
  kattalar: '#F6F7F6',
  'hc-light': '#FFFFFF',
  'hc-dark': '#000000',
}

/** Mirrors profile + device settings onto <html> attributes and CSS variables. */
export function useApplyTheme(): void {
  const theme = useProfileStore((s) => s.profile.theme)
  const sensory = useProfileStore((s) => s.profile.sensory)
  const uiLang = useDevice((s) => s.uiLang)
  const board = useDevice((s) => s.boardMode)
  const calib = useDevice((s) => s.boardCalibration)

  useEffect(() => {
    const html = document.documentElement
    html.dataset.theme = theme
    html.dataset.sensory = sensory
    html.dataset.board = String(board)
    html.lang = htmlLangOf(uiLang)
    if (board) {
      html.style.setProperty('--ui-scale', String(calib?.scale ?? 1.5))
      html.style.setProperty('--reach', String(calib?.reach ?? 0.45))
    } else {
      html.style.removeProperty('--ui-scale')
      html.style.removeProperty('--reach')
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme] ?? '#0A7584')
  }, [theme, sensory, uiLang, board, calib])
}

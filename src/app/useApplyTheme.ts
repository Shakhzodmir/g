import { useEffect } from 'react'
import { htmlLangOf } from '../i18n'
import { effectiveSensory } from '../lib/sensory'
import { useMediaQuery } from '../lib/useMediaQuery'
import { defaultCalibration, effectiveScale, useDevice, useViewport } from '../store/device'
import { useProfileStore } from '../store/profile'

const THEME_COLOR: Record<string, string> = {
  bolajon: '#0A7584',
  tun: '#0E1726',
  tinch: '#336D75',
  kattalar: '#F6F7F6',
  'hc-light': '#FFFFFF',
  'hc-dark': '#000000',
}

/** Mirrors profile + device settings onto <html> attributes and CSS variables. */
export function useApplyTheme(): void {
  const theme = useProfileStore((s) => s.profile.theme)
  const sensory = useProfileStore((s) => s.profile.sensory)
  const textScale = useProfileStore((s) => s.profile.textScale)
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const uiLang = useDevice((s) => s.uiLang)
  const board = useDevice((s) => s.boardMode)
  const calib = useDevice((s) => s.boardCalibration)
  const vp = useViewport()

  useEffect(() => {
    const html = document.documentElement
    html.dataset.theme = theme
    // prefers-reduced-motion wins over the profile: effective level is 'calm' (CSS, motion presets, SFX).
    html.dataset.sensory = effectiveSensory(sensory, reduced)
    html.style.setProperty('--text-scale', String(textScale ?? 1))
    html.dataset.tscale = (textScale ?? 1) >= 1.5 ? 'big' : 'normal'
    html.dataset.board = String(board)
    html.lang = htmlLangOf(uiLang)
    if (board) {
      html.style.setProperty('--ui-scale', String(effectiveScale(calib, vp)))
      html.style.setProperty('--reach', String(calib?.reach ?? defaultCalibration(vp).reach))
    } else {
      html.style.removeProperty('--ui-scale')
      html.style.removeProperty('--reach')
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme] ?? '#0A7584')
  }, [theme, sensory, reduced, textScale, uiLang, board, calib, vp])
}

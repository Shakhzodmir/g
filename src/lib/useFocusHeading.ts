import { useEffect, useRef } from 'react'

/**
 * Moves keyboard / screen-reader focus to the first <h1> of `root` (default: <main>) whenever `dep` changes
 * (a route, a wizard step). Skips the very first render so the page does not steal focus on load.
 */
export function useFocusHeading(dep: unknown, root?: React.RefObject<HTMLElement | null>): void {
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const scope: ParentNode = root?.current ?? document.querySelector('main') ?? document
    const h = scope.querySelector<HTMLElement>('h1')
    if (h) {
      h.tabIndex = -1
      h.focus({ preventScroll: true })
    }
  }, [dep, root])
}

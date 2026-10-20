import { useEffect, useRef } from 'react'

/**
 * Moves keyboard / screen-reader focus to the first <h1> of `root` (default: <main>) whenever `dep` CHANGES
 * (a route, a wizard step). It never moves focus on the first render, also not when React StrictMode runs the effect
 * twice in development: the first Tab on a fresh load must reach the skip link and the first control.
 */
export function useFocusHeading(dep: unknown, root?: React.RefObject<HTMLElement | null>): void {
  const last = useRef(dep)
  useEffect(() => {
    if (Object.is(last.current, dep)) return
    last.current = dep
    const scope: ParentNode = root?.current ?? document.querySelector('main') ?? document
    const h = scope.querySelector<HTMLElement>('h1')
    if (h) {
      h.tabIndex = -1
      h.focus({ preventScroll: true })
    }
  }, [dep, root])
}

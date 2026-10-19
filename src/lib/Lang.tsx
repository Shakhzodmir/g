import type { ReactNode } from 'react'

/** Marks a run of text as being in another language than the page (WCAG 3.1.2): `<Lang lang="ru">Привет</Lang>`. */
export function Lang({ lang, children, className }: { lang: string; children: ReactNode; className?: string }) {
  return (
    <span lang={lang} className={className}>
      {children}
    </span>
  )
}

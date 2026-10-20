import { ArrowLeft, ArrowRight, LayoutGrid, RotateCcw, Volume2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router'
import { speak, stopSpeaking } from '../../audio/speech'
import { STORIES, type SocialStory } from '../../content/stories'
import { useLabel, useStrings } from '../../i18n'
import { shy } from '../../lib/hyphenate'
import { useProfileStore } from '../../store/profile'
import { Button } from '../../ui/Button'
import { EmptyState } from '../../ui/misc'
import { PageHeader } from '../../ui/PageHeader'
import { SymbolImg } from '../../ui/SymbolImg'
import { Tile } from '../../ui/Tile'
import { canGoNext, canGoPrev, clampPage, isLastPage, nextPage, prevPage, storyPageKey, swipeDirection } from './nav'
import { S } from './strings'
import styles from './Stories.module.css'

/** Only very long single words get soft hyphens, so ordinary titles still wrap at spaces. */
const shyLong = (text: string, lang: 'uz' | 'ru') => text.replace(/[\p{L}ʻʼ]{12,}/gu, (w) => shy(w, lang))

function StoryList() {
  const t = useStrings(S)
  const label = useLabel()
  const navigate = useNavigate()
  const lang = useProfileStore((s) => s.profile.speechLang)
  return (
    <div className={styles.page}>
      <PageHeader title={t('title')} />
      <ul className={styles.list} role="list" data-reach>
        {STORIES.map((s) => {
          const title = label(s.title)
          return (
            <li key={s.id}>
              <Tile navigates
                shape="card"
                tone="calm"
                symbol={s.symbol}
                title={shyLong(title, lang)}
                subtitle={t('pages', { n: s.pages.length })}
                label={title}
                scanGroup="stories"
                onActivate={() => {
                  void speak({ key: `stt.${s.id}`, text: s.title })
                  navigate(s.id)
                }}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function StoryRoute() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const story = STORIES.find((s) => s.id === id)
  const t = useStrings(S)
  const navigate = useNavigate()
  if (!story) {
    return (
      <div className={styles.page}>
        <PageHeader title={t('title')} back="/stories" />
        <EmptyState symbol="open_book" title={t('notFound')} action={<Button onActivate={() => navigate('/stories')}>{t('toList')}</Button>} />
      </div>
    )
  }
  return <StoryReader key={`${story.id}:${params.get('page') ?? ''}`} story={story} />
}

function StoryReader({ story }: { story: SocialStory }) {
  const t = useStrings(S)
  const label = useLabel()
  const navigate = useNavigate()
  const total = story.pages.length
  // Optional deep link to a page (?page=3, 1-based) so an adult can open the story where it is needed.
  const [params] = useSearchParams()
  const [index, setIndex] = useState(() => clampPage(Number(params.get('page') ?? 1) - 1, total))
  // Once the child taps "listen", turning the page reads the new page too (still only after a tap).
  const [reading, setReading] = useState(false)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const i = clampPage(index, total)
  const page = story.pages[i]
  const last = isLastPage(i, total)

  useEffect(() => () => stopSpeaking(), [])

  const say = (n: number) => void speak({ key: storyPageKey(story.id, n), text: story.pages[n] })

  const go = (n: number) => {
    const target = clampPage(n, total)
    if (target === i) return
    stopSpeaking()
    setIndex(target)
    if (reading) say(target)
  }

  const listen = () => {
    setReading(true)
    say(i)
  }

  return (
    <div className={styles.page} data-reader>
      <PageHeader title={label(story.title)} back="/stories" />
      <div className={styles.reader}>
        <div
          className={styles.sheet}
          aria-live="polite"
          onPointerDown={(e) => {
            swipeStart.current = { x: e.clientX, y: e.clientY }
          }}
          onPointerUp={(e) => {
            const s = swipeStart.current
            swipeStart.current = null
            if (!s) return
            const dir = swipeDirection(e.clientX - s.x, e.clientY - s.y)
            if (dir === 'next') go(nextPage(i, total))
            if (dir === 'prev') go(prevPage(i, total))
          }}
          onPointerCancel={() => {
            swipeStart.current = null
          }}
        >
          <motion.div
            key={i}
            className={styles.pageContent}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
          >
            <span className={styles.art} aria-hidden="true">
              <SymbolImg id={page.symbol} />
            </span>
            <p className={styles.text}>{label(page)}</p>
          </motion.div>
        </div>

        <div className={styles.dots}>
          <span className="visually-hidden">{t('pageOf', { n: i + 1, total })}</span>
          <ol className={styles.dotList} aria-hidden="true">
            {story.pages.map((_, n) => (
              <li key={n} className={styles.dot} data-current={n === i || undefined} data-done={n < i || undefined} />
            ))}
          </ol>
        </div>

        {last && (
          <div className={styles.end}>
            <p className={styles.endText}>
              <SymbolImg id="sparkles" size={32} />
              {t('end')}
            </p>
            <div className={styles.endActions}>
              <Button variant="soft" size="lg" icon={<RotateCcw />} onActivate={() => go(0)}>
                {t('again')}
              </Button>
              <Button variant="soft" size="lg" icon={<LayoutGrid />} onActivate={() => navigate('/stories')}>
                {t('toList')}
              </Button>
            </div>
          </div>
        )}

        <div className={styles.controls} data-reach>
          <Button
            size="xl"
            variant="secondary"
            iconOnly
            icon={<ArrowLeft />}
            label={t('prev')}
            disabled={!canGoPrev(i, total)}
            scanGroup="story-nav"
            onActivate={() => go(prevPage(i, total))}
          >
            {t('prev')}
          </Button>
          <Button size="xl" variant="soft" icon={<Volume2 />} scanGroup="story-nav" onActivate={listen}>
            {t('listen')}
          </Button>
          <Button
            size="xl"
            variant="secondary"
            iconOnly
            icon={<ArrowRight />}
            label={t('next')}
            disabled={!canGoNext(i, total)}
            scanGroup="story-nav"
            onActivate={() => go(nextPage(i, total))}
          >
            {t('next')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function Stories() {
  return (
    <Routes>
      <Route index element={<StoryList />} />
      <Route path=":id" element={<StoryRoute />} />
    </Routes>
  )
}

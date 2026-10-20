import { expect, test, type Page } from '@playwright/test'

/*
 * Child vs adult mode: two clearly different products on the same engines.
 * Each test walks the real onboarding (Russian UI, so the labels below are stable), which also proves that the
 * correct Home appears after finishing.
 */

type Kind = 'child' | 'adult'

async function onboard(page: Page, kind: Kind): Promise<void> {
  await page.goto('#/')
  await expect(page).toHaveURL(/#\/onboarding/)
  await page.getByRole('button', { name: 'Русский' }).click()
  await page.getByRole('button', { name: kind === 'child' ? /Ребёнок/ : /Взрослый/ }).click()
  if (kind === 'adult') await expect(page.getByTestId('brand-mark')).toBeVisible()
  await page.getByLabel('Имя').fill('Азиз')
  // the mascot is only on the child's path
  await page.getByRole('button', { name: 'Дальше' }).click()
  await page.getByRole('button', { name: 'Пропустить' }).click()
  await expect(page).toHaveURL(/#\/$/)
}

/** The saved profile, read straight from IndexedDB. */
async function savedProfile(page: Page): Promise<{ kind: string; theme: string; sensory: string; ageGroup: string; aac: { level: number; showLabels: boolean; labelPos: string; colorCoding: boolean } }> {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            const open = indexedDB.open('gapimiz')
            open.onerror = () => resolve(0)
            open.onsuccess = () => {
              const db = open.result
              const req = db.transaction('profiles').objectStore('profiles').count()
              req.onsuccess = () => resolve(req.result)
              req.onerror = () => resolve(0)
            }
          }),
      ),
    )
    .toBeGreaterThan(0)
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('gapimiz')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const req = open.result.transaction('profiles').objectStore('profiles').getAll()
          req.onsuccess = () => resolve(req.result.find((r: { id: string }) => r.id !== 'default') ?? req.result[0])
        }
      }),
  )
}

const nav = (page: Page) => page.getByRole('navigation', { name: 'Gapimiz' })

test.describe('child mode', () => {
  test('home has the mascot, plates, Break button and the child navigation', async ({ page }) => {
    await onboard(page, 'child')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Привет, Азиз')
    await expect(page.getByRole('button', { name: 'Поздороваться с Мусей' })).toBeVisible()
    await expect(page.getByTestId('quick-phrases')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Мне нужен перерыв' })).toBeVisible()
    for (const name of ['Главная', 'Говорить', 'Мой день', 'Игры', 'Разминка']) await expect(nav(page).getByRole('button', { name })).toBeVisible()
    await expect(nav(page).getByRole('button')).toHaveCount(5)
    // child-only screens are reachable
    await expect(page.getByRole('button', { name: 'Звёздочки' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Истории' })).toBeVisible()
    await page.goto('#/tokens')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    await expect(page.getByText('Этот раздел из детского режима')).toHaveCount(0)
    await page.goto('#/stories')
    await expect(page.getByText('Этот раздел из детского режима')).toHaveCount(0)
    const p = await savedProfile(page)
    expect(p).toMatchObject({ kind: 'child', theme: 'bolajon', aac: { level: 2 } })
  })

  test('talk: level 2 board, keyboard tab only for readers', async ({ page }) => {
    await onboard(page, 'child')
    await page.goto('#/talk')
    await expect(page.getByRole('navigation', { name: 'Темы' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Клавиатура' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Боль', exact: true })).toHaveCount(0)
  })
})

test.describe('adult mode', () => {
  test('home: calm greeting, quick phrases, tool grid, no mascot, no Break button', async ({ page }) => {
    await onboard(page, 'adult')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Здравствуйте, Азиз')
    await expect(page.getByRole('button', { name: 'Поздороваться с Мусей' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Мне нужен перерыв' })).toHaveCount(0)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'kattalar')

    const strip = page.getByTestId('quick-phrases')
    await expect(strip).toBeVisible()
    await expect(strip.getByRole('button')).toHaveCount(8)
    // keyboard accessible: a phrase takes focus and activates with Enter
    const first = strip.getByRole('button').first()
    await first.focus()
    await expect(first).toBeFocused()
    await page.keyboard.press('Enter')

    for (const name of ['Говорить', 'Клавиатура', 'Готовые фразы', 'Шкала боли', 'План дня', 'Тренировка', 'Упражнения для голоса', 'Таймер', 'Расслабление']) {
      await expect(page.getByRole('main').getByRole('button', { name, exact: true })).toBeVisible()
    }
    // nothing child-only is offered
    await expect(page.getByRole('button', { name: 'Звёздочки' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Истории' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Игры', exact: true })).toHaveCount(0)
  })

  test('navigation: Home, Talk, Training, Plan, Voice', async ({ page }) => {
    await onboard(page, 'adult')
    for (const name of ['Главная', 'Говорить', 'Тренировка', 'План', 'Голос']) await expect(nav(page).getByRole('button', { name, exact: true })).toBeVisible()
    await expect(nav(page).getByRole('button')).toHaveCount(5)
    await nav(page).getByRole('button', { name: 'Тренировка' }).click()
    await expect(page).toHaveURL(/#\/games/)
  })

  test('tools open the right talk modes', async ({ page }) => {
    await onboard(page, 'adult')
    await page.getByRole('main').getByRole('button', { name: 'Клавиатура', exact: true }).click()
    await expect(page).toHaveURL(/#\/talk\?mode=keyboard/)
    await page.goto('#/')
    await page.getByRole('main').getByRole('button', { name: 'Шкала боли', exact: true }).click()
    await expect(page).toHaveURL(/#\/talk\?mode=pain/)
  })

  test('child-only screens redirect Home with a friendly note', async ({ page }) => {
    await onboard(page, 'adult')
    for (const route of ['#/tokens', '#/stories']) {
      await page.goto(route)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Этот раздел из детского режима')
      await page.getByRole('button', { name: 'На главную' }).click()
      await expect(page).toHaveURL(/#\/$/)
    }
  })

  test('talk: level 3 by default, keyboard and pain tabs always visible, saved defaults', async ({ page }) => {
    await onboard(page, 'adult')
    const p = await savedProfile(page)
    expect(p).toMatchObject({ kind: 'adult', theme: 'kattalar', sensory: 'normal', ageGroup: '13+', aac: { level: 3, showLabels: true, labelPos: 'bottom', colorCoding: true } })
    await page.goto('#/talk')
    const tabs = page.getByRole('navigation', { name: 'Темы' })
    await expect(tabs.getByRole('button', { name: 'Клавиатура' })).toBeVisible()
    await expect(tabs.getByRole('button', { name: 'Боль', exact: true })).toBeVisible()
    await expect(tabs.getByRole('button', { name: 'Готовые фразы' })).toBeVisible()
    // child-only topics are not offered
    await expect(tabs.getByRole('button', { name: 'Игрушки' })).toHaveCount(0)
    // «Да» / «Нет» quick keys stay
    await expect(page.getByRole('group', { name: 'Ответ' }).getByRole('button')).toHaveCount(2)
  })

  test('the first launch ends on the adult home', async ({ page }) => {
    await onboard(page, 'adult')
    await expect(page.getByTestId('quick-phrases')).toBeVisible()
  })
})

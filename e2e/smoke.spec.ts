import { expect, test, type Page } from '@playwright/test'

const ROUTES = ['/', '/talk', '/day', '/timer', '/tokens', '/calm', '/feelings', '/stories', '/games', '/exercises', '/board-setup']

async function seed(page: Page, uiLang: 'uz' | 'uzc' | 'ru') {
  await page.addInitScript(
    ([uiLang]) => {
      localStorage.setItem(
        'gapimiz.device',
        JSON.stringify({
          state: { uiLang, uzScript: uiLang === 'uzc' ? 'cyrl' : 'latn', onboarded: true, activeProfileId: null, boardMode: false, boardHintDismissed: true, boardCalibration: null, parentPinHash: null },
          version: 1,
        }),
      )
    },
    [uiLang],
  )
}

for (const lang of ['uz', 'uzc', 'ru'] as const) {
  test(`every screen renders without errors (${lang})`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => {
      if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text())
    })
    await seed(page, lang)
    for (const r of ROUTES) {
      await page.goto(`#${r}`)
      await expect(page.locator('main h1, h1').first()).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow, `${r} horizontal overflow`).toBeLessThanOrEqual(1)
      const tiny = await page.evaluate(() =>
        Array.from(document.querySelectorAll('main button, main [role=button]'))
          .map((e) => e.getBoundingClientRect())
          .filter((b) => b.width > 0 && b.height > 0 && (b.width < 44 || b.height < 44)).length,
      )
      expect(tiny, `${r} targets smaller than 44px`).toBe(0)
    }
    expect(errors).toEqual([])
  })
}

test('first launch goes through onboarding to the child home', async ({ page }) => {
  await page.goto('#/')
  await expect(page).toHaveURL(/#\/onboarding/)
  await page.getByRole('button', { name: 'Русский' }).click()
  await page.getByRole('button', { name: /Ребёнок/ }).click()
  // the name is required: Next stays disabled until it is filled in
  await expect(page.getByRole('button', { name: 'Дальше' })).toBeDisabled()
  await page.getByLabel('Имя').fill('Азиз')
  await page.getByRole('button', { name: 'Дальше' }).click()
  await page.getByRole('button', { name: 'Пропустить' }).click()
  await expect(page).toHaveURL(/#\/$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Привет, Азиз')
  await expect(page.getByRole('button', { name: 'Мне нужен перерыв' })).toBeVisible()
})

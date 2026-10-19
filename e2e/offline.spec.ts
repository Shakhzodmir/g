import { expect, test } from '@playwright/test'

test('the app reloads and works with no network after the first visit', async ({ page, context }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'gapimiz.device',
      JSON.stringify({
        state: { uiLang: 'ru', uzScript: 'latn', onboarded: true, activeProfileId: null, boardMode: false, boardHintDismissed: true, boardCalibration: null, parentPinHash: null },
        version: 1,
      }),
    )
  })
  await page.goto('./')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  // wait until the service worker controls the page and precache is complete
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 30_000 }).catch(async () => {
    await page.reload()
  })
  await page.waitForTimeout(1500)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Привет')

  await page.goto('./#/talk')
  await page.getByRole('button', { name: 'Еда' }).click()
  await expect(page.getByRole('button', { name: /palov/i }).first()).toBeVisible()
  await page.goto('./#/day')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await context.setOffline(false)
})

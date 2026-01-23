import { expect, test } from './fixtures'

const getExtensionId = async (page: import('@playwright/test').Page) => {
  const context = page.context()
  const findWorker = () => context.serviceWorkers().find(worker => worker.url().startsWith('chrome-extension://')) ?? null

  let worker = findWorker()
  if (!worker) {
    const warmup = await context.newPage()
    await warmup.goto('https://www.youtube.com', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null)
    const deadline = Date.now() + 30000
    while (!worker && Date.now() < deadline) {
      worker = findWorker()
      if (worker) break
      await context.waitForEvent('serviceworker', { timeout: Math.min(3000, deadline - Date.now()) }).catch(() => null)
    }
    await warmup.close()
  }
  return worker?.url().split('/')[2] ?? null
}

test('popup renders language selector and chat toggle', async ({ page }) => {
  test.setTimeout(90000)

  const extensionId = await getExtensionId(page)
  if (!extensionId) {
    test.skip(true, 'Extension service worker did not start in time.')
    return
  }

  await page.goto(`chrome-extension://${extensionId}/popup.html`)

  const languageSelect = page.locator('select')
  await expect(languageSelect).toBeVisible()
  const optionCount = await languageSelect.locator('option').count()
  expect(optionCount).toBeGreaterThan(1)

  const chatToggle = page.locator('input[type="checkbox"]')
  await expect(chatToggle).toHaveCount(1)

  const toggleId = await chatToggle.getAttribute('id')
  expect(toggleId).not.toBeNull()
  const toggleLabel = page.locator(`label[for="${toggleId}"]`)
  await expect(toggleLabel).toBeVisible()

  const initialChecked = await chatToggle.isChecked()
  await toggleLabel.click()
  await expect.poll(async () => chatToggle.isChecked()).toBe(!initialChecked)
  await toggleLabel.click()
  await expect.poll(async () => chatToggle.isChecked()).toBe(initialChecked)

  const donateLink = page.locator('a[href*="ko-fi.com"]')
  await expect(donateLink).toHaveCount(1)
})

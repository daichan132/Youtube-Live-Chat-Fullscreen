import { expect, test } from './fixtures'

test('popup renders language selector and chat toggle', async ({ page, extensionId }) => {
  test.setTimeout(90000)

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

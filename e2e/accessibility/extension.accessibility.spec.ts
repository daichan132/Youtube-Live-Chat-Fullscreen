import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { openDeterministicOverlay } from '@e2e/support/deterministicSurfaces'
import { switchButtonContainerSelector } from '@e2e/utils/selectors'

const expectNoViolations = async (results: Awaited<ReturnType<AxeBuilder['analyze']>>) => {
  expect(
    results.violations.map(violation => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.map(node => node.target),
    })),
  ).toEqual([])
}

test.describe('extension accessibility', () => {
  test('popup has no automated WCAG A/AA violations', async ({ page, extension }) => {
    await page.goto(extension.url('popup.html'))
    await expect(page.getByLabel('Select language')).toBeVisible()

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    await expectNoViolations(results)
  })

  test('expanded settings editors have no automated WCAG A/AA violations', async ({ page, extension }) => {
    await page.goto(extension.url('settings.html'))
    const font = page.getByRole('button', { name: 'Font', exact: true })
    await font.click()
    await expect(page.getByRole('combobox', { name: 'Search fonts', exact: true })).toBeFocused()
    await expectNoViolations(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze())
    await page.getByRole('combobox', { name: 'Search fonts', exact: true }).fill('no matching typeface 12345')
    await expect(page.getByRole('option')).toHaveCount(0)
    await expectNoViolations(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze())
    await page.keyboard.press('Escape')
    await expect(font).toBeFocused()
    await page.getByRole('button', { name: 'Background Color', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Color picker', exact: true })).toBeVisible()
    await expectNoViolations(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze())
  })

  test('overlay and control rail have no automated WCAG A/AA violations', async ({ page }) => {
    await openDeterministicOverlay(page)
    const overlay = page.locator('[data-ylc-resizable]')
    await overlay.hover()
    await expect(page.locator('[data-ylc-control-rail]')).toBeVisible()
    await page.locator('[data-ylc-placement-button]').click()
    await expect(page.locator('[data-ylc-placement-panel]')).toBeVisible()
    const results = await new AxeBuilder({ page })
      .include('#shadow-root-live-chat')
      .include(switchButtonContainerSelector)
      .exclude('iframe[data-ylc-chat="true"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    await expectNoViolations(results)
  })

  test('settings modal has no automated WCAG A/AA violations', async ({ page }) => {
    await openDeterministicOverlay(page)
    const overlay = new ExtensionOverlay(page)
    await overlay.openSettings()

    const results = await new AxeBuilder({ page })
      .include('#shadow-root-live-chat')
      .exclude('iframe[data-ylc-chat="true"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    await expectNoViolations(results)
  })

  test('Escape closes the focused color picker before closing settings', async ({ page }) => {
    await openDeterministicOverlay(page)
    const overlay = new ExtensionOverlay(page)
    await overlay.openSettings()
    const settings = overlay.settingsFrame()
    const trigger = settings.getByRole('button', { name: 'Background Color', exact: true })
    await trigger.click()
    const picker = settings.getByRole('dialog', { name: 'Color picker', exact: true })
    const hue = picker.getByRole('slider', { name: 'Hue', exact: true })
    await hue.focus()
    await page.keyboard.press('Escape')

    await expect(picker).toHaveCount(0)
    await expect(settings.locator('.ylc-setting-panel')).toBeVisible()
    await expect(trigger).toBeFocused()
    await expect(settings.getByRole('button', { name: 'Undo style change', exact: true })).toBeDisabled()

    await page.keyboard.press('Escape')
    await expect(page.locator('iframe[data-ylc-settings-frame]')).toHaveCount(0)
    await expect(page.locator('[data-ylc-settings-btn]')).toBeFocused()
  })
})

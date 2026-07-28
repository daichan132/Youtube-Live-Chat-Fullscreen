import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@e2e/fixtures'
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

  test('overlay and control rail have no automated WCAG A/AA violations', async ({ page }) => {
    await openDeterministicOverlay(page)
    const overlay = page.locator('[data-ylc-resizable]')
    await overlay.hover()
    await expect(page.locator('[data-ylc-control-rail]')).toBeVisible()

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
    const overlay = page.locator('[data-ylc-resizable]')
    await overlay.hover()
    await page.locator('[data-ylc-settings-btn]').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const results = await new AxeBuilder({ page })
      .include('#shadow-root-live-chat')
      .exclude('iframe[data-ylc-chat="true"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    await expectNoViolations(results)
  })
})

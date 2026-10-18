import { expect, test } from '@e2e/fixtures'
import type { Page, Request } from '@playwright/test'
import { LOCALE_STORAGE_KEY } from '../../../shared/settings/storageKeys'

type LocaleProbeGlobal = typeof globalThis & {
  __ylcLocaleProbe?: { originalFetch: typeof fetch; assets: string[] }
}

const localeAssetName = (request: Request) => {
  const url = new URL(request.url())
  const match = url.pathname.match(/\/locales\/([^/]+\.json)$/)
  return match?.[1] ?? null
}

const setExternalLocale = (page: Page, locale: string) =>
  page.evaluate(
    ({ key, locale }) =>
      chrome.storage.local.set({
        [key]: {
          schemaVersion: 1,
          writerId: `e2e-external-${locale}`,
          value: locale,
        },
      }),
    { key: LOCALE_STORAGE_KEY, locale },
  )

test.describe('popup locale runtime boundary', { tag: '@popup' }, () => {
  test('syncs en, ja, and RTL locale state while loading only selected message assets', { tag: '@fixture' }, async ({
    page,
    extension,
  }) => {
    test.setTimeout(90000)

    const context = page.context()
    const isExtensionWorker = (worker: { url(): string }) => worker.url().startsWith('chrome-extension://')
    const worker =
      context.serviceWorkers().find(isExtensionWorker) ?? (await context.waitForEvent('serviceworker', { predicate: isExtensionWorker }))
    // Chromium does not expose extension-scheme worker fetches as Page/Context
    // request events. Observe the real fetch boundary without replacing delivery.
    await worker.evaluate(() => {
      const scope = globalThis as LocaleProbeGlobal
      const originalFetch = scope.fetch
      scope.__ylcLocaleProbe = { originalFetch, assets: [] }
      scope.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        const match = new URL(url).pathname.match(/\/locales\/([^/]+\.json)$/)
        const asset = match?.[1]
        if (asset) scope.__ylcLocaleProbe?.assets.push(asset)
        return originalFetch.call(scope, input, init)
      }
    })
    const pageAssets: string[] = []
    const recordPageAsset = (request: Request) => {
      const asset = localeAssetName(request)
      if (asset) pageAssets.push(asset)
    }
    page.on('request', recordPageAsset)

    try {
      await page.goto(extension.url('popup.html'))
      await expect(page.getByLabel('Select language')).toHaveValue('en')
      await expect(page.getByText('Language', { exact: true })).toBeVisible()
      await expect(page.locator('#root > [dir]')).toHaveAttribute('dir', 'ltr')
      for (const name of ['Check status', 'Retry chat display', 'Copy diagnostics']) {
        await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0)
      }
      await expect(page.getByRole('status')).toHaveCount(0)

      await setExternalLocale(page, 'ja')
      await expect(page.getByLabel('言語を選択')).toHaveValue('ja')
      await expect(page.getByText('言語設定', { exact: true })).toBeVisible()
      await expect(page.locator('#root > [dir]')).toHaveAttribute('dir', 'ltr')
      for (const name of ['状態を確認', 'チャット表示を再試行', '診断をコピー']) {
        await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0)
      }
      await expect(page.getByText('診断をコピーしました。', { exact: true })).toHaveCount(0)

      await setExternalLocale(page, 'ar')
      await expect(page.getByLabel('اختيار اللغة')).toHaveValue('ar')
      await expect(page.getByText('اللغة', { exact: true })).toBeVisible()
      await expect(page.locator('#root > [dir]')).toHaveAttribute('dir', 'rtl')

      await expect
        .poll(() => worker.evaluate(() => [...((globalThis as LocaleProbeGlobal).__ylcLocaleProbe?.assets ?? [])].sort()))
        .toEqual(['_keys.json', 'ar.json', 'en.json', 'ja.json'])
      expect(pageAssets).toEqual([])

      expect(await page.evaluate(key => chrome.storage.local.get(key).then(values => values[key]), LOCALE_STORAGE_KEY)).toEqual({
        schemaVersion: 1,
        writerId: 'e2e-external-ar',
        value: 'ar',
      })
    } finally {
      page.off('request', recordPageAsset)
      await worker.evaluate(() => {
        const scope = globalThis as LocaleProbeGlobal
        if (scope.__ylcLocaleProbe) scope.fetch = scope.__ylcLocaleProbe.originalFetch
        scope.__ylcLocaleProbe = undefined
      })
    }
  })
})

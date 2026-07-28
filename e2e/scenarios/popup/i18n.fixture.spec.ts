import { expect, test } from '@e2e/fixtures'
import type { Page, Request } from '@playwright/test'
import { LOCALE_STORAGE_KEY } from '../../../shared/settings/storageKeys'

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

    const loadedAssets: string[] = []
    const recordLocaleAsset = (request: Request) => {
      const asset = localeAssetName(request)
      if (asset) loadedAssets.push(asset)
    }
    page.on('request', recordLocaleAsset)

    try {
      await page.goto(extension.url('popup.html'))
      await expect(page.getByLabel('Select language')).toHaveValue('en')
      await expect(page.getByText('Language', { exact: true })).toBeVisible()
      await expect(page.locator('#root > [dir]')).toHaveAttribute('dir', 'ltr')

      await setExternalLocale(page, 'ja')
      await expect(page.getByLabel('言語を選択')).toHaveValue('ja')
      await expect(page.getByText('言語設定', { exact: true })).toBeVisible()
      await expect(page.locator('#root > [dir]')).toHaveAttribute('dir', 'ltr')

      await setExternalLocale(page, 'ar')
      await expect(page.getByLabel('اختيار اللغة')).toHaveValue('ar')
      await expect(page.getByText('اللغة', { exact: true })).toBeVisible()
      await expect(page.locator('#root > [dir]')).toHaveAttribute('dir', 'rtl')

      await expect.poll(() => [...loadedAssets].sort()).toEqual(['_keys.json', 'ar.json', 'en.json', 'ja.json'])
      expect(loadedAssets.filter(asset => asset === '_keys.json')).toHaveLength(1)
      expect(loadedAssets.filter(asset => asset === 'en.json')).toHaveLength(1)
      expect(loadedAssets.filter(asset => asset === 'ja.json')).toHaveLength(1)
      expect(loadedAssets.filter(asset => asset === 'ar.json')).toHaveLength(1)

      expect(await page.evaluate(key => chrome.storage.local.get(key).then(values => values[key]), LOCALE_STORAGE_KEY)).toEqual({
        schemaVersion: 1,
        writerId: 'e2e-external-ar',
        value: 'ar',
      })
    } finally {
      page.off('request', recordLocaleAsset)
    }
  })
})

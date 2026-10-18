import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { browser } from 'wxt/browser'
import { createSettingsRepository } from './repository'
import { LOCALE_STORAGE_KEY } from './storageKeys'

const originalLocation = Object.getOwnPropertyDescriptor(globalThis, 'location')

describe('legacy locale origin isolation', () => {
  beforeEach(async () => {
    localStorage.clear()
    await browser.storage.local.clear()
    vi.spyOn(browser.i18n, 'getUILanguage').mockReturnValue('en')
  })

  afterEach(() => {
    if (originalLocation) Object.defineProperty(globalThis, 'location', originalLocation)
    vi.restoreAllMocks()
  })

  it('does not adopt or copy the YouTube page locale into extension storage', async () => {
    localStorage.setItem('i18nextLng', 'ja')
    const repository = createSettingsRepository('content-reader')

    const settings = await repository.load()
    await repository.flush()

    expect(settings.locale).toBe('en')
    expect(await browser.storage.local.get(LOCALE_STORAGE_KEY)).toEqual({})
    expect(localStorage.getItem('i18nextLng')).toBe('ja')
  })

  it('continues to adopt and copy the extension page legacy locale', async () => {
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: new URL(browser.runtime.getURL('/popup.html')),
    })
    localStorage.setItem('i18nextLng', 'ja')
    const repository = createSettingsRepository('extension-reader')

    const settings = await repository.load()
    await repository.flush()

    expect(settings.locale).toBe('ja')
    expect(await browser.storage.local.get(LOCALE_STORAGE_KEY)).toMatchObject({
      [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'extension-reader', value: 'ja' },
    })
    expect(localStorage.getItem('i18nextLng')).toBe('ja')
  })
})

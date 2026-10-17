import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { browser } from 'wxt/browser'
import type { ContentScriptContext } from 'wxt/utils/content-script-context'
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root'
import { clearLocaleCache } from '@/shared/i18n/loader'
import { isExtensionAssetRequest } from '@/shared/runtime/extensionAssets'
import { createContentSession } from './createContentSession'

vi.mock('wxt/utils/content-script-ui/shadow-root', () => ({ createShadowRootUi: vi.fn() }))

beforeEach(() => {
  clearLocaleCache()
  vi.spyOn(browser.runtime, 'sendMessage').mockImplementation(async request => {
    if (!isExtensionAssetRequest(request)) throw new Error('Unexpected extension message')
    return {
      ok: true,
      value: request.asset === 'content-style' ? ':root { color: black; }' : request.asset === '_keys' ? ['popup.theme'] : ['Theme'],
    }
  })
})

afterEach(clearLocaleCache)

describe('content session startup failure cleanup', () => {
  it.each(['create', 'mount'] as const)('releases real settings subscriptions when the WXT UI cannot %s', async stage => {
    const added = vi.spyOn(browser.storage.local.onChanged, 'addListener')
    const failure = new Error(`WXT UI ${stage} failed`)
    vi.mocked(createShadowRootUi).mockImplementationOnce(async () => {
      if (stage === 'create') throw failure
      const shadowHost = document.createElement('div')
      return {
        shadowHost,
        shadow: shadowHost.attachShadow({ mode: 'open' }),
        uiContainer: document.createElement('div'),
        mounted: undefined,
        remove: () => {},
        autoMount: () => {},
        mount: () => {
          throw failure
        },
      }
    })

    try {
      await expect(createContentSession({} as ContentScriptContext)).rejects.toBe(failure)

      // The app runtime and repository stay real: startup installed browser
      // subscriptions, and the failed session must relinquish all of them.
      expect(added.mock.calls.length).toBeGreaterThan(0)
      for (const [listener] of added.mock.calls) expect(browser.storage.local.onChanged.hasListener(listener)).toBe(false)
    } finally {
      // Keep a failing cleanup assertion from leaking into the next case.
      for (const [listener] of added.mock.calls) browser.storage.local.onChanged.removeListener(listener)
    }
  })
})

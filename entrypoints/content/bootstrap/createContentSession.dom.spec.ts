import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { browser } from 'wxt/browser'
import type { ContentScriptContext } from 'wxt/utils/content-script-context'
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root'
import { clearLocaleCache } from '@/shared/i18n/loader'
import { isExtensionAssetRequest } from '@/shared/runtime/extensionAssets'
import { createPresentationLease } from '../runtime/resources/PresentationLease'
import { createContentSession } from './createContentSession'

vi.mock('wxt/utils/content-script-ui/shadow-root', () => ({ createShadowRootUi: vi.fn() }))
vi.mock('../runtime/resources/PresentationLease', async importOriginal => {
  const actual = await importOriginal<typeof import('../runtime/resources/PresentationLease')>()
  return { ...actual, createPresentationLease: vi.fn(actual.createPresentationLease) }
})
vi.mock('react-dom/client', async importOriginal => {
  const actual = await importOriginal<typeof import('react-dom/client')>()
  return { ...actual, createRoot: vi.fn(actual.createRoot) }
})

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
  it('releases settings subscriptions when runtime construction fails', async () => {
    const failure = new Error('presentation construction failed')
    const added = vi.spyOn(browser.storage.local.onChanged, 'addListener')
    vi.mocked(createPresentationLease).mockImplementationOnce(() => {
      throw failure
    })
    try {
      await expect(createContentSession({} as ContentScriptContext)).rejects.toBe(failure)
      expect(added.mock.calls.length).toBeGreaterThan(0)
      for (const [listener] of added.mock.calls) expect(browser.storage.local.onChanged.hasListener(listener)).toBe(false)
    } finally {
      for (const [listener] of added.mock.calls) browser.storage.local.onChanged.removeListener(listener)
    }
  })

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

  it.each([false, true])('removes a partially mounted UI and releases subscriptions when unmount throws: %s', async unmountThrows => {
    const failure = new Error('mount failed after inserting the host')
    const added = vi.spyOn(browser.storage.local.onChanged, 'addListener')
    const unmount = vi.fn(() => {
      if (unmountThrows) throw new Error('unmount failed')
    })
    vi.mocked(createRoot).mockReturnValueOnce({ render: vi.fn(), unmount })
    const host = document.createElement('div')
    const shadow = host.attachShadow({ mode: 'open' })
    const container = document.createElement('div')
    shadow.append(container)
    const style = document.createElement('style')
    vi.mocked(createShadowRootUi).mockImplementationOnce(async (_ctx, options) => ({
      shadowHost: host,
      shadow,
      uiContainer: container,
      mounted: undefined,
      autoMount: () => {},
      mount: () => {
        document.body.append(host)
        document.head.append(style)
        options.onMount(container, shadow, host)
        throw failure
      },
      remove: () => {
        options.onRemove?.(undefined)
        host.remove()
        style.remove()
      },
    }))
    try {
      await expect(createContentSession({} as ContentScriptContext)).rejects.toBe(failure)
      expect(unmount).toHaveBeenCalledOnce()
      expect(host.isConnected).toBe(false)
      expect(style.isConnected).toBe(false)
      expect(added.mock.calls.length).toBeGreaterThan(0)
      for (const [listener] of added.mock.calls) expect(browser.storage.local.onChanged.hasListener(listener)).toBe(false)
    } finally {
      host.remove()
      style.remove()
      for (const [listener] of added.mock.calls) browser.storage.local.onChanged.removeListener(listener)
    }
  })

  it('removes the UI and releases subscriptions even when unmount fails during disposal', async () => {
    const failure = new Error('unmount failed')
    const added = vi.spyOn(browser.storage.local.onChanged, 'addListener')
    vi.mocked(createRoot).mockReturnValueOnce({
      render: vi.fn(),
      unmount: vi.fn(() => {
        throw failure
      }),
    })
    const host = document.createElement('div')
    const shadow = host.attachShadow({ mode: 'open' })
    const container = document.createElement('div')
    shadow.append(container)
    vi.mocked(createShadowRootUi).mockImplementationOnce(async (_ctx, options) => ({
      shadowHost: host,
      shadow,
      uiContainer: container,
      mounted: undefined,
      autoMount: () => {},
      mount: () => {
        document.body.append(host)
        options.onMount(container, shadow, host)
      },
      remove: () => {
        options.onRemove?.(undefined)
        host.remove()
      },
    }))
    try {
      const session = await createContentSession({} as ContentScriptContext)
      expect(() => session.dispose()).toThrow(failure)
      expect(host.isConnected).toBe(false)
      expect(added.mock.calls.length).toBeGreaterThan(0)
      for (const [listener] of added.mock.calls) expect(browser.storage.local.onChanged.hasListener(listener)).toBe(false)
      expect(() => session.dispose()).not.toThrow()
    } finally {
      host.remove()
      for (const [listener] of added.mock.calls) browser.storage.local.onChanged.removeListener(listener)
    }
  })
})

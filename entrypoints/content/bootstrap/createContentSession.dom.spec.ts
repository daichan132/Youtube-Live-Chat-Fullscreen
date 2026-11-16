import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { browser } from 'wxt/browser'
import { ContentScriptContext } from 'wxt/utils/content-script-context'
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

describe('content session UI invalidation ownership', () => {
  beforeEach(async () => {
    const actual = await vi.importActual<typeof import('wxt/utils/content-script-ui/shadow-root')>(
      'wxt/utils/content-script-ui/shadow-root',
    )
    vi.mocked(createShadowRootUi).mockImplementation(actual.createShadowRootUi)
  })

  afterEach(() => vi.mocked(createShadowRootUi).mockReset())

  it('unregisters each removed UI from the still-active content context', async () => {
    const ctx = new ContentScriptContext('content', { cssInjectionMode: 'manual' })
    const added = vi.spyOn(ctx.signal, 'addEventListener')
    const removed = vi.spyOn(ctx.signal, 'removeEventListener')
    const hostRemovals: ReturnType<typeof vi.spyOn>[] = []
    try {
      for (let index = 0; index < 5; index++) {
        vi.mocked(createRoot).mockReturnValueOnce({ render: vi.fn(), unmount: vi.fn() })
        const before = added.mock.calls.length
        const session = await createContentSession(ctx)
        const ui = await vi.mocked(createShadowRootUi).mock.results.at(-1)?.value
        const removeHost = vi.spyOn(ui.shadowHost, 'remove')
        hostRemovals.push(removeHost)
        expect(ui.shadowHost.isConnected).toBe(true)
        const callbacks = added.mock.calls.slice(before).filter(([type]) => type === 'abort')
        expect(callbacks.length).toBeGreaterThan(0)

        session.dispose()
        expect(ui.shadowHost.isConnected).toBe(false)
        expect(ctx.signal.aborted).toBe(false)
        for (const [, callback] of callbacks) expect(removed).toHaveBeenCalledWith('abort', callback)
      }
      ctx.abort('extension invalidated after all sessions were removed')
      for (const removeHost of hostRemovals) expect(removeHost).toHaveBeenCalledOnce()
    } finally {
      ctx.abort('test complete')
    }
  })

  it('still removes an active UI and releases settings when the parent context is invalidated', async () => {
    const ctx = new ContentScriptContext('content', { cssInjectionMode: 'manual' })
    const unmount = vi.fn()
    vi.mocked(createRoot).mockReturnValueOnce({ render: vi.fn(), unmount })
    const added = vi.spyOn(browser.storage.local.onChanged, 'addListener')
    const session = await createContentSession(ctx)
    const ui = await vi.mocked(createShadowRootUi).mock.results.at(-1)?.value
    expect(ui.shadowHost.isConnected).toBe(true)
    ctx.abort('extension invalidated')
    expect(ui.shadowHost.isConnected).toBe(false)
    expect(unmount).toHaveBeenCalledOnce()
    expect(added.mock.calls.length).toBeGreaterThan(0)
    for (const [listener] of added.mock.calls) expect(browser.storage.local.onChanged.hasListener(listener)).toBe(false)
    session.dispose()
    expect(unmount).toHaveBeenCalledOnce()
  })

  it('unregisters the UI after a mount failure even when React cleanup fails', async () => {
    const ctx = new ContentScriptContext('content', { cssInjectionMode: 'manual' })
    const failure = new Error('render failed')
    const added = vi.spyOn(ctx.signal, 'addEventListener')
    const removed = vi.spyOn(ctx.signal, 'removeEventListener')
    vi.mocked(createRoot).mockReturnValueOnce({
      render: vi.fn(() => {
        throw failure
      }),
      unmount: vi.fn(() => {
        throw new Error('unmount failed')
      }),
    })
    try {
      await expect(createContentSession(ctx)).rejects.toBe(failure)
      expect(document.querySelector('wxt-react-content')).toBeNull()
      const callbacks = added.mock.calls.filter(([type]) => type === 'abort')
      expect(callbacks.length).toBeGreaterThan(0)
      for (const [, callback] of callbacks) expect(removed).toHaveBeenCalledWith('abort', callback)
    } finally {
      ctx.abort('test complete')
    }
  })
})

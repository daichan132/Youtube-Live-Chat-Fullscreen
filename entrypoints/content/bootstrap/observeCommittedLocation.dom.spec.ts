import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContentScriptContext } from 'wxt/utils/content-script-context'
import { observeCommittedLocation } from './observeCommittedLocation'

afterEach(() => vi.unstubAllGlobals())

const createContext = () => {
  const controller = new AbortController()
  const context = {
    addEventListener(target: EventTarget, type: string, listener: EventListener) {
      target.addEventListener(type, listener, { signal: controller.signal })
    },
  } as Pick<ContentScriptContext, 'addEventListener'>
  return { context, dispose: () => controller.abort() }
}

describe('observeCommittedLocation', () => {
  it('reacts only to committed Navigation API entries and removes its listener on invalidation', () => {
    const navigation = new EventTarget()
    vi.stubGlobal('navigation', navigation)
    const { context, dispose } = createContext()
    const reconcile = vi.fn()
    observeCommittedLocation(context, reconcile)

    navigation.dispatchEvent(new Event('navigate'))
    expect(reconcile).not.toHaveBeenCalled()
    navigation.dispatchEvent(new Event('currententrychange'))
    expect(reconcile).toHaveBeenCalledOnce()
    dispose()
    navigation.dispatchEvent(new Event('currententrychange'))
    expect(reconcile).toHaveBeenCalledOnce()
  })

  it('uses WXT location notifications when the Navigation API is unavailable', () => {
    vi.stubGlobal('navigation', undefined)
    const { context, dispose } = createContext()
    const reconcile = vi.fn()
    observeCommittedLocation(context, reconcile)

    window.dispatchEvent(new Event('wxt:locationchange'))
    expect(reconcile).toHaveBeenCalledOnce()
    dispose()
    window.dispatchEvent(new Event('wxt:locationchange'))
    expect(reconcile).toHaveBeenCalledOnce()
  })
})

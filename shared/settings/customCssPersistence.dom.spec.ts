import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAppRuntime, type AppRuntime } from '@/shared/runtime/createAppRuntime'
import type { LocaleMessages } from '@/shared/i18n/generated/translationTypes'
import { customCssAtom, customCssFeedbackAtom, customCssSuspendedAtom, isCustomCssStoppedAtom, savedChatCssAtom } from '@/shared/state/customCssAtoms'
import { createSettingsRepository } from './repository'
import { CUSTOM_CSS_STORAGE_KEY, CUSTOM_CSS_SUSPENDED_STORAGE_KEY } from './storageKeys'

const runtimes: AppRuntime[] = []
beforeEach(async () => { await chrome.storage.local.clear() })
afterEach(() => {
  runtimes.splice(0).forEach(runtime => { runtime.dispose() })
  vi.restoreAllMocks()
})
const open = async (writer: string) => {
  const repository = createSettingsRepository(writer, null, { waitBeforeRetry: async () => {} })
  const runtime = await createAppRuntime(repository, { loadMessages: async () => ({}) as LocaleMessages })
  runtimes.push(runtime)
  return { runtime, repository }
}
describe('CSS storage and import integration', () => {
  it('persists applied CSS across reload and stores registrations separately', async () => {
    const { runtime } = await open('settings')
    await runtime.customCss.apply('body {color:red}', runtime.store.get(customCssAtom))
    await runtime.customCss.register('Saved', 'body {color:blue}')
    const { runtime: reloaded } = await open('reloaded')
    expect(reloaded.store.get(customCssAtom)).toEqual({ enabled: true, css: 'body {color:red}' })
    expect(reloaded.store.get(savedChatCssAtom)).toMatchObject([{ name: 'Saved', css: 'body {color:blue}' }])
  })
  it('keeps an independent emergency stop through import and propagates to another context', async () => {
    const { runtime } = await open('settings')
    const { runtime: popup } = await open('popup')
    await runtime.customCss.apply('body{}', runtime.store.get(customCssAtom))
    const backup = runtime.exportSettings()
    await popup.customCss.suspend(true)
    await vi.waitFor(() => expect(runtime.store.get(customCssSuspendedAtom)).toBe(true))
    await runtime.importSettings(backup)
    expect(runtime.store.get(customCssAtom)).toEqual({ enabled: false, css: 'body{}' })
    expect(runtime.store.get(customCssSuspendedAtom)).toBe(true)
    expect(popup.store.get(customCssSuspendedAtom)).toBe(true)
  })
})


describe('CSS write confirmation and retry boundaries', () => {
  it('clears the matching stale save error after the common Retry confirms the value', async () => {
    const { runtime } = await open('retry-error')
    vi.spyOn(chrome.storage.local, 'set')
      .mockRejectedValueOnce(new Error('quota'))
      .mockRejectedValueOnce(new Error('quota'))
    await expect(runtime.customCss.apply('body{}', runtime.store.get(customCssAtom))).rejects.toThrow('quota')
    expect(runtime.store.get(customCssFeedbackAtom)).toMatchObject({ kind: 'error', operation: 'apply', code: 'storage' })
    await runtime.retryPersistence()
    expect(runtime.store.get(customCssAtom)).toEqual({ enabled: true, css: 'body{}' })
    expect(runtime.store.get(customCssFeedbackAtom)).toBeNull()
  })

  it('does not retain an applied-success message after importing disabled CSS', async () => {
    const { runtime } = await open('import-feedback')
    await runtime.customCss.apply('body{}', runtime.store.get(customCssAtom))
    const backup = runtime.exportSettings()
    expect(runtime.store.get(customCssFeedbackAtom)).toMatchObject({ kind: 'success', operation: 'apply' })
    await runtime.importSettings(backup)
    expect(runtime.store.get(customCssAtom).enabled).toBe(false)
    expect(runtime.store.get(customCssFeedbackAtom)).toBeNull()
  })

  it('lets Remove effect supersede a failed enabling write before a later Retry', async () => {
    const { runtime } = await open('cancel-failed-apply')
    vi.spyOn(chrome.storage.local, 'set')
      .mockRejectedValueOnce(new Error('quota'))
      .mockRejectedValueOnce(new Error('quota'))
    await expect(runtime.customCss.apply('body {display:none}', runtime.store.get(customCssAtom))).rejects.toThrow('quota')
    await runtime.customCss.disable()
    await runtime.retryPersistence()
    const { runtime: reloaded } = await open('cancel-reloaded')
    expect(reloaded.store.get(customCssAtom)).toEqual({ enabled: false, css: '' })
  })

  it('rejects malformed CSS in a write readback without replacing the confirmed source', async () => {
    const { runtime } = await open('bad-readback')
    const before = runtime.store.get(customCssAtom)
    const originalGet = chrome.storage.local.get.bind(chrome.storage.local)
    vi.spyOn(chrome.storage.local, 'get').mockImplementation(async keys => {
      const values = await originalGet(keys)
      if (CUSTOM_CSS_STORAGE_KEY in values) {
        values[CUSTOM_CSS_STORAGE_KEY] = { schemaVersion: 1, writerId: 'bad-readback', value: { enabled: true, css: 123 } }
      }
      return values
    })
    await expect(runtime.customCss.apply('body{}', before)).rejects.toThrow('unconfirmed')
    expect(runtime.store.get(customCssAtom)).toBe(before)
  })

  it('does not normalize a malformed pause readback into a confirmed pause', async () => {
    const { runtime } = await open('bad-pause-readback')
    const originalGet = chrome.storage.local.get.bind(chrome.storage.local)
    vi.spyOn(chrome.storage.local, 'get').mockImplementation(async keys => {
      const values = await originalGet(keys)
      if (CUSTOM_CSS_SUSPENDED_STORAGE_KEY in values) {
        values[CUSTOM_CSS_SUSPENDED_STORAGE_KEY] = { schemaVersion: 1, writerId: 'bad-pause-readback', value: 'invalid' }
      }
      return values
    })
    await expect(runtime.customCss.suspend(true)).rejects.toThrow('unconfirmed')
    expect(runtime.store.get(customCssSuspendedAtom)).toBe(false)
    expect(runtime.store.get(isCustomCssStoppedAtom)).toBe(true)
  })
})

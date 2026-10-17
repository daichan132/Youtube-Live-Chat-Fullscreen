import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_PROFILE } from '../../shared/settings/defaults.ts'
import { applyExtensionSettings, readSettingsPatch } from './extension-settings.mjs'

const extensionId = 'abcdefghijklmnopabcdefghijklmnop'
const envelope = value => ({ schemaVersion: 1, writerId: 'existing-settings', value })
const profile = () => structuredClone(DEFAULT_CHAT_PROFILE)
const geometry = { reference: 'player', rect: { x: 0.7, y: 0.05, width: 0.25, height: 0.5 }, pinned: true }
const temporaryDirectories = []
afterEach(async () => {
  vi.useRealTimers()
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
})
const patchFile = async value => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ylc-settings-contract-'))
  temporaryDirectories.push(directory)
  const file = path.join(directory, 'settings.json')
  await writeFile(file, typeof value === 'string' ? value : JSON.stringify(value))
  return file
}

// Evaluate the actual CDP expressions against a narrow Chrome API stub. This catches
// accidental storage clearing, writes in a different extension, and omitted readback.
const createPage = ({ initial = {}, beforeReadback, contexts: customContexts } = {}) => {
  const storage = structuredClone(initial)
  const operations = []
  const listeners = new Map()
  const contexts = customContexts ?? [
    { id: 1, auxData: { isDefault: true, frameId: 'selected-main-frame' }, extensionId: null },
    { id: 2, auxData: { isDefault: false, frameId: 'selected-main-frame' }, extensionId: 'pppppppppppppppppppppppppppppppp' },
    { id: 3, auxData: { isDefault: false, frameId: 'chat-child-frame' }, extensionId },
    { id: 4, auxData: { isDefault: false, frameId: 'selected-main-frame' }, extensionId },
  ]
  let written = false
  const send = vi.fn(async (method, params) => {
    if (method === 'Page.getFrameTree') return { frameTree: { frame: { id: 'selected-main-frame' } } }
    if (method === 'Runtime.enable') {
      for (const context of contexts) listeners.get('Runtime.executionContextCreated')?.({ context })
      return {}
    }
    if (method !== 'Runtime.evaluate') throw new Error(`Unexpected CDP command: ${method}`)
    const context = contexts.find(candidate => candidate.id === params.contextId)
    const chrome = context.extensionId
      ? {
          runtime: { id: context.extensionId },
          storage: {
            local: {
              get: async keys => {
                operations.push({ type: 'get', contextId: context.id, keys })
                if (written) beforeReadback?.(storage)
                return Object.fromEntries(keys.filter(key => Object.hasOwn(storage, key)).map(key => [key, storage[key]]))
              },
              set: async items => {
                operations.push({ type: 'set', contextId: context.id, items: structuredClone(items) })
                Object.assign(storage, items)
                written = true
              },
              clear: () => {
                throw new Error('Storage clearing must never occur')
              },
            },
          },
        }
      : undefined
    try {
      const value = await vm.runInNewContext(params.expression, { chrome })
      return { result: { value: value === undefined ? undefined : JSON.parse(JSON.stringify(value)) } }
    } catch {
      return { exceptionDetails: { text: 'Private exception description must not be echoed' } }
    }
  })
  const cdp = { send, on: (event, callback) => listeners.set(event, callback), detach: vi.fn(async () => {}) }
  const newCDPSession = vi.fn(async () => cdp)
  return { page: { context: () => ({ newCDPSession }) }, storage, operations, newCDPSession, cdp }
}

describe('verification settings patch input', () => {
  it('reads a small patch using the current product setting values', async () => {
    const patch = {
      enabled: true,
      theme: 'dark',
      locale: 'en',
      profile: { appearance: { backgroundColor: { a: 0.22 } }, display: { contentMode: 'full-chat' } },
      geometry,
    }
    await expect(readSettingsPatch(await patchFile(patch))).resolves.toEqual(patch)
  })

  it.each([
    null,
    [],
    {},
    { storage: {} },
    { enabled: 'true' },
    { locale: 'made-up-locale' },
    { profile: { appearance: { backgroundColor: { a: 1.1 } } } },
    { profile: { appearance: { backgroundColor: { alpha: 0.2 } } } },
    { profile: { appearance: { blur: -1 } } },
    { profile: { appearance: { fontSize: 41 } } },
    { profile: { appearance: { fontFamily: 'url(https://example.test)' } } },
    { profile: { display: { contentMode: 'fake-composer' } } },
    { geometry: { ...geometry, rect: { ...geometry.rect, width: 0.7 } } },
    { geometry: { ...geometry, rect: { ...geometry.rect, x: 0.9 } } },
    { geometry: { reference: 'player', rect: geometry.rect } },
  ])('rejects invalid input before acquiring a browser session: %j', async patch => {
    const target = createPage()
    await expect(applyExtensionSettings({ page: target.page, extensionId, patch })).rejects.toThrow('Invalid settings patch')
    expect(target.newCDPSession).not.toHaveBeenCalled()
    expect(target.operations).toEqual([])
  })

  it('rejects non-finite numbers and prototype-changing fields without writing', async () => {
    for (const patch of [
      { profile: { appearance: { spacing: Number.NaN } } },
      { profile: { appearance: { fontSize: Number.POSITIVE_INFINITY } } },
      JSON.parse('{"profile":{"appearance":{"__proto__":{"a":0.5}}}}'),
    ]) {
      const target = createPage()
      await expect(applyExtensionSettings({ page: target.page, extensionId, patch })).rejects.toThrow('Invalid settings patch')
      expect(target.operations).toEqual([])
    }
  })

  it('rejects malformed JSON and files larger than the product import limit', async () => {
    await expect(readSettingsPatch(await patchFile('{broken'))).rejects.toThrow('valid JSON')
    await expect(readSettingsPatch(await patchFile(' '.repeat(1024 * 1024 + 1)))).rejects.toThrow('1 MiB')
  })
})

describe('verification settings storage contract', () => {
  it('applies one atomic domain write in the exact top-frame extension world, preserving all other values', async () => {
    const current = profile()
    current.appearance.backgroundColor = { r: 12, g: 23, b: 34, a: 0.9 }
    current.appearance.fontSize = 17
    current.display.contentMode = 'messages-only'
    const presets = [{ kind: 'custom', id: 'favorite', name: 'My saved style', profile: profile() }]
    const initial = {
      'ylc-chat-appearance': envelope({ profile: current, presets }),
      'ylc-chat-geometry': envelope(geometry),
      'ylc-theme': envelope('light'),
      'unrelated-extension-preference': { untouched: true },
    }
    const target = createPage({ initial })
    const result = await applyExtensionSettings({
      page: target.page,
      extensionId,
      patch: {
        enabled: false,
        locale: 'en',
        profile: { appearance: { backgroundColor: { a: 0.22 } }, display: { contentMode: 'full-chat' } },
      },
    })
    expect(result).toMatchObject({ verified: true, domains: ['enabled', 'locale', 'profile'] })
    const writes = target.operations.filter(operation => operation.type === 'set')
    expect(writes).toHaveLength(1)
    expect(writes[0].contextId).toBe(4)
    expect(target.operations.filter(operation => operation.type === 'get')).toHaveLength(2)
    expect(target.operations.every(operation => operation.contextId === 4)).toBe(true)
    expect(Object.keys(writes[0].items).sort()).toEqual(['ylc-chat-appearance', 'ylc-enabled', 'ylc-locale'])
    const appearance = target.storage['ylc-chat-appearance']
    expect(appearance).toMatchObject({ schemaVersion: 1, writerId: result.writerId })
    expect(appearance.value.profile).toEqual({
      ...current,
      appearance: { ...current.appearance, backgroundColor: { ...current.appearance.backgroundColor, a: 0.22 } },
      display: { ...current.display, contentMode: 'full-chat' },
    })
    expect(appearance.value.presets).toEqual(presets)
    expect(target.storage['ylc-chat-geometry']).toEqual(initial['ylc-chat-geometry'])
    expect(target.storage['ylc-theme']).toEqual(initial['ylc-theme'])
    expect(target.storage['unrelated-extension-preference']).toEqual(initial['unrelated-extension-preference'])
    expect(target.storage['ylc-enabled'].value).toBe(false)
    expect(target.cdp.detach).toHaveBeenCalledOnce()
  })

  it('uses the authoritative default profile for a missing appearance domain and assigns unique writers', async () => {
    const first = createPage()
    const second = createPage()
    const patch = { profile: { appearance: { blur: 3 }, display: { contentMode: 'full-chat' } } }
    const a = await applyExtensionSettings({ page: first.page, extensionId, patch })
    const b = await applyExtensionSettings({ page: second.page, extensionId, patch })
    expect(a.writerId).not.toBe(b.writerId)
    expect(first.storage['ylc-chat-appearance'].value).toEqual({
      profile: { ...profile(), appearance: { ...profile().appearance, blur: 3 } },
      presets: [
        { kind: 'builtin', id: 'standard' },
        { kind: 'builtin', id: 'transparent' },
        { kind: 'builtin', id: 'simple' },
        { kind: 'builtin', id: 'dark' },
        { kind: 'builtin', id: 'readable' },
        { kind: 'builtin', id: 'compact' },
        { kind: 'builtin', id: 'neon' },
      ],
    })
  })

  it('preserves a custom membership color while changing one component and stores complete geometry', async () => {
    const current = profile()
    current.appearance.membershipNameColor = { mode: 'custom', value: { r: 1, g: 2, b: 3, a: 1 } }
    const target = createPage({ initial: { 'ylc-chat-appearance': envelope({ profile: current, presets: [] }) } })
    await applyExtensionSettings({
      page: target.page,
      extensionId,
      patch: {
        profile: { appearance: { membershipNameColor: { mode: 'custom', value: { a: 0.5 } }, fontFamily: null } },
        geometry,
      },
    })
    expect(target.storage['ylc-chat-appearance'].value.profile.appearance.membershipNameColor).toEqual({
      mode: 'custom',
      value: { r: 1, g: 2, b: 3, a: 0.5 },
    })
    expect(target.storage['ylc-chat-geometry'].value).toEqual(geometry)
    expect(target.storage['ylc-chat-appearance'].value.presets).toEqual([])
  })

  it('fails closed before any write when an existing appearance envelope is incompatible', async () => {
    const target = createPage({ initial: { 'ylc-chat-appearance': { schemaVersion: 2, value: { profile: profile(), presets: [] } } } })
    await expect(
      applyExtensionSettings({ page: target.page, extensionId, patch: { enabled: false, profile: { appearance: { blur: 3 } } } }),
    ).rejects.toThrow('unsupported envelope')
    expect(target.operations.some(operation => operation.type === 'set')).toBe(false)
    expect(target.storage['ylc-enabled']).toBeUndefined()
    expect(target.cdp.detach).toHaveBeenCalledOnce()
  })

  it.each([
    { schemaVersion: 1, writerId: 'existing-settings' },
    envelope(undefined),
    envelope(null),
    envelope({ presets: [] }),
    envelope({ profile: profile(), presets: null }),
  ])('does not replace malformed stored appearance with defaults: %j', async existing => {
    const target = createPage({ initial: { 'ylc-chat-appearance': existing } })
    await expect(
      applyExtensionSettings({ page: target.page, extensionId, patch: { profile: { appearance: { blur: 3 } } } }),
    ).rejects.toThrow('no settings were written')
    expect(target.operations.some(operation => operation.type === 'set')).toBe(false)
  })

  it.each(['ylc-chat-settings', 'ytdLiveChatStore'])(
    'preserves %s instead of replacing legacy-only appearance with defaults',
    async key => {
      const original = { profile: { appearance: { backgroundColor: { r: 20, g: 40, b: 60, a: 1 } } } }
      const target = createPage({ initial: { [key]: original } })
      await expect(
        applyExtensionSettings({
          page: target.page,
          extensionId,
          patch: { enabled: false, profile: { appearance: { backgroundColor: { a: 0.22 } } } },
        }),
      ).rejects.toThrow('require migration')
      expect(target.operations.some(operation => operation.type === 'set')).toBe(false)
      expect(target.storage[key]).toEqual(original)
      expect(target.storage['ylc-enabled']).toBeUndefined()
    },
  )

  it('reports unconfirmed writes when another writer changes readback instead of reporting success', async () => {
    const target = createPage({
      beforeReadback: storage => {
        storage['ylc-theme'] = envelope('light')
      },
    })
    await expect(applyExtensionSettings({ page: target.page, extensionId, patch: { theme: 'dark' } })).rejects.toThrow('may have committed')
    expect(target.operations.filter(operation => operation.type === 'set')).toHaveLength(1)
    expect(target.cdp.detach).toHaveBeenCalledOnce()
  })

  it('never writes in an iframe or another extension when the verified top-frame world is absent', async () => {
    vi.useFakeTimers()
    const target = createPage({ contexts: [{ id: 3, auxData: { isDefault: false, frameId: 'chat-child-frame' }, extensionId }] })
    const applying = applyExtensionSettings({ page: target.page, extensionId, patch: { theme: 'dark' } })
    const rejected = expect(applying).rejects.toThrow('context is unavailable')
    await vi.advanceTimersByTimeAsync(15000)
    await rejected
    expect(target.operations).toEqual([])
    expect(target.cdp.detach).toHaveBeenCalledOnce()
  })
})

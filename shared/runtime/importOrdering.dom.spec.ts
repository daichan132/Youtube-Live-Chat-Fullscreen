import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSettingsRepository, type SettingsRepository } from '@/shared/settings/repository'
import { APPEARANCE_STORAGE_KEY, THEME_STORAGE_KEY } from '@/shared/settings/storageKeys'
import { chatSettingsStateAtom, editorSessionStateAtom, EMPTY_MESSAGES, globalSettingsStateAtom } from '@/shared/state/atoms'
import { commitStylePatchAtom } from '@/shared/state/commands'
import { type AppRuntime, createAppRuntime } from './createAppRuntime'

const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>(next => {
    resolve = next
  })
  return { promise, resolve }
}

const sessions: { runtime: AppRuntime; repository: SettingsRepository }[] = []
const releases: (() => void)[] = []
const createSession = async () => {
  const repository = createSettingsRepository('import-editor', null, { waitBeforeRetry: async () => {} })
  const runtime = await createAppRuntime(repository, { loadMessages: async () => EMPTY_MESSAGES })
  const session = { runtime, repository }
  sessions.push(session)
  return session
}

const backupWithSize = (runtime: AppRuntime, fontSize: number) => {
  const backup = runtime.exportSettings()
  backup.globalSetting.themeMode = 'dark'
  backup.chatSettings.profile.appearance.fontSize = fontSize
  return backup
}

const pauseImportWrite = () => {
  const started = deferred()
  const released = deferred()
  releases.push(released.resolve)
  const originalSet = chrome.storage.local.set.bind(chrome.storage.local)
  let pending = true
  const set = vi.spyOn(chrome.storage.local, 'set').mockImplementation(async values => {
    if (pending && Object.keys(values).length === 4) {
      pending = false
      started.resolve()
      await released.promise
    }
    await originalSet(values)
  })
  return { started: started.promise, release: released.resolve, set }
}

const pauseNextRead = () => {
  const started = deferred()
  const released = deferred()
  releases.push(released.resolve)
  const originalGet = chrome.storage.local.get.bind(chrome.storage.local)
  let pending = true
  vi.spyOn(chrome.storage.local, 'get').mockImplementation(async keys => {
    const snapshot = structuredClone(await originalGet(keys))
    if (pending) {
      pending = false
      started.resolve()
      await released.promise
    }
    return snapshot
  })
  return { started: started.promise, release: released.resolve }
}

beforeEach(async () => {
  await chrome.storage.local.clear()
})
afterEach(async () => {
  for (const release of releases.splice(0)) release()
  await Promise.allSettled(sessions.map(({ repository }) => repository.flush()))
  for (const { runtime } of sessions.splice(0)) runtime.dispose()
  vi.restoreAllMocks()
})

describe('import ordering across the repository and editor', () => {
  it('queues later edits after import without resetting their history or optimistic state', async () => {
    const { runtime, repository } = await createSession()
    const paused = pauseImportWrite()
    const importing = runtime.importSettings(backupWithSize(runtime, 24))
    await paused.started
    runtime.store.set(commitStylePatchAtom, { appearance: { fontSize: 31 } })
    const editor = runtime.store.get(editorSessionStateAtom)
    expect(paused.set).toHaveBeenCalledOnce()
    expect(repository.getPersistenceStatus().status).toBe('saving')

    paused.release()
    await importing
    await repository.flush()

    expect(runtime.store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(31)
    expect(runtime.store.get(editorSessionStateAtom)).toBe(editor)
    expect(runtime.store.get(globalSettingsStateAtom).themeMode).toBe('dark')
    expect((await repository.load()).chat.profile.appearance.fontSize).toBe(31)
    expect(repository.getPersistenceStatus().status).toBe('idle')
  })

  it('serializes two imports and makes flush wait for the whole replacement chain', async () => {
    const { runtime, repository } = await createSession()
    const paused = pauseImportWrite()
    const first = runtime.importSettings(backupWithSize(runtime, 24))
    await paused.started
    const second = runtime.importSettings(backupWithSize(runtime, 32))
    let flushed = false
    const flushing = repository.flush().then(() => {
      flushed = true
    })
    await Promise.resolve()
    expect(paused.set).toHaveBeenCalledOnce()
    expect(flushed).toBe(false)

    paused.release()
    await Promise.all([first, second, flushing])

    expect(paused.set).toHaveBeenCalledTimes(2)
    expect(runtime.store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(32)
    expect((await repository.load()).chat.profile.appearance.fontSize).toBe(32)
    expect(flushed).toBe(true)
  })

  it('does not restore an imported snapshot over an external commit delivered during confirmation', async () => {
    const { runtime, repository } = await createSession()
    const readback = pauseNextRead()
    const importing = runtime.importSettings(backupWithSize(runtime, 24))
    await readback.started
    const current = runtime.store.get(chatSettingsStateAtom)
    await chrome.storage.local.set({
      [APPEARANCE_STORAGE_KEY]: {
        schemaVersion: 1,
        writerId: 'another-editor',
        value: {
          profile: { ...current.profile, appearance: { ...current.profile.appearance, fontSize: 35 } },
          presets: current.presets,
        },
      },
    })
    await vi.waitFor(() => expect(runtime.store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(35))
    readback.release()
    await importing

    expect(runtime.store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(35)
    expect((await repository.load()).chat.profile.appearance.fontSize).toBe(35)
    expect(runtime.store.get(globalSettingsStateAtom).themeMode).toBe('dark')
  })

  it('clears old history after a confirmed import even when the profile value is unchanged', async () => {
    const { runtime, repository } = await createSession()
    runtime.store.set(commitStylePatchAtom, { appearance: { fontSize: 24 } })
    await repository.flush()
    expect(runtime.store.get(editorSessionStateAtom).past).toHaveLength(1)
    await runtime.importSettings(runtime.exportSettings())
    expect(runtime.store.get(editorSessionStateAtom).past).toHaveLength(0)
  })

  it('does not apply a failed import and allows subsequent interactive writes', async () => {
    const { runtime, repository } = await createSession()
    const original = runtime.store.get(chatSettingsStateAtom)
    vi.spyOn(chrome.storage.local, 'set').mockRejectedValueOnce(new Error('bulk write rejected'))
    await expect(runtime.importSettings(backupWithSize(runtime, 24))).rejects.toThrow('bulk write rejected')
    expect(runtime.store.get(chatSettingsStateAtom)).toBe(original)

    runtime.store.set(commitStylePatchAtom, { appearance: { fontSize: 33 } })
    await repository.flush()
    expect((await repository.load()).chat.profile.appearance.fontSize).toBe(33)
    expect(repository.getPersistenceStatus().status).toBe('idle')
  })

  it('reports failed confirmation without pretending the successful storage write was rolled back', async () => {
    const { runtime } = await createSession()
    const original = runtime.store.get(chatSettingsStateAtom)
    vi.spyOn(chrome.storage.local, 'get').mockRejectedValueOnce(new Error('confirmation unavailable'))
    await expect(runtime.importSettings(backupWithSize(runtime, 24))).rejects.toThrow('confirmation unavailable')
    expect(runtime.store.get(chatSettingsStateAtom)).toBe(original)
    expect((await chrome.storage.local.get(THEME_STORAGE_KEY))[THEME_STORAGE_KEY]).toMatchObject({ value: 'dark' })
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_GEOMETRY } from '@/shared/settings/defaults'
import { createSettingsRepository } from '@/shared/settings/repository'
import { GEOMETRY_STORAGE_KEY } from '@/shared/settings/storageKeys'
import { chatSettingsStateAtom, EMPTY_MESSAGES } from '@/shared/state/atoms'
import { type AppRuntime, createAppRuntime } from './createAppRuntime'

const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>(next => {
    resolve = next
  })
  return { promise, resolve }
}

const runtimes: AppRuntime[] = []
let releaseRetry: (() => void) | undefined
let pending: Promise<void> | undefined

const moveOverlay = (runtime: AppRuntime, x: number) => {
  const chat = runtime.store.get(chatSettingsStateAtom)
  runtime.store.set(chatSettingsStateAtom, {
    ...chat,
    geometry: { ...DEFAULT_CHAT_GEOMETRY, rect: { ...DEFAULT_CHAT_GEOMETRY.rect, x }, pinned: true },
  })
}

const readOverlayX = (runtime: AppRuntime) => {
  const geometry = runtime.store.get(chatSettingsStateAtom).geometry
  return geometry.reference === 'player' ? geometry.rect.x : null
}

beforeEach(async () => {
  await chrome.storage.local.clear()
})

afterEach(async () => {
  releaseRetry?.()
  try {
    await pending
  } finally {
    for (const runtime of runtimes.splice(0)) runtime.dispose()
    releaseRetry = undefined
    pending = undefined
    vi.restoreAllMocks()
  }
})

describe('geometry retries after content runtime disposal', () => {
  it.each([
    { disposed: false, externalCommit: true, expectedX: 0.4 },
    { disposed: true, externalCommit: true, expectedX: 0.4 },
    { disposed: true, externalCommit: false, expectedX: 0.2 },
  ])(
    'preserves committed geometry with disposed=$disposed and externalCommit=$externalCommit',
    async ({ disposed, externalCommit, expectedX }) => {
      const started = deferred()
      const release = deferred()
      releaseRetry = release.resolve
      const oldRepository = createSettingsRepository('old-content-session', null, {
        waitBeforeRetry: async () => {
          started.resolve()
          await release.promise
        },
      })
      const currentRepository = createSettingsRepository('current-content-session', null)
      const oldRuntime = await createAppRuntime(oldRepository, { loadMessages: async () => EMPTY_MESSAGES })
      const currentRuntime = await createAppRuntime(currentRepository, { loadMessages: async () => EMPTY_MESSAGES })
      runtimes.push(oldRuntime, currentRuntime)
      const originalSet = chrome.storage.local.set.bind(chrome.storage.local)
      let firstOldWrite = true
      vi.spyOn(chrome.storage.local, 'set').mockImplementation(async values => {
        const geometry = (values as Record<string, unknown>)[GEOMETRY_STORAGE_KEY] as { writerId?: string } | undefined
        if (geometry?.writerId === 'old-content-session' && firstOldWrite) {
          firstOldWrite = false
          throw new Error('Transient first geometry write failure')
        }
        await originalSet(values)
      })

      moveOverlay(oldRuntime, 0.2)
      await started.promise
      pending = oldRepository.flush()
      if (disposed) oldRuntime.dispose()

      if (externalCommit) {
        moveOverlay(currentRuntime, 0.4)
        await currentRepository.flush()
        expect(readOverlayX(currentRuntime)).toBe(0.4)
        if (!disposed) await vi.waitFor(() => expect(readOverlayX(oldRuntime)).toBe(0.4))
      }

      release.resolve()
      await pending
      const stored = (await chrome.storage.local.get(GEOMETRY_STORAGE_KEY))[GEOMETRY_STORAGE_KEY]
      expect(stored).toMatchObject({ value: { rect: { x: expectedX } } })
      expect(readOverlayX(currentRuntime)).toBe(expectedX)

      oldRuntime.dispose()
      currentRuntime.dispose()
      expect(chrome.storage.local.onChanged.hasListeners()).toBe(false)
    },
  )
})

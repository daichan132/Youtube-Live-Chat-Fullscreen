import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSettingsRepository } from './repository'
import { LOCALE_STORAGE_KEY } from './storageKeys'

const unwatchers: (() => void)[] = []
const observeLocale = () => {
  const repository = createSettingsRepository('local-writer', null, { waitBeforeRetry: async () => {} })
  const onLocale = vi.fn()
  unwatchers.push(repository.watch({ onEnabled: vi.fn(), onTheme: vi.fn(), onAppearance: vi.fn(), onGeometry: vi.fn(), onLocale }))
  return { repository, onLocale }
}

beforeEach(async () => { await chrome.storage.local.clear() })
afterEach(() => {
  for (const unwatch of unwatchers.splice(0)) unwatch()
  vi.restoreAllMocks()
})

describe('committed locale provenance', () => {
  it('labels an own committed envelope as a readback acknowledgement', async () => {
    const { repository, onLocale } = observeLocale()
    await repository.saveLocale('ja')
    expect(onLocale).toHaveBeenLastCalledWith('ja', 'readback')
  })

  it('labels a foreign envelope read after our write as an external commit', async () => {
    const { repository, onLocale } = observeLocale()
    const originalSet = chrome.storage.local.set.bind(chrome.storage.local)
    vi.spyOn(chrome.storage.local, 'set').mockImplementationOnce(async values => {
      await originalSet(values)
      await originalSet({ [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'another-writer', value: 'fr' } })
    })
    await repository.saveLocale('ja')
    expect(onLocale).toHaveBeenLastCalledWith('fr', 'external')
  })
})

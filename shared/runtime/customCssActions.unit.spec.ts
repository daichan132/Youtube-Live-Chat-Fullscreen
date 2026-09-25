import { createStore } from 'jotai/vanilla'
import { describe, expect, it, vi } from 'vitest'
import type { ChatCssCustomization, SavedChatCss } from '@/shared/settings/customCss'
import { customCssAtom, customCssFeedbackAtom, customCssLocalStopAtom, customCssOperationAtom, customCssSuspendedAtom, isCustomCssStoppedAtom, savedChatCssAtom } from '@/shared/state/customCssAtoms'
import { createCustomCssActions } from './customCssActions'

const setup = () => {
  const store = createStore()
  const repository = {
    saveCustomCss: vi.fn(async (value: ChatCssCustomization) => { store.set(customCssAtom, value) }),
    saveSavedChatCss: vi.fn(async (value: SavedChatCss[]) => { store.set(savedChatCssAtom, value) }),
    saveCustomCssSuspended: vi.fn(async (value: boolean) => { store.set(customCssSuspendedAtom, value) }),
  }
  return { store, repository, actions: createCustomCssActions(store, repository, () => false) }
}
describe('explicit CSS actions', () => {
  it('registers CSS without changing applied source, appearance or stop preference', async () => {
    const { store, repository, actions } = setup()
    await actions.register('Bubble', 'body{}')
    expect(store.get(savedChatCssAtom)).toMatchObject([{ name: 'Bubble', css: 'body{}' }])
    expect(repository.saveCustomCss).not.toHaveBeenCalled()
    expect(repository.saveCustomCssSuspended).not.toHaveBeenCalled()
  })
  it('allows repair while paused without resuming CSS', async () => {
    const { store, repository, actions } = setup()
    await actions.apply('body {color:red}', store.get(customCssAtom))
    expect(store.get(customCssAtom).enabled).toBe(true)
    expect(store.get(customCssSuspendedAtom)).toBe(true)
    expect(repository.saveCustomCssSuspended).not.toHaveBeenCalled()
  })
  it('refuses a known stale editor baseline', async () => {
    const { store, repository, actions } = setup()
    const before = store.get(customCssAtom)
    store.set(customCssAtom, { enabled: true, css: 'newer' })
    await expect(actions.apply('older draft', before)).rejects.toThrow('conflict')
    expect(repository.saveCustomCss).not.toHaveBeenCalled()
  })
  it('does not overwrite a newer value after awaiting an unconfirmed write', async () => {
    const { store, repository, actions } = setup()
    const expected = store.get(customCssAtom)
    repository.saveCustomCss.mockImplementationOnce(async () => { store.set(customCssAtom, { enabled: true, css: 'another view' }) })
    await expect(actions.apply('my draft', expected)).rejects.toThrow('unconfirmed')
    expect(store.get(customCssAtom).css).toBe('another view')
  })
  it('keeps source and registrations when removing the CSS effect', async () => {
    const { store, actions } = setup()
    store.set(customCssAtom, { enabled: true, css: 'keep me' })
    await actions.disable()
    expect(store.get(customCssAtom)).toEqual({ enabled: false, css: 'keep me' })
  })
  it('reports a failed stop save instead of reverting the local safety mask', async () => {
    const { store, repository, actions } = setup()
    store.set(customCssSuspendedAtom, false)
    repository.saveCustomCssSuspended.mockRejectedValueOnce(new Error('Storage failure'))
    await expect(actions.suspend(true)).rejects.toThrow('Storage failure')
    expect(store.get(customCssSuspendedAtom)).toBe(false)
    expect(store.get(isCustomCssStoppedAtom)).toBe(true)
    store.set(customCssSuspendedAtom, false)
    expect(store.get(isCustomCssStoppedAtom)).toBe(true)
    await actions.suspend(false)
    expect(store.get(customCssLocalStopAtom)).toBe(false)
  })
})

describe('CSS action ordering and recovery', () => {
  it('rejects overlapping registrations before they can replace each other', async () => {
    const { store, repository, actions } = setup()
    let complete!: () => void
    repository.saveSavedChatCss.mockImplementationOnce(value => new Promise<void>(resolve => {
      complete = () => { store.set(savedChatCssAtom, value); resolve() }
    }))
    const first = actions.register('First', 'body { color: red }')
    await expect(actions.register('Second', 'body { color: blue }')).rejects.toThrow('busy')
    expect(repository.saveSavedChatCss).toHaveBeenCalledTimes(1)
    complete()
    await first
    expect(store.get(savedChatCssAtom).map(entry => entry.name)).toEqual(['First'])
  })

  it('does not delete a registration changed after its confirmation was shown', async () => {
    const { store, repository, actions } = setup()
    const expected = { id: 'saved', name: 'Before', css: 'body{}' }
    store.set(savedChatCssAtom, [{ ...expected, name: 'After' }])
    await expect(actions.remove(expected)).rejects.toThrow('conflict')
    expect(repository.saveSavedChatCss).not.toHaveBeenCalled()
    expect(store.get(savedChatCssAtom)[0]?.name).toBe('After')
  })

  it('releases the operation lock after failure without dropping the source', async () => {
    const { store, repository, actions } = setup()
    const before = store.get(customCssAtom)
    repository.saveCustomCss.mockRejectedValueOnce(new Error('write failed'))
    await expect(actions.apply('body{}', before)).rejects.toThrow('write failed')
    await actions.apply('body { color: blue }', before)
    expect(store.get(customCssAtom).css).toBe('body { color: blue }')
  })

  it('requires a new confirmation if CSS changes again after an overwrite prompt', async () => {
    const { store, repository, actions } = setup()
    const promptSnapshot = { enabled: true, css: 'first external value' }
    store.set(customCssAtom, { enabled: true, css: 'second external value' })
    await expect(actions.apply('draft', promptSnapshot)).rejects.toThrow('conflict')
    expect(repository.saveCustomCss).not.toHaveBeenCalled()
  })
})

it('keeps a newer local stop while an older resume is completing', async () => {
  const { store, repository, actions } = setup()
  let completeResume!: () => void
  let completeStop!: () => void
  repository.saveCustomCssSuspended.mockImplementationOnce(() => new Promise<void>(resolve => {
    completeResume = () => { store.set(customCssSuspendedAtom, false); resolve() }
  }))
  repository.saveCustomCssSuspended.mockImplementationOnce(() => new Promise<void>(resolve => {
    completeStop = () => { store.set(customCssSuspendedAtom, true); resolve() }
  }))
  const resume = actions.suspend(false)
  const stop = actions.suspend(true)
  completeResume()
  await resume
  expect(store.get(isCustomCssStoppedAtom)).toBe(true)
  completeStop()
  await stop
  expect(store.get(isCustomCssStoppedAtom)).toBe(true)
})

it('does not save new CSS while a previous resume is still unconfirmed', async () => {
  const { store, repository, actions } = setup()
  let complete!: () => void
  repository.saveCustomCssSuspended.mockImplementationOnce(() => new Promise<void>(resolve => {
    complete = () => { store.set(customCssSuspendedAtom, false); resolve() }
  }))
  const resume = actions.suspend(false)
  await expect(actions.apply('.new{}', store.get(customCssAtom))).rejects.toThrow('busy')
  expect(repository.saveCustomCss).not.toHaveBeenCalled()
  complete()
  await resume
})


it('does not publish operation completion after the owning page is disposed', async () => {
  const store = createStore()
  let disposed = false
  let complete!: () => void
  const repository = {
    saveCustomCss: vi.fn(() => new Promise<void>(resolve => { complete = resolve })),
    saveSavedChatCss: vi.fn(async () => {}),
    saveCustomCssSuspended: vi.fn(async () => {}),
  }
  const actions = createCustomCssActions(store, repository, () => disposed)
  const pending = actions.apply('body{}', store.get(customCssAtom))
  const changed = vi.fn()
  const unsubscribe = store.sub(customCssOperationAtom, changed)
  disposed = true
  complete()
  await expect(pending).rejects.toThrow('disposed')
  expect(changed).not.toHaveBeenCalled()
  expect(store.get(customCssFeedbackAtom)).toBeNull()
  unsubscribe()
})

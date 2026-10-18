import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AppProvider } from '@/shared/runtime/AppProvider'
import { createAppRuntime } from '@/shared/runtime/createAppRuntime'
import { createSettingsRepository } from '@/shared/settings/repository'
import { APPEARANCE_STORAGE_KEY, ENABLED_STORAGE_KEY, LOCALE_STORAGE_KEY, THEME_STORAGE_KEY } from '@/shared/settings/storageKeys'
import { EMPTY_MESSAGES } from '@/shared/state/atoms'
import { commitStylePatchAtom } from '@/shared/state/commands'
import { DataTransfer } from './DataTransfer'

const cleanups: (() => Promise<void>)[] = []
const releases: (() => void)[] = []
const originalURL = globalThis.URL
afterEach(async () => {
  for (const release of releases.splice(0)) release()
  for (const cleanup of cleanups.splice(0)) await cleanup()
  vi.restoreAllMocks()
  globalThis.URL = originalURL
})
const setup = async () => {
  const repository = createSettingsRepository('import-ui', null, { waitBeforeRetry: async () => {} })
  const runtime = await createAppRuntime(repository, { loadMessages: async () => EMPTY_MESSAGES })
  cleanups.push(async () => {
    await repository.flush().catch(() => {})
    runtime.dispose()
  })
  const view = render(
    <AppProvider runtime={runtime}>
      <DataTransfer />
    </AppProvider>,
  )
  const input = view.container.querySelector('input') as HTMLInputElement
  return { runtime, repository, input }
}
const choose = (input: HTMLInputElement, data: unknown) =>
  fireEvent.change(input, {
    target: { files: [{ name: 'backup.json', size: 20, text: async () => JSON.stringify(data) }] },
  })

const backupWithFontSize = (fontSize: number) => ({
  version: 2,
  globalSetting: { ytdLiveChat: false, themeMode: 'dark' },
  chatSettings: { profile: { appearance: { fontSize } } },
})

it('waits for confirmation and saves omitted fields from the settings current at Apply', async () => {
  const { runtime, repository, input } = await setup()
  const before = await chrome.storage.local.get(null)
  choose(input, { version: 2, globalSetting: { ytdLiveChat: false, themeMode: 'dark' }, chatSettings: {} })
  await screen.findByText('popup.importConfirm')
  expect(await chrome.storage.local.get(null)).toEqual(before)
  act(() => runtime.store.set(commitStylePatchAtom, { appearance: { fontSize: 37 } }))
  await act(() => repository.flush())
  fireEvent.click(screen.getByText('popup.importApply'))
  await screen.findByText('popup.importDone')
  expect(await chrome.storage.local.get([ENABLED_STORAGE_KEY, THEME_STORAGE_KEY, APPEARANCE_STORAGE_KEY])).toMatchObject({
    [ENABLED_STORAGE_KEY]: { value: false },
    [THEME_STORAGE_KEY]: { value: 'dark' },
    [APPEARANCE_STORAGE_KEY]: { value: { profile: { appearance: { fontSize: 37 } } } },
  })
  expect(runtime.exportSettings()).toMatchObject({
    globalSetting: { ytdLiveChat: false, themeMode: 'dark' },
    chatSettings: { profile: { appearance: { fontSize: 37 } } },
  })
})

it('does not revive a cancelled slow file read', async () => {
  const { runtime, input } = await setup()
  let finish!: (text: string) => void
  fireEvent.change(input, {
    target: {
      files: [
        {
          name: 'slow.json',
          size: 20,
          text: () =>
            new Promise<string>(resolve => {
              finish = resolve
            }),
        },
      ],
    },
  })
  fireEvent.click(screen.getByText('popup.importCancel'))
  await act(async () => finish(JSON.stringify(runtime.exportSettings())))
  expect(screen.queryByText('popup.importConfirm')).not.toBeInTheDocument()
})

it('keeps import and cancellation unavailable until the confirmed settings finish saving', async () => {
  const { runtime, input } = await setup()
  let release!: () => void
  const pendingWrite = new Promise<void>(resolve => {
    release = resolve
  })
  releases.push(release)
  const originalSet = chrome.storage.local.set.bind(chrome.storage.local)
  vi.spyOn(chrome.storage.local, 'set').mockImplementationOnce(async values => {
    await pendingWrite
    await originalSet(values)
  })
  choose(input, backupWithFontSize(28))
  fireEvent.click(await screen.findByRole('button', { name: 'popup.importApply' }))
  expect(screen.getByRole('status')).toHaveTextContent('popup.importApplying')
  expect(screen.getByRole('button', { name: 'popup.import' })).toBeDisabled()
  expect(screen.queryByRole('button', { name: 'popup.importCancel' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'popup.importApply' })).not.toBeInTheDocument()

  await act(async () => release())
  await screen.findByText('popup.importDone')
  expect(screen.getByRole('button', { name: 'popup.import' })).toBeEnabled()
  expect(runtime.exportSettings()).toMatchObject({ chatSettings: { profile: { appearance: { fontSize: 28 } } } })
  expect((await chrome.storage.local.get(APPEARANCE_STORAGE_KEY))[APPEARANCE_STORAGE_KEY]).toMatchObject({
    value: { profile: { appearance: { fontSize: 28 } } },
  })
})

it('reports failed confirmation while leaving the successful write available after reload', async () => {
  const { runtime, input } = await setup()
  const before = runtime.exportSettings()
  choose(input, backupWithFontSize(28))
  await screen.findByText('popup.importConfirm')
  vi.spyOn(chrome.storage.local, 'get').mockRejectedValueOnce(new Error('readback offline'))
  fireEvent.click(screen.getByRole('button', { name: 'popup.importApply' }))
  await screen.findByText('popup.importReadback')
  expect(runtime.exportSettings()).toMatchObject({ globalSetting: before.globalSetting, chatSettings: before.chatSettings })
  expect(screen.queryByText('popup.importDone')).not.toBeInTheDocument()

  const reloaded = await createAppRuntime(createSettingsRepository('reloaded-import-ui', null), {
    loadMessages: async () => EMPTY_MESSAGES,
  })
  try {
    expect(reloaded.exportSettings()).toMatchObject({
      globalSetting: { ytdLiveChat: false, themeMode: 'dark' },
      chatSettings: { profile: { appearance: { fontSize: 28 } } },
    })
  } finally {
    reloaded.dispose()
  }
  expect(screen.getByText('popup.importReadback')).toBeVisible()
  fireEvent.click(screen.getByText('popup.importClose'))
  expect(screen.queryByText('popup.importReadback')).not.toBeInTheDocument()
})

it('leaves saved settings intact after a rejected write and allows a fresh import', async () => {
  const { runtime, input } = await setup()
  const before = await chrome.storage.local.get(null)
  const exportedBefore = runtime.exportSettings()
  vi.spyOn(chrome.storage.local, 'set').mockRejectedValueOnce(new Error('write offline'))
  choose(input, backupWithFontSize(28))
  fireEvent.click(await screen.findByRole('button', { name: 'popup.importApply' }))
  await screen.findByText('popup.importWrite')
  expect(await chrome.storage.local.get(null)).toEqual(before)
  expect(runtime.exportSettings()).toMatchObject({ globalSetting: exportedBefore.globalSetting, chatSettings: exportedBefore.chatSettings })

  choose(input, backupWithFontSize(32))
  fireEvent.click(await screen.findByRole('button', { name: 'popup.importApply' }))
  await screen.findByText('popup.importDone')
  expect((await chrome.storage.local.get(APPEARANCE_STORAGE_KEY))[APPEARANCE_STORAGE_KEY]).toMatchObject({
    value: { profile: { appearance: { fontSize: 32 } } },
  })
})

it('downloads a usable JSON backup of current settings without the browser-local language', async () => {
  const { runtime, repository, input } = await setup()
  await act(async () => {
    runtime.store.set(commitStylePatchAtom, { appearance: { fontSize: 33 } })
    await runtime.setLocale('ja')
    await repository.flush()
  })
  let downloaded: Blob | undefined
  vi.stubGlobal(
    'URL',
    class extends originalURL {
      static override createObjectURL(blob: Blob) {
        downloaded = blob
        return 'blob:settings-backup'
      }
      static override revokeObjectURL() {}
    },
  )
  let filename: string | undefined
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    filename = this.download
    expect(this.href).toBe('blob:settings-backup')
  })

  fireEvent.click(screen.getByRole('button', { name: 'popup.export' }))
  expect(filename).toMatch(/^yt-livechat-fullscreen-backup-\d{4}-\d{2}-\d{2}\.json$/)
  expect(downloaded?.type).toBe('application/json')
  const text = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsText(downloaded as Blob)
  })
  const backup = JSON.parse(text)
  expect(Object.keys(backup).sort()).toEqual(['chatSettings', 'exportedAt', 'globalSetting', 'version'])
  expect(backup).toMatchObject({ version: 2, chatSettings: { profile: { appearance: { fontSize: 33 } } } })
  expect((await chrome.storage.local.get(LOCALE_STORAGE_KEY))[LOCALE_STORAGE_KEY]).toMatchObject({ value: 'ja' })

  act(() => runtime.store.set(commitStylePatchAtom, { appearance: { fontSize: 22 } }))
  await act(() => repository.flush())
  choose(input, backup)
  expect(await screen.findByText('popup.importConfirm')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'popup.importApply' }))
  await screen.findByText('popup.importDone')
  expect(await chrome.storage.local.get([APPEARANCE_STORAGE_KEY, LOCALE_STORAGE_KEY])).toMatchObject({
    [APPEARANCE_STORAGE_KEY]: { value: { profile: { appearance: { fontSize: 33 } } } },
    [LOCALE_STORAGE_KEY]: { value: 'ja' },
  })
})

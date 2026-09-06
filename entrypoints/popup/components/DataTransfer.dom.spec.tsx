import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AppProvider } from '@/shared/runtime/AppProvider'
import { createAppRuntime } from '@/shared/runtime/createAppRuntime'
import { createSettingsRepository, SettingsImportError } from '@/shared/settings/repository'
import { chatSettingsStateAtom, EMPTY_MESSAGES } from '@/shared/state/atoms'
import { commitStylePatchAtom } from '@/shared/state/commands'
import { DataTransfer } from './DataTransfer'

const cleanups: (() => void)[] = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
  vi.restoreAllMocks()
})
const setup = async () => {
  const runtime = await createAppRuntime(createSettingsRepository('import-ui', null), { loadMessages: async () => EMPTY_MESSAGES })
  cleanups.push(runtime.dispose)
  const view = render(
    <AppProvider runtime={runtime}>
      <DataTransfer />
    </AppProvider>,
  )
  const input = view.container.querySelector('input') as HTMLInputElement
  return { runtime, input }
}
const choose = (input: HTMLInputElement, data: unknown) =>
  fireEvent.change(input, {
    target: { files: [{ name: 'backup.json', size: 20, text: async () => JSON.stringify(data) }] },
  })

it('requires confirmation and normalizes raw input against changes made while confirming', async () => {
  const { runtime, input } = await setup()
  const backup = { ...runtime.exportSettings(), chatSettings: {} }
  const imported = vi.spyOn(runtime, 'importSettings')
  choose(input, backup)
  await screen.findByText('popup.importConfirm')
  expect(imported).not.toHaveBeenCalled()
  act(() => runtime.store.set(commitStylePatchAtom, { appearance: { fontSize: 37 } }))
  fireEvent.click(screen.getByText('popup.importApply'))
  await screen.findByText('popup.importDone')
  expect(imported).toHaveBeenCalledWith(backup)
  expect(runtime.store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(37)
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

it('prevents duplicate apply and retains a readback failure until dismissed', async () => {
  const { runtime, input } = await setup()
  const imported = vi.spyOn(runtime, 'importSettings').mockRejectedValue(new SettingsImportError('readback', new Error('offline')))
  choose(input, runtime.exportSettings())
  const apply = await screen.findByText('popup.importApply')
  fireEvent.click(apply)
  fireEvent.click(apply)
  await screen.findByText('popup.importReadback')
  expect(imported).toHaveBeenCalledOnce()
  await waitFor(() => expect(screen.getByText('popup.importReadback')).toBeVisible())
  fireEvent.click(screen.getByText('popup.importClose'))
  expect(screen.queryByText('popup.importReadback')).not.toBeInTheDocument()
})

import { act } from '@testing-library/react'
import { createStore } from 'jotai/vanilla'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createAppRuntime: vi.fn(),
  dispose: vi.fn(),
}))

vi.mock('./createAppRuntime', () => ({
  createAppRuntime: mocks.createAppRuntime,
}))

import { mountExtensionPage } from './mountExtensionPage'

describe('mountExtensionPage', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>'
    mocks.dispose.mockReset()
    mocks.createAppRuntime.mockReset()
    mocks.createAppRuntime.mockResolvedValue({
      store: createStore(),
      setLocale: vi.fn(),
      exportSettings: vi.fn(),
      importSettings: vi.fn(),
      retryPersistence: vi.fn(),
      dispose: mocks.dispose,
    })
  })

  it('mounts with the shared runtime and disposes on pagehide', async () => {
    await act(async () => {
      await mountExtensionPage(<div>Mounted page</div>)
    })

    expect(document.getElementById('root')).toHaveTextContent('Mounted page')

    await act(async () => {
      window.dispatchEvent(new Event('pagehide'))
    })

    expect(mocks.dispose).toHaveBeenCalledTimes(1)
    expect(document.getElementById('root')).toBeEmptyDOMElement()
  })

  it('renders a reload fallback when runtime startup fails', async () => {
    mocks.createAppRuntime.mockRejectedValueOnce(new Error('storage unavailable'))

    await act(async () => {
      await mountExtensionPage(<div />)
    })

    expect(document.getElementById('root')).toHaveTextContent('The extension could not start.')
    expect(document.querySelector('button')).toHaveTextContent('Reload')
  })

  it('fails before creating a runtime when the root is missing', async () => {
    document.body.innerHTML = ''

    await expect(mountExtensionPage(<div />)).rejects.toThrow('Extension page root #root was not found')
    expect(mocks.createAppRuntime).not.toHaveBeenCalled()
  })
})

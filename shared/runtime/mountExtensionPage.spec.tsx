import { act } from '@testing-library/react'
import { createStore } from 'jotai/vanilla'
import { createPortal } from 'react-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createAppRuntime: vi.fn(),
  dispose: vi.fn(),
}))

vi.mock('./createAppRuntime', () => ({
  createAppRuntime: mocks.createAppRuntime,
}))

import { EMPTY_MESSAGES, localeStateAtom, localeStateFromMessages } from '@/shared/state/atoms'
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

  it('keeps extension documents and body portals in the chosen language and direction until disposal', async () => {
    const store = createStore()
    store.set(localeStateAtom, localeStateFromMessages('pt_BR', EMPTY_MESSAGES))
    mocks.createAppRuntime.mockResolvedValue({ store, dispose: mocks.dispose })
    const originalLanguage = document.documentElement.getAttribute('lang')
    const originalDirection = document.documentElement.getAttribute('dir')
    let dispose: (() => void) | undefined

    try {
      await act(async () => {
        dispose = await mountExtensionPage(createPortal(<button type='button'>Portal action</button>, document.body))
      })
      expect(document.documentElement).toHaveAttribute('lang', 'pt-BR')
      expect(document.documentElement).toHaveAttribute('dir', 'ltr')
      expect(document.querySelector('button')?.closest('[lang]')).toBe(document.documentElement)
      expect(document.querySelector('button')?.closest('[dir]')).toBe(document.documentElement)

      act(() => store.set(localeStateAtom, localeStateFromMessages('ar', EMPTY_MESSAGES)))
      expect(document.documentElement).toHaveAttribute('lang', 'ar')
      expect(document.documentElement).toHaveAttribute('dir', 'rtl')

      act(() => store.set(localeStateAtom, localeStateFromMessages('ja', EMPTY_MESSAGES)))
      expect(document.documentElement).toHaveAttribute('lang', 'ja')
      expect(document.documentElement).toHaveAttribute('dir', 'ltr')

      await act(async () => dispose?.())
      act(() => store.set(localeStateAtom, localeStateFromMessages('en_US', EMPTY_MESSAGES)))
      expect(document.documentElement).toHaveAttribute('lang', 'ja')
      expect(document.documentElement).toHaveAttribute('dir', 'ltr')
    } finally {
      await act(async () => dispose?.())
      if (originalLanguage === null) document.documentElement.removeAttribute('lang')
      else document.documentElement.setAttribute('lang', originalLanguage)
      if (originalDirection === null) document.documentElement.removeAttribute('dir')
      else document.documentElement.setAttribute('dir', originalDirection)
    }
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

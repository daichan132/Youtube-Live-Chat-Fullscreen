import { createStore } from 'jotai/vanilla'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_PROFILE } from '@/shared/settings/defaults'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import { chatSettingsStateAtom, globalSettingsStateAtom } from '@/shared/state/atoms'
import { renderWithStore } from '@/shared/state/testUtils'
import { Content } from './Content'
import { useChatRuntime, useChatRuntimeInstance } from './runtime/ChatRuntimeContext'

const chatRuntime = {
  start: vi.fn(),
  stop: vi.fn(),
  setEnabled: vi.fn(),
  setProfile: vi.fn(),
}

vi.mock('./runtime/ChatRuntimeContext', () => ({
  useChatRuntime: vi.fn(),
  useChatRuntimeInstance: vi.fn(),
}))
vi.mock('./YTDLiveChat', () => ({
  YTDLiveChat: ({ loading }: { loading: boolean }) => <div data-testid='live-chat'>{loading ? 'loading' : 'ready'}</div>,
}))
vi.mock('./features/YTDLiveChatSwitch', () => ({
  YTDLiveChatSwitch: () => <button type='button'>switch</button>,
}))

const inactiveView = {
  status: 'inactive' as const,
  mode: null,
  showSwitch: false,
  showOverlay: false,
  loading: false,
  overlayRoot: null,
  switchContainer: null,
}

describe('Content', () => {
  const store = createStore()
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useChatRuntime).mockReturnValue(inactiveView)
    vi.mocked(useChatRuntimeInstance).mockReturnValue(chatRuntime as never)
    store.set(globalSettingsStateAtom, { ytdLiveChat: true, themeMode: 'system' })
    store.set(chatSettingsStateAtom, { ...DEFAULT_CHAT_SETTINGS, profile: DEFAULT_CHAT_PROFILE })
  })

  afterEach(() => {
    document.body.replaceChildren()
  })

  it('starts the runtime and sends effective settings', () => {
    const { unmount } = renderWithStore(<Content />, store)

    expect(chatRuntime.start).toHaveBeenCalledTimes(1)
    expect(chatRuntime.setEnabled).toHaveBeenCalledWith(true)
    expect(chatRuntime.setProfile).toHaveBeenCalledWith(DEFAULT_CHAT_PROFILE)

    unmount()
    expect(chatRuntime.stop).toHaveBeenCalledTimes(1)
  })

  it('renders overlay and switch only into runtime-owned portal targets', () => {
    const host = document.createElement('div')
    const overlayRoot = host.attachShadow({ mode: 'open' })
    const switchContainer = document.createElement('div')
    document.body.append(host, switchContainer)
    vi.mocked(useChatRuntime).mockReturnValue({
      status: 'recovering',
      mode: 'live',
      showSwitch: true,
      showOverlay: true,
      loading: true,
      overlayRoot,
      switchContainer,
    })

    renderWithStore(<Content />, store)

    expect(overlayRoot.querySelector('[data-testid="live-chat"]')?.textContent).toBe('loading')
    expect(switchContainer.querySelector('button')?.textContent).toBe('switch')
  })

  it('does not create React-owned DOM for an unavailable video', () => {
    vi.mocked(useChatRuntime).mockReturnValue({
      ...inactiveView,
      status: 'unavailable',
    })

    const { container } = renderWithStore(<Content />, store)
    expect(container).toBeEmptyDOMElement()
  })
})

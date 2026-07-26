import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatSettingsStore } from '@/shared/settings/chatSettingsStore'
import { DEFAULT_CHAT_PROFILE } from '@/shared/settings/defaults'
import { useGlobalSettingStore } from '@/shared/stores'
import { Content } from './Content'
import { chatRuntime } from './runtime/ChatRuntime'
import { useChatRuntime } from './runtime/useChatRuntime'

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

vi.mock('./hooks/globalState/useContentRuntimeMessages', () => ({
  useContentRuntimeMessages: vi.fn(),
}))
vi.mock('./hooks/globalState/useSettingsStorageSync', () => ({
  useSettingsStorageSync: vi.fn(),
}))
vi.mock('./runtime/ChatRuntime', () => ({
  chatRuntime: {
    start: vi.fn(),
    stop: vi.fn(),
    setEnabled: vi.fn(),
    setProfile: vi.fn(),
  },
}))
vi.mock('./runtime/useChatRuntime', () => ({
  useChatRuntime: vi.fn(),
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
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useChatRuntime).mockReturnValue(inactiveView)
    useGlobalSettingStore.setState({ ytdLiveChat: true, themeMode: 'system' })
    useChatSettingsStore.setState({ profile: DEFAULT_CHAT_PROFILE })
  })

  afterEach(() => {
    document.body.replaceChildren()
  })

  it('starts the runtime and sends effective settings', () => {
    const { unmount } = render(<Content />)

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

    render(<Content />)

    expect(overlayRoot.querySelector('[data-testid="live-chat"]')?.textContent).toBe('loading')
    expect(switchContainer.querySelector('button')?.textContent).toBe('switch')
  })

  it('does not create React-owned DOM for an unavailable video', () => {
    vi.mocked(useChatRuntime).mockReturnValue({
      ...inactiveView,
      status: 'unavailable',
    })

    const { container } = render(<Content />)
    expect(container).toBeEmptyDOMElement()
  })
})

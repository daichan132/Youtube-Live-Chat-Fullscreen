import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SHADOW_HOST_ID } from '@/entrypoints/content/constants/domIds'
import { isNativeChatToggleButton, isNativeChatTriggerTarget } from '@/entrypoints/content/utils/nativeChat'
import { useNativeChatAutoDisable } from './useNativeChatAutoDisable'

vi.mock('@/entrypoints/content/utils/nativeChat', () => ({
  isNativeChatToggleButton: vi.fn(),
  isNativeChatTriggerTarget: vi.fn(),
}))

const isNativeChatToggleButtonMock = vi.mocked(isNativeChatToggleButton)
const isNativeChatTriggerTargetMock = vi.mocked(isNativeChatTriggerTarget)

describe('useNativeChatAutoDisable', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML = ''
    isNativeChatToggleButtonMock.mockReset()
    isNativeChatTriggerTargetMock.mockReset()
    isNativeChatToggleButtonMock.mockReturnValue(false)
    isNativeChatTriggerTargetMock.mockReturnValue(false)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('turns off fullscreen chat when native toggle button is pressed in fullscreen', () => {
    const setYTDLiveChat = vi.fn()
    isNativeChatToggleButtonMock.mockReturnValue(true)
    isNativeChatTriggerTargetMock.mockReturnValue(true)

    renderHook(() =>
      useNativeChatAutoDisable({
        enabled: true,
        nativeChatOpen: false,
        isFullscreen: true,
        setYTDLiveChat,
      }),
    )

    const nativeButton = document.createElement('button')
    document.body.appendChild(nativeButton)

    act(() => {
      nativeButton.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }))
    })

    expect(setYTDLiveChat).toHaveBeenCalledTimes(1)
    expect(setYTDLiveChat).toHaveBeenCalledWith(false)
  })

  it('turns off extension chat when not fullscreen and native chat is closed', () => {
    const setYTDLiveChat = vi.fn()
    isNativeChatToggleButtonMock.mockReturnValue(true)
    isNativeChatTriggerTargetMock.mockReturnValue(true)

    renderHook(() =>
      useNativeChatAutoDisable({
        enabled: true,
        nativeChatOpen: false,
        isFullscreen: false,
        setYTDLiveChat,
      }),
    )

    const nativeButton = document.createElement('button')
    document.body.appendChild(nativeButton)

    act(() => {
      nativeButton.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }))
    })

    expect(setYTDLiveChat).toHaveBeenCalledTimes(1)
    expect(setYTDLiveChat).toHaveBeenCalledWith(false)
  })

  it('ignores pointer events from inside extension shadow root', () => {
    const setYTDLiveChat = vi.fn()
    isNativeChatToggleButtonMock.mockReturnValue(true)
    isNativeChatTriggerTargetMock.mockReturnValue(true)

    renderHook(() =>
      useNativeChatAutoDisable({
        enabled: true,
        nativeChatOpen: false,
        isFullscreen: true,
        setYTDLiveChat,
      }),
    )

    const shadowHost = document.createElement('div')
    shadowHost.id = SHADOW_HOST_ID
    const shadowRoot = shadowHost.attachShadow({ mode: 'open' })
    const extensionButton = document.createElement('button')
    shadowRoot.appendChild(extensionButton)
    document.body.appendChild(shadowHost)

    act(() => {
      extensionButton.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true, composed: true }))
    })

    expect(setYTDLiveChat).not.toHaveBeenCalled()
  })
})

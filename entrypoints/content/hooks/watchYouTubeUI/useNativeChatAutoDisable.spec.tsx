import { act, fireEvent, renderHook } from '@testing-library/react'
import { Provider } from 'jotai'
import { createStore } from 'jotai/vanilla'
import { beforeEach, describe, expect, it } from 'vitest'
import { SHADOW_HOST_ID } from '@/entrypoints/content/constants/domIds'
import { globalSettingsStateAtom } from '@/shared/state/atoms'
import { useNativeChatAutoDisable } from './useNativeChatAutoDisable'

const setup = (enabled = true) => {
  const store = createStore()
  store.set(globalSettingsStateAtom, { ytdLiveChat: true, themeMode: 'system' })
  const hook = renderHook(({ enabled }) => useNativeChatAutoDisable({ enabled }), {
    initialProps: { enabled },
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  })
  return { ...hook, store }
}

const createPlayerChatControl = () => {
  const controls = document.createElement('div')
  controls.className = 'ytp-right-controls'
  controls.innerHTML = '<button aria-label="Open chat"><span>Chat icon</span></button>'
  document.body.append(controls)
  return controls.querySelector('span') as HTMLSpanElement
}

describe('useNativeChatAutoDisable', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('turns off extension chat when a native player chat control is pressed', () => {
    const { store } = setup()
    const icon = createPlayerChatControl()

    fireEvent.pointerDown(icon)

    expect(store.get(globalSettingsStateAtom).ytdLiveChat).toBe(false)
  })

  it('turns off extension chat for a non-button native chat trigger', () => {
    const { store } = setup()
    const trigger = document.createElement('div')
    trigger.id = 'chat-container'
    document.body.append(trigger)

    fireEvent.pointerDown(trigger)

    expect(store.get(globalSettingsStateAtom).ytdLiveChat).toBe(false)
  })

  it('ignores unrelated controls and native-looking controls inside the extension shadow root', () => {
    const { store } = setup()
    const unrelated = document.createElement('button')
    unrelated.setAttribute('aria-label', 'Play')
    document.body.append(unrelated)
    fireEvent.pointerDown(unrelated)
    expect(store.get(globalSettingsStateAtom).ytdLiveChat).toBe(true)

    const shadowHost = document.createElement('div')
    shadowHost.id = SHADOW_HOST_ID
    const shadowRoot = shadowHost.attachShadow({ mode: 'open' })
    const extensionTrigger = document.createElement('div')
    extensionTrigger.id = 'chat-container'
    shadowRoot.append(extensionTrigger)
    document.body.append(shadowHost)
    fireEvent.pointerDown(extensionTrigger, { composed: true })

    expect(store.get(globalSettingsStateAtom).ytdLiveChat).toBe(true)
  })

  it('listens only while enabled and stops after unmount', () => {
    const { store, rerender, unmount } = setup(false)
    const icon = createPlayerChatControl()
    fireEvent.pointerDown(icon)
    expect(store.get(globalSettingsStateAtom).ytdLiveChat).toBe(true)

    rerender({ enabled: true })
    fireEvent.pointerDown(icon)
    expect(store.get(globalSettingsStateAtom).ytdLiveChat).toBe(false)

    act(() => store.set(globalSettingsStateAtom, { ytdLiveChat: true, themeMode: 'system' }))
    unmount()
    fireEvent.pointerDown(icon)
    expect(store.get(globalSettingsStateAtom).ytdLiveChat).toBe(true)
  })
})

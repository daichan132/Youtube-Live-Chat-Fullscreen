import { render } from '@testing-library/react'
import { Provider } from 'jotai'
import { describe, expect, it, vi } from 'vitest'
import { createTestStore } from '@/shared/state/testUtils'
import { Content } from './Content'
import type { ChatRuntime, RuntimeView } from './runtime/ChatRuntime'
import { ChatRuntimeProvider } from './runtime/ChatRuntimeContext'

const view: RuntimeView = {
  status: 'inactive',
  mode: null,
  showSwitch: false,
  showOverlay: false,
  loading: false,
  overlayRoot: null,
  switchContainer: null,
}

const createRuntime = () =>
  ({
    start: vi.fn(),
    stop: vi.fn(),
    setEnabled: vi.fn(),
    setProfile: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    getSnapshot: () => view,
  }) as unknown as ChatRuntime

describe('Content runtime ownership', () => {
  it('stops the old runtime and initializes the replacement when its provider changes', () => {
    const store = createTestStore()
    const first = createRuntime()
    const second = createRuntime()
    const tree = (runtime: ChatRuntime) => (
      <Provider store={store}>
        <ChatRuntimeProvider runtime={runtime}>
          <Content />
        </ChatRuntimeProvider>
      </Provider>
    )
    const rendered = render(tree(first))
    expect(first.start).toHaveBeenCalledOnce()
    expect(first.setEnabled).toHaveBeenCalledOnce()
    expect(first.setProfile).toHaveBeenCalledOnce()

    rendered.rerender(tree(second))
    expect(first.stop).toHaveBeenCalledOnce()
    expect(second.start).toHaveBeenCalledOnce()
    expect(second.setEnabled).toHaveBeenCalledOnce()
    expect(second.setProfile).toHaveBeenCalledOnce()
    rendered.unmount()
    expect(second.stop).toHaveBeenCalledOnce()
  })
})

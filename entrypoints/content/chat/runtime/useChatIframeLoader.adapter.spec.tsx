import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createChatAttachmentController } from './chatAttachmentController'
import type { ChatIframeRuntime } from './useChatIframeLoader'
import { useChatIframeLoader } from './useChatIframeLoader'

const controller = vi.hoisted(() => ({
  cleanup: vi.fn(),
  reconcile: vi.fn(),
  start: vi.fn(),
}))

vi.mock('./chatAttachmentController', () => ({
  createChatAttachmentController: vi.fn(() => ({
    start: controller.start,
    reconcile: controller.reconcile,
  })),
}))

const TestComponent = ({ runtime }: { runtime: ChatIframeRuntime }) => {
  const { ref } = useChatIframeLoader(runtime)
  return <div ref={ref} />
}

describe('useChatIframeLoader adapter', () => {
  beforeEach(() => {
    controller.cleanup.mockReset()
    controller.reconcile.mockReset()
    controller.start.mockReset()
    controller.start.mockReturnValue(controller.cleanup)
    vi.mocked(createChatAttachmentController).mockClear()
  })

  it('reconciles an existing controller for runtime revisions', () => {
    const runtime = { videoId: 'video-a', mode: 'live', revision: 0 } as const
    const { rerender } = render(<TestComponent runtime={runtime} />)

    expect(createChatAttachmentController).toHaveBeenCalledTimes(1)
    expect(controller.start).toHaveBeenCalledTimes(1)
    expect(controller.reconcile).toHaveBeenCalledTimes(1)

    rerender(<TestComponent runtime={{ ...runtime, revision: 1 }} />)

    expect(createChatAttachmentController).toHaveBeenCalledTimes(1)
    expect(controller.start).toHaveBeenCalledTimes(1)
    expect(controller.reconcile).toHaveBeenCalledTimes(2)
    expect(controller.cleanup).not.toHaveBeenCalled()
  })

  it('recreates the controller only when video identity changes', () => {
    const runtime = { videoId: 'video-a', mode: 'live', revision: 0 } as const
    const { rerender } = render(<TestComponent runtime={runtime} />)

    rerender(<TestComponent runtime={{ ...runtime, videoId: 'video-b' }} />)

    expect(controller.cleanup).toHaveBeenCalledTimes(1)
    expect(createChatAttachmentController).toHaveBeenCalledTimes(2)
    expect(controller.start).toHaveBeenCalledTimes(2)
  })
})

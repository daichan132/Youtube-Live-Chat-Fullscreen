import { act, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatSettingsStore } from '@/shared/settings/chatSettingsStore'
import { DEFAULT_CHAT_GEOMETRY, DEFAULT_CHAT_PROFILE } from '@/shared/settings/defaults'
import { OverlayFrame } from './OverlayFrame'

type DndContextMockProps = {
  children: ReactNode
  onDragStart?: () => void
  onDragEnd?: (event: { delta: { x: number; y: number } }) => void
  onDragCancel?: () => void
}

const dndContextState = vi.hoisted(() => ({
  props: null as DndContextMockProps | null,
}))

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

vi.mock('@dnd-kit/core', () => ({
  DndContext: (props: DndContextMockProps) => {
    dndContextState.props = props
    return props.children
  },
  useDraggable: () => ({
    attributes: {},
    isDragging: false,
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
  }),
}))

vi.mock('@dnd-kit/modifiers', () => ({
  restrictToWindowEdges: vi.fn(),
}))

vi.mock('re-resizable', () => ({
  Resizable: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('./OverlayControlRail', () => ({
  OverlayControlRail: () => null,
}))

vi.mock('@/entrypoints/content/hooks/watchYouTubeUI/useDocumentFocus', () => ({
  useDocumentFocus: () => true,
}))

describe('OverlayFrame', () => {
  beforeEach(() => {
    dndContextState.props = null
    Object.defineProperty(window, 'innerWidth', { value: 800, writable: true, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 600, writable: true, configurable: true })
    useChatSettingsStore.setState({
      profile: DEFAULT_CHAT_PROFILE,
      geometry: DEFAULT_CHAT_GEOMETRY,
      commitGeometry: useChatSettingsStore.getInitialState().commitGeometry,
    })
  })

  it('connects dnd gesture state and performs one persistent commit at drag end', () => {
    const commitGeometry = vi.fn()
    const onInteractionStateChange = vi.fn()
    useChatSettingsStore.setState({ commitGeometry })

    render(
      <OverlayFrame onInteractionStateChange={onInteractionStateChange}>
        <div>chat</div>
      </OverlayFrame>,
    )

    act(() => dndContextState.props?.onDragStart?.())
    expect(onInteractionStateChange).toHaveBeenLastCalledWith('dragging')
    expect(commitGeometry).not.toHaveBeenCalled()

    act(() => dndContextState.props?.onDragEnd?.({ delta: { x: 20, y: 10 } }))

    expect(commitGeometry).toHaveBeenCalledOnce()
    expect(onInteractionStateChange).toHaveBeenLastCalledWith('idle')
  })

  it('clears the local drag state without committing when dnd is cancelled', () => {
    const commitGeometry = vi.fn()
    const onInteractionStateChange = vi.fn()
    useChatSettingsStore.setState({ commitGeometry })

    render(
      <OverlayFrame onInteractionStateChange={onInteractionStateChange}>
        <div>chat</div>
      </OverlayFrame>,
    )

    act(() => dndContextState.props?.onDragStart?.())
    act(() => dndContextState.props?.onDragCancel?.())

    expect(commitGeometry).not.toHaveBeenCalled()
    expect(onInteractionStateChange).toHaveBeenLastCalledWith('idle')
  })
})

import type { DragEndEvent } from '@dnd-kit/core'
import type { NumberSize } from 're-resizable'
import type { Direction } from 're-resizable/lib/resizer'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { ResizableMinHeight, ResizableMinWidth } from '@/shared/constants'
import { useChatSettingsStore } from '@/shared/settings/chatSettingsStore'
import { fitGeometryToViewport } from '@/shared/settings/fitGeometryToViewport'
import type { ChatGeometry } from '@/shared/settings/model'
import { deriveResizedLayout } from '../features/Draggable/hooks/clipGeometry'

export const GEOMETRY_VIEWPORT_PADDING = 10

export const useOverlayGeometry = () => {
  const { geometry, commitGeometry } = useChatSettingsStore(
    useShallow(state => ({
      geometry: state.geometry,
      commitGeometry: state.commitGeometry,
    })),
  )
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  const [draftGeometry, setDraftGeometry] = useState<ChatGeometry | null>(null)
  const draftGeometryRef = useRef<ChatGeometry | null>(null)
  const resizeStartGeometryRef = useRef<ChatGeometry>(geometry)

  const displayGeometry = draftGeometry ?? fitGeometryToViewport(geometry, viewport, GEOMETRY_VIEWPORT_PADDING)

  const startResizing = useCallback(() => {
    resizeStartGeometryRef.current = displayGeometry
    draftGeometryRef.current = null
    setDraftGeometry(null)
  }, [displayGeometry])

  const resize = useCallback((_event: MouseEvent | TouchEvent, direction: Direction, _ref: HTMLElement, delta: NumberSize) => {
    const startGeometry = resizeStartGeometryRef.current
    const nextLayout = deriveResizedLayout({
      startCoordinates: startGeometry.coordinates,
      currentSize: startGeometry.size,
      direction,
      delta,
    })
    const nextGeometry: ChatGeometry = {
      coordinates: nextLayout.coordinates,
      size: nextLayout.size,
    }
    draftGeometryRef.current = nextGeometry
    setDraftGeometry(nextGeometry)
  }, [])

  const finishResizing = useCallback(
    (_event: MouseEvent | TouchEvent, _direction: Direction, element: HTMLElement, _delta: NumberSize) => {
      const draftCoordinates = draftGeometryRef.current?.coordinates ?? resizeStartGeometryRef.current.coordinates
      const nextGeometry = fitGeometryToViewport(
        {
          coordinates: draftCoordinates,
          size: {
            width: Math.max(ResizableMinWidth, element.offsetWidth),
            height: Math.max(ResizableMinHeight, element.offsetHeight),
          },
        },
        { width: window.innerWidth, height: window.innerHeight },
        GEOMETRY_VIEWPORT_PADDING,
      )
      draftGeometryRef.current = null
      setDraftGeometry(null)
      commitGeometry(nextGeometry)
    },
    [commitGeometry],
  )

  const cancelResizing = useCallback(() => {
    draftGeometryRef.current = null
    setDraftGeometry(null)
  }, [])

  const finishDragging = useCallback(
    ({ delta }: DragEndEvent) => {
      const currentDisplayGeometry = fitGeometryToViewport(geometry, viewport, GEOMETRY_VIEWPORT_PADDING)
      commitGeometry(
        fitGeometryToViewport(
          {
            coordinates: {
              x: currentDisplayGeometry.coordinates.x + delta.x,
              y: currentDisplayGeometry.coordinates.y + delta.y,
            },
            size: currentDisplayGeometry.size,
          },
          viewport,
          GEOMETRY_VIEWPORT_PADDING,
        ),
      )
    },
    [commitGeometry, geometry, viewport],
  )

  useLayoutEffect(() => {
    const handleWindowResize = () => {
      const nextViewport = { width: window.innerWidth, height: window.innerHeight }
      setViewport(current => (current.width === nextViewport.width && current.height === nextViewport.height ? current : nextViewport))
    }

    handleWindowResize()
    window.addEventListener('resize', handleWindowResize, { passive: true })
    return () => window.removeEventListener('resize', handleWindowResize)
  }, [])

  return {
    displayGeometry,
    draftGeometry,
    viewport,
    startResizing,
    resize,
    finishResizing,
    cancelResizing,
    finishDragging,
  }
}

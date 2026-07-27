import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { fitGeometryToViewport } from '@/shared/settings/fitGeometryToViewport'
import type { ChatGeometry } from '@/shared/settings/model'
import { commitGeometryAtom, geometryAtom } from '@/shared/state'
import { deriveResizedLayout, type ResizeDirection } from '../features/Draggable/hooks/clipGeometry'
import { type Point, usePointerSession } from './usePointerSession'

export const GEOMETRY_VIEWPORT_PADDING = 10

type GeometrySession = {
  type: 'move' | 'resize'
  direction?: ResizeDirection
  startPoint: Point
  startGeometry: ChatGeometry
}

export const useOverlayGeometry = ({
  onGestureStart,
  onGestureEnd,
}: {
  onGestureStart?: (type: GeometrySession['type']) => void
  onGestureEnd?: () => void
} = {}) => {
  const geometry = useAtomValue(geometryAtom)
  const commitGeometry = useSetAtom(commitGeometryAtom)
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  const [draftGeometry, setDraftGeometry] = useState<ChatGeometry | null>(null)
  const draftGeometryRef = useRef<ChatGeometry | null>(null)
  const displayGeometry = draftGeometry ?? fitGeometryToViewport(geometry, viewport, GEOMETRY_VIEWPORT_PADDING)

  const beginSession = useCallback(
    (event: React.PointerEvent, point: Point): GeometrySession => {
      const direction = (event.currentTarget as HTMLElement).dataset.ylcResizeDirection as ResizeDirection | undefined
      draftGeometryRef.current = null
      setDraftGeometry(null)
      return { type: direction ? 'resize' : 'move', direction, startPoint: point, startGeometry: displayGeometry }
    },
    [displayGeometry],
  )

  const updateSession = useCallback((session: GeometrySession, point: Point) => {
    const delta = { width: point.x - session.startPoint.x, height: point.y - session.startPoint.y }
    const nextGeometry =
      session.type === 'resize' && session.direction
        ? deriveResizedLayout({
            startCoordinates: session.startGeometry.coordinates,
            currentSize: session.startGeometry.size,
            direction: session.direction,
            delta,
          })
        : {
            coordinates: {
              x: session.startGeometry.coordinates.x + delta.width,
              y: session.startGeometry.coordinates.y + delta.height,
            },
            size: session.startGeometry.size,
          }
    const normalized = fitGeometryToViewport(
      nextGeometry,
      { width: window.innerWidth, height: window.innerHeight },
      GEOMETRY_VIEWPORT_PADDING,
    )
    draftGeometryRef.current = normalized
    setDraftGeometry(normalized)
  }, [])

  const finishSession = useCallback(
    (session: GeometrySession) => {
      const next = draftGeometryRef.current ?? session.startGeometry
      draftGeometryRef.current = null
      setDraftGeometry(null)
      commitGeometry(fitGeometryToViewport(next, { width: window.innerWidth, height: window.innerHeight }, GEOMETRY_VIEWPORT_PADDING))
    },
    [commitGeometry],
  )

  const cancelSession = useCallback(() => {
    draftGeometryRef.current = null
    setDraftGeometry(null)
  }, [])

  const pointerSession = usePointerSession<GeometrySession>({
    begin: beginSession,
    move: updateSession,
    commit: finishSession,
    cancel: cancelSession,
    onStart: session => onGestureStart?.(session.type),
    onEnd: onGestureEnd,
  })

  const onPointerDown = pointerSession.onPointerDown

  const moveByKeyboard = useCallback(
    (delta: Point) => {
      const current = fitGeometryToViewport(geometry, viewport, GEOMETRY_VIEWPORT_PADDING)
      commitGeometry(
        fitGeometryToViewport(
          { coordinates: { x: current.coordinates.x + delta.x, y: current.coordinates.y + delta.y }, size: current.size },
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
    onPointerDown,
    moveByKeyboard,
  }
}

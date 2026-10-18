import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  isChatGeometryV2,
  layoutGeometryToV2,
  legacyGeometryToV2,
  MAX_CHAT_HEIGHT_RATIO,
  MAX_CHAT_WIDTH_RATIO,
  MIN_CHAT_HEIGHT_PX,
  MIN_CHAT_WIDTH_PX,
  type PixelChatGeometry,
  renderChatGeometry,
} from '@/shared/settings/chatGeometry'
import { fitGeometryToViewport } from '@/shared/settings/fitGeometryToViewport'
import { commitGeometryAtom, geometryAtom } from '@/shared/state'
import { deriveResizedLayout, type ResizeDirection } from '../features/Draggable/hooks/clipGeometry'
import { useAutomaticOverlayPlacement } from './useAutomaticOverlayPlacement'
import type { OverlayInteractionState } from './useOverlayInteraction'
import { type Point, usePointerSession } from './usePointerSession'

export const GEOMETRY_VIEWPORT_PADDING = 10

type GeometrySession = {
  type: 'move' | 'resize'
  direction?: ResizeDirection
  startPoint: Point
  startGeometry: PixelChatGeometry
}

const getResizeMaxSize = (geometry: PixelChatGeometry, direction: ResizeDirection, viewport: { width: number; height: number }) => {
  const fromLeft = direction === 'left' || direction === 'topLeft' || direction === 'bottomLeft'
  const fromTop = direction === 'top' || direction === 'topLeft' || direction === 'topRight'
  const availableWidth = fromLeft
    ? geometry.coordinates.x + geometry.size.width - GEOMETRY_VIEWPORT_PADDING
    : viewport.width - GEOMETRY_VIEWPORT_PADDING - geometry.coordinates.x
  const availableHeight = fromTop
    ? geometry.coordinates.y + geometry.size.height - GEOMETRY_VIEWPORT_PADDING
    : viewport.height - GEOMETRY_VIEWPORT_PADDING - geometry.coordinates.y
  return {
    width: Math.max(MIN_CHAT_WIDTH_PX, Math.min(viewport.width * MAX_CHAT_WIDTH_RATIO, availableWidth)),
    height: Math.max(MIN_CHAT_HEIGHT_PX, Math.min(viewport.height * MAX_CHAT_HEIGHT_RATIO, availableHeight)),
  }
}

const getPlayerElement = (referenceElement: HTMLElement | null) => {
  const root = referenceElement?.getRootNode()
  return typeof ShadowRoot !== 'undefined' && root instanceof ShadowRoot
    ? (root.host.parentElement as HTMLElement | null)
    : referenceElement
}

const readReferenceSize = (element: HTMLElement | null) => {
  if (!element) return null
  const rect = element.getBoundingClientRect()
  const width = rect.width || element.clientWidth
  const height = rect.height || element.clientHeight
  return width > 0 && height > 0 ? { width, height } : null
}

export const useOverlayGeometry = ({
  referenceElement,
  settingsOpen = false,
  automaticPlacementPaused = false,
  interactionState = 'idle',
  onGestureStart,
  onGestureEnd,
}: {
  referenceElement?: HTMLElement | null
  settingsOpen?: boolean
  automaticPlacementPaused?: boolean
  interactionState?: OverlayInteractionState
  onGestureStart?: (type: GeometrySession['type']) => void
  onGestureEnd?: () => void
} = {}) => {
  const geometry = useAtomValue(geometryAtom)
  const commitGeometry = useSetAtom(commitGeometryAtom)
  const playerElement = getPlayerElement(referenceElement ?? null)
  const [referenceSize, setReferenceSize] = useState(() => readReferenceSize(playerElement))
  const [draftGeometry, setDraftGeometry] = useState<PixelChatGeometry | null>(null)
  const pointerActiveRef = useRef(false)
  const viewportWidth = referenceSize?.width ?? window.innerWidth
  const viewportHeight = referenceSize?.height ?? window.innerHeight
  const viewport = useMemo(() => ({ width: viewportWidth, height: viewportHeight }), [viewportWidth, viewportHeight])
  const storedLayout = useMemo(() => renderChatGeometry(geometry, viewport), [geometry, viewport])
  const displayGeometry = useMemo(
    () => draftGeometry ?? fitGeometryToViewport(storedLayout, viewport, GEOMETRY_VIEWPORT_PADDING),
    [draftGeometry, storedLayout, viewport],
  )
  const pinned = isChatGeometryV2(geometry) ? geometry.pinned : true

  const commitLayout = useCallback(
    (layout: PixelChatGeometry, nextPinned: boolean) => {
      const fitted = fitGeometryToViewport(layout, viewport, GEOMETRY_VIEWPORT_PADDING)
      commitGeometry(layoutGeometryToV2(fitted, viewport, nextPinned))
    },
    [commitGeometry, viewport],
  )

  const beginSession = useCallback(
    (event: React.PointerEvent, point: Point): GeometrySession => {
      const direction = (event.currentTarget as HTMLElement).dataset.ylcResizeDirection as ResizeDirection | undefined
      pointerActiveRef.current = true
      setDraftGeometry(null)
      return { type: direction ? 'resize' : 'move', direction, startPoint: point, startGeometry: displayGeometry }
    },
    [displayGeometry],
  )

  const deriveSessionGeometry = useCallback(
    (session: GeometrySession, point: Point) => {
      const delta = { width: point.x - session.startPoint.x, height: point.y - session.startPoint.y }
      const nextGeometry =
        session.type === 'resize' && session.direction
          ? deriveResizedLayout({
              startCoordinates: session.startGeometry.coordinates,
              currentSize: session.startGeometry.size,
              direction: session.direction,
              delta,
              maxSize: getResizeMaxSize(session.startGeometry, session.direction, viewport),
            })
          : {
              coordinates: {
                x: session.startGeometry.coordinates.x + delta.width,
                y: session.startGeometry.coordinates.y + delta.height,
              },
              size: session.startGeometry.size,
            }
      return fitGeometryToViewport(nextGeometry, viewport, GEOMETRY_VIEWPORT_PADDING)
    },
    [viewport],
  )

  const updateSession = useCallback(
    (session: GeometrySession, point: Point) => {
      setDraftGeometry(deriveSessionGeometry(session, point))
    },
    [deriveSessionGeometry],
  )

  const finishSession = useCallback(
    (session: GeometrySession, point: Point) => {
      const next = deriveSessionGeometry(session, point)
      pointerActiveRef.current = false
      setDraftGeometry(null)
      commitLayout(next, true)
    },
    [commitLayout, deriveSessionGeometry],
  )

  const cancelSession = useCallback(() => {
    pointerActiveRef.current = false
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

  const adjustBy = useCallback(
    (delta: Point, sizeDelta = { width: 0, height: 0 }) => {
      if (pointerActiveRef.current || settingsOpen) return
      const current = fitGeometryToViewport(storedLayout, viewport, GEOMETRY_VIEWPORT_PADDING)
      const fitted = fitGeometryToViewport(
        {
          coordinates: { x: current.coordinates.x + delta.x, y: current.coordinates.y + delta.y },
          size: { width: current.size.width + sizeDelta.width, height: current.size.height + sizeDelta.height },
        },
        viewport,
        GEOMETRY_VIEWPORT_PADDING,
      )
      const next = layoutGeometryToV2(fitted, viewport, true)
      const rendered = renderChatGeometry(next, viewport)
      if (
        Math.abs(rendered.coordinates.x - current.coordinates.x) < 0.001 &&
        Math.abs(rendered.coordinates.y - current.coordinates.y) < 0.001 &&
        Math.abs(rendered.size.width - current.size.width) < 0.001 &&
        Math.abs(rendered.size.height - current.size.height) < 0.001
      )
        return
      commitGeometry(next)
    },
    [commitGeometry, storedLayout, viewport, settingsOpen],
  )
  const moveBy = useCallback((delta: Point) => adjustBy(delta), [adjustBy])
  const resizeBy = useCallback((delta: { width: number; height: number }) => adjustBy({ x: 0, y: 0 }, delta), [adjustBy])

  const automaticPlacement = useAutomaticOverlayPlacement({
    playerElement,
    referenceSize,
    viewport,
    pinned,
    settingsOpen,
    paused: automaticPlacementPaused,
    interactionState,
    pointerActiveRef,
    draftGeometry,
    displayGeometry,
    viewportPadding: GEOMETRY_VIEWPORT_PADDING,
    commitLayout,
  })

  useLayoutEffect(automaticPlacement.reset, [automaticPlacement.reset])

  useLayoutEffect(() => {
    if (!playerElement) return
    const updateSize = () => {
      const next = readReferenceSize(playerElement)
      if (!next) return
      setReferenceSize(current => (current?.width === next.width && current.height === next.height ? current : next))
    }
    updateSize()
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateSize)
    resizeObserver?.observe(playerElement)
    window.addEventListener('resize', updateSize, { passive: true })

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateSize)
    }
  }, [playerElement])

  useLayoutEffect(automaticPlacement.observe, [automaticPlacement.observe])

  useLayoutEffect(() => {
    if (!referenceSize || isChatGeometryV2(geometry)) return
    commitGeometry(legacyGeometryToV2(geometry, referenceSize))
  }, [commitGeometry, geometry, referenceSize])

  useLayoutEffect(automaticPlacement.apply, [automaticPlacement.apply])

  return {
    displayGeometry,
    draftGeometry,
    viewport,
    onPointerDown: pointerSession.onPointerDown,
    moveBy,
    resizeBy,
  }
}

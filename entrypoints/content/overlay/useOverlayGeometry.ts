import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  isChatGeometryV2,
  layoutGeometryToV2,
  legacyGeometryToV2,
  type PixelChatGeometry,
  renderChatGeometry,
} from '@/shared/settings/chatGeometry'
import { fitGeometryToViewport } from '@/shared/settings/fitGeometryToViewport'
import { commitGeometryAtom, geometryAtom } from '@/shared/state'
import { deriveResizedLayout, type ResizeDirection } from '../features/Draggable/hooks/clipGeometry'
import { collectPlayerObstacles, type PlayerObstacle } from '../platform/youtube/collectPlayerObstacles'
import { playerObstacleBoundarySelector } from '../platform/youtube/selectorCatalog'
import { chooseAutoSafePlacement, shouldApplyAutoSafePlacement } from './autoSafeArea'
import { type Point, usePointerSession } from './usePointerSession'

export const GEOMETRY_VIEWPORT_PADDING = 10

type GeometrySession = {
  type: 'move' | 'resize'
  direction?: ResizeDirection
  startPoint: Point
  startGeometry: PixelChatGeometry
}

type InteractionState = 'idle' | 'hovering-chat' | 'hovering-controls' | 'dragging' | 'resizing' | 'settings-open'

type ObstacleSnapshot = {
  player: HTMLElement
  viewport: { width: number; height: number }
  settingsOpen: boolean
  obstacles: PlayerObstacle[]
  signature: string
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

const nodeMatchesOrContainsPlayerObstacle = (node: Node) =>
  node instanceof Element && (node.matches(playerObstacleBoundarySelector) || node.querySelector(playerObstacleBoundarySelector) !== null)

const mutationTargetTouchesPlayerObstacle = (target: Node, player: HTMLElement) => {
  const element = target instanceof Element ? target : target.parentElement
  if (!element) return false
  const obstacle = element.closest(playerObstacleBoundarySelector)
  return obstacle !== null && player.contains(obstacle)
}

export const mutationTouchesPlayerObstacle = (mutation: MutationRecord, player: HTMLElement) => {
  if (mutation.type === 'attributes') {
    return mutation.target === player || mutationTargetTouchesPlayerObstacle(mutation.target, player)
  }
  if (mutationTargetTouchesPlayerObstacle(mutation.target, player)) return true
  return [...mutation.addedNodes, ...mutation.removedNodes].some(nodeMatchesOrContainsPlayerObstacle)
}

export const useOverlayGeometry = ({
  referenceElement,
  settingsOpen = false,
  interactionState = 'idle',
  onGestureStart,
  onGestureEnd,
}: {
  referenceElement?: HTMLElement | null
  settingsOpen?: boolean
  interactionState?: InteractionState
  onGestureStart?: (type: GeometrySession['type']) => void
  onGestureEnd?: () => void
} = {}) => {
  const geometry = useAtomValue(geometryAtom)
  const commitGeometry = useSetAtom(commitGeometryAtom)
  const playerElement = getPlayerElement(referenceElement ?? null)
  const [referenceSize, setReferenceSize] = useState(() => readReferenceSize(playerElement))
  const [obstacleRevision, setObstacleRevision] = useState(0)
  const [draftGeometry, setDraftGeometry] = useState<PixelChatGeometry | null>(null)
  const pointerActiveRef = useRef(false)
  const autoRepositionedRef = useRef(false)
  const [autoPlacementComplete, setAutoPlacementComplete] = useState(false)
  const lastObstacleSignatureRef = useRef('')
  const obstacleSnapshotRef = useRef<ObstacleSnapshot | null>(null)
  const viewportWidth = referenceSize?.width ?? window.innerWidth
  const viewportHeight = referenceSize?.height ?? window.innerHeight
  const viewport = useMemo(() => ({ width: viewportWidth, height: viewportHeight }), [viewportWidth, viewportHeight])
  const storedLayout = useMemo(() => renderChatGeometry(geometry, viewport), [geometry, viewport])
  const displayGeometry = useMemo(
    () => draftGeometry ?? fitGeometryToViewport(storedLayout, viewport, GEOMETRY_VIEWPORT_PADDING),
    [draftGeometry, storedLayout, viewport],
  )
  const pinned = isChatGeometryV2(geometry) ? geometry.pinned : true

  const measureObstacles = useCallback((): ObstacleSnapshot | null => {
    if (!playerElement) return null
    const obstacles = collectPlayerObstacles(playerElement, settingsOpen)
    return { player: playerElement, viewport, settingsOpen, obstacles, signature: JSON.stringify(obstacles) }
  }, [playerElement, settingsOpen, viewport])

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

  useLayoutEffect(() => {
    autoRepositionedRef.current = false
    setAutoPlacementComplete(false)
    lastObstacleSignatureRef.current = ''
    obstacleSnapshotRef.current = null
  }, [pinned, playerElement])

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

  useLayoutEffect(() => {
    if (!playerElement || pinned || autoPlacementComplete) return
    let scheduledFrame: number | null = null
    const mutationObserver =
      pinned || typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver(mutations => {
            if (!mutations.some(mutation => mutationTouchesPlayerObstacle(mutation, playerElement))) return
            if (scheduledFrame !== null) return
            scheduledFrame = requestAnimationFrame(() => {
              scheduledFrame = null
              const snapshot = measureObstacles()
              if (!snapshot) return
              const previous = obstacleSnapshotRef.current
              obstacleSnapshotRef.current = snapshot
              // Playback updates progress and time inside the controls even
              // when their occupied area stays fixed. Publish only new bounds.
              if (snapshot.signature === previous?.signature) return
              setObstacleRevision(revision => revision + 1)
            })
          })
    mutationObserver?.observe(playerElement, {
      attributes: true,
      attributeFilter: ['aria-hidden', 'class', 'hidden', 'style'],
      characterData: true,
      childList: true,
      subtree: true,
    })
    return () => {
      mutationObserver?.disconnect()
      if (scheduledFrame !== null) cancelAnimationFrame(scheduledFrame)
    }
  }, [pinned, playerElement, autoPlacementComplete, measureObstacles])

  useLayoutEffect(() => {
    if (!referenceSize || isChatGeometryV2(geometry)) return
    commitGeometry(legacyGeometryToV2(geometry, referenceSize))
  }, [commitGeometry, geometry, referenceSize])

  useLayoutEffect(() => {
    if (!playerElement || !referenceSize || pinned || autoRepositionedRef.current || pointerActiveRef.current || draftGeometry) return
    if (interactionState === 'dragging' || interactionState === 'resizing') return
    const cached = obstacleSnapshotRef.current
    const snapshot =
      cached?.player === playerElement && cached.viewport === viewport && cached.settingsOpen === settingsOpen ? cached : measureObstacles()
    if (!snapshot) return
    obstacleSnapshotRef.current = snapshot
    const { obstacles, signature } = snapshot
    if (signature === lastObstacleSignatureRef.current) return
    lastObstacleSignatureRef.current = signature
    const placement = chooseAutoSafePlacement(displayGeometry, referenceSize, obstacles, GEOMETRY_VIEWPORT_PADDING)
    if (!shouldApplyAutoSafePlacement(placement)) return
    autoRepositionedRef.current = true
    setAutoPlacementComplete(true)
    commitLayout(placement.best.geometry, false)
  }, [
    commitLayout,
    displayGeometry,
    draftGeometry,
    interactionState,
    measureObstacles,
    obstacleRevision,
    pinned,
    playerElement,
    referenceSize,
    settingsOpen,
    viewport,
  ])

  return {
    displayGeometry,
    draftGeometry,
    viewport,
    onPointerDown: pointerSession.onPointerDown,
    moveBy,
    resizeBy,
  }
}

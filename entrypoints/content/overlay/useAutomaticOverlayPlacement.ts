import { type RefObject, useCallback, useRef, useState } from 'react'
import type { GeometryReferenceSize, PixelChatGeometry } from '@/shared/settings/chatGeometry'
import { collectPlayerObstacles, type PlayerObstacle } from '../platform/youtube/collectPlayerObstacles'
import { playerObstacleBoundarySelector } from '../platform/youtube/selectorCatalog'
import { chooseAutoSafePlacement, shouldApplyAutoSafePlacement } from './autoSafeArea'
import type { OverlayInteractionState } from './useOverlayInteraction'

type ObstacleSnapshot = {
  player: HTMLElement
  viewport: GeometryReferenceSize
  settingsOpen: boolean
  obstacles: PlayerObstacle[]
  signature: string
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

export const useAutomaticOverlayPlacement = ({
  playerElement,
  referenceSize,
  viewport,
  pinned,
  settingsOpen,
  interactionState,
  pointerActiveRef,
  draftGeometry,
  displayGeometry,
  viewportPadding,
  commitLayout,
}: {
  playerElement: HTMLElement | null
  referenceSize: GeometryReferenceSize | null
  viewport: GeometryReferenceSize
  pinned: boolean
  settingsOpen: boolean
  interactionState: OverlayInteractionState
  pointerActiveRef: RefObject<boolean>
  draftGeometry: PixelChatGeometry | null
  displayGeometry: PixelChatGeometry
  viewportPadding: number
  commitLayout: (layout: PixelChatGeometry, pinned: boolean) => void
}) => {
  const [obstacleRevision, setObstacleRevision] = useState(0)
  const autoRepositionedRef = useRef(false)
  const [autoPlacementComplete, setAutoPlacementComplete] = useState(false)
  const lastObstacleSignatureRef = useRef('')
  const obstacleSnapshotRef = useRef<ObstacleSnapshot | null>(null)

  const measureObstacles = useCallback((): ObstacleSnapshot | null => {
    if (!playerElement) return null
    const obstacles = collectPlayerObstacles(playerElement, settingsOpen)
    return { player: playerElement, viewport, settingsOpen, obstacles, signature: JSON.stringify(obstacles) }
  }, [playerElement, settingsOpen, viewport])

  const reset = useCallback(() => {
    autoRepositionedRef.current = false
    setAutoPlacementComplete(false)
    lastObstacleSignatureRef.current = ''
    obstacleSnapshotRef.current = null
  }, [pinned, playerElement])

  const observe = useCallback(() => {
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

  const apply = useCallback(() => {
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
    const placement = chooseAutoSafePlacement(displayGeometry, referenceSize, obstacles, viewportPadding)
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
    pointerActiveRef,
    referenceSize,
    settingsOpen,
    viewport,
    viewportPadding,
  ])

  // The geometry hook schedules these layout effects around player measurement
  // and legacy migration. Keeping the phases separate preserves that order.
  return { reset, observe, apply }
}

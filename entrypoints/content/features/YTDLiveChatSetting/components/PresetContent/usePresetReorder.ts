import { useCallback, useEffect, useRef, useState } from 'react'

type ItemLayout = { id: string; top: number; height: number }

type PointerCaptureTarget = HTMLElement & {
  setPointerCapture?: (pointerId: number) => void
  hasPointerCapture?: (pointerId: number) => boolean
  releasePointerCapture?: (pointerId: number) => void
}

const AUTO_SCROLL_EDGE_PX = 56
const AUTO_SCROLL_MAX_STEP_PX = 18

const hasOrderChanged = (before: string[], after: string[]) =>
  before.length !== after.length || before.some((id, index) => id !== after[index])

export const usePresetReorder = ({
  ids,
  onCommit,
  describeMove,
}: {
  ids: string[]
  onCommit: (ids: string[]) => void
  /** Renders the translated "moved <name> to position <n>" announcement. Positions are 1-based. */
  describeMove: (id: string, position: number) => string
}) => {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [previewIds, setPreviewIds] = useState(ids)
  const [liveMessage, setLiveMessage] = useState('')
  const layoutsRef = useRef<ItemLayout[]>([])
  const measuredScrollTopRef = useRef(0)
  const startIdsRef = useRef(ids)
  const activeIdRef = useRef<string | null>(null)
  const previewIdsRef = useRef(ids)
  const pointerGestureRef = useRef(false)
  const activePointerIdRef = useRef<number | null>(null)
  const pointerClientYRef = useRef<number | null>(null)
  const captureTargetRef = useRef<PointerCaptureTarget | null>(null)
  const captureAcquiredRef = useRef(false)
  const scrollContainerRef = useRef<HTMLElement | null>(null)
  const autoScrollFrameRef = useRef<number | null>(null)
  // Held in refs so new callbacks or preset lists never change the identity of
  // the global pointer listeners between addEventListener and removeEventListener.
  const describeMoveRef = useRef(describeMove)
  const onCommitRef = useRef(onCommit)
  describeMoveRef.current = describeMove
  onCommitRef.current = onCommit

  const finish = useCallback((commit: boolean) => {
    const nextActive = activeIdRef.current
    if (!nextActive) return

    const pointerId = activePointerIdRef.current
    const captureTarget = captureTargetRef.current
    const captureAcquired = captureAcquiredRef.current
    const scrollContainer = scrollContainerRef.current
    activeIdRef.current = null
    pointerGestureRef.current = false
    activePointerIdRef.current = null
    pointerClientYRef.current = null
    captureTargetRef.current = null
    captureAcquiredRef.current = false
    scrollContainerRef.current = null
    if (autoScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(autoScrollFrameRef.current)
      autoScrollFrameRef.current = null
    }
    setActiveId(null)
    window.removeEventListener('pointermove', handleMove)
    window.removeEventListener('pointerup', handleUp)
    window.removeEventListener('pointercancel', handleCancel)
    window.removeEventListener('keydown', handleKeyDown, true)
    window.removeEventListener('blur', handleWindowBlur)
    scrollContainer?.removeEventListener('scroll', handleScroll)
    captureTarget?.removeEventListener('lostpointercapture', handleLostPointerCapture as EventListener)

    if (captureTarget && pointerId !== null && captureAcquired) {
      try {
        const stillCaptured = typeof captureTarget.hasPointerCapture !== 'function' || captureTarget.hasPointerCapture(pointerId)
        if (stillCaptured) captureTarget.releasePointerCapture?.(pointerId)
      } catch {
        // The browser may already have released capture during detach or blur.
      }
    }

    if (commit && hasOrderChanged(startIdsRef.current, previewIdsRef.current)) onCommitRef.current(previewIdsRef.current)
    else {
      previewIdsRef.current = startIdsRef.current
      setPreviewIds(startIdsRef.current)
    }
  }, [])

  useEffect(() => {
    // An imported or externally edited list supersedes an in-progress reorder.
    // Cancelling must restore the latest list, not the gesture's stale snapshot.
    if (activeIdRef.current && hasOrderChanged(startIdsRef.current, ids)) finish(false)
    if (!activeIdRef.current) {
      previewIdsRef.current = ids
      setPreviewIds(ids)
    }
  }, [finish, ids])

  const measureLayouts = useCallback(() => {
    measuredScrollTopRef.current = scrollContainerRef.current?.scrollTop ?? 0
    const root = scrollContainerRef.current ?? document
    const elements = [...root.querySelectorAll<HTMLElement>('[data-ylc-preset-item]')]
    layoutsRef.current = elements.map(element => {
      const rect = element.getBoundingClientRect()
      return {
        id: element.dataset.ylcPresetItem ?? '',
        top: rect.top,
        height: rect.height,
      }
    })
  }, [])

  const updatePointerPreview = useCallback((clientY: number) => {
    const activeId = activeIdRef.current
    if (!activeId) return
    const layouts = layoutsRef.current
    const target = layouts.findIndex(layout => clientY < layout.top + layout.height / 2)
    const fallback = layouts.length - 1
    const targetIndex = target === -1 ? fallback : target
    const current = previewIdsRef.current
    const from = current.indexOf(activeId)
    if (from < 0 || from === targetIndex) return
    const next = [...current]
    const [item] = next.splice(from, 1)
    if (item === undefined) return
    next.splice(targetIndex, 0, item)
    previewIdsRef.current = next
    setPreviewIds(next)
    setLiveMessage(describeMoveRef.current(activeId, targetIndex + 1))
  }, [])

  const runAutoScroll = useCallback(() => {
    autoScrollFrameRef.current = null
    if (!pointerGestureRef.current) return

    const container = scrollContainerRef.current
    const clientY = pointerClientYRef.current
    if (!container || clientY === null) return

    const rect = container.getBoundingClientRect()
    const edge = Math.min(AUTO_SCROLL_EDGE_PX, rect.height / 3)
    const distanceFromTop = clientY - rect.top
    const distanceFromBottom = rect.bottom - clientY
    let direction = 0
    let proximity = 0

    if (distanceFromTop < edge) {
      direction = -1
      proximity = Math.min(1, Math.max(0, (edge - distanceFromTop) / edge))
    } else if (distanceFromBottom < edge) {
      direction = 1
      proximity = Math.min(1, Math.max(0, (edge - distanceFromBottom) / edge))
    }

    if (direction === 0) return

    const before = container.scrollTop
    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight)
    const step = Math.max(1, Math.ceil(AUTO_SCROLL_MAX_STEP_PX * proximity))
    container.scrollTop = Math.min(maxScrollTop, Math.max(0, before + direction * step))
    if (container.scrollTop === before) return

    measureLayouts()
    updatePointerPreview(clientY)
    if (pointerGestureRef.current) {
      autoScrollFrameRef.current = window.requestAnimationFrame(runAutoScroll)
    }
  }, [measureLayouts, updatePointerPreview])

  const requestAutoScrollFrame = useCallback(() => {
    if (!pointerGestureRef.current || autoScrollFrameRef.current !== null) return
    autoScrollFrameRef.current = window.requestAnimationFrame(runAutoScroll)
  }, [runAutoScroll])

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    const clientY = pointerClientYRef.current
    if (!pointerGestureRef.current || !container || clientY === null || container.scrollTop === measuredScrollTopRef.current) return
    measureLayouts()
    updatePointerPreview(clientY)
    requestAutoScrollFrame()
  }, [measureLayouts, requestAutoScrollFrame, updatePointerPreview])

  const handleMove = useCallback(
    (event: PointerEvent) => {
      if (!pointerGestureRef.current || event.pointerId !== activePointerIdRef.current || event.clientY === pointerClientYRef.current) return
      pointerClientYRef.current = event.clientY
      // Row slots are stable during ordinary pointer movement. Re-read layout
      // only after scrolling actually changes their viewport positions.
      updatePointerPreview(event.clientY)
      requestAutoScrollFrame()
    },
    [requestAutoScrollFrame, updatePointerPreview],
  )

  const handleUp = useCallback(
    (event: PointerEvent) => {
      if (!pointerGestureRef.current || event.pointerId !== activePointerIdRef.current) return
      // Pointer-up can carry a final position without a preceding pointer-move.
      // A click with no movement must not reorder the row at its own midpoint.
      if (event.clientY !== pointerClientYRef.current) updatePointerPreview(event.clientY)
      finish(true)
    },
    [finish, updatePointerPreview],
  )
  const handleCancel = useCallback(
    (event: PointerEvent) => {
      if (!pointerGestureRef.current || event.pointerId !== activePointerIdRef.current) return
      finish(false)
    },
    [finish],
  )
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing || !activeIdRef.current) return
      event.preventDefault()
      event.stopPropagation()
      finish(false)
    },
    [finish],
  )
  const handleWindowBlur = useCallback(() => {
    finish(false)
  }, [finish])
  const handleLostPointerCapture = useCallback(
    (event: PointerEvent) => {
      if (!pointerGestureRef.current || event.pointerId !== activePointerIdRef.current) return
      captureAcquiredRef.current = false
      finish(false)
    },
    [finish],
  )

  const begin = useCallback(
    (id: string, event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0 || activeIdRef.current || !previewIdsRef.current.includes(id)) return
      const captureTarget = event.currentTarget as PointerCaptureTarget
      scrollContainerRef.current = captureTarget.closest<HTMLElement>('[data-ylc-setting-scroll-container]')
      pointerGestureRef.current = true
      activePointerIdRef.current = event.pointerId
      pointerClientYRef.current = event.clientY
      captureTargetRef.current = captureTarget
      captureAcquiredRef.current = false
      measureLayouts()
      startIdsRef.current = previewIdsRef.current
      activeIdRef.current = id
      setActiveId(id)
      captureTarget.addEventListener('lostpointercapture', handleLostPointerCapture as EventListener)
      window.addEventListener('pointermove', handleMove)
      window.addEventListener('pointerup', handleUp)
      window.addEventListener('pointercancel', handleCancel)
      window.addEventListener('keydown', handleKeyDown, true)
      window.addEventListener('blur', handleWindowBlur)
      scrollContainerRef.current?.addEventListener('scroll', handleScroll, { passive: true })
      try {
        captureTarget.setPointerCapture?.(event.pointerId)
        captureAcquiredRef.current = typeof captureTarget.setPointerCapture === 'function'
      } catch {
        captureAcquiredRef.current = false
      }
      requestAutoScrollFrame()
      event.preventDefault()
    },
    [
      handleCancel,
      handleKeyDown,
      handleLostPointerCapture,
      handleMove,
      handleScroll,
      handleUp,
      handleWindowBlur,
      measureLayouts,
      requestAutoScrollFrame,
    ],
  )

  useEffect(() => () => finish(false), [finish])

  const beginKeyboard = (id: string) => {
    if (activeIdRef.current || !previewIdsRef.current.includes(id)) return
    startIdsRef.current = previewIdsRef.current
    activeIdRef.current = id
    setActiveId(id)
    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('blur', handleWindowBlur)
  }

  const moveByKeyboard = (id: string, direction: 'up' | 'down') => {
    const current = previewIdsRef.current
    const index = current.indexOf(id)
    const nextIndex = direction === 'up' ? Math.max(0, index - 1) : Math.min(current.length - 1, index + 1)
    if (index < 0 || nextIndex === index) return
    const next = [...current]
    next.splice(index, 1)
    next.splice(nextIndex, 0, id)
    previewIdsRef.current = next
    setPreviewIds(next)
    setLiveMessage(describeMoveRef.current(id, nextIndex + 1))
  }

  const getHandleProps = (id: string) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => begin(id, event),
    onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.nativeEvent.isComposing) return
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown' && event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      const current = previewIdsRef.current
      if (event.key === 'Enter' || event.key === ' ') {
        if (activeIdRef.current === id) finish(true)
        else beginKeyboard(id)
        return
      }
      if (activeIdRef.current === id) {
        moveByKeyboard(id, event.key === 'ArrowUp' ? 'up' : 'down')
        return
      }
      const currentIndex = current.indexOf(id)
      const nextIndex = event.key === 'ArrowUp' ? Math.max(0, currentIndex - 1) : Math.min(current.length - 1, currentIndex + 1)
      if (currentIndex < 0 || nextIndex === currentIndex) return
      const next = [...current]
      next.splice(currentIndex, 1)
      next.splice(nextIndex, 0, id)
      previewIdsRef.current = next
      setPreviewIds(next)
      onCommitRef.current(next)
      setLiveMessage(describeMoveRef.current(id, nextIndex + 1))
    },
  })

  return { activeId, previewIds, liveMessage, getHandleProps }
}

import { useCallback, useEffect, useRef, useState } from 'react'

type ItemLayout = PresetPointerPreview

type PointerCaptureTarget = HTMLElement & {
  setPointerCapture?: (pointerId: number) => void
  hasPointerCapture?: (pointerId: number) => boolean
  releasePointerCapture?: (pointerId: number) => void
}

export type PresetPointerPreview = { id: string; top: number; left: number; width: number; height: number }

type PointerGesture = {
  pointerId: number
  clientY: number
  scrollContainer: HTMLElement | null
  startY: number
  row: PresetPointerPreview
  offsetY: number
  lifted: boolean
  handle: HTMLButtonElement
}

/** Resources belong to one lift and are released before its order is committed or restored. */
const createReorderResources = (onKeyDown: (event: KeyboardEvent) => void, onBlur: () => void) => {
  let disposed = false
  let autoScrollFrame: number | null = null
  let releasePointer = () => {}
  window.addEventListener('keydown', onKeyDown, true)
  window.addEventListener('blur', onBlur)

  return {
    attachPointer({
      target,
      pointerId,
      scrollContainer,
      onMove,
      onUp,
      onCancel,
      onScroll,
    }: {
      target: PointerCaptureTarget
      pointerId: number
      scrollContainer: HTMLElement | null
      onMove: (event: PointerEvent) => void
      onUp: (event: PointerEvent) => void
      onCancel: (event: PointerEvent) => void
      onScroll: () => void
    }) {
      let captured = false
      const onLostCapture = (event: PointerEvent) => {
        if (event.target !== target || event.pointerId !== pointerId) return
        captured = false
        onCancel(event)
      }
      target.addEventListener('lostpointercapture', onLostCapture)
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onCancel)
      scrollContainer?.addEventListener('scroll', onScroll, { passive: true })
      releasePointer = () => {
        target.removeEventListener('lostpointercapture', onLostCapture)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onCancel)
        scrollContainer?.removeEventListener('scroll', onScroll)
        if (!captured) return
        try {
          const stillCaptured = typeof target.hasPointerCapture !== 'function' || target.hasPointerCapture(pointerId)
          if (stillCaptured) target.releasePointerCapture?.(pointerId)
        } catch {
          // The browser may already have released capture during detach or blur.
        }
      }
      try {
        target.setPointerCapture?.(pointerId)
        captured = typeof target.setPointerCapture === 'function'
      } catch {
        // Global listeners still complete the gesture when capture is unavailable.
      }
    },
    requestAutoScroll(callback: () => void) {
      if (disposed || autoScrollFrame !== null) return
      autoScrollFrame = window.requestAnimationFrame(() => {
        autoScrollFrame = null
        if (!disposed) callback()
      })
    },
    dispose() {
      if (disposed) return
      disposed = true
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('blur', onBlur)
      if (autoScrollFrame !== null) window.cancelAnimationFrame(autoScrollFrame)
      releasePointer()
    },
  }
}

const DRAG_THRESHOLD_PX = 6
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
  const [pointerPreview, setPointerPreview] = useState<PresetPointerPreview | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [previewIds, setPreviewIds] = useState(ids)
  const [liveMessage, setLiveMessage] = useState('')
  const layoutsRef = useRef<ItemLayout[]>([])
  const measuredScrollTopRef = useRef(0)
  const startIdsRef = useRef(ids)
  const activeIdRef = useRef<string | null>(null)
  const previewIdsRef = useRef(ids)
  const pointerGestureRef = useRef<PointerGesture | null>(null)
  const resourcesRef = useRef<ReturnType<typeof createReorderResources> | null>(null)
  // A lift uses the latest callbacks without replacing its resource owner.
  const describeMoveRef = useRef(describeMove)
  const onCommitRef = useRef(onCommit)
  describeMoveRef.current = describeMove
  onCommitRef.current = onCommit

  const finish = useCallback((commit: boolean) => {
    const nextActive = activeIdRef.current
    if (!nextActive) return

    const pointerHandle = pointerGestureRef.current?.handle
    activeIdRef.current = null
    pointerGestureRef.current = null
    setPointerPreview(null)
    const resources = resourcesRef.current
    resourcesRef.current = null
    resources?.dispose()
    setActiveId(null)
    if (commit && pointerHandle?.isConnected) pointerHandle.focus({ preventScroll: true })

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
      setPreviewIds(current => (hasOrderChanged(current, ids) ? ids : current))
    }
  }, [finish, ids])

  const measureLayouts = useCallback((container?: HTMLElement | null) => {
    const scrollContainer = container ?? pointerGestureRef.current?.scrollContainer
    measuredScrollTopRef.current = scrollContainer?.scrollTop ?? 0
    const root = scrollContainer ?? document
    const elements = [...root.querySelectorAll<HTMLElement>('[data-ylc-preset-item]')]
    layoutsRef.current = elements.map(element => {
      const rect = element.getBoundingClientRect()
      return {
        id: element.dataset.ylcPresetItem ?? '',
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }
    })
  }, [])

  const moveItem = useCallback((id: string, targetIndex: number, commit = false) => {
    const current = previewIdsRef.current
    const from = current.indexOf(id)
    if (from < 0 || from === targetIndex) return
    const next = [...current]
    const [item] = next.splice(from, 1)
    if (item === undefined) return
    next.splice(targetIndex, 0, item)
    previewIdsRef.current = next
    setPreviewIds(next)
    if (commit) onCommitRef.current(next)
    setLiveMessage(describeMoveRef.current(id, targetIndex + 1))
  }, [])

  const updatePointerPreview = useCallback(
    (clientY: number) => {
      const activeId = activeIdRef.current
      const pointer = pointerGestureRef.current
      if (!activeId || !pointer) return
      if (!pointer.lifted && Math.abs(clientY - pointer.startY) < DRAG_THRESHOLD_PX) return
      pointer.lifted = true
      setPointerPreview({ ...pointer.row, top: clientY - pointer.offsetY })
      const layouts = layoutsRef.current
      const centerY = clientY - pointer.offsetY + pointer.row.height / 2
      const target = layouts.filter(layout => layout.id !== activeId && centerY > layout.top + layout.height / 2).length
      moveItem(activeId, target)
    },
    [moveItem],
  )

  const runAutoScroll = useCallback(() => {
    const pointer = pointerGestureRef.current
    const container = pointer?.scrollContainer
    if (!pointer?.lifted || !container) return
    const clientY = pointer.clientY

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
      resourcesRef.current?.requestAutoScroll(runAutoScroll)
    }
  }, [measureLayouts, updatePointerPreview])

  const requestAutoScrollFrame = useCallback(() => {
    if (pointerGestureRef.current?.lifted) resourcesRef.current?.requestAutoScroll(runAutoScroll)
  }, [runAutoScroll])

  const handleScroll = useCallback(() => {
    const pointer = pointerGestureRef.current
    const container = pointer?.scrollContainer
    if (!pointer?.lifted || !container || container.scrollTop === measuredScrollTopRef.current) return
    measureLayouts()
    updatePointerPreview(pointer.clientY)
    requestAutoScrollFrame()
  }, [measureLayouts, requestAutoScrollFrame, updatePointerPreview])

  const handleMove = useCallback(
    (event: PointerEvent) => {
      const pointer = pointerGestureRef.current
      if (!pointer || event.pointerId !== pointer.pointerId || event.clientY === pointer.clientY) return
      pointer.clientY = event.clientY
      // Row slots are stable during ordinary pointer movement. Re-read layout
      // only after scrolling actually changes their viewport positions.
      updatePointerPreview(event.clientY)
      requestAutoScrollFrame()
    },
    [requestAutoScrollFrame, updatePointerPreview],
  )

  const handleUp = useCallback(
    (event: PointerEvent) => {
      const pointer = pointerGestureRef.current
      if (!pointer || event.pointerId !== pointer.pointerId) return
      // Pointer-up can carry a final position without a preceding pointer-move.
      // A click with no movement must not reorder the row at its own midpoint.
      if (event.clientY !== pointer.clientY) updatePointerPreview(event.clientY)
      finish(true)
    },
    [finish, updatePointerPreview],
  )
  const handleCancel = useCallback(
    (event: PointerEvent) => {
      if (event.pointerId !== pointerGestureRef.current?.pointerId) return
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
  const begin = useCallback(
    (id: string, event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0 || activeIdRef.current || !previewIdsRef.current.includes(id)) return
      const handle = event.currentTarget
      const scrollContainer = handle.closest<HTMLElement>('[data-ylc-setting-scroll-container]')
      // React can reinsert the active row when its order changes, which drops
      // pointer capture. Keep capture on the stationary list or scroll owner.
      const captureTarget = (scrollContainer ?? handle.closest('[data-ylc-preset-item]')?.parentElement ?? handle) as PointerCaptureTarget
      measureLayouts(scrollContainer)
      const rowBounds = layoutsRef.current.find(layout => layout.id === id)
      if (!rowBounds) return
      pointerGestureRef.current = {
        pointerId: event.pointerId,
        clientY: event.clientY,
        scrollContainer,
        startY: event.clientY,
        offsetY: event.clientY - rowBounds.top,
        lifted: false,
        handle,
        row: { id, top: rowBounds.top, left: rowBounds.left, width: rowBounds.width, height: rowBounds.height },
      }
      startIdsRef.current = previewIdsRef.current
      activeIdRef.current = id
      setActiveId(id)
      const resources = createReorderResources(handleKeyDown, handleWindowBlur)
      resourcesRef.current = resources
      resources.attachPointer({
        target: captureTarget,
        pointerId: event.pointerId,
        scrollContainer,
        onMove: handleMove,
        onUp: handleUp,
        onCancel: handleCancel,
        onScroll: handleScroll,
      })
      event.preventDefault()
    },
    [handleCancel, handleKeyDown, handleMove, handleScroll, handleUp, handleWindowBlur, measureLayouts],
  )

  useEffect(() => () => finish(false), [finish])

  const beginKeyboard = (id: string) => {
    if (activeIdRef.current || !previewIdsRef.current.includes(id)) return
    startIdsRef.current = previewIdsRef.current
    activeIdRef.current = id
    setActiveId(id)
    resourcesRef.current = createReorderResources(handleKeyDown, handleWindowBlur)
  }

  const getHandleProps = (id: string) => ({
    'aria-pressed': activeId === id,
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => begin(id, event),
    onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.nativeEvent.isComposing) return
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown' && event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      // A gesture owns its preview until it finishes; another input must not commit it.
      if (pointerGestureRef.current || (activeIdRef.current && activeIdRef.current !== id)) return
      const current = previewIdsRef.current
      if (event.key === 'Enter' || event.key === ' ') {
        if (activeIdRef.current === id) finish(true)
        else beginKeyboard(id)
        return
      }
      const currentIndex = current.indexOf(id)
      const nextIndex = event.key === 'ArrowUp' ? Math.max(0, currentIndex - 1) : Math.min(current.length - 1, currentIndex + 1)
      moveItem(id, nextIndex, activeIdRef.current !== id)
    },
  })

  return { activeId, previewIds, pointerPreview, liveMessage, getHandleProps }
}

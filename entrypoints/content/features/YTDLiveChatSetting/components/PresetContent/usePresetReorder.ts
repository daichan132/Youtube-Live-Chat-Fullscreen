import { useCallback, useEffect, useRef, useState } from 'react'

type ItemLayout = { id: string; top: number; height: number }

const AUTO_SCROLL_EDGE_PX = 56
const AUTO_SCROLL_MAX_STEP_PX = 18

const hasOrderChanged = (before: string[], after: string[]) =>
  before.length !== after.length || before.some((id, index) => id !== after[index])

export const usePresetReorder = ({ ids, onCommit }: { ids: string[]; onCommit: (ids: string[]) => void }) => {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [previewIds, setPreviewIds] = useState(ids)
  const [liveMessage, setLiveMessage] = useState('')
  const layoutsRef = useRef<ItemLayout[]>([])
  const startIdsRef = useRef(ids)
  const activeIdRef = useRef<string | null>(null)
  const previewIdsRef = useRef(ids)
  const pointerGestureRef = useRef(false)
  const activePointerIdRef = useRef<number | null>(null)
  const pointerClientYRef = useRef<number | null>(null)
  const scrollContainerRef = useRef<HTMLElement | null>(null)
  const autoScrollFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!activeIdRef.current) {
      setPreviewIds(ids)
      previewIdsRef.current = ids
    }
  }, [ids])

  const finish = useCallback(
    (commit: boolean) => {
      const nextActive = activeIdRef.current
      if (!nextActive) return
      activeIdRef.current = null
      pointerGestureRef.current = false
      activePointerIdRef.current = null
      pointerClientYRef.current = null
      scrollContainerRef.current = null
      if (autoScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(autoScrollFrameRef.current)
        autoScrollFrameRef.current = null
      }
      setActiveId(null)
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleCancel)
      window.removeEventListener('keydown', handleKeyDown)
      if (commit && hasOrderChanged(startIdsRef.current, previewIdsRef.current)) onCommit(previewIdsRef.current)
      else {
        previewIdsRef.current = startIdsRef.current
        setPreviewIds(startIdsRef.current)
      }
    },
    [onCommit],
  )

  const measureLayouts = useCallback(() => {
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
    next.splice(targetIndex, 0, item)
    previewIdsRef.current = next
    setPreviewIds(next)
    setLiveMessage(`${activeId} を ${targetIndex + 1} 番目に移動しました`)
  }, [])

  const handleMove = useCallback(
    (event: PointerEvent) => {
      if (!pointerGestureRef.current || event.pointerId !== activePointerIdRef.current) return
      pointerClientYRef.current = event.clientY
      measureLayouts()
      updatePointerPreview(event.clientY)
    },
    [measureLayouts, updatePointerPreview],
  )

  const runAutoScroll = useCallback(() => {
    autoScrollFrameRef.current = null
    if (!pointerGestureRef.current) return

    const container = scrollContainerRef.current
    const clientY = pointerClientYRef.current
    if (container && clientY !== null) {
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

      if (direction !== 0) {
        const before = container.scrollTop
        const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight)
        const step = Math.max(1, Math.ceil(AUTO_SCROLL_MAX_STEP_PX * proximity))
        container.scrollTop = Math.min(maxScrollTop, Math.max(0, before + direction * step))
        if (container.scrollTop !== before) {
          measureLayouts()
          updatePointerPreview(clientY)
        }
      }
    }

    if (pointerGestureRef.current) {
      autoScrollFrameRef.current = window.requestAnimationFrame(runAutoScroll)
    }
  }, [measureLayouts, updatePointerPreview])

  const handleUp = useCallback(
    (event: PointerEvent) => {
      if (!pointerGestureRef.current || event.pointerId !== activePointerIdRef.current) return
      finish(true)
    },
    [finish],
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
      if (event.key === 'Escape') finish(false)
    },
    [finish],
  )

  const begin = useCallback(
    (id: string, event: React.PointerEvent) => {
      if (event.button !== 0 || activeIdRef.current || !previewIdsRef.current.includes(id)) return
      scrollContainerRef.current = event.currentTarget.closest<HTMLElement>('[data-ylc-setting-scroll-container]')
      pointerGestureRef.current = true
      activePointerIdRef.current = event.pointerId
      pointerClientYRef.current = event.clientY
      measureLayouts()
      startIdsRef.current = previewIdsRef.current
      activeIdRef.current = id
      setActiveId(id)
      event.currentTarget.setPointerCapture?.(event.pointerId)
      window.addEventListener('pointermove', handleMove)
      window.addEventListener('pointerup', handleUp)
      window.addEventListener('pointercancel', handleCancel)
      window.addEventListener('keydown', handleKeyDown)
      autoScrollFrameRef.current = window.requestAnimationFrame(runAutoScroll)
      event.preventDefault()
    },
    [handleCancel, handleKeyDown, handleMove, handleUp, measureLayouts, runAutoScroll],
  )

  useEffect(() => () => finish(false), [finish])

  const beginKeyboard = (id: string) => {
    if (activeIdRef.current || !previewIdsRef.current.includes(id)) return
    startIdsRef.current = previewIdsRef.current
    activeIdRef.current = id
    setActiveId(id)
    window.addEventListener('keydown', handleKeyDown)
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
    setLiveMessage(`${id} を ${nextIndex + 1} 番目に移動しました`)
  }

  const getHandleProps = (id: string) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => begin(id, event),
    onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => {
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
      onCommit(next)
      setLiveMessage(`${id} を ${nextIndex + 1} 番目に移動しました`)
    },
  })

  return { activeId, previewIds, liveMessage, getHandleProps }
}

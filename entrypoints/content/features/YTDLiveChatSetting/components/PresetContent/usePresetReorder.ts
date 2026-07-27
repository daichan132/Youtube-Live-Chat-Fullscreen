import { useCallback, useEffect, useRef, useState } from 'react'

type ItemLayout = { id: string; top: number; height: number }

export const usePresetReorder = ({ ids, onCommit }: { ids: string[]; onCommit: (ids: string[]) => void }) => {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [previewIds, setPreviewIds] = useState(ids)
  const [liveMessage, setLiveMessage] = useState('')
  const layoutsRef = useRef<ItemLayout[]>([])
  const startIdsRef = useRef(ids)
  const activeIdRef = useRef<string | null>(null)
  const previewIdsRef = useRef(ids)

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
      setActiveId(null)
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleCancel)
      window.removeEventListener('keydown', handleKeyDown)
      if (commit) onCommit(previewIdsRef.current)
      else {
        previewIdsRef.current = startIdsRef.current
        setPreviewIds(startIdsRef.current)
      }
    },
    [onCommit],
  )

  const handleMove = useCallback((event: PointerEvent) => {
    if (!activeIdRef.current) return
    const layouts = layoutsRef.current
    const target = layouts.findIndex(layout => event.clientY < layout.top + layout.height / 2)
    const fallback = layouts.length - 1
    const targetIndex = target === -1 ? fallback : target
    const current = previewIdsRef.current
    const from = current.indexOf(activeIdRef.current)
    if (from < 0 || from === targetIndex) return
    const next = [...current]
    const [item] = next.splice(from, 1)
    next.splice(targetIndex, 0, item)
    previewIdsRef.current = next
    setPreviewIds(next)
    setLiveMessage(`${activeIdRef.current} を ${targetIndex + 1} 番目に移動しました`)
  }, [])
  const handleUp = useCallback(() => finish(true), [finish])
  const handleCancel = useCallback(() => finish(false), [finish])
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish(false)
    },
    [finish],
  )

  const begin = useCallback(
    (id: string, event: React.PointerEvent) => {
      if (event.button !== 0 || activeIdRef.current) return
      const elements = [...document.querySelectorAll<HTMLElement>('[data-ylc-preset-item]')]
      layoutsRef.current = elements.map(element => ({
        id: element.dataset.ylcPresetItem ?? '',
        top: element.getBoundingClientRect().top,
        height: element.getBoundingClientRect().height,
      }))
      startIdsRef.current = previewIdsRef.current
      activeIdRef.current = id
      setActiveId(id)
      event.currentTarget.setPointerCapture?.(event.pointerId)
      window.addEventListener('pointermove', handleMove)
      window.addEventListener('pointerup', handleUp)
      window.addEventListener('pointercancel', handleCancel)
      window.addEventListener('keydown', handleKeyDown)
      event.preventDefault()
    },
    [handleCancel, handleKeyDown, handleMove, handleUp],
  )

  useEffect(() => () => finish(false), [finish])

  const beginKeyboard = (id: string) => {
    if (activeIdRef.current) return
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

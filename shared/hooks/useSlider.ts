import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface UseSliderOptions {
  onScrub?: (value: number) => void
  onScrubStart?: () => void
  onScrubStop?: (value: number) => void
}

interface UseSliderState {
  isSliding: boolean
  value: number
}

const clamp = (v: number) => Math.min(1, Math.max(0, v))

const getRelativePosition = (el: HTMLElement, clientX: number): number => {
  const rect = el.getBoundingClientRect()
  return clamp((clientX - rect.left) / rect.width)
}

export const useSlider = (ref: React.RefObject<HTMLElement | null>, options: UseSliderOptions = {}): UseSliderState => {
  const [state, setState] = useState<UseSliderState>({ isSliding: false, value: 0 })
  const optionsRef = useRef(options)
  optionsRef.current = options
  const stateRef = useRef(state)
  stateRef.current = state

  const startScrubbing = useCallback(() => {
    if (!stateRef.current.isSliding) {
      setState(prev => ({ ...prev, isSliding: true }))
      optionsRef.current.onScrubStart?.()
    }
  }, [])

  const stopScrubbing = useCallback(() => {
    if (stateRef.current.isSliding) {
      setState(prev => ({ ...prev, isSliding: false }))
      optionsRef.current.onScrubStop?.(stateRef.current.value)
    }
  }, [])

  const onScrub = useCallback(
    (clientX: number) => {
      const el = ref.current
      if (!el) return
      const value = getRelativePosition(el, clientX)
      setState({ isSliding: true, value })
      optionsRef.current.onScrub?.(value)
    },
    [ref],
  )

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const handleMouseDown = (e: MouseEvent) => {
      startScrubbing()
      onScrub(e.clientX)
    }

    const handleTouchStart = (e: TouchEvent) => {
      startScrubbing()
      if (e.changedTouches.length > 0) {
        onScrub(e.changedTouches[0].clientX)
      }
    }

    el.addEventListener('mousedown', handleMouseDown)
    el.addEventListener('touchstart', handleTouchStart, { passive: true })

    return () => {
      el.removeEventListener('mousedown', handleMouseDown)
      el.removeEventListener('touchstart', handleTouchStart)
    }
  }, [ref, startScrubbing, onScrub])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (stateRef.current.isSliding) onScrub(e.clientX)
    }
    const handleTouchMove = (e: TouchEvent) => {
      if (stateRef.current.isSliding && e.changedTouches.length > 0) {
        onScrub(e.changedTouches[0].clientX)
      }
    }
    const handleUp = () => stopScrubbing()

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleUp)
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleUp)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleUp)
    }
  }, [onScrub, stopScrubbing])

  return state
}

import { useCallback, useEffect, useRef } from 'react'

export type Point = { x: number; y: number }

export type PointerSessionOptions<TSession> = {
  begin: (event: React.PointerEvent, point: Point) => TSession | null
  move: (session: TSession, point: Point) => void
  commit: (session: TSession, point: Point) => void
  cancel: (session: TSession) => void
  onStart?: (session: TSession) => void
  onEnd?: () => void
}

type PointerCaptureTarget = Element & {
  setPointerCapture?: (pointerId: number) => void
  hasPointerCapture?: (pointerId: number) => boolean
  releasePointerCapture?: (pointerId: number) => void
}

type ActivePointerSession<TSession> = {
  pointerId: number
  session: TSession
  captureTarget: PointerCaptureTarget
  captureAcquired: boolean
}

export const pointFromPointerEvent = (event: Pick<PointerEvent, 'clientX' | 'clientY'>): Point => ({
  x: event.clientX,
  y: event.clientY,
})

export const usePointerSession = <TSession>({ begin, move, commit, cancel, onStart, onEnd }: PointerSessionOptions<TSession>) => {
  const optionsRef = useRef<PointerSessionOptions<TSession>>({ begin, move, commit, cancel, onStart, onEnd })
  const activeRef = useRef<ActivePointerSession<TSession> | null>(null)
  optionsRef.current = { begin, move, commit, cancel, onStart, onEnd }

  const releaseCapture = useCallback((active: ActivePointerSession<TSession>) => {
    if (!active.captureAcquired) return
    active.captureAcquired = false
    try {
      const stillCaptured =
        typeof active.captureTarget.hasPointerCapture !== 'function' ||
        active.captureTarget.hasPointerCapture(active.pointerId)
      if (stillCaptured) active.captureTarget.releasePointerCapture?.(active.pointerId)
    } catch {
      // The browser may already have released capture during detach or blur.
    }
  }, [])

  const cleanup = useCallback((active: ActivePointerSession<TSession> | null) => {
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
    window.removeEventListener('pointercancel', handlePointerCancel)
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('blur', handleWindowBlur)
    active?.captureTarget.removeEventListener('lostpointercapture', handleLostPointerCapture as EventListener)
  }, [])

  const finish = useCallback(
    (shouldCommit: boolean, point?: Point) => {
      const active = activeRef.current
      if (!active) return
      activeRef.current = null
      cleanup(active)
      releaseCapture(active)
      if (shouldCommit) optionsRef.current.commit(active.session, point ?? { x: 0, y: 0 })
      else optionsRef.current.cancel(active.session)
      optionsRef.current.onEnd?.()
    },
    [cleanup, releaseCapture],
  )

  const handlePointerMove = useCallback((event: PointerEvent) => {
    const active = activeRef.current
    if (!active || active.pointerId !== event.pointerId) return
    optionsRef.current.move(active.session, pointFromPointerEvent(event))
  }, [])
  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      const active = activeRef.current
      if (!active || active.pointerId !== event.pointerId) return
      finish(true, pointFromPointerEvent(event))
    },
    [finish],
  )
  const handlePointerCancel = useCallback(
    (event: PointerEvent) => {
      if (activeRef.current?.pointerId === event.pointerId) finish(false)
    },
    [finish],
  )
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish(false)
    },
    [finish],
  )
  const handleWindowBlur = useCallback(() => {
    finish(false)
  }, [finish])
  const handleLostPointerCapture = useCallback(
    (event: PointerEvent) => {
      const active = activeRef.current
      if (!active || active.pointerId !== event.pointerId || event.currentTarget !== active.captureTarget) return
      active.captureAcquired = false
      finish(false)
    },
    [finish],
  )

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (event.button !== 0 || activeRef.current) return
      const session = optionsRef.current.begin(event, pointFromPointerEvent(event))
      if (!session) return

      const captureTarget = event.currentTarget as PointerCaptureTarget
      const active: ActivePointerSession<TSession> = {
        pointerId: event.pointerId,
        session,
        captureTarget,
        captureAcquired: false,
      }
      activeRef.current = active
      captureTarget.addEventListener('lostpointercapture', handleLostPointerCapture as EventListener)
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
      window.addEventListener('pointercancel', handlePointerCancel)
      window.addEventListener('keydown', handleKeyDown)
      window.addEventListener('blur', handleWindowBlur)
      try {
        captureTarget.setPointerCapture?.(event.pointerId)
        active.captureAcquired = typeof captureTarget.setPointerCapture === 'function'
      } catch {
        active.captureAcquired = false
      }
      event.preventDefault()
      optionsRef.current.onStart?.(session)
    },
    [handleKeyDown, handleLostPointerCapture, handlePointerCancel, handlePointerMove, handlePointerUp, handleWindowBlur],
  )

  useEffect(
    () => () => {
      if (activeRef.current) finish(false)
      else cleanup(null)
    },
    [cleanup, finish],
  )

  return { onPointerDown, isActive: () => activeRef.current !== null }
}

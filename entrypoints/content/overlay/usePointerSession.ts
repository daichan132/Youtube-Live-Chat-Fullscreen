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

export const pointFromPointerEvent = (event: Pick<PointerEvent, 'clientX' | 'clientY'>): Point => ({ x: event.clientX, y: event.clientY })

export const usePointerSession = <TSession>({ begin, move, commit, cancel, onStart, onEnd }: PointerSessionOptions<TSession>) => {
  const optionsRef = useRef<PointerSessionOptions<TSession>>({ begin, move, commit, cancel, onStart, onEnd })
  const activeRef = useRef<{ pointerId: number; session: TSession } | null>(null)
  optionsRef.current = { begin, move, commit, cancel, onStart, onEnd }

  const cleanup = useCallback(() => {
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
    window.removeEventListener('pointercancel', handlePointerCancel)
    window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const finish = useCallback(
    (shouldCommit: boolean, point?: Point) => {
      const active = activeRef.current
      if (!active) return
      activeRef.current = null
      cleanup()
      if (shouldCommit) optionsRef.current.commit(active.session, point ?? { x: 0, y: 0 })
      else optionsRef.current.cancel(active.session)
      optionsRef.current.onEnd?.()
    },
    [cleanup],
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

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (event.button !== 0 || activeRef.current) return
      const session = optionsRef.current.begin(event, pointFromPointerEvent(event))
      if (!session) return
      activeRef.current = { pointerId: event.pointerId, session }
      event.currentTarget.setPointerCapture?.(event.pointerId)
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
      window.addEventListener('pointercancel', handlePointerCancel)
      window.addEventListener('keydown', handleKeyDown)
      event.preventDefault()
      optionsRef.current.onStart?.(session)
    },
    [handleKeyDown, handlePointerCancel, handlePointerMove, handlePointerUp],
  )

  useEffect(
    () => () => {
      if (activeRef.current) finish(false)
      else cleanup()
    },
    [cleanup, finish],
  )

  return { onPointerDown, isActive: () => activeRef.current !== null }
}

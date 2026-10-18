import { type ButtonHTMLAttributes, useEffect, useLayoutEffect, useRef } from 'react'

const HOLD_DELAY_MS = 350
const REPEAT_INTERVAL_MS = 80
const isActivationKey = (key: string) => key === 'Enter' || key === ' '

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & { onAdjust: () => void }

/** One repeat session per press; every exit restores ordinary button input. */
export const PlacementActionButton = ({ onAdjust, ...props }: Props) => {
  const action = useRef(onAdjust)
  const stopRef = useRef<(() => void) | null>(null)
  const suppressPointerClick = useRef(false)
  useLayoutEffect(() => {
    action.current = onAdjust
  }, [onAdjust])
  useEffect(() => () => stopRef.current?.(), [])
  useLayoutEffect(() => {
    if (props.disabled) stopRef.current?.()
  }, [props.disabled])

  const begin = (button: HTMLButtonElement, input: { pointerId: number } | { key: string }) => {
    stopRef.current?.()
    const document = button.ownerDocument
    const view = document.defaultView
    if (!view) return
    let timer = 0
    let stopped = false
    const stop = () => {
      if (stopped) return
      stopped = true
      view.clearTimeout(timer)
      view.removeEventListener('blur', stop)
      document.removeEventListener('visibilitychange', stop)
      document.removeEventListener('pointerup', onPointerEnd, true)
      document.removeEventListener('pointercancel', onPointerEnd, true)
      document.removeEventListener('keyup', onKeyUp, true)
      if (stopRef.current === stop) stopRef.current = null
    }
    const onPointerEnd = (event: PointerEvent) => {
      if ('pointerId' in input && event.pointerId === input.pointerId) stop()
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if ('key' in input && event.key === input.key) stop()
    }
    const repeat = () => {
      if (stopped) return
      if ('pointerId' in input) suppressPointerClick.current = true
      action.current()
      if (!stopped) timer = view.setTimeout(repeat, REPEAT_INTERVAL_MS)
    }
    stopRef.current = stop
    view.addEventListener('blur', stop)
    document.addEventListener('visibilitychange', stop)
    document.addEventListener('pointerup', onPointerEnd, true)
    document.addEventListener('pointercancel', onPointerEnd, true)
    document.addEventListener('keyup', onKeyUp, true)
    timer = view.setTimeout(repeat, HOLD_DELAY_MS)
  }

  return (
    <button
      {...props}
      type='button'
      onPointerDown={event => {
        if (event.button !== 0 || !event.isPrimary || stopRef.current) return
        suppressPointerClick.current = false
        begin(event.currentTarget, { pointerId: event.pointerId })
      }}
      onPointerLeave={() => stopRef.current?.()}
      onBlur={() => stopRef.current?.()}
      onKeyDown={event => {
        if (!isActivationKey(event.key) || event.altKey || event.ctrlKey || event.metaKey) return
        event.preventDefault()
        if (event.repeat || stopRef.current) return
        begin(event.currentTarget, { key: event.key })
        action.current()
      }}
      onKeyUp={event => {
        if (isActivationKey(event.key)) event.preventDefault()
      }}
      onContextMenu={event => {
        if (stopRef.current || suppressPointerClick.current) event.preventDefault()
      }}
      onClick={event => {
        if (event.detail > 0 && suppressPointerClick.current) return
        action.current()
      }}
    />
  )
}

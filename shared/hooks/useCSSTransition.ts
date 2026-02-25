import { useEffect, useRef, useState } from 'react'

type TransitionClassNames = {
  appear?: string
  appearActive?: string
  enter?: string
  enterActive?: string
  exit?: string
  exitActive?: string
}

type TransitionTimeout = number | { appear?: number; enter?: number; exit?: number }

interface UseCSSTransitionOptions {
  in: boolean
  timeout: TransitionTimeout
  classNames: TransitionClassNames
  unmountOnExit?: boolean
}

type TransitionState = 'entered' | 'entering' | 'exited' | 'exiting' | 'unmounted'

const getTimeout = (timeout: TransitionTimeout, phase: 'appear' | 'enter' | 'exit'): number =>
  typeof timeout === 'number' ? timeout : (timeout[phase] ?? 0)

export const useCSSTransition = ({ in: show, timeout, classNames, unmountOnExit = false }: UseCSSTransitionOptions) => {
  const [state, setState] = useState<TransitionState>(show ? 'entered' : unmountOnExit ? 'unmounted' : 'exited')
  const prevShowRef = useRef(show)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const timeoutRef = useRef(timeout)
  timeoutRef.current = timeout
  const unmountOnExitRef = useRef(unmountOnExit)
  unmountOnExitRef.current = unmountOnExit

  useEffect(() => {
    const prevShow = prevShowRef.current
    prevShowRef.current = show

    if (show === prevShow) return

    clearTimeout(timerRef.current)

    if (show) {
      setState('entering')
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          timerRef.current = setTimeout(() => setState('entered'), getTimeout(timeoutRef.current, 'enter'))
        })
      })
    } else {
      setState('exiting')
      timerRef.current = setTimeout(
        () => setState(unmountOnExitRef.current ? 'unmounted' : 'exited'),
        getTimeout(timeoutRef.current, 'exit'),
      )
    }
  }, [show])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const isMounted = state !== 'unmounted'

  let className = ''
  if (state === 'entering') {
    className = `${classNames.enter ?? ''} ${classNames.enterActive ?? ''}`.trim()
  } else if (state === 'entered') {
    className = classNames.enterActive ?? ''
  } else if (state === 'exiting') {
    className = `${classNames.exit ?? ''} ${classNames.exitActive ?? ''}`.trim()
  }

  return { isMounted, className }
}

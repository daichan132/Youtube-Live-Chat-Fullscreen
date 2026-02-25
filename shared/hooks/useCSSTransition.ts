import { useEffect, useRef, useState } from 'react'

type TransitionClassNames = {
  enter?: string
  enterActive?: string
  exit?: string
  exitActive?: string
}

type TransitionTimeout = number | { enter?: number; exit?: number }

interface UseCSSTransitionOptions {
  in: boolean
  timeout: TransitionTimeout
  classNames: TransitionClassNames
  unmountOnExit?: boolean
}

// enter: initial state class applied (e.g., opacity-0)
// entering: target state + transition class applied (e.g., transition-opacity opacity-100)
// entered: keep target state
// exit/exiting/exited: mirror of enter phases
type TransitionState = 'unmounted' | 'exited' | 'enter' | 'entering' | 'entered' | 'exit' | 'exiting'

const getTimeout = (timeout: TransitionTimeout, phase: 'enter' | 'exit'): number =>
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
    let cancelled = false

    if (show) {
      // Phase 1: Apply enter class only (initial state, e.g., opacity-0)
      setState('enter')
      // Phase 2: After browser paints, switch to enterActive (target + transition)
      requestAnimationFrame(() => {
        if (cancelled) return
        requestAnimationFrame(() => {
          if (cancelled) return
          setState('entering')
          timerRef.current = setTimeout(() => setState('entered'), getTimeout(timeoutRef.current, 'enter'))
        })
      })
    } else {
      // Phase 1: Apply exit class only (captures current visual state)
      setState('exit')
      // Phase 2: After browser paints, switch to exitActive (target + transition)
      requestAnimationFrame(() => {
        if (cancelled) return
        requestAnimationFrame(() => {
          if (cancelled) return
          setState('exiting')
          timerRef.current = setTimeout(
            () => setState(unmountOnExitRef.current ? 'unmounted' : 'exited'),
            getTimeout(timeoutRef.current, 'exit'),
          )
        })
      })
    }

    return () => {
      cancelled = true
      clearTimeout(timerRef.current)
    }
  }, [show])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const isMounted = state !== 'unmounted'

  let className = ''
  if (state === 'enter') {
    className = classNames.enter ?? ''
  } else if (state === 'entering' || state === 'entered') {
    className = classNames.enterActive ?? ''
  } else if (state === 'exit') {
    className = classNames.exit ?? ''
  } else if (state === 'exiting') {
    className = classNames.exitActive ?? ''
  }

  return { isMounted, className }
}

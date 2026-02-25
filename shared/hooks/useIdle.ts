import { useEffect, useState } from 'react'

const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']

export const useIdle = (timeoutMs: number): boolean => {
  const [idle, setIdle] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const reset = () => {
      setIdle(false)
      clearTimeout(timer)
      timer = setTimeout(() => setIdle(true), timeoutMs)
    }

    reset()
    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, reset, { passive: true })
    }

    return () => {
      clearTimeout(timer)
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, reset)
      }
    }
  }, [timeoutMs])

  return idle
}

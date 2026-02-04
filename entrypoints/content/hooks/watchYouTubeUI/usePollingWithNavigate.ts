import { useEffect, useState } from 'react'

type UsePollingWithNavigateOptions = {
  checkFn: () => boolean
  intervalMs?: number
  /**
   * Maximum polling attempts before giving up (default: 100).
   * Only applies when stopOnSuccess is true.
   */
  maxAttempts?: number
  /**
   * If true (default), stops polling when checkFn returns true.
   * If false, continues polling indefinitely for continuous monitoring.
   * Use false when the state can change dynamically (e.g., chat availability).
   */
  stopOnSuccess?: boolean
}

export const usePollingWithNavigate = ({
  checkFn,
  intervalMs = 1000,
  maxAttempts = 100,
  stopOnSuccess = true,
}: UsePollingWithNavigateOptions) => {
  const [result, setResult] = useState(false)

  useEffect(() => {
    let interval: number | null = null

    const startCheck = () => {
      // Immediate check on start - don't wait for first interval
      const initialResult = checkFn()
      setResult(initialResult)

      // If immediate check succeeded and we should stop on success, don't start polling
      if (initialResult && stopOnSuccess) {
        return
      }

      let count = 1 // Already did one check
      if (interval) window.clearInterval(interval)
      interval = window.setInterval(() => {
        const nextResult = checkFn()
        setResult(nextResult)
        count += 1
        if (nextResult && stopOnSuccess) {
          if (interval) window.clearInterval(interval)
          interval = null
          return
        }

        // Continuous monitoring mode: keep polling regardless of result
        if (!stopOnSuccess) return

        // Standard mode: stop after maxAttempts
        if (count >= maxAttempts) {
          if (interval) window.clearInterval(interval)
          interval = null
        }
      }, intervalMs)
    }

    const handleNavigate = () => {
      startCheck()
    }

    startCheck()
    document.addEventListener('yt-navigate-finish', handleNavigate)

    return () => {
      if (interval) window.clearInterval(interval)
      document.removeEventListener('yt-navigate-finish', handleNavigate)
    }
  }, [checkFn, intervalMs, maxAttempts, stopOnSuccess])

  return result
}

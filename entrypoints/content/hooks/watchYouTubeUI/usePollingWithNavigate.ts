import { useEffect, useState } from 'react'

type UsePollingWithNavigateOptions = {
  checkFn: () => boolean
  intervalMs?: number
  maxAttempts?: number
}

export const usePollingWithNavigate = ({ checkFn, intervalMs = 1000, maxAttempts = 100 }: UsePollingWithNavigateOptions) => {
  const [result, setResult] = useState(false)

  useEffect(() => {
    let interval: number | null = null

    const startCheck = () => {
      setResult(false)
      let count = 0
      if (interval) window.clearInterval(interval)
      interval = window.setInterval(() => {
        if (checkFn()) {
          setResult(true)
          if (interval) window.clearInterval(interval)
          interval = null
          return
        }
        count += 1
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
  }, [checkFn, intervalMs, maxAttempts])

  return result
}

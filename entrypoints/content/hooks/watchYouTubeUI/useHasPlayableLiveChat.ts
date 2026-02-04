import { useCallback } from 'react'
import { hasPlayableLiveChat } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { usePollingWithNavigate } from './usePollingWithNavigate'

// Continuous monitoring interval for chat availability changes
const CONTINUOUS_MONITORING_INTERVAL_MS = 2000

export const useHasPlayableLiveChat = () => {
  const checkFn = useCallback(() => hasPlayableLiveChat(), [])
  return usePollingWithNavigate({
    checkFn,
    stopOnSuccess: false,
    intervalMs: CONTINUOUS_MONITORING_INTERVAL_MS,
  })
}

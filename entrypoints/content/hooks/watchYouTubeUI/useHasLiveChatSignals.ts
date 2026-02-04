import { useCallback } from 'react'
import { hasLiveChatSignals } from '@/entrypoints/content/utils/hasLiveChatSignals'
import { usePollingWithNavigate } from './usePollingWithNavigate'

// Longer interval for continuous monitoring to reduce CPU usage
const CONTINUOUS_MONITORING_INTERVAL_MS = 2000

export const useHasLiveChatSignals = () => {
  const checkFn = useCallback(() => hasLiveChatSignals(), [])
  return usePollingWithNavigate({
    checkFn,
    stopOnSuccess: false,
    intervalMs: CONTINUOUS_MONITORING_INTERVAL_MS,
  })
}

import { useCallback } from 'react'
import { hasLiveChatSignals } from '@/entrypoints/content/utils/hasLiveChatSignals'
import { usePollingWithNavigate } from './usePollingWithNavigate'

export const useHasLiveChatSignals = () => {
  const checkFn = useCallback(() => hasLiveChatSignals(), [])
  return usePollingWithNavigate({ checkFn })
}

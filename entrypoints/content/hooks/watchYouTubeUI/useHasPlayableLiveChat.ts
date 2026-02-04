import { useCallback } from 'react'
import { hasPlayableLiveChat } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { usePollingWithNavigate } from './usePollingWithNavigate'

export const useHasPlayableLiveChat = () => {
  const checkFn = useCallback(() => hasPlayableLiveChat(), [])
  return usePollingWithNavigate({ checkFn })
}

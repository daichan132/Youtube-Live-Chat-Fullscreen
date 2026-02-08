import { hasLiveChatSignals } from '@/entrypoints/content/utils/hasLiveChatSignals'
import { getLiveChatIframe } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { isYouTubeLiveNow } from '@/entrypoints/content/utils/isYouTubeLiveNow'
import { isLiveChatIframe, isReplayChatIframe } from '../shared/iframeDom'
import type { ChatMode } from './types'

const hasChatHost = () => Boolean(document.querySelector('ytd-live-chat-frame') || document.querySelector('#chat-container'))

export const detectChatMode = (): ChatMode => {
  if (isYouTubeLiveNow()) return 'live'

  const nativeIframe = getLiveChatIframe()
  if (nativeIframe) {
    if (isReplayChatIframe(nativeIframe)) return 'archive'
    if (isLiveChatIframe(nativeIframe)) return 'live'
  }

  if (hasLiveChatSignals()) return 'live'
  if (hasChatHost()) return 'archive'
  return 'none'
}

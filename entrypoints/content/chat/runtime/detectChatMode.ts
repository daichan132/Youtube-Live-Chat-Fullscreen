import { hasLiveChatSignals } from '@/entrypoints/content/utils/hasLiveChatSignals'
import { getLiveChatIframe } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { isYouTubeLiveNow } from '@/entrypoints/content/utils/isYouTubeLiveNow'
import { isYouTubeLiveVideo } from '@/entrypoints/content/utils/isYouTubeLiveVideo'
import { isLiveChatIframe, isReplayChatIframe } from '../shared/iframeDom'
import type { ChatMode } from './types'

const hasChatHost = () => Boolean(document.querySelector('ytd-live-chat-frame') || document.querySelector('#chat-container'))

const getExtensionIframe = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  return root?.querySelector('iframe[data-ylc-chat="true"]') as HTMLIFrameElement | null
}

const isManagedLiveExtensionIframe = (iframe: HTMLIFrameElement | null) =>
  iframe?.getAttribute('data-ylc-owned') === 'true' && iframe.getAttribute('data-ylc-source') === 'live_direct'

const isBorrowedArchiveExtensionIframe = (iframe: HTMLIFrameElement | null) =>
  Boolean(iframe && iframe.getAttribute('data-ylc-chat') === 'true' && iframe.getAttribute('data-ylc-owned') !== 'true')

export const detectChatMode = (): ChatMode => {
  const extensionIframe = getExtensionIframe()
  if (extensionIframe) {
    if (isReplayChatIframe(extensionIframe) || isBorrowedArchiveExtensionIframe(extensionIframe)) return 'archive'
    if (isLiveChatIframe(extensionIframe) || isManagedLiveExtensionIframe(extensionIframe)) return 'live'
  }

  const nativeIframe = getLiveChatIframe()
  if (nativeIframe) {
    if (isReplayChatIframe(nativeIframe)) return 'archive'
    if (isLiveChatIframe(nativeIframe)) return 'live'
  }

  if (isYouTubeLiveNow() || isYouTubeLiveVideo()) return 'live'

  // On non-live pages, generic chat signals imply replay/archive mode.
  if (hasLiveChatSignals()) return 'archive'
  if (hasChatHost()) return 'archive'
  return 'none'
}

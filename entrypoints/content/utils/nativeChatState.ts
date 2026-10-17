import { getCurrentLiveChatHost, getCurrentLiveChatIframe, getNonBlankIframeHref, isIframeForCurrentVideo } from '../chat/shared/iframeDom'
import { chatContainerProbe, nativeChatHostProbe, queryFirstProbe } from '../platform/youtube/selectorCatalog'
import { getCurrentYouTubeVideoId } from './getYouTubeVideoId'

const isChatHiddenByAttribute = (chatContainer: HTMLElement | null, chatFrameHost: HTMLElement | null) =>
  chatContainer?.hasAttribute('hidden') ||
  chatFrameHost?.hasAttribute('hidden') ||
  chatContainer?.getAttribute('aria-hidden') === 'true' ||
  chatFrameHost?.getAttribute('aria-hidden') === 'true'

const isChatHiddenByStyle = (containerStyle: CSSStyleDeclaration, hostStyle: CSSStyleDeclaration) =>
  containerStyle.display === 'none' ||
  containerStyle.visibility === 'hidden' ||
  hostStyle.display === 'none' ||
  hostStyle.visibility === 'hidden'

/** Checks whether the current video's loaded native chat is visible, regardless of its interactive size. */
export const isNativeChatOpen = () => {
  const chatContainer = queryFirstProbe<HTMLElement>(document, chatContainerProbe).element
  const chatFrameHost = getCurrentLiveChatHost() ?? queryFirstProbe<HTMLElement>(document, nativeChatHostProbe).element
  const chatFrame = getCurrentLiveChatIframe(getCurrentYouTubeVideoId())

  if (!chatFrame) return false

  if (!isIframeForCurrentVideo(chatFrame, getCurrentYouTubeVideoId())) return false
  if (!getNonBlankIframeHref(chatFrame)) return false

  if (chatContainer && chatFrameHost) {
    const isHiddenAttr = isChatHiddenByAttribute(chatContainer, chatFrameHost)
    const containerStyle = window.getComputedStyle(chatContainer)
    const hostStyle = window.getComputedStyle(chatFrameHost)
    const isHiddenStyle = isChatHiddenByStyle(containerStyle, hostStyle)
    return !isHiddenAttr && !isHiddenStyle
  }
  return false
}

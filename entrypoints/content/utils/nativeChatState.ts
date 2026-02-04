type NativeChatElements = {
  secondary: HTMLElement | null
  chatContainer: HTMLElement | null
  chatFrameHost: HTMLElement | null
  chatFrame: HTMLIFrameElement | null
}

export const getNativeChatElements = (): NativeChatElements => ({
  secondary: document.querySelector('#secondary') as HTMLElement | null,
  chatContainer: document.querySelector('#chat-container') as HTMLElement | null,
  chatFrameHost: document.querySelector('ytd-live-chat-frame') as HTMLElement | null,
  chatFrame: document.querySelector('#chatframe') as HTMLIFrameElement | null,
})

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

export const isNativeChatExpanded = () => {
  const watchFlexy = document.querySelector('ytd-watch-flexy')
  const watchGrid = document.querySelector('ytd-watch-grid')
  const hasExpandedChat =
    watchFlexy?.hasAttribute('live-chat-present-and-expanded') || watchGrid?.hasAttribute('live-chat-present-and-expanded')
  const { chatContainer, chatFrameHost } = getNativeChatElements()
  const isHidden = isChatHiddenByAttribute(chatContainer, chatFrameHost)
  const hasChatDom = Boolean(chatContainer && chatFrameHost)
  return Boolean(hasExpandedChat && hasChatDom && !isHidden)
}

export const isNativeChatUsable = () => {
  const { secondary, chatContainer, chatFrameHost, chatFrame } = getNativeChatElements()
  if (!secondary || !chatContainer || !chatFrameHost || !chatFrame) return false

  const secondaryStyle = window.getComputedStyle(secondary)
  const containerStyle = window.getComputedStyle(chatContainer)
  const hostStyle = window.getComputedStyle(chatFrameHost)

  if (isChatHiddenByStyle(containerStyle, hostStyle)) return false
  if (secondaryStyle.display === 'none' || secondaryStyle.visibility === 'hidden') return false

  const pointerBlocked =
    secondaryStyle.pointerEvents === 'none' || containerStyle.pointerEvents === 'none' || hostStyle.pointerEvents === 'none'
  if (pointerBlocked) return false

  const secondaryBox = secondary.getBoundingClientRect()
  const chatBox = chatFrameHost.getBoundingClientRect()
  const frameBox = chatFrame.getBoundingClientRect()
  return secondaryBox.width > 80 && chatBox.width > 80 && chatBox.height > 120 && frameBox.height > 120
}

export const isNativeChatOpen = () => {
  const { chatContainer, chatFrameHost } = getNativeChatElements()
  const chatFrame =
    (document.querySelector('#chatframe') as HTMLIFrameElement | null) ??
    (document.querySelector('ytd-live-chat-frame iframe.ytd-live-chat-frame') as HTMLIFrameElement | null)

  if (chatContainer && chatFrameHost) {
    const isHiddenAttr = isChatHiddenByAttribute(chatContainer, chatFrameHost)
    const containerStyle = window.getComputedStyle(chatContainer)
    const hostStyle = window.getComputedStyle(chatFrameHost)
    const isHiddenStyle = isChatHiddenByStyle(containerStyle, hostStyle)
    if (!isHiddenAttr && !isHiddenStyle) return true
  }

  if (!chatFrame) return false
  const doc = chatFrame.contentDocument ?? null
  const href = doc?.location?.href ?? chatFrame.getAttribute('src') ?? ''
  if (!href || href.includes('about:blank')) return false
  return true
}

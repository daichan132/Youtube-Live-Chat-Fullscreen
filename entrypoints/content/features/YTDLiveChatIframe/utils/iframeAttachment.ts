import type { ChatSource } from './chatSourceResolver'

const YLC_OWNED_ATTR = 'data-ylc-owned'
const YLC_CHAT_ATTR = 'data-ylc-chat'

export const getIframeDocumentHref = (iframe: HTMLIFrameElement) => {
  try {
    return iframe.contentDocument?.location?.href ?? ''
  } catch {
    return ''
  }
}

export const getNonBlankIframeHref = (iframe: HTMLIFrameElement) => {
  const docHref = getIframeDocumentHref(iframe)
  if (docHref && !docHref.includes('about:blank')) return docHref

  const srcAttr = iframe.getAttribute('src') ?? ''
  if (srcAttr && !srcAttr.includes('about:blank')) return srcAttr

  const src = iframe.src ?? ''
  if (src && !src.includes('about:blank')) return src

  return ''
}

export const isManagedLiveIframe = (iframe: HTMLIFrameElement | null) => iframe?.getAttribute(YLC_OWNED_ATTR) === 'true'

export const createManagedLiveIframe = (src: string) => {
  const iframe = document.createElement('iframe') as HTMLIFrameElement
  iframe.className = 'ytd-live-chat-frame'
  iframe.setAttribute(YLC_OWNED_ATTR, 'true')
  iframe.src = src
  return iframe
}

export const resolveSourceIframe = (source: ChatSource, currentIframe: HTMLIFrameElement | null) => {
  if (source.kind === 'archive_native') return source.iframe

  if (isManagedLiveIframe(currentIframe) && currentIframe) {
    const href = getNonBlankIframeHref(currentIframe)
    if (href === source.url) return currentIframe
  }
  return createManagedLiveIframe(source.url)
}

export const attachIframeToContainer = (container: HTMLDivElement | null, iframe: HTMLIFrameElement) => {
  if (!container) return
  iframe.setAttribute(YLC_CHAT_ATTR, 'true')
  if (iframe.parentElement !== container) {
    container.appendChild(iframe)
  }
  iframe.style.width = '100%'
  iframe.style.height = '100%'
  iframe.style.borderStyle = 'none'
  iframe.style.borderWidth = '0'
  iframe.style.outline = 'none'
}

const restoreIframeToOriginal = (iframe: HTMLIFrameElement) => {
  const ytdLiveChatFrame: HTMLElement | null = document.querySelector('ytd-live-chat-frame')
  if (!ytdLiveChatFrame) return
  if (iframe.parentElement === ytdLiveChatFrame) return
  ytdLiveChatFrame.insertBefore(iframe, ytdLiveChatFrame.firstChild)
}

export const detachAttachedIframe = (iframe: HTMLIFrameElement, container: HTMLDivElement | null) => {
  const managed = isManagedLiveIframe(iframe)
  iframe.removeAttribute(YLC_CHAT_ATTR)

  if (managed) {
    if (iframe.parentElement === container) {
      container?.removeChild(iframe)
    } else {
      iframe.remove()
    }
    iframe.removeAttribute(YLC_OWNED_ATTR)
    return
  }

  restoreIframeToOriginal(iframe)
  if (iframe.parentElement === container) {
    container?.removeChild(iframe)
  }
}

import type { ChatSource } from './chatSourceResolver'

const YLC_OWNED_ATTR = 'data-ylc-owned'
const YLC_CHAT_ATTR = 'data-ylc-chat'
const YLC_SOURCE_ATTR = 'data-ylc-source'
const YLC_SOURCE_LIVE = 'live_direct'

const borrowedIframeRestoreMap = new WeakMap<HTMLIFrameElement, { parent: ParentNode | null; nextSibling: ChildNode | null }>()

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

const isManagedIframe = (iframe: HTMLIFrameElement | null) => iframe?.getAttribute(YLC_OWNED_ATTR) === 'true'

export const isManagedLiveIframe = (iframe: HTMLIFrameElement | null) =>
  isManagedIframe(iframe) && iframe?.getAttribute(YLC_SOURCE_ATTR) === YLC_SOURCE_LIVE

export const createManagedLiveIframe = (src: string) => {
  const iframe = document.createElement('iframe') as HTMLIFrameElement
  iframe.className = 'ytd-live-chat-frame'
  iframe.setAttribute(YLC_OWNED_ATTR, 'true')
  iframe.setAttribute(YLC_SOURCE_ATTR, YLC_SOURCE_LIVE)
  iframe.src = src
  return iframe
}

const applyChatIframeStyle = (iframe: HTMLIFrameElement) => {
  iframe.style.width = '100%'
  iframe.style.height = '100%'
  iframe.style.borderStyle = 'none'
  iframe.style.borderWidth = '0'
  iframe.style.outline = 'none'
}

const rememberBorrowIframeRestoreTarget = (iframe: HTMLIFrameElement) => {
  if (borrowedIframeRestoreMap.has(iframe)) return
  borrowedIframeRestoreMap.set(iframe, {
    parent: iframe.parentNode,
    nextSibling: iframe.nextSibling,
  })
}

const restoreBorrowedIframe = (iframe: HTMLIFrameElement) => {
  const restoreTarget = borrowedIframeRestoreMap.get(iframe)
  if (restoreTarget?.parent) {
    if (restoreTarget.nextSibling && restoreTarget.parent.contains(restoreTarget.nextSibling)) {
      restoreTarget.parent.insertBefore(iframe, restoreTarget.nextSibling)
    } else {
      restoreTarget.parent.appendChild(iframe)
    }
  }
  borrowedIframeRestoreMap.delete(iframe)
}

export const resolveSourceIframe = (source: ChatSource, currentIframe: HTMLIFrameElement | null) => {
  if (source.kind === 'archive_borrow') {
    return source.iframe
  }

  if (isManagedLiveIframe(currentIframe) && currentIframe) {
    const href = getNonBlankIframeHref(currentIframe)
    if (href === source.url) return currentIframe
  }
  return createManagedLiveIframe(source.url)
}

export const attachIframeToContainer = (container: HTMLDivElement | null, iframe: HTMLIFrameElement) => {
  if (!container) return

  iframe.setAttribute(YLC_CHAT_ATTR, 'true')

  if (!isManagedIframe(iframe)) {
    rememberBorrowIframeRestoreTarget(iframe)
  }

  if (iframe.parentElement !== container) {
    container.appendChild(iframe)
  }

  applyChatIframeStyle(iframe)
}

const restoreIframeToNativeHost = (iframe: HTMLIFrameElement) => {
  const host = document.querySelector('ytd-live-chat-frame') as HTMLElement | null
  if (!host) return
  if (iframe.parentElement === host) return
  host.insertBefore(iframe, host.firstChild)
}

export const detachAttachedIframe = (iframe: HTMLIFrameElement, container: HTMLDivElement | null) => {
  const managed = isManagedIframe(iframe)
  iframe.removeAttribute(YLC_CHAT_ATTR)

  if (managed) {
    if (iframe.parentElement === container) {
      container?.removeChild(iframe)
    } else {
      iframe.remove()
    }
    iframe.removeAttribute(YLC_OWNED_ATTR)
    iframe.removeAttribute(YLC_SOURCE_ATTR)
    return
  }

  if (borrowedIframeRestoreMap.has(iframe)) {
    restoreBorrowedIframe(iframe)
    return
  }

  if (iframe.parentElement === container) {
    container?.removeChild(iframe)
  }
  restoreIframeToNativeHost(iframe)
}

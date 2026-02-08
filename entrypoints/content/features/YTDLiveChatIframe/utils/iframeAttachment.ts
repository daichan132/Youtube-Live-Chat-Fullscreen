import type { ChatSource } from '@/entrypoints/content/chat/runtime/types'
import { openArchiveNativeChatPanel } from '@/entrypoints/content/utils/nativeChat'
import { isNativeChatOpen } from '@/entrypoints/content/utils/nativeChatState'

const YLC_OWNED_ATTR = 'data-ylc-owned'
const YLC_CHAT_ATTR = 'data-ylc-chat'
const YLC_SOURCE_ATTR = 'data-ylc-source'
const YLC_SOURCE_LIVE = 'live_direct'

type BorrowedIframeStyleSnapshot = {
  width: string
  height: string
  maxWidth: string
  borderStyle: string
  borderWidth: string
  outline: string
}

type BorrowedIframeRestoreTarget = {
  parent: ParentNode | null
  nextSibling: ChildNode | null
  placeholder: Comment | null
  style: BorrowedIframeStyleSnapshot
}

const borrowedIframeRestoreMap = new WeakMap<HTMLIFrameElement, BorrowedIframeRestoreTarget>()
const pendingNativeHostRestoreIframes = new Set<HTMLIFrameElement>()
let pendingNativeHostRestoreObserver: MutationObserver | null = null

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

const syncBorrowedIframeSrcWithDocumentHref = (iframe: HTMLIFrameElement) => {
  const docHref = getIframeDocumentHref(iframe)
  if (!docHref || docHref.includes('about:blank')) return

  const currentSrc = iframe.getAttribute('src') ?? iframe.src ?? ''
  if (currentSrc && !currentSrc.includes('about:blank')) return

  iframe.src = docHref
}

const captureBorrowedIframeStyle = (iframe: HTMLIFrameElement): BorrowedIframeStyleSnapshot => ({
  width: iframe.style.width,
  height: iframe.style.height,
  maxWidth: iframe.style.maxWidth,
  borderStyle: iframe.style.borderStyle,
  borderWidth: iframe.style.borderWidth,
  outline: iframe.style.outline,
})

const restoreBorrowedIframeStyle = (iframe: HTMLIFrameElement, style: BorrowedIframeStyleSnapshot) => {
  iframe.style.width = style.width
  iframe.style.height = style.height
  iframe.style.maxWidth = style.maxWidth
  iframe.style.borderStyle = style.borderStyle
  iframe.style.borderWidth = style.borderWidth
  iframe.style.outline = style.outline
}

const rememberBorrowIframeRestoreTarget = (iframe: HTMLIFrameElement, container: HTMLDivElement) => {
  if (borrowedIframeRestoreMap.has(iframe)) return

  const parent = iframe.parentNode
  if (!parent || parent === container) return

  const placeholder = document.createComment('ylc-borrowed-iframe-anchor')
  parent.insertBefore(placeholder, iframe)

  borrowedIframeRestoreMap.set(iframe, {
    parent,
    nextSibling: iframe.nextSibling,
    placeholder,
    style: captureBorrowedIframeStyle(iframe),
  })
}

const restoreBorrowedIframe = (iframe: HTMLIFrameElement) => {
  const restoreTarget = borrowedIframeRestoreMap.get(iframe)
  if (!restoreTarget) return false

  restoreBorrowedIframeStyle(iframe, restoreTarget.style)

  const placeholderParent = restoreTarget.placeholder?.parentNode
  if (placeholderParent && (placeholderParent as Node).isConnected) {
    placeholderParent.insertBefore(iframe, restoreTarget.placeholder?.nextSibling ?? null)
    restoreTarget.placeholder?.remove()
    borrowedIframeRestoreMap.delete(iframe)
    return true
  }

  if (restoreTarget.parent && (restoreTarget.parent as Node).isConnected) {
    if (restoreTarget.nextSibling && restoreTarget.parent.contains(restoreTarget.nextSibling)) {
      restoreTarget.parent.insertBefore(iframe, restoreTarget.nextSibling)
    } else {
      restoreTarget.parent.appendChild(iframe)
    }
    restoreTarget.placeholder?.remove()
    borrowedIframeRestoreMap.delete(iframe)
    return true
  }

  restoreTarget.placeholder?.remove()
  borrowedIframeRestoreMap.delete(iframe)
  return false
}

const cleanupNativeRestoreObserverIfIdle = () => {
  if (pendingNativeHostRestoreIframes.size > 0) return

  pendingNativeHostRestoreObserver?.disconnect()
  pendingNativeHostRestoreObserver = null
}

const tryRestorePendingNativeIframes = () => {
  if (pendingNativeHostRestoreIframes.size === 0) {
    cleanupNativeRestoreObserverIfIdle()
    return
  }

  const host = document.querySelector('ytd-live-chat-frame') as HTMLElement | null
  if (!host) return

  for (const iframe of Array.from(pendingNativeHostRestoreIframes)) {
    host.insertBefore(iframe, host.firstChild)
    pendingNativeHostRestoreIframes.delete(iframe)
  }

  cleanupNativeRestoreObserverIfIdle()
}

const ensureNativeRestoreObserver = () => {
  if (pendingNativeHostRestoreObserver || !document.body) return

  pendingNativeHostRestoreObserver = new MutationObserver(() => {
    tryRestorePendingNativeIframes()
  })
  pendingNativeHostRestoreObserver.observe(document.body, {
    childList: true,
    subtree: true,
  })
}

const queueRestoreToNativeHost = (iframe: HTMLIFrameElement) => {
  pendingNativeHostRestoreIframes.add(iframe)
  iframe.remove()
  ensureNativeRestoreObserver()
  tryRestorePendingNativeIframes()
}

const cancelQueuedNativeRestore = (iframe: HTMLIFrameElement) => {
  if (!pendingNativeHostRestoreIframes.delete(iframe)) return
  cleanupNativeRestoreObserverIfIdle()
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

  cancelQueuedNativeRestore(iframe)
  iframe.setAttribute(YLC_CHAT_ATTR, 'true')

  if (!isManagedIframe(iframe)) {
    rememberBorrowIframeRestoreTarget(iframe, container)
    syncBorrowedIframeSrcWithDocumentHref(iframe)
  }

  if (iframe.parentElement !== container) {
    container.appendChild(iframe)
  }

  applyChatIframeStyle(iframe)
}

const restoreIframeToNativeHost = (iframe: HTMLIFrameElement) => {
  const host = document.querySelector('ytd-live-chat-frame') as HTMLElement | null
  if (!host) return false
  if (iframe.parentElement === host) return true
  host.insertBefore(iframe, host.firstChild)
  return true
}

const ensureNativeChatVisible = () => {
  if (isNativeChatOpen()) return
  openArchiveNativeChatPanel()
  if (isNativeChatOpen()) return
  if (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('jsdom')) return

  let attempts = 0
  const maxAttempts = 5
  const retryIntervalMs = 500
  const retryInterval = window.setInterval(() => {
    if (isNativeChatOpen()) {
      window.clearInterval(retryInterval)
      return
    }

    attempts += 1
    openArchiveNativeChatPanel()
    if (attempts >= maxAttempts) {
      window.clearInterval(retryInterval)
    }
  }, retryIntervalMs)
}

export const detachAttachedIframe = (
  iframe: HTMLIFrameElement,
  container: HTMLDivElement | null,
  options: {
    ensureNativeVisible?: boolean
  } = {},
) => {
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
    const restored = restoreBorrowedIframe(iframe)
    if (restored) {
      if (options.ensureNativeVisible) {
        ensureNativeChatVisible()
      }
      return
    }
  }

  if (iframe.parentElement === container) {
    container?.removeChild(iframe)
  }
  const restored = restoreIframeToNativeHost(iframe)
  if (!restored) {
    queueRestoreToNativeHost(iframe)
  }
  if (options.ensureNativeVisible) {
    ensureNativeChatVisible()
  }
}

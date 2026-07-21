import type { ChatSource } from '@/entrypoints/content/chat/runtime/types'
import {
  getIframeDocumentHref,
  getIframeVideoId,
  getNonBlankIframeHref,
  isChatHostForCurrentVideo,
  isManagedIframe,
  isManagedLiveIframe,
  YLC_CHAT_ATTR,
  YLC_OWNED_ATTR,
  YLC_SOURCE_ATTR,
  YLC_SOURCE_LIVE,
} from '@/entrypoints/content/chat/shared/iframeDom'
import { getVideoIdFromUrl } from '@/entrypoints/content/utils/getYouTubeVideoId'
import { openArchiveNativeChatPanel } from '@/entrypoints/content/utils/nativeChat'
import { isNativeChatOpen } from '@/entrypoints/content/utils/nativeChatState'
import {
  IFRAME_CHAT_BODY_CLASS,
  IFRAME_CHAT_ONLY_CLASS,
  IFRAME_CHAT_ONLY_HEADER_HEIGHT_VAR,
  IFRAME_CHAT_ONLY_INPUT_HEIGHT_VAR,
  IFRAME_CHAT_ONLY_INPUT_PANEL_HEIGHT_VAR,
  IFRAME_CHAT_ONLY_RESTRICTED_PARTICIPATION_HEIGHT_VAR,
  IFRAME_CHAT_ONLY_SIGN_IN_HEIGHT_VAR,
  IFRAME_CHAT_ONLY_TRANSITION_CLASS,
  IFRAME_STYLE_MARKER_ATTR,
} from '../constants/styleContract'

type BorrowedIframeStyleSnapshot = {
  width: string
  height: string
  maxWidth: string
  borderStyle: string
  borderWidth: string
  outline: string
  position: string
  zIndex: string
  backgroundColor: string
}

type BorrowedIframeRestoreTarget = {
  parent: ParentNode | null
  nextSibling: ChildNode | null
  placeholder: Comment | null
  style: BorrowedIframeStyleSnapshot
  videoId: string | null
}

const borrowedIframeRestoreMap = new WeakMap<HTMLIFrameElement, BorrowedIframeRestoreTarget>()
const pendingNativeHostRestoreIframes = new Set<HTMLIFrameElement>()
const pendingNativeHostRestoreVideoIds = new WeakMap<HTMLIFrameElement, string>()
let pendingNativeHostRestoreObserver: MutationObserver | null = null

const createManagedLiveIframe = (src: string) => {
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
  iframe.style.position = 'relative'
  iframe.style.zIndex = '1'
  iframe.style.backgroundColor = 'transparent'
  iframe.setAttribute('allowtransparency', 'true')
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
  position: iframe.style.position,
  zIndex: iframe.style.zIndex,
  backgroundColor: iframe.style.backgroundColor,
})

const restoreBorrowedIframeStyle = (iframe: HTMLIFrameElement, style: BorrowedIframeStyleSnapshot) => {
  iframe.style.width = style.width
  iframe.style.height = style.height
  iframe.style.maxWidth = style.maxWidth
  iframe.style.borderStyle = style.borderStyle
  iframe.style.borderWidth = style.borderWidth
  iframe.style.outline = style.outline
  iframe.style.position = style.position
  iframe.style.zIndex = style.zIndex
  iframe.style.backgroundColor = style.backgroundColor
}

const cleanupBorrowedIframeDocument = (iframe: HTMLIFrameElement) => {
  let doc: Document | null = null
  try {
    doc = iframe.contentDocument
  } catch {
    return
  }

  doc?.body?.classList.remove(IFRAME_CHAT_BODY_CLASS, IFRAME_CHAT_ONLY_CLASS, IFRAME_CHAT_ONLY_TRANSITION_CLASS)
  doc?.body?.style.removeProperty(IFRAME_CHAT_ONLY_HEADER_HEIGHT_VAR)
  doc?.body?.style.removeProperty(IFRAME_CHAT_ONLY_INPUT_HEIGHT_VAR)
  doc?.body?.style.removeProperty(IFRAME_CHAT_ONLY_INPUT_PANEL_HEIGHT_VAR)
  doc?.body?.style.removeProperty(IFRAME_CHAT_ONLY_RESTRICTED_PARTICIPATION_HEIGHT_VAR)
  doc?.body?.style.removeProperty(IFRAME_CHAT_ONLY_SIGN_IN_HEIGHT_VAR)
  doc?.head?.querySelector(`style[${IFRAME_STYLE_MARKER_ATTR}="true"]`)?.remove()
}

const getBorrowedIframeVideoId = (iframe: HTMLIFrameElement) => getIframeVideoId(iframe) ?? getVideoIdFromUrl()

const isBorrowedVideoCurrent = (videoId: string | null | undefined) => {
  const currentVideoId = getVideoIdFromUrl()
  return Boolean(videoId && currentVideoId && videoId === currentVideoId)
}

const discardBorrowedIframe = (iframe: HTMLIFrameElement) => {
  iframe.removeAttribute(YLC_CHAT_ATTR)
  iframe.remove()
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
    videoId: getBorrowedIframeVideoId(iframe),
  })
}

const restoreBorrowedIframe = (iframe: HTMLIFrameElement) => {
  const restoreTarget = borrowedIframeRestoreMap.get(iframe)
  if (!restoreTarget) return false

  const currentVideoId = getVideoIdFromUrl()
  if (restoreTarget.videoId && currentVideoId && restoreTarget.videoId !== currentVideoId) {
    restoreTarget.placeholder?.remove()
    borrowedIframeRestoreMap.delete(iframe)
    discardBorrowedIframe(iframe)
    return true
  }

  restoreBorrowedIframeStyle(iframe, restoreTarget.style)
  cleanupBorrowedIframeDocument(iframe)

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

const getCurrentNativeChatHost = () =>
  Array.from(document.querySelectorAll<HTMLElement>('ytd-live-chat-frame')).find(host => isChatHostForCurrentVideo(host)) ?? null

const tryRestorePendingNativeIframes = () => {
  if (pendingNativeHostRestoreIframes.size === 0) {
    cleanupNativeRestoreObserverIfIdle()
    return
  }

  const host = getCurrentNativeChatHost()
  if (!host) return

  for (const iframe of Array.from(pendingNativeHostRestoreIframes)) {
    const restoreVideoId = pendingNativeHostRestoreVideoIds.get(iframe) ?? null
    if (!isBorrowedVideoCurrent(restoreVideoId)) {
      pendingNativeHostRestoreIframes.delete(iframe)
      pendingNativeHostRestoreVideoIds.delete(iframe)
      discardBorrowedIframe(iframe)
      continue
    }
    cleanupBorrowedIframeDocument(iframe)
    host.insertBefore(iframe, host.firstChild)
    pendingNativeHostRestoreIframes.delete(iframe)
    pendingNativeHostRestoreVideoIds.delete(iframe)
  }

  cleanupNativeRestoreObserverIfIdle()
}

const ensureNativeRestoreObserver = () => {
  if (pendingNativeHostRestoreObserver || !document.body) return

  pendingNativeHostRestoreObserver = new MutationObserver(() => {
    tryRestorePendingNativeIframes()
  })
  pendingNativeHostRestoreObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['video-id'],
    childList: true,
    subtree: true,
  })
}

const queueRestoreToNativeHost = (iframe: HTMLIFrameElement, videoId: string | null) => {
  if (!videoId || !isBorrowedVideoCurrent(videoId)) {
    discardBorrowedIframe(iframe)
    return
  }
  pendingNativeHostRestoreIframes.add(iframe)
  pendingNativeHostRestoreVideoIds.set(iframe, videoId)
  iframe.remove()
  ensureNativeRestoreObserver()
  tryRestorePendingNativeIframes()
}

const cancelQueuedNativeRestore = (iframe: HTMLIFrameElement) => {
  if (!pendingNativeHostRestoreIframes.delete(iframe)) return
  pendingNativeHostRestoreVideoIds.delete(iframe)
  cleanupNativeRestoreObserverIfIdle()
}

export const resolveSourceIframe = (source: ChatSource, currentIframe: HTMLIFrameElement | null) => {
  if (source.kind === 'archive_borrow' || source.kind === 'live_borrow') {
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

const restoreIframeToNativeHost = (iframe: HTMLIFrameElement, videoId: string | null) => {
  if (!isBorrowedVideoCurrent(videoId)) return false
  const host = getCurrentNativeChatHost()
  if (!host) return false
  cleanupBorrowedIframeDocument(iframe)
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
  const borrowedVideoId = managed ? null : (borrowedIframeRestoreMap.get(iframe)?.videoId ?? getBorrowedIframeVideoId(iframe))
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
  const restored = restoreIframeToNativeHost(iframe, borrowedVideoId)
  if (!restored) {
    queueRestoreToNativeHost(iframe, borrowedVideoId)
  }
  if (options.ensureNativeVisible) {
    ensureNativeChatVisible()
  }
}

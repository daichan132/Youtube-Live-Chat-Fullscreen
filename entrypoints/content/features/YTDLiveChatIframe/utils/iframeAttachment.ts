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
import { YLC_DOCUMENT_STYLE_PROPERTIES } from '@/entrypoints/content/hooks/ylcStyleChange/ylcStyleConstants'
import { getCurrentYouTubeVideoId } from '@/entrypoints/content/utils/getYouTubeVideoId'
import { openArchiveNativeChatPanel } from '@/entrypoints/content/utils/nativeChat'
import { isNativeChatOpen } from '@/entrypoints/content/utils/nativeChatState'
import { CHAT_PANEL_LAYER } from '@/shared/constants/zIndex'
import {
  IFRAME_CHAT_BODY_CLASS,
  IFRAME_CHAT_ONLY_CLASS,
  IFRAME_CHAT_ONLY_MEASURING_CLASS,
  IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR,
  IFRAME_CHAT_ONLY_TRANSITION_CLASS,
  IFRAME_STYLE_MARKER_ATTR,
} from '../constants/styleContract'
import { uninstallMembershipFallback } from './iframeInitializer'

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
  allowTransparency: string | null
  filter: InlineStylePropertySnapshot
  webkitFilter: InlineStylePropertySnapshot
}

type InlineStylePropertySnapshot = {
  value: string
  priority: string
}

type CustomFontStyleSnapshot = {
  element: Element | null
  parent: ParentNode | null
  nextSibling: ChildNode | null
  textContent: string | null
}

type BorrowedDocumentStyleSnapshot = {
  documentElementStyles: Map<string, InlineStylePropertySnapshot>
  bodyBackdropFilter: InlineStylePropertySnapshot
  bodyWebkitBackdropFilter: InlineStylePropertySnapshot
  customFontStyle: CustomFontStyleSnapshot
}

type BorrowedIframeRestoreTarget = {
  parent: ParentNode | null
  nextSibling: ChildNode | null
  placeholder: Comment | null
  style: BorrowedIframeStyleSnapshot
  videoId: string | null
  documentStyleSnapshots: WeakMap<Document, BorrowedDocumentStyleSnapshot>
  handleDocumentLoad: () => void
}

const borrowedIframeRestoreMap = new WeakMap<HTMLIFrameElement, BorrowedIframeRestoreTarget>()
const pendingNativeHostRestoreIframes = new Set<HTMLIFrameElement>()
const pendingNativeHostRestoreVideoIds = new WeakMap<HTMLIFrameElement, string>()
const legacyChatOnlyHeightVariables = [
  '--extension-chat-only-header-height',
  '--extension-chat-only-input-panel-height',
  '--extension-chat-only-input-height',
  '--extension-chat-only-restricted-participation-height',
  '--extension-chat-only-sign-in-height',
] as const
const CUSTOM_FONT_STYLE_ID = 'custom-font-style'
let pendingNativeHostRestoreObserver: MutationObserver | null = null

const captureInlineStyleProperty = (style: CSSStyleDeclaration, property: string): InlineStylePropertySnapshot => ({
  value: style.getPropertyValue(property),
  priority: style.getPropertyPriority(property),
})

const restoreInlineStyleProperty = (style: CSSStyleDeclaration, property: string, snapshot: InlineStylePropertySnapshot) => {
  if (snapshot.value) {
    style.setProperty(property, snapshot.value, snapshot.priority)
    return
  }
  style.removeProperty(property)
}

const getIframeDocument = (iframe: HTMLIFrameElement) => {
  try {
    return iframe.contentDocument
  } catch {
    return null
  }
}

const captureBorrowedDocumentStyle = (iframe: HTMLIFrameElement, restoreTarget: BorrowedIframeRestoreTarget) => {
  const doc = getIframeDocument(iframe)
  if (!doc?.documentElement || !doc.head || !doc.body || restoreTarget.documentStyleSnapshots.has(doc)) return false

  const customFontStyle = doc.head.querySelector(`#${CUSTOM_FONT_STYLE_ID}`)
  restoreTarget.documentStyleSnapshots.set(doc, {
    documentElementStyles: new Map(
      YLC_DOCUMENT_STYLE_PROPERTIES.map(property => [property, captureInlineStyleProperty(doc.documentElement.style, property)]),
    ),
    bodyBackdropFilter: captureInlineStyleProperty(doc.body.style, 'backdrop-filter'),
    bodyWebkitBackdropFilter: captureInlineStyleProperty(doc.body.style, '-webkit-backdrop-filter'),
    customFontStyle: {
      element: customFontStyle,
      parent: customFontStyle?.parentNode ?? null,
      nextSibling: customFontStyle?.nextSibling ?? null,
      textContent: customFontStyle?.textContent ?? null,
    },
  })
  return true
}

export const captureAttachedBorrowedIframeDocumentStyle = (iframe: HTMLIFrameElement) => {
  const restoreTarget = borrowedIframeRestoreMap.get(iframe)
  if (!restoreTarget) return false
  return captureBorrowedDocumentStyle(iframe, restoreTarget)
}

const restoreCustomFontStyle = (doc: Document, snapshot: CustomFontStyleSnapshot) => {
  const current = doc.head?.querySelector(`#${CUSTOM_FONT_STYLE_ID}`) ?? null
  if (!snapshot.element) {
    current?.remove()
    return
  }

  if (current && current !== snapshot.element) current.remove()
  snapshot.element.textContent = snapshot.textContent
  if (snapshot.element.ownerDocument !== doc || snapshot.element.isConnected) return

  const parent = snapshot.parent && (snapshot.parent as Node).ownerDocument === doc ? snapshot.parent : doc.head
  if (!parent) return
  const nextSibling = snapshot.nextSibling?.parentNode === parent ? snapshot.nextSibling : null
  parent.insertBefore(snapshot.element, nextSibling)
}

const restoreBorrowedDocumentStyle = (doc: Document, snapshot: BorrowedDocumentStyleSnapshot) => {
  for (const [property, propertySnapshot] of snapshot.documentElementStyles) {
    restoreInlineStyleProperty(doc.documentElement.style, property, propertySnapshot)
  }
  restoreInlineStyleProperty(doc.body.style, 'backdrop-filter', snapshot.bodyBackdropFilter)
  restoreInlineStyleProperty(doc.body.style, '-webkit-backdrop-filter', snapshot.bodyWebkitBackdropFilter)
  restoreCustomFontStyle(doc, snapshot.customFontStyle)
}

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
  iframe.style.zIndex = String(CHAT_PANEL_LAYER.iframe)
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
  allowTransparency: iframe.getAttribute('allowtransparency'),
  filter: captureInlineStyleProperty(iframe.style, 'filter'),
  webkitFilter: captureInlineStyleProperty(iframe.style, '-webkit-filter'),
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
  if (style.allowTransparency === null) {
    iframe.removeAttribute('allowtransparency')
  } else {
    iframe.setAttribute('allowtransparency', style.allowTransparency)
  }
  restoreInlineStyleProperty(iframe.style, 'filter', style.filter)
  restoreInlineStyleProperty(iframe.style, '-webkit-filter', style.webkitFilter)
}

const cleanupBorrowedIframeDocument = (iframe: HTMLIFrameElement) => {
  const doc = getIframeDocument(iframe)
  if (!doc?.documentElement || !doc.head || !doc.body) return

  const documentStyleSnapshot = borrowedIframeRestoreMap.get(iframe)?.documentStyleSnapshots.get(doc)
  if (documentStyleSnapshot) restoreBorrowedDocumentStyle(doc, documentStyleSnapshot)
  uninstallMembershipFallback(doc)

  doc?.body?.classList.remove(
    IFRAME_CHAT_BODY_CLASS,
    IFRAME_CHAT_ONLY_CLASS,
    IFRAME_CHAT_ONLY_TRANSITION_CLASS,
    IFRAME_CHAT_ONLY_MEASURING_CLASS,
  )
  for (const target of doc?.body?.querySelectorAll<HTMLElement>(`[style*="${IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR}"]`) ?? []) {
    target.style.removeProperty(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)
  }
  for (const variable of legacyChatOnlyHeightVariables) {
    doc?.body?.style.removeProperty(variable)
  }
  doc?.head?.querySelector(`style[${IFRAME_STYLE_MARKER_ATTR}="true"]`)?.remove()
}

const getBorrowedIframeVideoId = (iframe: HTMLIFrameElement) => getIframeVideoId(iframe) ?? getCurrentYouTubeVideoId()

const isBorrowedVideoCurrent = (videoId: string | null | undefined) => {
  const currentVideoId = getCurrentYouTubeVideoId()
  return Boolean(videoId && currentVideoId && videoId === currentVideoId)
}

const discardBorrowedIframe = (iframe: HTMLIFrameElement) => {
  iframe.removeAttribute(YLC_CHAT_ATTR)
  iframe.remove()
}

const rememberBorrowIframeRestoreTarget = (iframe: HTMLIFrameElement, container: HTMLDivElement) => {
  if (borrowedIframeRestoreMap.has(iframe)) return

  const parent = iframe.parentNode
  const restoreParent = parent && parent !== container ? parent : null
  const placeholder = restoreParent ? document.createComment('ylc-borrowed-iframe-anchor') : null
  if (placeholder) restoreParent?.insertBefore(placeholder, iframe)
  const documentStyleSnapshots = new WeakMap<Document, BorrowedDocumentStyleSnapshot>()
  const restoreTarget: BorrowedIframeRestoreTarget = {
    parent: restoreParent,
    nextSibling: iframe.nextSibling,
    placeholder,
    style: captureBorrowedIframeStyle(iframe),
    videoId: getBorrowedIframeVideoId(iframe),
    documentStyleSnapshots,
    handleDocumentLoad: () => {
      captureBorrowedDocumentStyle(iframe, restoreTarget)
    },
  }
  borrowedIframeRestoreMap.set(iframe, restoreTarget)
  iframe.addEventListener('load', restoreTarget.handleDocumentLoad)
  captureBorrowedDocumentStyle(iframe, restoreTarget)
}

const forgetBorrowedIframeRestoreTarget = (iframe: HTMLIFrameElement, restoreTarget: BorrowedIframeRestoreTarget) => {
  iframe.removeEventListener('load', restoreTarget.handleDocumentLoad)
  borrowedIframeRestoreMap.delete(iframe)
}

const restoreBorrowedIframe = (iframe: HTMLIFrameElement) => {
  const restoreTarget = borrowedIframeRestoreMap.get(iframe)
  if (!restoreTarget) return false

  const currentVideoId = getCurrentYouTubeVideoId()
  if (restoreTarget.videoId && currentVideoId && restoreTarget.videoId !== currentVideoId) {
    restoreTarget.placeholder?.remove()
    forgetBorrowedIframeRestoreTarget(iframe, restoreTarget)
    discardBorrowedIframe(iframe)
    return true
  }

  restoreBorrowedIframeStyle(iframe, restoreTarget.style)
  cleanupBorrowedIframeDocument(iframe)

  const placeholderParent = restoreTarget.placeholder?.parentNode
  if (placeholderParent && (placeholderParent as Node).isConnected) {
    placeholderParent.insertBefore(iframe, restoreTarget.placeholder?.nextSibling ?? null)
    restoreTarget.placeholder?.remove()
    forgetBorrowedIframeRestoreTarget(iframe, restoreTarget)
    return true
  }

  if (restoreTarget.parent && (restoreTarget.parent as Node).isConnected) {
    if (restoreTarget.nextSibling && restoreTarget.parent.contains(restoreTarget.nextSibling)) {
      restoreTarget.parent.insertBefore(iframe, restoreTarget.nextSibling)
    } else {
      restoreTarget.parent.appendChild(iframe)
    }
    restoreTarget.placeholder?.remove()
    forgetBorrowedIframeRestoreTarget(iframe, restoreTarget)
    return true
  }

  restoreTarget.placeholder?.remove()
  forgetBorrowedIframeRestoreTarget(iframe, restoreTarget)
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
  const startingVideoId = getCurrentYouTubeVideoId()
  if (isNativeChatOpen()) return
  openArchiveNativeChatPanel()
  if (isNativeChatOpen()) return
  if (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('jsdom')) return

  let attempts = 0
  const maxAttempts = 5
  const retryIntervalMs = 500
  const retryInterval = window.setInterval(() => {
    if (getCurrentYouTubeVideoId() !== startingVideoId) {
      window.clearInterval(retryInterval)
      return
    }
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

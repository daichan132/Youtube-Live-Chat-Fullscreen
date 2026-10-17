import {
  getIframeDocumentHref,
  getIframeVideoId,
  isChatHostForCurrentVideo,
  isManagedIframe,
  YLC_CHAT_ATTR,
  YLC_OWNED_ATTR,
  YLC_SOURCE_ATTR,
  YLC_SOURCE_LIVE,
} from '@/entrypoints/content/chat/shared/iframeDom'
import type { PageTargets } from '@/entrypoints/content/platform/youtube/types'
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
import {
  type BorrowedDocumentStyleSnapshot,
  type BorrowedIframeStyleSnapshot,
  captureBorrowedDocumentStyle,
  captureBorrowedIframeStyle,
  restoreBorrowedDocumentStyle,
  restoreBorrowedIframeStyle,
} from './borrowedIframeStyleSnapshot'
import { uninstallMembershipFallback } from './iframeInitializer'

type BorrowedRestoreState = {
  originalParent: ParentNode | null
  originalNextSibling: ChildNode | null
  placeholder: Comment | null
  iframeStyle: BorrowedIframeStyleSnapshot
  sourceVideoId: string | null
  documentStyles: WeakMap<Document, BorrowedDocumentStyleSnapshot>
  loadListener: EventListener
}

export type IframeAttachmentState = 'created' | 'attached' | 'restoring' | 'released'

export type IframeAttachment = {
  readonly state: IframeAttachmentState
  attach(container: HTMLElement): void
  captureDocumentStyle(): boolean
  release(options?: { ensureNativeVisible?: boolean }, targets?: PageTargets | null): void
  reconcile(targets?: PageTargets | null): void
  abandonRestore(): void
}

const legacyChatOnlyHeightVariables = [
  '--extension-chat-only-header-height',
  '--extension-chat-only-input-panel-height',
  '--extension-chat-only-input-height',
  '--extension-chat-only-restricted-participation-height',
  '--extension-chat-only-sign-in-height',
] as const

const getIframeDocument = (iframe: HTMLIFrameElement) => {
  try {
    return iframe.contentDocument
  } catch {
    return null
  }
}

const captureDocumentStyle = (iframe: HTMLIFrameElement, restore: BorrowedRestoreState) => {
  const doc = getIframeDocument(iframe)
  if (!doc?.documentElement || !doc.head || !doc.body || restore.documentStyles.has(doc)) return false
  restore.documentStyles.set(doc, captureBorrowedDocumentStyle(doc))
  return true
}

export const createManagedLiveIframe = (src: string) => {
  const iframe = document.createElement('iframe') as HTMLIFrameElement
  iframe.className = 'ytd-live-chat-frame'
  iframe.title = 'YouTube live chat'
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
  if (!currentSrc || currentSrc.includes('about:blank')) iframe.src = docHref
}

const canPreserveIframeState = (iframe: HTMLIFrameElement, parent: ParentNode) => {
  const target = parent as ParentNode & Node & { moveBefore?: (node: Node, reference: Node | null) => void }
  return (
    iframe.isConnected && target.isConnected && iframe.ownerDocument === target.ownerDocument && typeof target.moveBefore === 'function'
  )
}

const moveBorrowedIframe = (iframe: HTMLIFrameElement, parent: ParentNode, reference: Node | null, syncBlankSrc = false) => {
  if (canPreserveIframeState(iframe, parent)) {
    // Ordinary reparenting reloads src. YouTube may have updated the loaded chat
    // by postMessage while leaving its original continuation URL unchanged.
    parent.moveBefore(iframe, reference)
  } else {
    if (syncBlankSrc) syncBorrowedIframeSrcWithDocumentHref(iframe)
    parent.insertBefore(iframe, reference)
  }
}

const cleanupBorrowedDocument = (iframe: HTMLIFrameElement, restore: BorrowedRestoreState) => {
  const doc = getIframeDocument(iframe)
  if (!doc?.documentElement || !doc.head || !doc.body) return
  const snapshot = restore.documentStyles.get(doc)
  if (snapshot) restoreBorrowedDocumentStyle(doc, snapshot)
  uninstallMembershipFallback(doc)
  doc.body.classList.remove(
    IFRAME_CHAT_BODY_CLASS,
    IFRAME_CHAT_ONLY_CLASS,
    IFRAME_CHAT_ONLY_TRANSITION_CLASS,
    IFRAME_CHAT_ONLY_MEASURING_CLASS,
  )
  for (const target of doc.body.querySelectorAll<HTMLElement>(`[style*="${IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR}"]`)) {
    target.style.removeProperty(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)
  }
  for (const variable of legacyChatOnlyHeightVariables) doc.body.style.removeProperty(variable)
  doc.head.querySelector(`style[${IFRAME_STYLE_MARKER_ATTR}="true"]`)?.remove()
}

const isVideoCurrent = (videoId: string | null | undefined) => {
  const currentVideoId = getCurrentYouTubeVideoId()
  return Boolean(videoId && currentVideoId && videoId === currentVideoId)
}

const resolveNativeHost = (targets?: PageTargets | null) => {
  const candidate = targets?.nativeChatHost
  if (candidate && isChatHostForCurrentVideo(candidate)) return candidate
  return Array.from(document.querySelectorAll<HTMLElement>('ytd-live-chat-frame')).find(isChatHostForCurrentVideo) ?? null
}

const ensureNativeChatVisible = () => {
  if (!isNativeChatOpen()) openArchiveNativeChatPanel()
}

export const createIframeAttachment = (iframe: HTMLIFrameElement, videoId: string): IframeAttachment => {
  const managed = isManagedIframe(iframe)
  let state: IframeAttachmentState = 'created'
  let restore: BorrowedRestoreState | null = null

  const finalizeBorrowedRestore = () => {
    if (!restore) return
    iframe.removeEventListener('load', restore.loadListener)
    restore.placeholder?.remove()
    restore = null
    state = 'released'
  }

  const discardBorrowed = () => {
    iframe.removeAttribute(YLC_CHAT_ATTR)
    iframe.remove()
    finalizeBorrowedRestore()
  }

  const restoreBorrowedIframe = (parent: ParentNode, reference: Node | null) => {
    try {
      moveBorrowedIframe(iframe, parent, reference)
    } catch (error) {
      if (!canPreserveIframeState(iframe, parent)) throw error
      // Recovery clears presentation and unmounts its React-owned carrier.
      // Keep the document connected outside both owners for one restore retry.
      const parking = iframe.ownerDocument.createElement('div')
      parking.hidden = true
      try {
        iframe.ownerDocument.body.append(parking)
        if (!canPreserveIframeState(iframe, parking)) throw error
        parking.moveBefore(iframe, null)
        if (!canPreserveIframeState(iframe, parent)) throw error
        parent.moveBefore(iframe, reference)
      } catch {
        // A permanently failing move cannot preserve state and remove its DOM.
        // End ownership explicitly; never reload the old continuation as success.
        discardBorrowed()
        throw error
      } finally {
        parking.remove()
      }
    }
  }

  const restoreToAvailableTarget = (targets?: PageTargets | null) => {
    if (!restore) return false
    if (!isVideoCurrent(restore.sourceVideoId)) {
      discardBorrowed()
      return true
    }
    const placeholderParent = restore.placeholder?.parentNode
    if (placeholderParent && (placeholderParent as Node).isConnected) {
      restoreBorrowedIframe(placeholderParent, restore.placeholder?.nextSibling ?? null)
      finalizeBorrowedRestore()
      return true
    }
    if (restore.originalParent && (restore.originalParent as Node).isConnected) {
      const sibling = restore.originalNextSibling
      restoreBorrowedIframe(restore.originalParent, sibling?.parentNode === restore.originalParent ? sibling : null)
      finalizeBorrowedRestore()
      return true
    }
    const host = resolveNativeHost(targets)
    if (!host) return false
    restoreBorrowedIframe(host, host.firstChild)
    finalizeBorrowedRestore()
    return true
  }

  const captureRestoreState = (nextContainer: HTMLElement) => {
    if (managed || restore) return
    const parent = iframe.parentNode
    const originalParent = parent && parent !== nextContainer ? parent : null
    const placeholder = originalParent ? document.createComment('ylc-borrowed-iframe-anchor') : null
    if (placeholder) originalParent?.insertBefore(placeholder, iframe)
    const nextRestore = {} as BorrowedRestoreState
    nextRestore.originalParent = originalParent
    nextRestore.originalNextSibling = iframe.nextSibling
    nextRestore.placeholder = placeholder
    nextRestore.iframeStyle = captureBorrowedIframeStyle(iframe)
    nextRestore.sourceVideoId = getIframeVideoId(iframe) ?? videoId
    nextRestore.documentStyles = new WeakMap()
    nextRestore.loadListener = () => captureDocumentStyle(iframe, nextRestore)
    restore = nextRestore
    iframe.addEventListener('load', nextRestore.loadListener)
    captureDocumentStyle(iframe, nextRestore)
  }

  return {
    get state() {
      return state
    },
    attach(nextContainer) {
      if (state === 'released' || state === 'restoring') return
      iframe.setAttribute(YLC_CHAT_ATTR, 'true')
      captureRestoreState(nextContainer)
      if (iframe.parentElement !== nextContainer) {
        if (managed) nextContainer.appendChild(iframe)
        else moveBorrowedIframe(iframe, nextContainer, null, true)
      }
      applyChatIframeStyle(iframe)
      state = 'attached'
    },
    captureDocumentStyle() {
      return restore ? captureDocumentStyle(iframe, restore) : false
    },
    release(options = {}, targets: PageTargets | null = null) {
      if (state === 'released' || state === 'restoring') return
      iframe.removeAttribute(YLC_CHAT_ATTR)
      if (managed) {
        iframe.remove()
        iframe.removeAttribute(YLC_OWNED_ATTR)
        iframe.removeAttribute(YLC_SOURCE_ATTR)
        state = 'released'
      } else if (restore) {
        restoreBorrowedIframeStyle(iframe, restore.iframeStyle)
        cleanupBorrowedDocument(iframe, restore)
        if (!restoreToAvailableTarget(targets)) {
          iframe.remove()
          state = 'restoring'
        }
      } else {
        iframe.remove()
        state = 'released'
      }
      if (options.ensureNativeVisible) ensureNativeChatVisible()
    },
    reconcile(targets) {
      if (state !== 'restoring') return
      restoreToAvailableTarget(targets)
    },
    abandonRestore() {
      if (state !== 'restoring') return
      discardBorrowed()
    },
  }
}

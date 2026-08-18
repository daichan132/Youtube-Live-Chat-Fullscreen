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
import { YLC_DOCUMENT_STYLE_PROPERTIES } from '@/entrypoints/content/hooks/ylcStyleChange/ylcStyleConstants'
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
import { uninstallMembershipFallback } from './iframeInitializer'

type InlineStylePropertySnapshot = { value: string; priority: string }

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
const CUSTOM_FONT_STYLE_ID = 'custom-font-style'

const captureInlineStyleProperty = (style: CSSStyleDeclaration, property: string): InlineStylePropertySnapshot => ({
  value: style.getPropertyValue(property),
  priority: style.getPropertyPriority(property),
})

const restoreInlineStyleProperty = (style: CSSStyleDeclaration, property: string, snapshot: InlineStylePropertySnapshot) => {
  if (snapshot.value) style.setProperty(property, snapshot.value, snapshot.priority)
  else style.removeProperty(property)
}

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
  const customFontStyle = doc.head.querySelector(`#${CUSTOM_FONT_STYLE_ID}`)
  restore.documentStyles.set(doc, {
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
  parent.insertBefore(snapshot.element, snapshot.nextSibling?.parentNode === parent ? snapshot.nextSibling : null)
}

const restoreDocumentStyle = (doc: Document, snapshot: BorrowedDocumentStyleSnapshot) => {
  for (const [property, value] of snapshot.documentElementStyles) {
    restoreInlineStyleProperty(doc.documentElement.style, property, value)
  }
  restoreInlineStyleProperty(doc.body.style, 'backdrop-filter', snapshot.bodyBackdropFilter)
  restoreInlineStyleProperty(doc.body.style, '-webkit-backdrop-filter', snapshot.bodyWebkitBackdropFilter)
  restoreCustomFontStyle(doc, snapshot.customFontStyle)
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

const captureIframeStyle = (iframe: HTMLIFrameElement): BorrowedIframeStyleSnapshot => ({
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

const restoreIframeStyle = (iframe: HTMLIFrameElement, style: BorrowedIframeStyleSnapshot) => {
  iframe.style.width = style.width
  iframe.style.height = style.height
  iframe.style.maxWidth = style.maxWidth
  iframe.style.borderStyle = style.borderStyle
  iframe.style.borderWidth = style.borderWidth
  iframe.style.outline = style.outline
  iframe.style.position = style.position
  iframe.style.zIndex = style.zIndex
  iframe.style.backgroundColor = style.backgroundColor
  if (style.allowTransparency === null) iframe.removeAttribute('allowtransparency')
  else iframe.setAttribute('allowtransparency', style.allowTransparency)
  restoreInlineStyleProperty(iframe.style, 'filter', style.filter)
  restoreInlineStyleProperty(iframe.style, '-webkit-filter', style.webkitFilter)
}

const cleanupBorrowedDocument = (iframe: HTMLIFrameElement, restore: BorrowedRestoreState) => {
  const doc = getIframeDocument(iframe)
  if (!doc?.documentElement || !doc.head || !doc.body) return
  const snapshot = restore.documentStyles.get(doc)
  if (snapshot) restoreDocumentStyle(doc, snapshot)
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

  const restoreToAvailableTarget = (targets?: PageTargets | null) => {
    if (!restore) return false
    if (!isVideoCurrent(restore.sourceVideoId)) {
      discardBorrowed()
      return true
    }
    const placeholderParent = restore.placeholder?.parentNode
    if (placeholderParent && (placeholderParent as Node).isConnected) {
      placeholderParent.insertBefore(iframe, restore.placeholder?.nextSibling ?? null)
      finalizeBorrowedRestore()
      return true
    }
    if (restore.originalParent && (restore.originalParent as Node).isConnected) {
      const sibling = restore.originalNextSibling
      if (sibling && restore.originalParent.contains(sibling)) restore.originalParent.insertBefore(iframe, sibling)
      else restore.originalParent.appendChild(iframe)
      finalizeBorrowedRestore()
      return true
    }
    const host = resolveNativeHost(targets)
    if (!host) return false
    host.insertBefore(iframe, host.firstChild)
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
    nextRestore.iframeStyle = captureIframeStyle(iframe)
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
      if (!managed) syncBorrowedIframeSrcWithDocumentHref(iframe)
      if (iframe.parentElement !== nextContainer) nextContainer.appendChild(iframe)
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
        restoreIframeStyle(iframe, restore.iframeStyle)
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

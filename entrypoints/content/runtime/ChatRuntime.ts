import { getIframeDocumentHref } from '@/entrypoints/content/chat/shared/iframeDom'
import { IFRAME_CHAT_BODY_CLASS } from '@/entrypoints/content/features/YTDLiveChatIframe/constants/styleContract'
import iframeStyles from '@/entrypoints/content/features/YTDLiveChatIframe/styles'
import {
  captureAttachedBorrowedIframeDocumentStyle,
  reconcilePendingNativeIframeRestores,
} from '@/entrypoints/content/features/YTDLiveChatIframe/utils/iframeAttachment'
import {
  ensureStyleInjected,
  getIframeDocument,
  installMembershipFallback,
} from '@/entrypoints/content/features/YTDLiveChatIframe/utils/iframeInitializer'
import { applyChatProfileToDocument } from '@/entrypoints/content/style/applyStylePatch'
import { openArchiveNativeChatPanel } from '@/entrypoints/content/utils/nativeChat'
import type { ChatProfile } from '@/shared/settings/model'
import { type ChatOnlyChromeIntent, createChatOnlyChromeController } from './chatOnlyChrome'
import { clearFullscreenChatLayout, setFullscreenChatLayout } from './fullscreenChatLayout'
import { createIframeLease, type IframeLease } from './iframeLease'
import { createPortalHost, type PortalHost } from './portalHost'
import { type PageSnapshot, readPageSnapshot } from './readPageSnapshot'
import { type ChatDecision, resolveChatDecision } from './resolveChatDecision'

export type RuntimeState =
  | {
      status: 'inactive'
      reason: 'disabled' | 'not-watch-page' | 'not-fullscreen'
    }
  | {
      status: 'searching'
      videoId: string | null
    }
  | {
      status: 'active'
      videoId: string
      mode: 'live' | 'archive'
      sourceKind: 'borrowed' | 'managed'
    }
  | {
      status: 'recovering'
      videoId: string
      mode: 'live' | 'archive'
      sourceKind: 'borrowed' | 'managed'
    }
  | {
      status: 'unavailable'
      videoId: string
    }

export type RuntimeView = {
  status: RuntimeState['status']
  mode: 'live' | 'archive' | null
  showSwitch: boolean
  showOverlay: boolean
  loading: boolean
  overlayRoot: ShadowRoot | null
  switchContainer: HTMLElement | null
}

export interface ChatRuntime {
  start(): void
  stop(): void
  subscribe(listener: () => void): () => void
  getSnapshot(): RuntimeView
  setEnabled(enabled: boolean): void
  setProfile(profile: ChatProfile): void
  setOverlayContainer(container: HTMLElement | null): void
  setOverlayInteraction(state: 'idle' | 'hovering-chat' | 'hovering-controls' | 'dragging' | 'resizing' | 'settings-open'): void
}

const RETRY_DELAYS_MS = [250, 500, 1000, 2000, 5000] as const
const MAX_RETRY_ATTEMPTS = 12
const ARCHIVE_OPEN_COOLDOWN_MS = 2000
const CHAT_BOUNDARY_SELECTOR =
  'ytd-watch-flexy, ytd-watch-grid, #movie_player, .ytp-right-controls, ytd-live-chat-frame, #chatframe, #chat-container, #show-hide-button, #secondary, #panels-full-bleed-container'

const initialView: RuntimeView = {
  status: 'inactive',
  mode: null,
  showSwitch: false,
  showOverlay: false,
  loading: false,
  overlayRoot: null,
  switchContainer: null,
}

const isSameView = (a: RuntimeView, b: RuntimeView) =>
  a.status === b.status &&
  a.mode === b.mode &&
  a.showSwitch === b.showSwitch &&
  a.showOverlay === b.showOverlay &&
  a.loading === b.loading &&
  a.overlayRoot === b.overlayRoot &&
  a.switchContainer === b.switchContainer

export const mutationTouchesChatBoundary = (mutation: MutationRecord) => {
  const relevant = (node: Node) =>
    node instanceof Element && (node.matches(CHAT_BOUNDARY_SELECTOR) || node.querySelector(CHAT_BOUNDARY_SELECTOR) !== null)
  if (mutation.type === 'attributes') return relevant(mutation.target)
  return relevant(mutation.target) || [...mutation.addedNodes, ...mutation.removedNodes].some(relevant)
}

const sourceMatchesLease = (decision: Extract<ChatDecision, { kind: 'available' }>, lease: IframeLease | null) => {
  if (!lease || lease.videoId !== decision.videoId) return false
  if (decision.source.kind === 'live_direct') return lease.kind === 'managed'
  return lease.kind === 'borrowed' && lease.iframe === decision.source.iframe
}

const getModeForState = (state: RuntimeState): RuntimeView['mode'] =>
  state.status === 'active' || state.status === 'recovering' ? state.mode : null

export class ChatRuntimeImpl implements ChatRuntime {
  private readonly listeners = new Set<() => void>()
  private readonly portalHost: PortalHost
  private readonly readSnapshot: (leasedIframe?: HTMLIFrameElement | null) => PageSnapshot
  private readonly resolveDecision: (snapshot: PageSnapshot) => ChatDecision
  private readonly createLease: (source: Extract<ChatDecision, { kind: 'available' }>['source'], videoId: string) => IframeLease
  private readonly chatOnlyChrome = createChatOnlyChromeController()
  private state: RuntimeState = { status: 'inactive', reason: 'disabled' }
  private view = initialView
  private started = false
  private enabled = false
  private profile: ChatProfile | null = null
  private overlayContainer: HTMLElement | null = null
  private lease: IframeLease | null = null
  private observer: MutationObserver | null = null
  private scheduledFrame: number | null = null
  private retryTimer: number | null = null
  private retryAttempts = 0
  private lastArchiveOpenAt = 0
  private loadListenerIframe: HTMLIFrameElement | null = null
  private overlayInteraction: Parameters<ChatRuntime['setOverlayInteraction']>[0] = 'idle'

  constructor(
    dependencies: Partial<{
      portalHost: PortalHost
      readSnapshot: (leasedIframe?: HTMLIFrameElement | null) => PageSnapshot
      resolveDecision: (snapshot: PageSnapshot) => ChatDecision
      createLease: (source: Extract<ChatDecision, { kind: 'available' }>['source'], videoId: string) => IframeLease
    }> = {},
  ) {
    this.portalHost = dependencies.portalHost ?? createPortalHost()
    this.readSnapshot = dependencies.readSnapshot ?? readPageSnapshot
    this.resolveDecision = dependencies.resolveDecision ?? resolveChatDecision
    this.createLease = dependencies.createLease ?? createIframeLease
  }

  start = () => {
    if (this.started) return
    this.started = true
    document.addEventListener('fullscreenchange', this.scheduleReconcile)
    document.addEventListener('yt-navigate-finish', this.handleNavigation)
    this.scheduleReconcile()
  }

  stop = () => {
    if (!this.started) return
    this.started = false
    document.removeEventListener('fullscreenchange', this.scheduleReconcile)
    document.removeEventListener('yt-navigate-finish', this.handleNavigation)
    this.disconnectObserver()
    this.cancelScheduledFrame()
    this.cancelRetry()
    this.releaseLease()
    this.portalHost.clear()
    clearFullscreenChatLayout()
    this.chatOnlyChrome.dispose()
    this.overlayContainer = null
    this.state = { status: 'inactive', reason: 'disabled' }
    this.publish(initialView)
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = () => this.view

  setEnabled = (enabled: boolean) => {
    if (this.enabled === enabled) return
    this.enabled = enabled
    this.scheduleReconcile()
  }

  setProfile = (profile: ChatProfile) => {
    if (this.profile === profile) return
    this.profile = profile
    if (this.lease) {
      this.applyCurrentProfile(this.lease.iframe)
      this.syncChatOnlyChrome()
    }
  }

  setOverlayContainer = (container: HTMLElement | null) => {
    if (this.overlayContainer === container) return
    this.overlayContainer = container
    if (container && this.lease) {
      this.lease.attach(container)
      this.initializeLease()
    }
    this.scheduleReconcile()
  }

  setOverlayInteraction = (state: Parameters<ChatRuntime['setOverlayInteraction']>[0]) => {
    if (this.overlayInteraction === state) return
    this.overlayInteraction = state
    this.syncChatOnlyChrome()
  }

  private handleNavigation = () => {
    this.retryAttempts = 0
    this.scheduleReconcile()
  }

  private scheduleReconcile = () => {
    if (!this.started || this.scheduledFrame !== null) return
    this.scheduledFrame = window.requestAnimationFrame(() => {
      this.scheduledFrame = null
      this.reconcile()
    })
  }

  private cancelScheduledFrame = () => {
    if (this.scheduledFrame === null) return
    window.cancelAnimationFrame(this.scheduledFrame)
    this.scheduledFrame = null
  }

  private ensureObserver = () => {
    if (this.observer || !document.documentElement) return
    this.observer = new MutationObserver(mutations => {
      if (mutations.some(mutationTouchesChatBoundary)) this.scheduleReconcile()
    })
    this.observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        'aria-hidden',
        'class',
        'hidden',
        'is-live-now',
        'live-chat-present',
        'live-chat-present-and-expanded',
        'src',
        'video-id',
      ],
      childList: true,
      subtree: true,
    })
  }

  private disconnectObserver = () => {
    this.observer?.disconnect()
    this.observer = null
  }

  private scheduleRetry = () => {
    if (this.retryTimer !== null) return
    if (this.retryAttempts >= MAX_RETRY_ATTEMPTS) {
      const videoId = this.state.status === 'searching' || this.state.status === 'recovering' ? this.state.videoId : null
      this.releaseLease()
      this.cancelRetry()
      if (videoId) {
        this.state = { status: 'unavailable', videoId }
        this.publishFromState(false, false)
      }
      return
    }

    const delay = RETRY_DELAYS_MS[Math.min(this.retryAttempts, RETRY_DELAYS_MS.length - 1)]
    this.retryAttempts += 1
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null
      this.reconcile()
    }, delay)
  }

  private cancelRetry = () => {
    if (this.retryTimer !== null) window.clearTimeout(this.retryTimer)
    this.retryTimer = null
  }

  private resetRetry = () => {
    this.cancelRetry()
    this.retryAttempts = 0
  }

  private releaseLease = (ensureNativeVisible = false) => {
    if (!this.lease) return
    this.removeLoadListener()
    this.lease.release({ ensureNativeVisible })
    this.lease = null
    this.chatOnlyChrome.sync(null, 'inactive')
  }

  private removeLoadListener = () => {
    if (!this.loadListenerIframe) return
    this.loadListenerIframe.removeEventListener('load', this.handleIframeLoad)
    this.loadListenerIframe = null
  }

  private handleIframeLoad = () => {
    this.retryAttempts = 0
    this.scheduleReconcile()
  }

  private installLoadListener = (iframe: HTMLIFrameElement) => {
    if (this.loadListenerIframe === iframe) return
    this.removeLoadListener()
    iframe.addEventListener('load', this.handleIframeLoad)
    this.loadListenerIframe = iframe
  }

  private applyCurrentProfile = (iframe: HTMLIFrameElement) => {
    if (!this.profile) return false
    const document = getIframeDocument(iframe)
    if (!document?.documentElement || !document.head || !document.body) return false
    try {
      if (document.location?.href === 'about:blank') return false
    } catch {
      // A real document can deny location access; contentDocument remains enough.
    }
    applyChatProfileToDocument(document, this.profile)
    return true
  }

  private initializeLease = () => {
    const lease = this.lease
    if (!lease || !this.overlayContainer) return false
    lease.attach(this.overlayContainer)
    this.installLoadListener(lease.iframe)

    const document = getIframeDocument(lease.iframe)
    if (!document?.documentElement || !document.head || !document.body) return false
    try {
      if (document.location?.href === 'about:blank' && !getIframeDocumentHref(lease.iframe)) return false
    } catch {
      // Cross-origin access can throw; the document object is still usable here.
    }

    if (lease.kind === 'borrowed') captureAttachedBorrowedIframeDocumentStyle(lease.iframe)
    ensureStyleInjected(document, iframeStyles)
    document.body.classList.add(IFRAME_CHAT_BODY_CLASS)
    installMembershipFallback(document)
    const applied = this.applyCurrentProfile(lease.iframe)
    this.syncChatOnlyChrome()
    return applied
  }

  private getChatOnlyIntent = (): ChatOnlyChromeIntent => {
    const display = this.profile?.display
    if (display?.idleVisibility !== 'always-visible' || display.contentMode !== 'messages-only') {
      return 'inactive'
    }
    if (this.overlayInteraction === 'dragging' || this.overlayInteraction === 'resizing') return 'hold'
    if (this.overlayInteraction === 'hovering-chat') return 'expanded'
    return 'collapsed'
  }

  private syncChatOnlyChrome = () => {
    this.chatOnlyChrome.sync(this.lease?.iframe ?? null, this.getChatOnlyIntent())
  }

  private ensureArchivePanelOpen = () => {
    const now = Date.now()
    if (now - this.lastArchiveOpenAt < ARCHIVE_OPEN_COOLDOWN_MS) return
    if (openArchiveNativeChatPanel()) this.lastArchiveOpenAt = now
  }

  private reconcile = () => {
    if (!this.started) return
    reconcilePendingNativeIframeRestores()
    const snapshot = this.readSnapshot(this.lease?.iframe ?? null)

    if (!snapshot.isWatchPage) {
      this.transitionInactive('not-watch-page')
      return
    }
    if (!snapshot.isFullscreen) {
      this.transitionInactive('not-fullscreen')
      return
    }

    this.ensureObserver()
    const decision = this.resolveDecision(snapshot)

    if (!this.enabled) {
      const showSwitch = decision.kind === 'available' || (decision.kind === 'pending' && decision.canToggle)
      this.transitionDisabled(snapshot, showSwitch)
      return
    }

    if (decision.kind === 'inactive') {
      this.transitionInactive(decision.reason)
      return
    }

    if (this.lease && decision.videoId !== this.lease.videoId) {
      this.releaseLease()
      this.retryAttempts = 0
    }

    if (decision.kind === 'unavailable') {
      this.releaseLease()
      this.resetRetry()
      this.state = { status: 'unavailable', videoId: decision.videoId }
      this.syncPortals(snapshot, false, false)
      return
    }

    if (decision.kind === 'pending') {
      const previousLease = this.lease
      const recoveringMode =
        previousLease && this.state.status !== 'inactive'
          ? this.state.status === 'active' || this.state.status === 'recovering'
            ? this.state.mode
            : decision.mode
          : null
      if (previousLease && decision.videoId === previousLease.videoId && recoveringMode) {
        this.state = {
          status: 'recovering',
          videoId: previousLease.videoId,
          mode: recoveringMode,
          sourceKind: previousLease.kind,
        }
      } else {
        this.state = { status: 'searching', videoId: decision.videoId }
      }
      if (decision.mode === 'archive' && decision.canToggle) this.ensureArchivePanelOpen()
      this.syncPortals(snapshot, decision.canToggle, decision.canToggle || Boolean(previousLease))
      this.scheduleRetry()
      return
    }

    if (!sourceMatchesLease(decision, this.lease)) {
      this.releaseLease()
      this.lease = this.createLease(decision.source, decision.videoId)
    }

    const initialized = this.initializeLease()
    if (!initialized) {
      this.state = this.lease
        ? {
            status: 'recovering',
            videoId: decision.videoId,
            mode: decision.mode,
            sourceKind: this.lease.kind,
          }
        : { status: 'searching', videoId: decision.videoId }
      this.syncPortals(snapshot, true, true)
      this.scheduleRetry()
      return
    }

    this.resetRetry()
    this.state = {
      status: 'active',
      videoId: decision.videoId,
      mode: decision.mode,
      sourceKind: this.lease?.kind ?? 'borrowed',
    }
    this.syncPortals(snapshot, true, true)
  }

  private transitionDisabled = (snapshot: PageSnapshot, showSwitch: boolean) => {
    const ensureNativeVisible = (this.state.status === 'active' || this.state.status === 'recovering') && this.state.mode === 'archive'
    // Remove our fullscreen footprint before restoring/clicking YouTube's
    // native archive chat. Visibility checks and the native toggle must see
    // YouTube's real layout, not the parked extension layout.
    setFullscreenChatLayout(false)
    this.releaseLease(ensureNativeVisible)
    this.resetRetry()
    this.state = { status: 'inactive', reason: 'disabled' }
    this.syncPortals(snapshot, showSwitch, false, showSwitch)
  }

  private transitionInactive = (reason: Extract<RuntimeState, { status: 'inactive' }>['reason']) => {
    const ensureNativeVisible =
      reason === 'not-fullscreen' && (this.state.status === 'active' || this.state.status === 'recovering') && this.state.mode === 'archive'
    this.releaseLease(ensureNativeVisible)
    this.resetRetry()
    this.state = { status: 'inactive', reason }
    this.disconnectObserver()
    this.portalHost.clear()
    clearFullscreenChatLayout()
    this.publish(initialView)
  }

  private syncPortals = (snapshot: PageSnapshot, showSwitch: boolean, showOverlay: boolean, keepOverlayHost = showOverlay) => {
    setFullscreenChatLayout(showOverlay && snapshot.isFullscreen)
    const targets = this.portalHost.sync({
      player: snapshot.player,
      rightControls: snapshot.rightControls,
      overlayEnabled: keepOverlayHost,
      switchEnabled: showSwitch,
    })
    this.publishFromState(showSwitch, showOverlay, targets)
  }

  private publishFromState(
    showSwitch: boolean,
    showOverlay: boolean,
    targets: { overlayRoot: ShadowRoot | null; switchContainer: HTMLElement | null } = {
      overlayRoot: null,
      switchContainer: null,
    },
  ) {
    this.publish({
      status: this.state.status,
      mode: getModeForState(this.state),
      showSwitch,
      showOverlay,
      loading: this.state.status === 'searching' || this.state.status === 'recovering',
      ...targets,
    })
  }

  private publish = (next: RuntimeView) => {
    if (isSameView(this.view, next)) return
    this.view = next
    for (const listener of this.listeners) listener()
  }
}

export const chatRuntime = new ChatRuntimeImpl()

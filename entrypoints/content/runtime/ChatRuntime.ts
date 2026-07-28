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
import {
  createInitialRuntimeModel,
  markRuntimeRetryFired,
  type RuntimeLeaseSnapshot,
  type RuntimeModel,
  type RuntimeModelAction,
  type RuntimeModelTransition,
  type RuntimeState,
  resetRuntimeRetry,
  settleRuntimeLeaseInitialization,
  stopRuntimeModel,
  transitionRuntimeModel,
} from './runtimeModel'

export type { RuntimeState } from './runtimeModel'

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

/** DOM/timer driver that observes the page and executes pure runtimeModel actions. */
export class ChatRuntimeImpl implements ChatRuntime {
  private readonly listeners = new Set<() => void>()
  private readonly portalHost: PortalHost
  private readonly readSnapshot: (leasedIframe?: HTMLIFrameElement | null) => PageSnapshot
  private readonly resolveDecision: (snapshot: PageSnapshot) => ChatDecision
  private readonly createLease: (source: Extract<ChatDecision, { kind: 'available' }>['source'], videoId: string) => IframeLease
  private readonly chatOnlyChrome = createChatOnlyChromeController()
  private model: RuntimeModel = createInitialRuntimeModel()
  private view = initialView
  private started = false
  private enabled = false
  private profile: ChatProfile | null = null
  private overlayContainer: HTMLElement | null = null
  private lease: IframeLease | null = null
  private observer: MutationObserver | null = null
  private scheduledFrame: number | null = null
  private retryTimer: number | null = null
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
    this.cancelScheduledFrame()
    this.applyModelTransition(stopRuntimeModel(this.model, this.getLeaseSnapshot()), null)
    this.chatOnlyChrome.dispose()
    this.overlayContainer = null
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
    this.applyModelActions(resetRuntimeRetry(this.model))
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

  private cancelRetry = () => {
    if (this.retryTimer !== null) window.clearTimeout(this.retryTimer)
    this.retryTimer = null
  }

  private scheduleRetry = (delayMs: number) => {
    if (this.retryTimer !== null) return
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null
      this.model = markRuntimeRetryFired(this.model)
      this.reconcile()
    }, delayMs)
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
    this.applyModelActions(resetRuntimeRetry(this.model))
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

  private getLeaseSnapshot = (): RuntimeLeaseSnapshot | null =>
    this.lease
      ? {
          videoId: this.lease.videoId,
          kind: this.lease.kind,
          iframe: this.lease.iframe,
        }
      : null

  private reconcile = () => {
    if (!this.started) return
    reconcilePendingNativeIframeRestores()
    const snapshot = this.readSnapshot(this.lease?.iframe ?? null)
    const decision = this.resolveDecision(snapshot)
    this.applyModelTransition(
      transitionRuntimeModel(this.model, {
        enabled: this.enabled,
        decision,
        lease: this.getLeaseSnapshot(),
      }),
      snapshot,
    )
  }

  private applyModelActions = (transition: RuntimeModelTransition) => {
    this.model = transition.model
    for (const action of transition.actions) {
      if (action.type === 'cancel-retry') {
        this.cancelRetry()
        continue
      }
      throw new Error(`Unexpected standalone runtime action: ${action.type}`)
    }
  }

  private applyModelTransition = (transition: RuntimeModelTransition, snapshot: PageSnapshot | null) => {
    this.model = transition.model
    const targets: { overlayRoot: ShadowRoot | null; switchContainer: HTMLElement | null } = {
      overlayRoot: null,
      switchContainer: null,
    }

    for (const action of transition.actions) {
      const initialized = this.executeModelAction(action, snapshot, targets)
      if (initialized === null) continue
      const settled = settleRuntimeLeaseInitialization(this.model, {
        decision: initialized.decision,
        lease: this.getLeaseSnapshot(),
        initialized: initialized.success,
      })
      this.applyModelTransition(settled, snapshot)
      return
    }

    this.publish({
      ...this.model.view,
      ...targets,
    })
  }

  private executeModelAction = (
    action: RuntimeModelAction,
    snapshot: PageSnapshot | null,
    targets: { overlayRoot: ShadowRoot | null; switchContainer: HTMLElement | null },
  ): { decision: Extract<ChatDecision, { kind: 'available' }>; success: boolean } | null => {
    switch (action.type) {
      case 'ensure-observer':
        this.ensureObserver()
        return null
      case 'disconnect-observer':
        this.disconnectObserver()
        return null
      case 'clear-layout':
        setFullscreenChatLayout(false)
        return null
      case 'clear-runtime':
        this.portalHost.clear()
        clearFullscreenChatLayout()
        targets.overlayRoot = null
        targets.switchContainer = null
        return null
      case 'release-lease':
        this.releaseLease(action.ensureNativeVisible)
        return null
      case 'create-lease':
        this.lease = this.createLease(action.decision.source, action.decision.videoId)
        return null
      case 'initialize-lease':
        return { decision: action.decision, success: this.initializeLease() }
      case 'cancel-retry':
        this.cancelRetry()
        return null
      case 'schedule-retry':
        this.scheduleRetry(action.delayMs)
        return null
      case 'open-archive-panel':
        this.ensureArchivePanelOpen()
        return null
      case 'sync-portals': {
        if (!snapshot) throw new Error('A page snapshot is required to synchronize runtime portals.')
        setFullscreenChatLayout(action.showOverlay && snapshot.isFullscreen)
        const nextTargets = this.portalHost.sync({
          player: snapshot.player,
          rightControls: snapshot.rightControls,
          overlayEnabled: action.keepOverlayHost,
          switchEnabled: action.showSwitch,
        })
        targets.overlayRoot = nextTargets.overlayRoot
        targets.switchContainer = nextTargets.switchContainer
        return null
      }
    }
  }

  private publish = (next: RuntimeView) => {
    if (isSameView(this.view, next)) return
    this.view = next
    for (const listener of this.listeners) listener()
  }
}

export const chatRuntime = new ChatRuntimeImpl()

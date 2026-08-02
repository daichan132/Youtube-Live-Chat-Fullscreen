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
import { createSessionScope, type SessionScope } from '../bootstrap/SessionScope'
import { collectPageObservation } from '../platform/youtube/collectPageObservation'
import { runtimeBoundarySelector } from '../platform/youtube/selectorCatalog'
import { type PageObservation, withObservationGeneration } from '../platform/youtube/types'
import { type ChatOnlyChromeIntent, createChatOnlyChromeController } from './chatOnlyChrome'
import { clearFullscreenChatLayout, setFullscreenChatLayout } from './fullscreenChatLayout'
import { createIframeLease, type IframeLease } from './iframeLease'
import { createPortalHost, type PortalHost } from './portalHost'
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
  getGeneration(): number
  setEnabled(enabled: boolean): void
  setProfile(profile: ChatProfile): void
  setOverlayContainer(container: HTMLElement | null): void
  setOverlayInteraction(state: 'idle' | 'hovering-chat' | 'hovering-controls' | 'dragging' | 'resizing' | 'settings-open'): void
}

const ARCHIVE_OPEN_COOLDOWN_MS = 2000
const CHAT_BOUNDARY_SELECTOR = runtimeBoundarySelector

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
  private readonly readObservation: (leasedIframe?: HTMLIFrameElement | null) => PageObservation
  private readonly resolveDecision: (observation: PageObservation) => ChatDecision
  private readonly createLease: (source: Extract<ChatDecision, { kind: 'available' }>['source'], videoId: string) => IframeLease
  private readonly chatOnlyChrome = createChatOnlyChromeController()
  private model: RuntimeModel = createInitialRuntimeModel()
  private view = initialView
  private started = false
  private enabled = false
  private profile: ChatProfile | null = null
  private overlayContainer: HTMLElement | null = null
  private lease: IframeLease | null = null
  private contentScope: SessionScope | null = null
  private sessionScope: SessionScope | null = null
  private generation = 0
  private sessionIdentity: { videoId: string | null; player: HTMLElement | null; fullscreenRoot: Element | null } | null = null
  private observer: MutationObserver | null = null
  private scheduledFrame: number | null = null
  private retryTimer: number | null = null
  private lastArchiveOpenAt = 0
  private loadListenerIframe: HTMLIFrameElement | null = null
  private removeLoadListenerCleanup: (() => void) | null = null
  private overlayInteraction: Parameters<ChatRuntime['setOverlayInteraction']>[0] = 'idle'

  constructor(
    dependencies: Partial<{
      portalHost: PortalHost
      readObservation: (leasedIframe?: HTMLIFrameElement | null) => PageObservation
      resolveDecision: (observation: PageObservation) => ChatDecision
      createLease: (source: Extract<ChatDecision, { kind: 'available' }>['source'], videoId: string) => IframeLease
    }> = {},
  ) {
    this.portalHost = dependencies.portalHost ?? createPortalHost()
    this.readObservation = dependencies.readObservation ?? collectPageObservation
    this.resolveDecision = dependencies.resolveDecision ?? (observation => resolveChatDecision(observation.evidence, observation.targets))
    this.createLease = dependencies.createLease ?? createIframeLease
  }

  start = () => {
    if (this.started) return
    this.started = true
    this.contentScope = createSessionScope(0)
    this.contentScope.listen(document, 'fullscreenchange', this.handlePageSignal)
    this.contentScope.listen(document, 'yt-navigate-finish', this.handleNavigation)
    this.scheduleReconcile()
  }

  stop = () => {
    if (!this.started) return
    this.started = false
    this.cancelScheduledFrame()
    this.applyModelTransition(stopRuntimeModel(this.model, this.getLeaseSnapshot()), null)
    this.disposeSessionScope()
    this.contentScope?.dispose()
    this.contentScope = null
    this.chatOnlyChrome.dispose()
    this.overlayContainer = null
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = () => this.view

  getGeneration = () => this.generation

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

  private handlePageSignal = () => {
    this.scheduleReconcile()
  }

  private scheduleReconcile = (expectedGeneration?: number) => {
    if (!this.started || this.scheduledFrame !== null) return
    const scope = this.contentScope
    if (!scope) return
    this.scheduledFrame = scope.requestAnimationFrame(() => {
      this.scheduledFrame = null
      if (expectedGeneration !== undefined && expectedGeneration !== this.sessionScope?.generation) return
      this.reconcile()
    })
  }

  private cancelScheduledFrame = () => {
    if (this.scheduledFrame === null) return
    this.contentScope?.cancelAnimationFrame(this.scheduledFrame)
    this.scheduledFrame = null
  }

  private ensureObserver = () => {
    const scope = this.sessionScope
    if (this.observer || !document.documentElement || !scope) return
    const observer = new MutationObserver(mutations => {
      if (mutations.some(mutationTouchesChatBoundary)) this.scheduleReconcile(scope.generation)
    })
    this.observer = observer
    observer.observe(document.documentElement, {
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
    scope.addCleanup(() => {
      observer.disconnect()
      if (this.observer === observer) this.observer = null
    })
  }

  private disconnectObserver = () => {
    this.observer?.disconnect()
    this.observer = null
  }

  private cancelRetry = () => {
    if (this.retryTimer !== null) this.sessionScope?.clearTimeout(this.retryTimer)
    this.retryTimer = null
  }

  private scheduleRetry = (delayMs: number) => {
    const scope = this.sessionScope
    if (this.retryTimer !== null || !scope) return
    this.retryTimer = scope.setTimeout(() => {
      if (scope !== this.sessionScope || scope.signal.aborted) return
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
    this.removeLoadListenerCleanup?.()
    this.removeLoadListenerCleanup = null
    this.loadListenerIframe = null
  }

  private installLoadListener = (iframe: HTMLIFrameElement) => {
    const scope = this.sessionScope
    if (this.loadListenerIframe === iframe || !scope) return
    this.removeLoadListener()
    this.removeLoadListenerCleanup = scope.listen(iframe, 'load', () => {
      if (scope !== this.sessionScope || scope.signal.aborted) return
      this.applyModelActions(resetRuntimeRetry(this.model))
      this.scheduleReconcile(scope.generation)
    })
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

  private ensureSessionScope = (observation: PageObservation) => {
    const { evidence, targets } = observation
    const nextIdentity = {
      videoId: evidence.videoId,
      player: targets.player,
      fullscreenRoot: evidence.fullscreen ? (targets.fullscreenRoot ?? targets.player) : null,
    }
    const changed =
      this.sessionIdentity !== null &&
      (this.sessionIdentity.videoId !== nextIdentity.videoId ||
        this.sessionIdentity.player !== nextIdentity.player ||
        this.sessionIdentity.fullscreenRoot !== nextIdentity.fullscreenRoot)

    if (changed) {
      this.disposeSessionScope()
      this.applyModelTransition(stopRuntimeModel(this.model, this.getLeaseSnapshot()), null)
    }

    if (!this.sessionScope) this.sessionScope = createSessionScope(++this.generation)
    this.sessionIdentity = nextIdentity
  }

  private disposeSessionScope = () => {
    this.sessionScope?.dispose()
    this.sessionScope = null
    this.sessionIdentity = null
    this.observer = null
    this.retryTimer = null
    this.loadListenerIframe = null
    this.removeLoadListenerCleanup = null
  }

  private reconcile = () => {
    if (!this.started) return
    reconcilePendingNativeIframeRestores()
    let observation = this.readObservation(this.lease?.iframe ?? null)
    this.ensureSessionScope(observation)
    observation = withObservationGeneration(observation, this.generation)
    const decision = this.resolveDecision(observation)
    this.applyModelTransition(
      transitionRuntimeModel(this.model, {
        enabled: this.enabled,
        decision,
        lease: this.getLeaseSnapshot(),
      }),
      observation,
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

  private applyModelTransition = (transition: RuntimeModelTransition, observation: PageObservation | null) => {
    this.model = transition.model
    const targets: { overlayRoot: ShadowRoot | null; switchContainer: HTMLElement | null } = {
      overlayRoot: null,
      switchContainer: null,
    }

    for (const action of transition.actions) {
      const initialized = this.executeModelAction(action, observation, targets)
      if (initialized === null) continue
      const settled = settleRuntimeLeaseInitialization(this.model, {
        decision: initialized.decision,
        lease: this.getLeaseSnapshot(),
        initialized: initialized.success,
      })
      this.applyModelTransition(settled, observation)
      return
    }

    this.publish({
      ...this.model.view,
      ...targets,
    })
  }

  private executeModelAction = (
    action: RuntimeModelAction,
    observation: PageObservation | null,
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
        if (!observation) throw new Error('A page observation is required to synchronize runtime portals.')
        setFullscreenChatLayout(action.showOverlay && observation.evidence.fullscreen)
        const nextTargets = this.portalHost.sync({
          player: observation.targets.player,
          rightControls: observation.targets.rightControls,
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

import { openArchiveNativeChatPanel } from '@/entrypoints/content/utils/nativeChat'
import type { ChatProfile } from '@/shared/settings/model'
import { createSessionScope, type SessionScope } from '../bootstrap/SessionScope'
import { collectPageObservation } from '../platform/youtube/collectPageObservation'
import { runtimeBoundarySelector } from '../platform/youtube/selectorCatalog'
import { type PageObservation, withObservationGeneration } from '../platform/youtube/types'
import { ResourceReconciler } from './ResourceReconciler'
import { type ChatDecision, resolveChatDecision } from './resolveChatDecision'
import type { ChatIframeLease } from './resources/ChatIframeLease'
import type { PresentationLease } from './resources/PresentationLease'
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
  private readonly resources: ResourceReconciler
  private readonly readObservation: (leasedIframe?: HTMLIFrameElement | null) => PageObservation
  private readonly resolveDecision: (observation: PageObservation) => ChatDecision
  private model: RuntimeModel = createInitialRuntimeModel()
  private view = initialView
  private started = false
  private enabled = false
  private contentScope: SessionScope | null = null
  private sessionScope: SessionScope | null = null
  private generation = 0
  private sessionIdentity: { videoId: string | null; player: HTMLElement | null; fullscreenRoot: Element | null } | null = null
  private observer: MutationObserver | null = null
  private scheduledFrame: number | null = null
  private retryTimer: number | null = null
  private lastArchiveOpenAt = 0

  constructor(
    dependencies: Partial<{
      portalHost: PresentationLease
      readObservation: (leasedIframe?: HTMLIFrameElement | null) => PageObservation
      resolveDecision: (observation: PageObservation) => ChatDecision
      createLease: (source: Extract<ChatDecision, { kind: 'available' }>['source'], videoId: string, generation: number) => ChatIframeLease
    }> = {},
  ) {
    this.resources = new ResourceReconciler({
      presentation: dependencies.portalHost,
      createLease: dependencies.createLease,
    })
    this.readObservation = dependencies.readObservation ?? collectPageObservation
    this.resolveDecision = dependencies.resolveDecision ?? (observation => resolveChatDecision(observation.evidence, observation.targets))
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
    this.resources.setProfile(profile)
  }

  setOverlayContainer = (container: HTMLElement | null) => {
    this.resources.setOverlayContainer(container)
    if (container && this.resources.lease && this.sessionScope) this.initializeLease()
    this.scheduleReconcile()
  }

  setOverlayInteraction = (state: Parameters<ChatRuntime['setOverlayInteraction']>[0]) => {
    this.resources.setInteraction(state)
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

  private initializeLease = () => {
    const scope = this.sessionScope
    if (!scope) return false
    return this.resources.initializeIframe(scope, () => {
      if (scope !== this.sessionScope || scope.signal.aborted) return
      this.applyModelActions(resetRuntimeRetry(this.model))
      this.scheduleReconcile(scope.generation)
    })
  }

  private ensureArchivePanelOpen = () => {
    const now = Date.now()
    if (now - this.lastArchiveOpenAt < ARCHIVE_OPEN_COOLDOWN_MS) return
    if (openArchiveNativeChatPanel()) this.lastArchiveOpenAt = now
  }

  private getLeaseSnapshot = (): RuntimeLeaseSnapshot | null =>
    this.resources.lease
      ? {
          videoId: this.resources.lease.videoId,
          kind: this.resources.lease.ownership,
          iframe: this.resources.lease.iframe,
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
      this.applyModelTransition(stopRuntimeModel(this.model, this.getLeaseSnapshot()), observation)
      this.disposeSessionScope()
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
  }

  private reconcile = () => {
    if (!this.started) return
    let observation = this.readObservation(this.resources.lease?.iframe ?? null)
    this.resources.reconcileRestoring(observation.targets)
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
        this.resources.clearLayout()
        return null
      case 'clear-runtime':
        this.resources.clear(observation?.targets)
        targets.overlayRoot = null
        targets.switchContainer = null
        return null
      case 'release-lease':
        this.resources.releaseIframe(observation?.targets ?? null, action.ensureNativeVisible)
        return null
      case 'create-lease':
        this.resources.createIframe(action.decision, this.generation)
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
        if (!this.sessionScope) throw new Error('A session scope is required to synchronize runtime resources.')
        const nextTargets = this.resources.syncPresentation(observation, action, this.sessionScope)
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

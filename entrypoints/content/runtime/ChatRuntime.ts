import { browser } from 'wxt/browser'
import { openArchiveNativeChatPanel } from '@/entrypoints/content/utils/nativeChat'
import type { ChatProfile } from '@/shared/settings/model'
import { createSessionScope, type SessionScope } from '../bootstrap/SessionScope'
import type { RuntimeFailureCode } from '../diagnostics/failureCodes'
import { type DiagnosticEventName, RuntimeTrace } from '../diagnostics/RuntimeTrace'
import {
  createSanitizedDiagnosticReport,
  detectBrowserFamily,
  type SanitizedDiagnosticReport,
} from '../diagnostics/sanitizeDiagnosticReport'
import { collectPageObservation } from '../platform/youtube/collectPageObservation'
import { matchesProbe, nativeChatIframeProbe, runtimeBoundarySelector } from '../platform/youtube/selectorCatalog'
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
  type RuntimeModelTransition,
  type RuntimePlan,
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
  restart(): void
  subscribe(listener: () => void): () => void
  getSnapshot(): RuntimeView
  getDiagnosticReport(): SanitizedDiagnosticReport
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

const isChatBoundaryElement = (node: Node) => node instanceof Element && node.matches(CHAT_BOUNDARY_SELECTOR)
const isChatBoundarySubtree = (node: Node) =>
  node instanceof Element && (isChatBoundaryElement(node) || node.querySelector(CHAT_BOUNDARY_SELECTOR) !== null)

export const mutationTouchesChatBoundary = (mutation: MutationRecord) => {
  if (mutation.type === 'attributes') return isChatBoundaryElement(mutation.target)
  if (isChatBoundaryElement(mutation.target)) return true
  return [...mutation.addedNodes, ...mutation.removedNodes].some(isChatBoundarySubtree)
}

/** DOM/timer driver that observes the page and executes pure runtimeModel actions. */
export class ChatRuntimeImpl implements ChatRuntime {
  private readonly listeners = new Set<() => void>()
  private readonly resources: ResourceReconciler
  private readonly readObservation: (leasedIframe?: HTMLIFrameElement | null) => PageObservation
  private readonly resolveDecision: (observation: PageObservation) => ChatDecision
  private readonly trace: RuntimeTrace
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
  private lastObservation: PageObservation | null = null
  private lastObservationSignature = ''
  private lastPlanSignature = ''
  private lastFailure: RuntimeFailureCode | undefined
  private unexpectedRecoveryAttempts = 0

  constructor(
    dependencies: Partial<{
      portalHost: PresentationLease
      readObservation: (leasedIframe?: HTMLIFrameElement | null) => PageObservation
      resolveDecision: (observation: PageObservation) => ChatDecision
      createLease: (source: Extract<ChatDecision, { kind: 'available' }>['source'], videoId: string, generation: number) => ChatIframeLease
      trace: RuntimeTrace
    }> = {},
  ) {
    this.resources = new ResourceReconciler({
      presentation: dependencies.portalHost,
      createLease: dependencies.createLease,
    })
    this.readObservation = dependencies.readObservation ?? collectPageObservation
    this.resolveDecision = dependencies.resolveDecision ?? (observation => resolveChatDecision(observation.evidence, observation.targets))
    this.trace = dependencies.trace ?? new RuntimeTrace()
  }

  start = () => {
    if (this.started) return
    this.started = true
    this.contentScope = createSessionScope(0)
    this.contentScope.listen(document, 'fullscreenchange', this.handlePageSignal)
    this.contentScope.listen(document, 'yt-navigate-finish', this.handleNavigation)
    document.addEventListener('load', this.handleResourceLoad, true)
    this.contentScope.addCleanup(() => document.removeEventListener('load', this.handleResourceLoad, true))
    this.scheduleReconcile()
  }

  stop = () => {
    if (!this.started) return
    this.started = false
    this.cancelScheduledFrame()
    this.applyModelTransition(stopRuntimeModel(this.model, this.getLeaseSnapshot()), this.lastObservation)
    this.disposeSessionScope()
    this.contentScope?.dispose()
    this.contentScope = null
  }

  restart = () => {
    if (!this.started) return
    this.cancelScheduledFrame()
    this.applyModelTransition(stopRuntimeModel(this.model, this.getLeaseSnapshot()), this.lastObservation)
    this.disposeSessionScope()
    this.lastObservation = null
    this.lastObservationSignature = ''
    this.lastPlanSignature = ''
    this.lastFailure = undefined
    this.unexpectedRecoveryAttempts = 0
    this.scheduleReconcile()
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = () => this.view

  getDiagnosticReport = (): SanitizedDiagnosticReport => {
    let extensionVersion = 'unknown'
    try {
      extensionVersion = browser.runtime.getManifest?.().version ?? extensionVersion
    } catch {
      // An invalidated extension context can no longer expose its manifest.
    }
    return createSanitizedDiagnosticReport({
      extensionVersion,
      browserFamily: detectBrowserFamily(globalThis.navigator?.userAgent ?? ''),
      generation: this.generation,
      evidence: this.lastObservation?.evidence ?? null,
      state: this.model.state,
      leases: this.resources.getDiagnosticSnapshot(),
      failureCode: this.lastFailure,
      events: this.trace.snapshot(),
    })
  }

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
    this.applyStandaloneTransition(resetRuntimeRetry(this.model))
    this.scheduleReconcile()
  }

  private handlePageSignal = () => {
    this.scheduleReconcile()
  }

  private handleResourceLoad = (event: Event) => {
    const target = event.target
    if (!(target instanceof HTMLIFrameElement) || !matchesProbe(target, nativeChatIframeProbe)) return
    this.scheduleReconcile()
  }

  private scheduleReconcile = (expectedGeneration?: number) => {
    if (!this.started || this.scheduledFrame !== null) return
    const scope = this.contentScope
    if (!scope) return
    this.scheduledFrame = scope.requestAnimationFrame(() => {
      this.scheduledFrame = null
      if (expectedGeneration !== undefined && expectedGeneration !== this.sessionScope?.generation) return
      this.reconcileSafely()
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
      this.reconcileSafely()
    }, delayMs)
  }

  private initializeLease = () => {
    const scope = this.sessionScope
    if (!scope) return false
    return this.resources.initializeIframe(scope, () => {
      if (scope !== this.sessionScope || scope.signal.aborted) return
      this.applyStandaloneTransition(resetRuntimeRetry(this.model))
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

    const created = !this.sessionScope
    if (!this.sessionScope) this.sessionScope = createSessionScope(++this.generation)
    this.sessionIdentity = nextIdentity
    return created
  }

  private disposeSessionScope = () => {
    this.sessionScope?.dispose()
    this.sessionScope = null
    this.sessionIdentity = null
    this.observer = null
    this.retryTimer = null
  }

  private reconcileSafely = () => {
    try {
      this.reconcile()
      this.unexpectedRecoveryAttempts = 0
    } catch {
      this.lastFailure = 'UNEXPECTED_RUNTIME_ERROR'
      this.recordTrace('failed', this.lastFailure)
      this.cancelScheduledFrame()
      try {
        this.resources.clear(this.lastObservation?.targets ?? null)
      } catch {
        // Recovery must remain best-effort even when a page-owned node disappeared.
      }
      this.disposeSessionScope()
      this.model = createInitialRuntimeModel()
      this.lastObservation = null
      this.lastObservationSignature = ''
      this.lastPlanSignature = ''
      this.publish(initialView)

      if (!this.started || this.unexpectedRecoveryAttempts >= 1) return
      this.unexpectedRecoveryAttempts += 1
      this.scheduleReconcile()
    }
  }

  private reconcile = () => {
    if (!this.started) return
    let observation = this.readObservation(this.resources.lease?.iframe ?? null)
    const sessionStarted = this.ensureSessionScope(observation)
    observation = withObservationGeneration(observation, this.generation)
    this.lastObservation = observation
    if (sessionStarted) this.recordTrace('session-started')
    this.recordObservation(observation)
    const decision = this.resolveDecision(observation)
    if (decision.kind === 'pending') this.lastFailure = 'CHAT_SOURCE_PENDING'
    else if (decision.kind === 'unavailable') this.lastFailure = 'CHAT_SOURCE_UNAVAILABLE'
    this.applyModelTransition(
      transitionRuntimeModel(this.model, {
        enabled: this.enabled,
        decision,
        lease: this.getLeaseSnapshot(),
      }),
      observation,
    )
  }

  private applyStandaloneTransition = (transition: RuntimeModelTransition) => {
    this.model = transition.model
    this.applyRuntimeOperations(transition.plan)
  }

  private applyModelTransition = (transition: RuntimeModelTransition, observation: PageObservation | null) => {
    const previousStatus = this.model.state.status
    const previousResources = this.resources.getDiagnosticSnapshot()
    this.model = transition.model
    this.recordPlan(transition.plan)
    this.applyRuntimeOperations(transition.plan)
    const scope = this.sessionScope
    const result = this.resources.reconcilePlan(transition.plan, observation, scope, () => {
      if (!scope || scope !== this.sessionScope || scope.signal.aborted) return
      this.applyStandaloneTransition(resetRuntimeRetry(this.model))
      this.scheduleReconcile(scope.generation)
    })
    this.recordResourceChanges(previousResources, this.resources.getDiagnosticSnapshot())
    if (result.initialization) {
      if (!result.initialization.success) this.lastFailure = 'IFRAME_DOCUMENT_NOT_READY'
      const settled = settleRuntimeLeaseInitialization(this.model, {
        decision: result.initialization.decision,
        lease: this.getLeaseSnapshot(),
        initialized: result.initialization.success,
      })
      this.applyModelTransition(settled, observation)
      return
    }

    this.updateFailure(previousStatus, observation)
    this.recordStatusTransition(previousStatus, this.model.state.status)

    this.publish({
      ...this.model.view,
      ...result.targets,
    })
  }

  private applyRuntimeOperations = (plan: RuntimePlan) => {
    if (plan.monitoring === 'active') this.ensureObserver()
    else if (plan.monitoring === 'inactive') this.disconnectObserver()
    if (plan.retry.kind === 'none') this.cancelRetry()
    else if (plan.retry.kind === 'scheduled') {
      this.scheduleRetry(plan.retry.delayMs)
      this.recordTrace('retry-scheduled', this.lastFailure)
    }
    if (plan.openArchivePanel) this.ensureArchivePanelOpen()
  }

  private publish = (next: RuntimeView) => {
    if (isSameView(this.view, next)) return
    this.view = next
    for (const listener of this.listeners) listener()
  }

  private recordTrace = (event: DiagnosticEventName, failureCode?: RuntimeFailureCode) => {
    this.trace.record({
      generation: this.generation,
      event,
      status: this.model.state.status,
      probeIds: this.lastObservation?.evidence.probeIds ?? [],
      ...(failureCode ? { failureCode } : {}),
    })
  }

  private recordObservation = (observation: PageObservation) => {
    const { evidence } = observation
    const signature = JSON.stringify({
      generation: evidence.generation,
      route: evidence.route,
      fullscreen: evidence.fullscreen,
      videoMode: evidence.videoMode,
      chatAvailability: evidence.chatAvailability,
      capabilities: evidence.capabilities,
      sourceKind: evidence.sourceKind,
      probeIds: evidence.probeIds,
    })
    if (signature === this.lastObservationSignature) return
    this.lastObservationSignature = signature
    this.recordTrace('observation-changed')
  }

  private recordPlan = (plan: RuntimePlan) => {
    const signature = JSON.stringify({
      monitoring: plan.monitoring,
      presentation: plan.presentation,
      chat: plan.chat.kind,
      layout: plan.layout,
      retry: plan.retry.kind,
      openArchivePanel: Boolean(plan.openArchivePanel),
    })
    if (signature === this.lastPlanSignature) return
    this.lastPlanSignature = signature
    this.recordTrace('plan-changed')
  }

  private recordResourceChanges = (
    previous: ReturnType<ResourceReconciler['getDiagnosticSnapshot']>,
    next: ReturnType<ResourceReconciler['getDiagnosticSnapshot']>,
  ) => {
    if (previous.chat.kind === 'none' && next.chat.kind !== 'none') this.recordTrace('lease-acquired')
    if (previous.chat.kind !== 'none' && next.chat.kind === 'none') {
      this.recordTrace(next.restoringChatCount > previous.restoringChatCount ? 'lease-restoring' : 'lease-released')
    }
    if (previous.restoringChatCount > next.restoringChatCount) this.recordTrace('lease-released')
  }

  private updateFailure = (previousStatus: RuntimeState['status'], observation: PageObservation | null) => {
    if (this.model.state.status === 'active') {
      this.lastFailure = undefined
      return
    }
    if (this.model.state.status === 'unavailable' && (previousStatus === 'searching' || previousStatus === 'recovering')) {
      this.lastFailure = 'RETRY_EXHAUSTED'
      return
    }
    const evidence = observation?.evidence
    if (!evidence) return
    if (evidence.fullscreen && !evidence.capabilities.canMountOverlay) this.lastFailure = 'PLAYER_TARGET_MISSING'
    else if (evidence.fullscreen && !evidence.capabilities.canMountPlayerSwitch) this.lastFailure = 'CONTROL_TARGET_MISSING'
    else if (evidence.chatAvailability === 'unavailable') this.lastFailure = 'CHAT_SOURCE_UNAVAILABLE'
    else if (evidence.chatAvailability === 'pending') this.lastFailure = 'CHAT_SOURCE_PENDING'
  }

  private recordStatusTransition = (previousStatus: RuntimeState['status'], nextStatus: RuntimeState['status']) => {
    if ((previousStatus === 'recovering' || previousStatus === 'searching') && nextStatus === 'active') {
      this.recordTrace('recovered')
    }
    if (previousStatus !== 'unavailable' && nextStatus === 'unavailable') {
      this.recordTrace('failed', this.lastFailure)
    }
  }
}

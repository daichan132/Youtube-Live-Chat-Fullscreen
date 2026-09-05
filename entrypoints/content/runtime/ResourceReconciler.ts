import { getIframeDocumentHref } from '@/entrypoints/content/chat/shared/iframeDom'
import { IFRAME_CHAT_BODY_CLASS } from '@/entrypoints/content/features/YTDLiveChatIframe/constants/styleContract'
import iframeStyles from '@/entrypoints/content/features/YTDLiveChatIframe/styles'
import {
  ensureStyleInjected,
  getIframeDocument,
  installMembershipFallback,
} from '@/entrypoints/content/features/YTDLiveChatIframe/utils/iframeInitializer'
import { applyChatProfileToDocument } from '@/entrypoints/content/style/applyStylePatch'
import type { ChatProfile } from '@/shared/settings/model'
import type { SessionScope } from '../bootstrap/SessionScope'
import type { PageObservation, PageTargets } from '../platform/youtube/types'
import type { ChatDecision } from './resolveChatDecision'
import { type ChatChromeLease, type ChatOnlyChromeIntent, createChatChromeLease } from './resources/ChatChromeLease'
import { type ChatIframeLease, createIframeLease } from './resources/ChatIframeLease'
import { createPlayerLayoutLease, type PlayerLayoutLease } from './resources/PlayerLayoutLease'
import { createPresentationLease, type PortalTargets, type PresentationLease } from './resources/PresentationLease'
import type { RuntimePlan } from './runtimeModel'

type AvailableDecision = Extract<ChatDecision, { kind: 'available' }>

export type ResourceDiagnosticSnapshot = {
  chat: {
    kind: ChatIframeLease['kind'] | 'none'
    state: ChatIframeLease['state'] | 'none'
  }
  presentation: 'none' | 'switch-only' | 'overlay-only' | 'overlay-and-switch'
  layout: 'none' | 'floating'
  restoringChatCount: number
}

export class ResourceReconciler {
  private readonly presentation: PresentationLease
  private readonly chatChrome: ChatChromeLease
  private readonly createLease: (source: AvailableDecision['source'], videoId: string, generation: number) => ChatIframeLease
  private readonly createLayout: (scope: SessionScope) => PlayerLayoutLease
  private readonly restoringLeases = new Set<ChatIframeLease>()
  private iframeLease: ChatIframeLease | null = null
  private layoutLease: PlayerLayoutLease | null = null
  private layoutScope: SessionScope | null = null
  private profile: ChatProfile | null = null
  private overlayContainer: HTMLElement | null = null
  private loadListenerIframe: HTMLIFrameElement | null = null
  private removeLoadListener: (() => void) | null = null
  private portalTargets: PortalTargets = { overlayRoot: null, switchContainer: null }
  private interaction: 'idle' | 'hovering-chat' | 'hovering-controls' | 'dragging' | 'resizing' | 'settings-open' = 'idle'
  private presentationState: ResourceDiagnosticSnapshot['presentation'] = 'none'
  private layoutState: ResourceDiagnosticSnapshot['layout'] = 'none'

  constructor(
    dependencies: Partial<{
      presentation: PresentationLease
      chatChrome: ChatChromeLease
      createLease: ResourceReconciler['createLease']
      createLayout: ResourceReconciler['createLayout']
    }> = {},
  ) {
    this.presentation = dependencies.presentation ?? createPresentationLease()
    this.chatChrome = dependencies.chatChrome ?? createChatChromeLease()
    this.createLease = dependencies.createLease ?? createIframeLease
    this.createLayout = dependencies.createLayout ?? createPlayerLayoutLease
  }

  get lease() {
    return this.iframeLease
  }

  getDiagnosticSnapshot = (): ResourceDiagnosticSnapshot => ({
    chat: this.iframeLease ? { kind: this.iframeLease.kind, state: this.iframeLease.state } : { kind: 'none', state: 'none' },
    presentation: this.presentationState,
    layout: this.layoutState,
    restoringChatCount: this.restoringLeases.size,
  })

  reconcilePlan(plan: RuntimePlan, observation: PageObservation | null, scope: SessionScope | null, onLoad: () => void) {
    const pageTargets = observation?.targets ?? null
    if (pageTargets) this.reconcileRestoring(pageTargets)

    if (plan.chat.kind === 'none') this.releaseIframe(pageTargets, plan.chat.ensureNativeVisible)
    if (plan.chat.kind === 'acquire' && !this.sourceMatches(plan.chat.decision)) this.releaseIframe(pageTargets)
    if (plan.monitoring === 'inactive') this.abandonRestoring()

    if (plan.layout === 'none') {
      this.layoutState = 'none'
      if (plan.monitoring === 'inactive') {
        this.layoutLease?.release()
        this.layoutLease = null
        this.layoutScope = null
      } else {
        this.layoutLease?.reconcile(false)
      }
    }
    if (plan.presentation === 'none') {
      this.presentation.clear()
      this.portalTargets = { overlayRoot: null, switchContainer: null }
      this.presentationState = 'none'
    }

    const presentationFlags = this.getPresentationFlags(plan.presentation)
    if (presentationFlags) {
      if (!observation) throw new Error('Missing page observation')
      if (plan.presentation !== 'preserve' && plan.presentation !== 'none') this.presentationState = plan.presentation
      this.portalTargets = this.presentation.sync({
        player: observation.targets.player,
        rightControls: observation.targets.rightControls,
        ...presentationFlags,
      })
    }
    if (plan.layout === 'floating') {
      if (!scope) throw new Error('Missing session scope')
      this.layoutState = 'floating'
      this.ensureLayoutLease(scope).reconcile(true)
    }

    if (plan.chat.kind !== 'acquire') return { targets: this.portalTargets, initialization: null }
    if (!this.iframeLease) this.createIframe(plan.chat.decision, scope?.generation ?? 0)
    if (!scope) throw new Error('Missing session scope')
    return {
      targets: this.portalTargets,
      initialization: {
        decision: plan.chat.decision,
        success: this.initializeIframe(scope, onLoad),
      },
    }
  }

  setProfile(profile: ChatProfile) {
    this.profile = profile
    if (this.iframeLease) {
      this.applyProfile(this.iframeLease.iframe)
      this.syncChatChrome()
    }
  }

  setOverlayContainer(container: HTMLElement | null) {
    this.overlayContainer = container
  }

  setInteraction(interaction: ResourceReconciler['interaction']) {
    this.interaction = interaction
    this.syncChatChrome()
  }

  reconcileRestoring(targets: PageTargets) {
    for (const lease of this.restoringLeases) {
      lease.reconcile(targets)
      if (lease.state === 'released') this.restoringLeases.delete(lease)
    }
  }

  createIframe(decision: AvailableDecision, generation: number) {
    this.iframeLease = this.createLease(decision.source, decision.videoId, generation)
  }

  initializeIframe(scope: SessionScope, onLoad: () => void) {
    const lease = this.iframeLease
    if (!lease || !this.overlayContainer) return false
    lease.attach(this.overlayContainer)
    if (this.loadListenerIframe !== lease.iframe) {
      this.clearLoadListener()
      this.removeLoadListener = scope.listen(lease.iframe, 'load', onLoad)
      this.loadListenerIframe = lease.iframe
    }

    const doc = getIframeDocument(lease.iframe)
    if (!doc?.documentElement || !doc.head || !doc.body) return false
    try {
      if (doc.location?.href === 'about:blank' && !getIframeDocumentHref(lease.iframe)) return false
    } catch {
      // Cross-origin access can throw; contentDocument remains enough.
    }
    if (lease.ownership === 'borrowed') lease.captureDocumentStyle()
    ensureStyleInjected(doc, iframeStyles)
    doc.body.classList.add(IFRAME_CHAT_BODY_CLASS)
    installMembershipFallback(doc)
    const applied = this.applyProfile(lease.iframe)
    this.syncChatChrome()
    return applied
  }

  releaseIframe(targets: PageTargets | null, ensureNativeVisible = false) {
    const lease = this.iframeLease
    if (!lease) return
    this.clearLoadListener()
    this.chatChrome.sync(null, 'inactive')
    lease.release({ ensureNativeVisible }, targets)
    if (lease.state === 'restoring') this.restoringLeases.add(lease)
    this.iframeLease = null
  }

  clear(targets: PageTargets | null = null) {
    // Restore the borrowed iframe before removing layout/presentation targets.
    this.releaseIframe(targets)
    this.abandonRestoring()
    this.layoutLease?.release()
    this.layoutLease = null
    this.layoutScope = null
    this.presentation.clear()
    this.portalTargets = { overlayRoot: null, switchContainer: null }
    this.presentationState = 'none'
    this.layoutState = 'none'
    this.chatChrome.release()
  }

  private abandonRestoring() {
    for (const lease of this.restoringLeases) lease.abandonRestore()
    this.restoringLeases.clear()
  }

  private ensureLayoutLease(scope: SessionScope) {
    if (this.layoutLease && this.layoutScope === scope) return this.layoutLease
    this.layoutLease?.release()
    this.layoutScope = scope
    this.layoutLease = this.createLayout(scope)
    return this.layoutLease
  }

  private sourceMatches(decision: AvailableDecision) {
    const lease = this.iframeLease
    if (!lease || lease.videoId !== decision.videoId) return false
    if (decision.source.kind === 'live_direct') return lease.ownership === 'managed'
    return lease.ownership === 'borrowed' && lease.iframe === decision.source.iframe
  }

  private getPresentationFlags(mode: RuntimePlan['presentation']) {
    if (mode === 'preserve' || mode === 'none') return null
    return {
      overlayEnabled: mode === 'overlay-only' || mode === 'overlay-and-switch',
      switchEnabled: mode === 'switch-only' || mode === 'overlay-and-switch',
    }
  }

  private clearLoadListener() {
    this.removeLoadListener?.()
    this.removeLoadListener = null
    this.loadListenerIframe = null
  }

  private applyProfile(iframe: HTMLIFrameElement) {
    if (!this.profile) return false
    const doc = getIframeDocument(iframe)
    if (!doc?.documentElement || !doc.head || !doc.body) return false
    try {
      if (doc.location?.href === 'about:blank') return false
    } catch {
      // A real document can deny location access; contentDocument remains enough.
    }
    applyChatProfileToDocument(doc, this.profile)
    return true
  }

  private getChatChromeIntent(): ChatOnlyChromeIntent {
    const display = this.profile?.display
    if (display?.idleVisibility !== 'always-visible' || display.contentMode !== 'messages-only') return 'inactive'
    if (this.interaction === 'dragging' || this.interaction === 'resizing') return 'hold'
    if (this.interaction === 'hovering-chat') return 'expanded'
    return 'collapsed'
  }

  private syncChatChrome() {
    this.chatChrome.sync(this.iframeLease?.iframe ?? null, this.getChatChromeIntent())
  }
}

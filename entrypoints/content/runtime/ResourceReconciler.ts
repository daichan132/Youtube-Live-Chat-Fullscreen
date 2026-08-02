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

type AvailableDecision = Extract<ChatDecision, { kind: 'available' }>

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
  private interaction: 'idle' | 'hovering-chat' | 'hovering-controls' | 'dragging' | 'resizing' | 'settings-open' = 'idle'

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

  clearLayout() {
    this.layoutLease?.reconcile(false)
  }

  syncPresentation(
    observation: PageObservation,
    input: { showSwitch: boolean; showOverlay: boolean; keepOverlayHost: boolean },
    scope: SessionScope,
  ): PortalTargets {
    // Acquire order is presentation -> layout -> iframe (attached by React once
    // the overlay container mounted) -> profile/style.
    const targets = this.presentation.sync({
      player: observation.targets.player,
      rightControls: observation.targets.rightControls,
      overlayEnabled: input.keepOverlayHost,
      switchEnabled: input.showSwitch,
    })
    this.ensureLayoutLease(scope).reconcile(input.showOverlay && observation.evidence.fullscreen)
    return targets
  }

  clear(targets: PageTargets | null = null) {
    // Restore the borrowed iframe before removing layout/presentation targets.
    this.releaseIframe(targets)
    this.layoutLease?.release()
    this.layoutLease = null
    this.layoutScope = null
    this.presentation.clear()
    this.chatChrome.release()
  }

  private ensureLayoutLease(scope: SessionScope) {
    if (this.layoutLease && this.layoutScope === scope) return this.layoutLease
    this.layoutLease?.release()
    this.layoutScope = scope
    this.layoutLease = this.createLayout(scope)
    return this.layoutLease
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

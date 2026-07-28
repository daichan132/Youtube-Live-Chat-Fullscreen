import { YouTubeWatchPage } from '@e2e/pages/YouTubeWatchPage'
import {
  hasNativeChatControls,
  hasPlayableChat,
  isExtensionChatLoaded,
  isExtensionOverlayRendered,
  isNativeChatUnavailable,
} from '@e2e/support/diagnostics'
import { SHADOW_HOST, switchButtonContainerSelector, switchButtonSelector } from '@e2e/utils/selectors'
import type { Page } from '@playwright/test'
import { compileYouTubeScenario } from './compiler'
import type {
  ExtensionIframeIdentity,
  NativeIframeMutation,
  NativeSlotObservation,
  ScenarioRuntimeObservation,
  YouTubeScenarioState,
} from './types'

const FIXTURE_PREFLIGHT_URL = 'https://www.youtube.com/?ylc-fixture-preflight=1'

export class YouTubeScenario {
  private readonly watchPage: YouTubeWatchPage
  private state: YouTubeScenarioState | null = null

  constructor(private readonly page: Page) {
    this.watchPage = new YouTubeWatchPage(page)
  }

  async load(state: YouTubeScenarioState) {
    this.state = state
    const compiled = compileYouTubeScenario(state)

    await this.page.route(
      FIXTURE_PREFLIGHT_URL,
      route =>
        route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: '<!doctype html><title>YouTube fixture preflight</title>',
        }),
      { times: 1 },
    )
    await this.page.goto(FIXTURE_PREFLIGHT_URL, { waitUntil: 'domcontentloaded', timeout: 10000 })
    await this.page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map(registration => registration.unregister()))
    })
    await this.page.goto('about:blank', { waitUntil: 'domcontentloaded', timeout: 10000 })

    await this.page.route(
      compiled.watchUrl,
      route =>
        route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: compiled.watchHtml,
        }),
      { times: 1 },
    )
    for (const chatRoute of compiled.chatRoutes) {
      await this.page.route(chatRoute.pattern, route =>
        route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: chatRoute.body,
        }),
      )
    }

    await this.watchPage.goto(compiled.watchUrl)
    if (state.fullscreen) await this.enterFullscreen()
  }

  enterFullscreen(options?: { timeout?: number }) {
    return this.watchPage.enterFullscreen(options)
  }

  exitFullscreen(options?: { timeout?: number }) {
    return this.watchPage.expectFullscreenExited(options)
  }

  async addNativeIframe(mutation: NativeIframeMutation) {
    const videoId = this.requireState().video.id
    await this.page.evaluate(
      ({ videoId, mutation }) => {
        const chatContainer = document.getElementById('chat-container')
        if (!chatContainer) throw new Error('YouTube scenario has no chat container.')
        const host = document.createElement('ytd-live-chat-frame')
        if (mutation.hostVideoId !== false) host.setAttribute('video-id', videoId)
        const iframe = document.createElement('iframe')
        iframe.id = 'chatframe'
        iframe.className = 'ytd-live-chat-frame'
        iframe.src =
          mutation.mode === 'archive' ? `/live_chat_replay?v=${videoId}&continuation=ylc-fixture` : `/live_chat?v=${videoId}&fixture=native`
        if (mutation.state === 'unavailable') {
          iframe.srcdoc =
            '<!doctype html><yt-live-chat-unavailable-message-renderer>Live chat replay is not available</yt-live-chat-unavailable-message-renderer>'
        }
        host.append(iframe)
        chatContainer.append(host)
      },
      { videoId, mutation },
    )
  }

  async replaceNativeIframe(mutation: NativeIframeMutation) {
    await this.page.evaluate(() => {
      document.querySelector('ytd-live-chat-frame')?.remove()
    })
    await this.addNativeIframe(mutation)
  }

  async setChatUnavailable() {
    await this.page.evaluate(() => {
      const iframe = document.querySelector<HTMLIFrameElement>('#chatframe')
      if (!iframe) throw new Error('YouTube scenario has no native chat iframe.')
      iframe.srcdoc =
        '<!doctype html><yt-live-chat-unavailable-message-renderer>Live chat replay is not available</yt-live-chat-unavailable-message-renderer>'
    })
  }

  async addNativeChatControl(label = 'Show chat') {
    await this.page.evaluate(label => {
      const chatContainer = document.getElementById('chat-container')
      if (!chatContainer) throw new Error('YouTube scenario has no chat container.')
      const showHideButton = document.createElement('div')
      showHideButton.id = 'show-hide-button'
      const button = document.createElement('button')
      button.type = 'button'
      button.setAttribute('aria-label', label)
      button.textContent = label
      showHideButton.append(button)
      chatContainer.append(showHideButton)
    }, label)
  }

  nativeIframeCount() {
    return this.page.locator('ytd-live-chat-frame > #chatframe').count()
  }

  observeExtensionIframeIdentity(): Promise<ExtensionIframeIdentity> {
    return this.page.evaluate(() => {
      const iframe = window.__ylcHelpers.getExtensionIframe()
      const overlayRoot = document.getElementById('shadow-root-live-chat')?.shadowRoot ?? null
      return {
        id: iframe?.getAttribute('id') ?? null,
        owned: iframe?.getAttribute('data-ylc-owned') ?? null,
        source: iframe?.getAttribute('data-ylc-source') ?? null,
        managedCount:
          document.querySelectorAll('iframe[data-ylc-owned="true"]').length +
          (overlayRoot?.querySelectorAll('iframe[data-ylc-owned="true"]').length ?? 0),
        nativeCount: document.querySelectorAll('ytd-live-chat-frame > #chatframe').length,
      }
    })
  }

  observeNativeSlot(): Promise<NativeSlotObservation> {
    return this.page.evaluate(() => {
      const host = document.querySelector('ytd-live-chat-frame')
      const iframe = host?.querySelector(':scope > #chatframe')
      return {
        restored: Boolean(iframe),
        attached: iframe?.getAttribute('data-ylc-chat') ?? null,
        children: Array.from(host?.children ?? []).map(child => child.id),
      }
    })
  }

  async observeRuntime(): Promise<ScenarioRuntimeObservation> {
    const [
      shadowHostCount,
      switchContainerCount,
      switchCount,
      nativeUnavailable,
      nativePlayable,
      nativeControls,
      extensionOverlayRendered,
      extensionChatLoaded,
    ] = await Promise.all([
      this.page.locator(SHADOW_HOST).count(),
      this.page.locator(switchButtonContainerSelector).count(),
      this.page.locator(switchButtonSelector).count(),
      this.page.evaluate(isNativeChatUnavailable),
      this.page.evaluate(hasPlayableChat),
      this.page.evaluate(hasNativeChatControls, switchButtonContainerSelector),
      this.page.evaluate(isExtensionOverlayRendered),
      this.page.evaluate(isExtensionChatLoaded),
    ])
    return {
      shadowHostCount,
      switchContainerCount,
      switchCount,
      nativeUnavailable,
      nativePlayable,
      nativeControls,
      extensionOverlayRendered,
      extensionChatLoaded,
    }
  }

  private requireState() {
    if (!this.state) throw new Error('Call YouTubeScenario.load() before mutating the scenario.')
    return this.state
  }
}

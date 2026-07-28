import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'
import type { Page } from '@playwright/test'

const VISUAL_VIDEO_ID = 'ylc-deterministic-surface'
const require = createRequire(import.meta.url)
const stableFonts = [400, 600, 700].map(weight => ({
  weight: String(weight),
  base64: readFileSync(require.resolve(`@fontsource/inter/files/inter-latin-${weight}-normal.woff2`)).toString('base64'),
}))

const overlayScenario = {
  video: { id: VISUAL_VIDEO_ID, title: 'Deterministic extension surface', mode: 'live' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: {
    mode: 'live',
    native: { state: 'absent' },
    response: 'playable',
  },
} satisfies YouTubeScenarioState

const STABLE_RENDERING_CSS = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
    font-family: "YLC E2E Inter", sans-serif !important;
    text-rendering: geometricPrecision !important;
  }
`

export const stabilizeExtensionRendering = async (page: Page) => {
  await page.addStyleTag({ content: STABLE_RENDERING_CSS })
  await page.evaluate(async ({ css, fonts }) => {
    const installFonts = async (targetDocument: Document) => {
      await Promise.all(
        fonts.map(async font => {
          const bytes = Uint8Array.from(atob(font.base64), character => character.charCodeAt(0))
          const face = new FontFace('YLC E2E Inter', bytes, { style: 'normal', weight: font.weight })
          await face.load()
          targetDocument.fonts.add(face)
        }),
      )
      await targetDocument.fonts.ready
    }

    await installFonts(document)
    const addStableStyle = (root: Document | ShadowRoot) => {
      const ownerDocument = root.nodeType === Node.DOCUMENT_NODE ? (root as Document) : root.ownerDocument
      if (!ownerDocument) throw new Error('Stable rendering root is detached from a document.')
      const style = ownerDocument.createElement('style')
      style.setAttribute('data-ylc-e2e-stable-rendering', 'true')
      style.textContent = css
      if (root.nodeType === Node.DOCUMENT_NODE) {
        ;((root as Document).head ?? (root as Document).documentElement).append(style)
      } else {
        root.append(style)
      }
    }

    const shadowRoot = document.getElementById('shadow-root-live-chat')?.shadowRoot
    if (shadowRoot) addStableStyle(shadowRoot)

    const iframe = window.__ylcHelpers?.getExtensionIframe()
    const iframeDocument = iframe?.contentDocument
    if (!iframeDocument) return
    await installFonts(iframeDocument)
    addStableStyle(iframeDocument)
    const itemList = iframeDocument.querySelector('yt-live-chat-item-list-renderer')
    if (!itemList) return
    itemList.innerHTML = `
      <div id="items" style="display:flex;flex-direction:column;gap:10px;padding:16px;color:#202124">
        <yt-live-chat-text-message-renderer style="display:flex;align-items:center;gap:8px">
          <span id="author-photo" aria-hidden="true" style="width:24px;height:24px;border-radius:50%;background:#7c3aed"></span>
          <span id="author-name" style="font-weight:700">Aiko</span>
          <span id="message">Great stream!</span>
        </yt-live-chat-text-message-renderer>
        <yt-live-chat-text-message-renderer style="display:flex;align-items:center;gap:8px">
          <span id="author-photo" aria-hidden="true" style="width:24px;height:24px;border-radius:50%;background:#0891b2"></span>
          <span id="author-name" style="font-weight:700">Mina</span>
          <span id="message">Hello from the fixture chat</span>
        </yt-live-chat-text-message-renderer>
        <yt-live-chat-text-message-renderer style="display:flex;align-items:center;gap:8px">
          <span id="author-photo" aria-hidden="true" style="width:24px;height:24px;border-radius:50%;background:#ea580c"></span>
          <span id="author-name" style="font-weight:700">Ren</span>
          <span id="message">The overlay looks good</span>
        </yt-live-chat-text-message-renderer>
      </div>
    `
  }, { css: STABLE_RENDERING_CSS, fonts: stableFonts })
}

export const openDeterministicOverlay = async (page: Page) => {
  const scenario = new YouTubeScenario(page)
  const overlay = new ExtensionOverlay(page)
  await scenario.load(overlayScenario)
  await scenario.enterFullscreen()
  await overlay.expectSwitchReady({ timeout: 12000 })
  await overlay.expectChatLoaded({ timeout: 12000 })
  await stabilizeExtensionRendering(page)
  return { scenario, overlay }
}

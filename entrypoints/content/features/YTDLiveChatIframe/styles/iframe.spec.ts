// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { iframeStyleModuleNames } from './index'

const stylesDirectory = resolve(process.cwd(), 'entrypoints/content/features/YTDLiveChatIframe/styles')
const readStyleModule = (moduleName: (typeof iframeStyleModuleNames)[number]) => readFileSync(resolve(stylesDirectory, moduleName), 'utf8')
const styleModules = Object.fromEntries(iframeStyleModuleNames.map(moduleName => [moduleName, readStyleModule(moduleName)])) as Record<
  (typeof iframeStyleModuleNames)[number],
  string
>
const iframeStyles = iframeStyleModuleNames.map(moduleName => styleModules[moduleName]).join('')
const iframeStylesWithoutComments = iframeStyles.replace(/\/\*[\s\S]*?\*\//g, '')

const directDisplayNoneSelectors = () =>
  Array.from(iframeStylesWithoutComments.matchAll(/([^{}]+)\{\s*[^{}]*display\s*:\s*none(?:\s*!important)?\s*;[^{}]*\}/g)).map(match =>
    match[1].replace(/\s+/g, ' ').trim(),
  )

const mountStyleFixture = (styles: string, markup: string) => {
  document.head.replaceChildren()
  document.body.className = 'custom-yt-app-live-chat-extension'
  document.body.innerHTML = markup
  const style = document.createElement('style')
  style.textContent = styles
  document.head.append(style)
}

const getComputedColor = (selector: string) => {
  const element = document.querySelector(selector)
  if (!element) throw new Error(`Missing style fixture element: ${selector}`)
  return getComputedStyle(element).color
}

describe('iframe styles contract', () => {
  it('assembles responsibility modules in cascade order', () => {
    expect(iframeStyleModuleNames).toEqual([
      'tokens.css',
      'frame.css',
      'core-theme.css',
      'menus.css',
      'banners.css',
      'leaderboard.css',
      'composer.css',
      'chat-only.css',
      'monetization.css',
      'message-layout.css',
    ])
  })

  it('keeps direct display none limited to the native close control', () => {
    expect(directDisplayNoneSelectors()).toEqual(['body.custom-yt-app-live-chat-extension yt-live-chat-header-renderer > #close-button'])
  })

  it('keeps the transparent iframe body covering the viewport', () => {
    expect(iframeStyles).toContain(
      'body.custom-yt-app-live-chat-extension {\n  margin: 0;\n  min-height: 100vh;\n  position: relative;\n  width: 100%;\n}',
    )
  })

  it('removes the native chat edge shimmer from both clipped chat-only edges', () => {
    expect(iframeStyles).toContain('yt-live-chat-renderer #chat::before')
    expect(iframeStyles).toContain('yt-live-chat-renderer #chat::after')
    expect(iframeStyles).toContain('background-image: none !important;')
    expect(iframeStyles).toContain('animation: none !important;')
  })

  it('does not suppress the live viewer leaderboard entry', () => {
    expect(iframeStyles).not.toContain('ytvl-live-viewer-leaderboard-chat-entry-point-view-model')
  })

  it('keeps header SVG controls themed while limiting the native-color exception to the Top fans crown', () => {
    expect(styleModules['core-theme.css']).not.toContain('[style*="color:"]')
    expect(styleModules['core-theme.css']).toContain(
      '#viewer-leaderboard-entry-point\n  .ytSpecButtonShapeNextIcon\n  .ytSpecIconShapeHost {\n  color: inherit;\n}',
    )
    expect(styleModules['core-theme.css']).toContain('yt-live-chat-header-renderer .ytSpecIconShapeHost')

    const coreThemeStyles = styleModules['core-theme.css'].replaceAll('var(--extension-yt-live-font-color)', 'rgb(18, 52, 86)')
    mountStyleFixture(
      coreThemeStyles,
      `
        <yt-live-chat-header-renderer>
          <button aria-label="More options">
            <span class="ytSpecButtonShapeNextIcon">
              <span id="neutral-icon" class="ytSpecIconShapeHost"></span>
            </span>
          </button>
          <div id="viewer-leaderboard-entry-point">
            <button aria-label="0 XP">
              <span class="ytSpecButtonShapeNextIcon" style="color: rgb(123, 62, 219)">
                <span id="top-fans-crown" class="ytSpecIconShapeHost"></span>
              </span>
            </button>
          </div>
        </yt-live-chat-header-renderer>
      `,
    )

    expect(getComputedColor('#neutral-icon')).toBe('rgb(18, 52, 86)')
    expect(getComputedColor('#top-fans-crown')).toBe('rgb(123, 62, 219)')
  })

  it('themes top fan leaderboard text and icons without hiding its entry point', () => {
    expect(iframeStyles).toContain('ytd-engagement-panel-section-list-renderer[target-id="PAlive_viewer_leaderboard"]')
    expect(iframeStyles).toContain('ytd-engagement-panel-title-header-renderer')
    expect(iframeStyles).toContain('.ytvlLiveLeaderboardItemViewModelRankNumber')
    expect(iframeStyles).toContain('.ytvlLiveLeaderboardItemChannelContentViewModelChannelName')
    expect(iframeStyles).toContain('.ytvlLiveLeaderboardItemViewModelPoints')
    expect(iframeStyles).toContain('.ytvlLiveLeaderboardItemActionContentViewModelActionDescription')
    expect(iframeStyles).toContain('color: var(--extension-yt-live-font-color) !important;')
    expect(iframeStyles).toContain('color: var(--extension-yt-live-secondary-font-color) !important;')
    expect(iframeStyles).toContain('fill: currentColor !important;')
    expect(iframeStyles).not.toContain('ytvl-live-viewer-leaderboard-chat-entry-point-view-model')
    expect(styleModules['leaderboard.css']).not.toContain(
      ':where(ytd-engagement-panel-section-list-renderer[target-id="PAlive_viewer_leaderboard"]),',
    )
    expect(styleModules['leaderboard.css']).not.toContain(
      ':where(ytd-engagement-panel-section-list-renderer[target-id="PAlive_viewer_leaderboard"] ytvl-live-leaderboard-item-view-model)',
    )
  })

  it('animates only the outer chat chrome boundaries inside the iframe', () => {
    expect(iframeStyles).toContain('will-change: height, opacity, transform;')
    expect(iframeStyles).toContain('transition-property: height, opacity, transform, margin, padding, border-width !important;')
    expect(iframeStyles).toContain('transition-duration: 260ms, 260ms, 260ms, 260ms, 260ms, 260ms !important;')
    expect(iframeStyles).toContain('body.custom-yt-app-live-chat-extension.chat-only-transition-ready yt-live-chat-header-renderer')
    expect(iframeStyles).toContain('body.custom-yt-app-live-chat-extension.chat-only-transition-ready #input-panel')
    expect(iframeStyles).toContain('body.custom-yt-app-live-chat-extension.chat-only-transition-ready:not(:has(#input-panel))')
    expect(iframeStyles).toContain('height: var(--extension-chat-only-target-height) !important;')
    expect(iframeStyles).toContain('body.custom-yt-app-live-chat-extension.chat-only-measuring yt-live-chat-header-renderer')
    expect(iframeStyles).toContain('transition: none !important;')
    expect(iframeStyles).not.toContain('--extension-chat-only-header-height')
    expect(iframeStyles).not.toContain('--extension-chat-only-input-panel-height')
    expect(iframeStyles).not.toContain('--extension-chat-only-input-height')
    expect(iframeStyles).not.toContain('--extension-chat-only-restricted-participation-height')
    expect(iframeStyles).not.toContain('--extension-chat-only-sign-in-height')
    expect(iframeStyles).toContain('body.custom-yt-app-live-chat-extension.chat-only-display yt-live-chat-header-renderer')
    expect(iframeStyles).toContain('body.custom-yt-app-live-chat-extension.chat-only-display #input-panel')
    expect(iframeStyles).toContain('body.custom-yt-app-live-chat-extension.chat-only-display:not(:has(#input-panel))')
    expect(iframeStyles).toContain('height: 0 !important;')
    expect(iframeStyles).toContain('opacity: 0 !important;')
    expect(iframeStyles).toContain('transform: translateY(-8px);')
    expect(iframeStyles).toContain('box-sizing: border-box !important;')
    expect(iframeStyles).not.toContain('height, 96px')
    expect(iframeStyles).not.toContain('max-height: 0 !important;')
    expect(iframeStyles).not.toContain('chat-only-display yt-live-chat-header-renderer {\n  display: none')
  })

  it('adds breathing room above a visible Super Chat ticker in chat-only mode', () => {
    expect(iframeStyles).toContain('body.custom-yt-app-live-chat-extension.chat-only-display #ticker > yt-live-chat-ticker-renderer')
    expect(iframeStyles).toContain('margin-top: 8px;')
    expect(iframeStyles).toContain('transition: margin-top 260ms cubic-bezier(0.22, 1, 0.36, 1) !important;')
  })

  it('lets header menus escape while expanded and clips them while collapsed', () => {
    expect(iframeStyles).toContain(
      'body.custom-yt-app-live-chat-extension yt-live-chat-header-renderer {\n  height: 56px !important;\n  position: relative !important;\n  z-index: 2 !important;\n  overflow: visible !important;\n}',
    )
    expect(iframeStyles).toContain(
      'height: 0 !important;\n  min-height: 0 !important;\n  overflow: hidden !important;\n  opacity: 0 !important;',
    )
  })

  it('keeps user display settings as iframe-internal variables', () => {
    expect(iframeStyles).toContain('#items yt-live-chat-author-chip.yt-live-chat-text-message-renderer')
    expect(iframeStyles).not.toContain('div#items')
    expect(iframeStyles).toContain('display: var(--extension-user-name-display);')
    expect(iframeStyles).toContain('display: var(--extension-user-icon-display);')
    expect(iframeStyles).toContain('display: var(--extension-super-chat-bar-display);')
  })

  it('themes YouTube menu and Material button surfaces with extension colors', () => {
    expect(iframeStyles).toContain('--extension-yt-live-menu-background-color')
    expect(iframeStyles).toContain('--extension-yt-live-panel-background-color')
    expect(iframeStyles).toContain('--extension-yt-live-control-background-color')
    expect(iframeStyles).toContain('--extension-yt-live-control-border-color')
    expect(iframeStyles).toContain('--extension-yt-live-menu-hover-background-color')
    expect(iframeStyles).toContain('yt-live-chat-header-renderer .ytSpecButtonShapeNextHost')
    expect(iframeStyles).toContain('yt-live-chat-header-renderer yt-button-shape')
    expect(iframeStyles).toContain('a.ytSpecButtonShapeNextTonal')
    expect(iframeStyles).toContain('ytd-menu-popup-renderer')
    expect(iframeStyles).toContain('ytd-menu-service-item-renderer yt-formatted-string')
    expect(iframeStyles).toContain('tp-yt-paper-listbox')
    expect(iframeStyles).toContain('ytd-menu-service-item-renderer[aria-disabled="true"]')
    expect(iframeStyles).toContain('border-radius: 8px;')
    expect(iframeStyles).toContain('overflow: hidden;')
    expect(iframeStyles).toContain(
      'tp-yt-iron-dropdown {\n  color: var(--extension-yt-live-font-color) !important;\n  background: transparent !important;',
    )
    expect(iframeStyles).toContain('background-color: transparent !important;')
    expect(iframeStyles).toContain('background: var(--extension-yt-live-panel-background-color) !important;')
    expect(iframeStyles).toContain('background-color: var(--extension-yt-live-panel-background-color) !important;')
    expect(iframeStyles).toContain('backdrop-filter: var(--extension-yt-live-backdrop-filter) !important;')
    expect(iframeStyles).toContain('-webkit-backdrop-filter: var(--extension-yt-live-backdrop-filter) !important;')
    expect(iframeStyles).toContain('border-radius: inherit;')
    expect(iframeStyles).toContain('--extension-yt-live-backdrop-filter: none;')
    expect(iframeStyles).not.toContain('body.custom-yt-app-live-chat-extension::before')
    expect(iframeStyles).not.toContain('tp-yt-paper-listbox::before')
    expect(iframeStyles).not.toContain('ytd-menu-popup-renderer #items::before')
    expect(iframeStyles).not.toContain('tp-yt-paper-listbox > *')
    expect(iframeStyles).toContain(
      'ytd-menu-popup-renderer {\n  color: var(--extension-yt-live-font-color) !important;\n  background: transparent !important;',
    )
    expect(iframeStyles).toContain('background: transparent !important;')
    expect(iframeStyles).toContain('ytd-menu-popup-renderer yt-live-chat-toggle-renderer yt-icon')
    expect(iframeStyles).toContain('ytd-menu-popup-renderer yt-live-chat-toggle-renderer span')
    expect(styleModules['menus.css']).not.toContain('tp-yt-paper-item *')
    expect(styleModules['menus.css']).toContain('tp-yt-iron-dropdown tp-yt-paper-item-body')
    expect(styleModules['menus.css']).toContain('tp-yt-iron-dropdown tp-yt-paper-item .item')
    expect(styleModules['menus.css']).toContain('tp-yt-iron-dropdown tp-yt-paper-item #subtitle')
    expect(styleModules['menus.css']).toContain('tp-yt-iron-dropdown svg')
    expect(styleModules['menus.css']).toContain('tp-yt-iron-dropdown path')
    expect(iframeStyles).toContain('fill: currentColor !important;')

    const menuStyles = styleModules['menus.css']
      .replaceAll('var(--extension-yt-live-font-color)', 'rgb(18, 52, 86)')
      .replaceAll('var(--extension-yt-live-secondary-font-color)', 'rgb(92, 104, 116)')
    mountStyleFixture(
      menuStyles,
      `
        <tp-yt-iron-dropdown>
          <tp-yt-paper-item>
            <tp-yt-paper-item-body>
              <span id="menu-label" class="item">Menu item</span>
              <yt-icon><span id="menu-icon" class="ytSpecIconShapeHost"></span></yt-icon>
            </tp-yt-paper-item-body>
          </tp-yt-paper-item>
          <tp-yt-paper-item aria-disabled="true">
            <tp-yt-paper-item-body>
              <span id="disabled-menu-label" class="item">Disabled item</span>
              <yt-icon><span id="disabled-menu-icon" class="ytSpecIconShapeHost"></span></yt-icon>
            </tp-yt-paper-item-body>
          </tp-yt-paper-item>
        </tp-yt-iron-dropdown>
      `,
    )

    expect(getComputedColor('#menu-label')).toBe('rgb(18, 52, 86)')
    expect(getComputedColor('#menu-icon')).toBe('rgb(18, 52, 86)')
    expect(getComputedColor('#disabled-menu-label')).toBe('rgb(92, 104, 116)')
    expect(getComputedColor('#disabled-menu-icon')).toBe('rgb(92, 104, 116)')
  })

  it('themes logged-in support and Super Chat picker surfaces', () => {
    expect(iframeStyles).toContain(
      '#input-panel:has(yt-live-chat-message-input-renderer[product-picker-open]),\nbody.custom-yt-app-live-chat-extension #input-panel > yt-live-chat-message-input-renderer[product-picker-open] {\n  overflow: visible !important;\n}',
    )
    expect(iframeStyles).toContain('yt-live-chat-product-picker-panel-view-model')
    expect(iframeStyles).toContain('yt-live-chat-product-picker-panel-item-view-model')
    expect(iframeStyles).toContain('yt-live-chat-message-buy-flow-renderer #buy-flow')
    expect(iframeStyles).toContain('yt-live-chat-paid-sticker-panel-renderer')
    expect(iframeStyles).toContain(
      'yt-live-chat-product-picker-panel-view-model {\n  background: var(--extension-yt-live-panel-background-color) !important;',
    )
    expect(iframeStyles).toContain(
      'yt-live-chat-message-buy-flow-renderer,\nbody.custom-yt-app-live-chat-extension yt-live-chat-paid-sticker-panel-renderer,\nbody.custom-yt-app-live-chat-extension yt-live-chat-super-sticker-preview-renderer,\nbody.custom-yt-app-live-chat-extension yt-live-chat-super-sticker-pack-renderer {\n  background: transparent !important;\n  background-color: transparent !important;\n  backdrop-filter: var(--extension-yt-live-backdrop-filter) !important;',
    )
    expect(iframeStyles).toContain(
      'yt-live-chat-super-sticker-preview-renderer #footer {\n  background: transparent !important;\n  background-color: transparent !important;\n}',
    )
    expect(iframeStyles).toContain(
      '#panel-pages > #loading.yt-live-chat-renderer {\n  color: var(--extension-yt-live-font-color) !important;\n  background: transparent !important;\n  background-color: transparent !important;\n}',
    )
    expect(iframeStyles).toContain(
      '#panel-pages > #loading.yt-live-chat-renderer > tp-yt-paper-spinner-lite.yt-live-chat-renderer {\n  --paper-spinner-color: var(--extension-yt-live-font-color);\n}',
    )
    expect(iframeStyles).not.toContain('yt-live-chat-super-sticker-pack-renderer::before')
    expect(iframeStyles).not.toContain('yt-live-chat-super-sticker-pack-renderer > *')
    expect(iframeStyles).not.toContain('isolation: isolate;')
    expect(iframeStyles).toContain('yt-live-chat-super-sticker-pack-renderer {\n  overflow-x: hidden;\n  overflow-y: auto;\n}')
    expect(iframeStyles).toContain('yt-live-chat-product-picker-panel-item-view-model #text yt-attributed-string:not(:first-child)')
    expect(iframeStyles).toContain('yt-live-chat-product-picker-panel-view-model .ytSpecIconShapeHost')
    expect(iframeStyles).toContain('yt-live-chat-message-buy-flow-renderer #help yt-button-renderer')
    expect(iframeStyles).toContain('yt-live-chat-message-buy-flow-renderer #price-input *')
    expect(iframeStyles).toContain('yt-live-chat-message-buy-flow-renderer #picker-buttons svg')
    expect(iframeStyles).toContain('yt-live-chat-paid-sticker-panel-renderer #header-text *')
    expect(iframeStyles).toContain('yt-live-chat-paid-sticker-panel-renderer #help-button yt-button-renderer')
    expect(iframeStyles).toContain('yt-live-chat-paid-sticker-panel-renderer #close-button svg')
    expect(iframeStyles).toContain('yt-live-chat-paid-sticker-panel-renderer #back-button path')
    expect(iframeStyles).toContain('yt-live-chat-product-picker-panel-item-view-model:hover #container')
    expect(iframeStyles).toContain('yt-live-chat-super-sticker-pack-renderer #pack-stickers')
    expect(iframeStyles).toContain('yt-live-chat-super-sticker-pack-item-button-renderer:hover #sticker')
    expect(iframeStyles).toContain('yt-live-chat-super-sticker-pack-backstory-renderer {\n  background: #fff !important;')
    expect(iframeStyles).toContain(
      'yt-live-chat-super-sticker-pack-backstory-renderer #title,\nbody.custom-yt-app-live-chat-extension yt-live-chat-super-sticker-pack-backstory-renderer #content {\n  color: #0f0f0f !important;',
    )
    expect(iframeStyles).toContain('background: transparent !important;')
    expect(iframeStyles).toContain('background-color: transparent !important;')
    expect(iframeStyles).not.toContain('yt-live-chat-product-picker-panel-item-view-model:hover,\n')
    expect(iframeStyles).not.toContain('yt-live-chat-product-picker-panel-item-view-model #endpoint:hover')
    expect(iframeStyles).not.toContain('body.custom-yt-app-live-chat-extension .yt-live-chat-paid-sticker-panel-renderer')
    expect(iframeStyles).not.toContain('body.custom-yt-app-live-chat-extension .yt-live-chat-super-sticker-preview-renderer')
    expect(iframeStyles).not.toContain('body.custom-yt-app-live-chat-extension .yt-live-chat-super-sticker-pack-backstory-renderer')
    expect(iframeStyles).not.toContain('yt-live-chat-super-sticker-pack-backstory-renderer svg')
    expect(iframeStyles).not.toContain('yt-live-chat-super-sticker-pack-backstory-renderer path')
    expect(iframeStyles).not.toContain('yt-live-chat-super-sticker-pack-backstory-renderer #content *')
  })

  it('themes chat input, emoji picker, and reaction controls', () => {
    expect(iframeStyles).toContain(
      '#input-panel\n  > :is(\n    yt-live-chat-message-input-renderer,\n    yt-live-chat-restricted-participation-renderer,\n    yt-live-chat-sign-in-prompt-renderer,\n    yt-live-chat-message-renderer\n  )',
    )
    expect(iframeStyles).toContain('background: var(--extension-yt-live-panel-background-color) !important;')
    expect(iframeStyles).not.toContain('body.custom-yt-app-live-chat-extension yt-live-chat-message-renderer {')
    expect(iframeStyles).toContain('#send-button.yt-live-chat-message-input-renderer')
    expect(iframeStyles).toContain('yt-live-chat-icon-toggle-button-renderer[use-toggled-active-state][active]#emoji')
    expect(iframeStyles).toContain(
      'yt-reaction-control-panel-view-model[reaction-control-panel-expanded] #fab-container {\n  background-color: color-mix(in srgb, var(--extension-yt-live-panel-background-color) 70%, transparent) !important;\n  backdrop-filter: var(--extension-yt-live-backdrop-filter) !important;\n  -webkit-backdrop-filter: var(--extension-yt-live-backdrop-filter) !important;\n  transition-delay: 0s, 0s !important;\n}',
    )
    expect(iframeStyles).toContain(
      'yt-reaction-control-panel-view-model #fab-container {\n  transition-property: height, background-color !important;\n  transition-duration: 0.3s, 0.12s !important;\n  transition-delay: 0s, 0.3s !important;\n}',
    )
    expect(iframeStyles).not.toContain('yt-reaction-control-panel-view-model #hover-area')
    expect(iframeStyles).not.toContain('yt-reaction-control-panel-view-model #expanded-buttons')
    expect(iframeStyles).not.toContain('yt-reaction-control-panel-button-view-model #button')
    expect(iframeStyles).not.toContain('yt-reaction-control-panel-button-view-model button')
    expect(iframeStyles).not.toContain('yt-reaction-control-panel-button-view-model:hover')
    expect(iframeStyles).not.toContain('ylc-reaction-fab-expanded')
    expect(iframeStyles).not.toContain('yt-reaction-control-panel-view-model {\n  background-color:')
    expect(iframeStyles).not.toContain('yt-reaction-control-panel-overlay-view-model')
    expect(iframeStyles).not.toContain('yt-reaction-control-panel-view-model {\n  color:')
    expect(iframeStyles).toContain(
      'yt-emoji-picker-renderer {\n  background: var(--extension-yt-live-panel-background-color) !important;\n  background-color: var(--extension-yt-live-panel-background-color) !important;\n  backdrop-filter: var(--extension-yt-live-backdrop-filter) !important;\n  -webkit-backdrop-filter: var(--extension-yt-live-backdrop-filter) !important;\n  border-radius: 8px;\n  overflow: hidden;\n}',
    )
    expect(iframeStyles).toContain('yt-emoji-picker-renderer #search-panel')
    expect(iframeStyles).toContain(
      'yt-emoji-picker-renderer #search-panel {\n  background: var(--extension-yt-live-control-background-color) !important;\n  background-color: var(--extension-yt-live-control-background-color) !important;',
    )
    expect(iframeStyles).toContain('border: 1px solid var(--extension-yt-live-control-border-color);')
    expect(iframeStyles).toContain('yt-emoji-picker-category-button-renderer')
    expect(iframeStyles).toContain('yt-emoji-picker-category-button-renderer[active]')
    expect(iframeStyles).toContain('yt-emoji-picker-category-button-renderer[aria-selected="true"]')
    expect(iframeStyles).toContain('yt-emoji-picker-category-button-renderer svg')
    expect(iframeStyles).toContain('yt-emoji-picker-category-button-renderer path')
    expect(iframeStyles).not.toContain(
      'yt-emoji-picker-category-button-renderer[active],\nbody.custom-yt-app-live-chat-extension yt-emoji-picker-category-button-renderer[aria-selected="true"] {\n  background:',
    )
    expect(iframeStyles).toContain('#title.yt-emoji-picker-category-renderer {\n  color: var(--yt-spec-text-secondary) !important;\n}')
    expect(iframeStyles).toContain('fill: currentColor !important;')
  })

  it('themes pinned banners without overriding owner badges', () => {
    expect(iframeStyles).toContain('yt-live-chat-banner-renderer #message.yt-live-chat-text-message-renderer')
    expect(iframeStyles).toContain('yt-live-chat-banner-header-renderer #menu .ytSpecButtonShapeNextIcon')
    expect(iframeStyles).toContain('yt-live-chat-text-message-renderer[author-type="owner"] #message')
    expect(iframeStyles).not.toContain(
      '.yt-live-chat-banner-renderer #message.yt-live-chat-text-message-renderer {\n  color: var(--yt-live-chat-primary-text-color',
    )
  })

  it('uses the membership name color variable for member author names', () => {
    expect(iframeStyles).toContain('--extension-yt-live-membership-name-color: var(--yt-live-chat-sponsor-color, rgba(15, 157, 88, 1));')
    expect(iframeStyles).toContain(
      '#author-name.member.yt-live-chat-author-chip {\n  color: var(--extension-yt-live-membership-name-color);\n}',
    )
  })
})

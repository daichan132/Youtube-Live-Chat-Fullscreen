import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const iframeStyles = readFileSync(resolve(process.cwd(), 'entrypoints/content/features/YTDLiveChatIframe/styles/iframe.css'), 'utf8')
const iframeStylesWithoutComments = iframeStyles.replace(/\/\*[\s\S]*?\*\//g, '')

const directDisplayNoneSelectors = () =>
  Array.from(iframeStylesWithoutComments.matchAll(/([^{}]+)\{\s*[^{}]*display\s*:\s*none(?:\s*!important)?\s*;[^{}]*\}/g)).map(match =>
    match[1].replace(/\s+/g, ' ').trim(),
  )

describe('iframe styles contract', () => {
  it('keeps direct display none limited to the native close control', () => {
    expect(directDisplayNoneSelectors()).toEqual(['body.custom-yt-app-live-chat-extension yt-live-chat-header-renderer > #close-button'])
  })

  it('keeps the transparent iframe body covering the viewport', () => {
    expect(iframeStyles).toContain('body.custom-yt-app-live-chat-extension {\n  margin: 0;\n  min-height: 100vh;\n  width: 100%;\n}')
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
    expect(iframeStyles).toContain('border-radius: inherit;')
    expect(iframeStyles).not.toContain('--extension-yt-live-panel-backdrop-filter')
    expect(iframeStyles).not.toContain('tp-yt-paper-listbox::before')
    expect(iframeStyles).not.toContain('ytd-menu-popup-renderer #items::before')
    expect(iframeStyles).not.toContain('tp-yt-paper-listbox > *')
    expect(iframeStyles).toContain(
      'ytd-menu-popup-renderer {\n  color: var(--extension-yt-live-font-color) !important;\n  background: transparent !important;',
    )
    expect(iframeStyles).toContain('background: transparent !important;')
    expect(iframeStyles).toContain('ytd-menu-popup-renderer yt-live-chat-toggle-renderer yt-icon')
    expect(iframeStyles).toContain('ytd-menu-popup-renderer yt-live-chat-toggle-renderer span')
    expect(iframeStyles).toContain('tp-yt-iron-dropdown tp-yt-paper-item *')
    expect(iframeStyles).toContain('fill: currentColor !important;')
  })

  it('themes logged-in support and Super Chat picker surfaces', () => {
    expect(iframeStyles).toContain('yt-live-chat-product-picker-panel-view-model')
    expect(iframeStyles).toContain('yt-live-chat-product-picker-panel-item-view-model')
    expect(iframeStyles).toContain('yt-live-chat-message-buy-flow-renderer #buy-flow')
    expect(iframeStyles).toContain('yt-live-chat-paid-sticker-panel-renderer')
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
    expect(iframeStyles).toContain('#send-button.yt-live-chat-message-input-renderer')
    expect(iframeStyles).toContain('yt-live-chat-icon-toggle-button-renderer[use-toggled-active-state][active]#emoji')
    expect(iframeStyles).toContain(
      'yt-reaction-control-panel-view-model[reaction-control-panel-expanded] #fab-container {\n  background-color: color-mix(in srgb, var(--extension-yt-live-panel-background-color) 70%, transparent) !important;\n  transition-delay: 0s, 0s !important;\n}',
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
    expect(iframeStyles).toContain('yt-emoji-picker-renderer #search-panel')
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

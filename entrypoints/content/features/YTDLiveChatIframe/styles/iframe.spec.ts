import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const iframeStyles = readFileSync(resolve(process.cwd(), 'entrypoints/content/features/YTDLiveChatIframe/styles/iframe.css'), 'utf8')
const iframeStylesWithoutComments = iframeStyles.replace(/\/\*[\s\S]*?\*\//g, '')

const directDisplayNoneSelectors = () =>
  Array.from(iframeStylesWithoutComments.matchAll(/([^{}]+)\{\s*[^{}]*display\s*:\s*none\s*;[^{}]*\}/g)).map(match =>
    match[1].replace(/\s+/g, ' ').trim(),
  )

describe('iframe styles contract', () => {
  it('keeps direct display none limited to the native close control', () => {
    expect(directDisplayNoneSelectors()).toEqual(['body.custom-yt-app-live-chat-extension yt-live-chat-header-renderer > #close-button'])
  })

  it('does not suppress the live viewer leaderboard entry', () => {
    expect(iframeStyles).not.toContain('ytvl-live-viewer-leaderboard-chat-entry-point-view-model')
  })

  it('does not keep stale clip-path iframe selectors', () => {
    expect(iframeStyles).not.toContain('clip-path-enable')
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
    expect(iframeStyles).toContain('background: var(--extension-yt-live-menu-background-color) !important;')
    expect(iframeStyles).toContain('background-color: var(--extension-yt-live-menu-background-color) !important;')
    expect(iframeStyles).toContain('border-radius: inherit;')
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
    expect(iframeStyles).toContain('yt-live-chat-product-picker-panel-item-view-model #text yt-attributed-string:not(:first-child)')
    expect(iframeStyles).toContain('yt-live-chat-product-picker-panel-view-model .ytSpecIconShapeHost')
    expect(iframeStyles).toContain('yt-live-chat-message-buy-flow-renderer #help yt-button-renderer')
    expect(iframeStyles).toContain('yt-live-chat-message-buy-flow-renderer #price-input *')
    expect(iframeStyles).toContain('yt-live-chat-message-buy-flow-renderer #picker-buttons svg')
    expect(iframeStyles).toContain('yt-live-chat-product-picker-panel-item-view-model:hover #container')
    expect(iframeStyles).toContain('yt-live-chat-super-sticker-pack-renderer #pack-stickers')
    expect(iframeStyles).toContain('yt-live-chat-super-sticker-pack-item-button-renderer:hover #sticker')
    expect(iframeStyles).toContain('yt-live-chat-super-sticker-pack-backstory-renderer #content')
    expect(iframeStyles).toContain('background: transparent !important;')
    expect(iframeStyles).toContain('background-color: transparent !important;')
    expect(iframeStyles).not.toContain('yt-live-chat-product-picker-panel-item-view-model:hover,\n')
    expect(iframeStyles).not.toContain('yt-live-chat-product-picker-panel-item-view-model #endpoint:hover')
    expect(iframeStyles).not.toContain('body.custom-yt-app-live-chat-extension .yt-live-chat-paid-sticker-panel-renderer')
    expect(iframeStyles).not.toContain('body.custom-yt-app-live-chat-extension .yt-live-chat-super-sticker-preview-renderer')
    expect(iframeStyles).not.toContain('body.custom-yt-app-live-chat-extension .yt-live-chat-super-sticker-pack-backstory-renderer')
  })

  it('themes pinned banners without overriding owner badges', () => {
    expect(iframeStyles).toContain('yt-live-chat-banner-renderer #message.yt-live-chat-text-message-renderer')
    expect(iframeStyles).toContain('yt-live-chat-banner-header-renderer #menu .ytSpecButtonShapeNextIcon')
    expect(iframeStyles).toContain('yt-live-chat-text-message-renderer[author-type="owner"] #message')
    expect(iframeStyles).not.toContain(
      '.yt-live-chat-banner-renderer #message.yt-live-chat-text-message-renderer {\n  color: var(--yt-live-chat-primary-text-color',
    )
  })
})

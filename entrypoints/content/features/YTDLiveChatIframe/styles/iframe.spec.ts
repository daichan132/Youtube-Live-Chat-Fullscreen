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
    expect(iframeStyles).toContain('a.ytSpecButtonShapeNextTonal')
    expect(iframeStyles).toContain('ytd-menu-popup-renderer')
    expect(iframeStyles).toContain('ytd-menu-service-item-renderer yt-formatted-string')
    expect(iframeStyles).toContain('tp-yt-paper-listbox')
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

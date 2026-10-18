import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const readStyles = (module: string) =>
  readFileSync(resolve(process.cwd(), 'entrypoints/content/features/YTDLiveChatIframe/styles', module), 'utf8')
const LINK_COLOR = 'rgb(151, 204, 255)'
const PRIMARY_COLOR = 'rgb(245, 240, 230)'
const nativeLink = 'rgb(62, 166, 255)'
const css = [readStyles('core-theme.css'), readStyles('banners.css')]
  .join('\n')
  .replaceAll('var(--extension-yt-live-link-color)', LINK_COLOR)
  .replaceAll('var(--extension-yt-live-font-color)', PRIMARY_COLOR)

const mount = () => {
  document.body.className = 'custom-yt-app-live-chat-extension'
  document.body.innerHTML = `
    <yt-live-chat-text-message-renderer>
      <span id="message" class="yt-live-chat-text-message-renderer">
        <a id="chat-link" href="https://example.com/long-message-link">Message URL</a>
        <a id="button-link" role="button" href="https://example.com/action" style="color: rgb(1, 80, 40)">Action</a>
        <a id="tonal-link" class="ytSpecButtonShapeNextTonal" href="https://example.com/tonal">Native tonal button</a>
        <a id="no-href" style="color: rgb(1, 80, 40)">No navigation target</a>
      </span>
    </yt-live-chat-text-message-renderer>
    <yt-live-chat-banner-renderer>
      <span id="message" class="yt-live-chat-text-message-renderer"><a id="pinned-link" href="https://example.com/pinned">Pinned URL</a></span>
    </yt-live-chat-banner-renderer>
    <yt-live-chat-viewer-engagement-message-renderer>
      <span id="message"><a id="notice-link" href="https://example.com/notice">Notice URL</a></span>
      <div id="action-button"><a id="notice-action" role="button" href="https://example.com/action">Notice action</a></div>
    </yt-live-chat-viewer-engagement-message-renderer>
    <yt-live-chat-paid-message-renderer>
      <span id="message" class="yt-live-chat-paid-message-renderer"><a id="paid-link" href="https://example.com/paid" style="color: rgb(11, 22, 33)">Paid card URL</a></span>
    </yt-live-chat-paid-message-renderer>
    <yt-live-chat-super-sticker-preview-renderer>
      <a id="purchase-link" href="https://example.com/purchase" style="color: rgb(11, 22, 33)">Native purchase control</a>
    </yt-live-chat-super-sticker-preview-renderer>
  `
  const nativeStyle = document.createElement('style')
  nativeStyle.textContent = `body { font-size: 16px; } a[href] { color: ${nativeLink}; }`
  const extensionStyle = document.createElement('style')
  extensionStyle.textContent = css
  document.head.append(nativeStyle, extensionStyle)
}
const styleOf = (id: string) => {
  const element = document.getElementById(id)
  if (!element) throw new Error(`Missing link fixture ${id}`)
  return getComputedStyle(element)
}

afterEach(() => {
  document.head.replaceChildren()
  document.body.replaceChildren()
  document.body.className = ''
})

describe('scoped chat link appearance', () => {
  it('gives actual chat, pinned and notice copy links the themed color with an underline and long-URL wrapping', () => {
    mount()

    for (const id of ['chat-link', 'pinned-link', 'notice-link']) {
      const style = styleOf(id)
      expect(style.color).toBe(LINK_COLOR)
      expect(style.textDecorationLine).toBe('underline')
      expect(style.textUnderlineOffset).toBe('1.92px')
      expect(style.overflowWrap).toBe('anywhere')
      expect(style.wordBreak).toBe('normal')
    }
  })

  it('preserves native button-shaped anchors and paid foreground pairs', () => {
    mount()

    expect(styleOf('button-link').color).toBe('rgb(1, 80, 40)')
    expect(styleOf('tonal-link').color).toBe(PRIMARY_COLOR)
    expect(styleOf('notice-action').color).toBe(PRIMARY_COLOR)
    expect(styleOf('no-href').color).toBe('rgb(1, 80, 40)')
    expect(styleOf('paid-link').color).toBe('rgb(11, 22, 33)')
    expect(styleOf('purchase-link').color).toBe('rgb(11, 22, 33)')
    for (const id of ['button-link', 'tonal-link', 'notice-action', 'no-href', 'paid-link', 'purchase-link']) {
      expect(styleOf(id).textDecorationLine).not.toBe('underline')
    }
  })

  it('releases the color and affordances outside the extension-owned chat body', () => {
    mount()
    expect(styleOf('chat-link').color).toBe(LINK_COLOR)

    document.body.className = ''

    expect(styleOf('chat-link').color).toBe(nativeLink)
    expect(styleOf('chat-link').textDecorationLine).not.toBe('underline')
    expect(styleOf('chat-link').overflowWrap).not.toBe('anywhere')
  })
})

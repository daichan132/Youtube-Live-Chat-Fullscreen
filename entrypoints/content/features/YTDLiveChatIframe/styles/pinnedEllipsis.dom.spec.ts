import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const styleDirectory = resolve(process.cwd(), 'entrypoints/content/features/YTDLiveChatIframe/styles')
const extensionStyles = ['core-theme.css', 'banners.css'].map(name => readFileSync(resolve(styleDirectory, name), 'utf8')).join('\n')
const nativePrimary = 'rgb(15, 15, 15)'
const ownerBadgeColor = 'rgb(123, 62, 219)'
const linkColor = 'rgb(151, 204, 255)'
const palettes = [
  { name: 'white', primary: 'rgb(255, 255, 255)' },
  { name: 'magenta', primary: 'rgb(220, 80, 180)' },
  { name: 'dark', primary: 'rgb(15, 15, 15)' },
]

const message = (name: string, collapsed = false) => `
  <yt-live-chat-text-message-renderer ${collapsed ? 'in-collapsed-banner' : ''}>
    <div id="content" class="style-scope yt-live-chat-text-message-renderer" data-fixture="${name}-content">
      <yt-live-chat-author-chip><yt-live-chat-author-badge-renderer data-fixture="${name}-badge">Owner badge</yt-live-chat-author-badge-renderer></yt-live-chat-author-chip>
      <span id="message-container" class="style-scope yt-live-chat-text-message-renderer">
        <span id="message" class="style-scope yt-live-chat-text-message-renderer" data-fixture="${name}-message">
          A long pinned message <a href="https://example.invalid/long-pinned-reference" data-fixture="${name}-link">https://example.invalid/long-pinned-reference</a>
        </span>
      </span>
    </div>
  </yt-live-chat-text-message-renderer>`

const mountFixture = (primary: string) => {
  document.body.className = 'custom-yt-app-live-chat-extension'
  document.body.innerHTML = `
    <yt-live-chat-banner-renderer><div id="contents">${message('pinned', true)}</div></yt-live-chat-banner-renderer>
    <yt-live-chat-item-list-renderer>${message('ordinary')}</yt-live-chat-item-list-renderer>`

  const nativeStyles = `
    :root { --yt-live-chat-primary-text-color: ${nativePrimary}; }
    yt-live-chat-text-message-renderer { color: var(--yt-live-chat-primary-text-color); }
    /* Exact native collapsed-banner rule observed on YouTube. The ellipsis
       belongs to this block, while #message has a separate extension color. */
    yt-live-chat-text-message-renderer[in-collapsed-banner] #content.yt-live-chat-text-message-renderer {
      color: var(--yt-live-chat-primary-text-color);
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    yt-live-chat-author-badge-renderer { color: ${ownerBadgeColor}; }
    a { color: rgb(6, 95, 212); }
  `
  const style = document.createElement('style')
  // jsdom does not resolve custom properties. Resolve only the observed native
  // value and the supplied extension settings, without changing selectors.
  style.textContent = `
    ${nativeStyles.replaceAll('var(--yt-live-chat-primary-text-color)', nativePrimary)}
    ${extensionStyles.replaceAll('var(--extension-yt-live-font-color)', primary).replaceAll('var(--extension-yt-live-link-color)', linkColor)}
  `
  document.head.append(style)
}

const fixtureStyle = (name: string) => {
  const element = document.querySelector(`[data-fixture="${name}"]`)
  if (!element) throw new Error(`Missing pinned ellipsis fixture: ${name}`)
  return getComputedStyle(element)
}

afterEach(() => {
  document.head.replaceChildren()
  document.body.replaceChildren()
  document.body.className = ''
})

describe('pinned message text-overflow color', () => {
  it.each(palettes)('themes the ellipsis owner with $name while preserving native clipping and semantic colors', ({ primary }) => {
    mountFixture(primary)

    const owner = fixtureStyle('pinned-content')
    expect.soft(owner.color, 'the block that paints the horizontal ellipsis').toBe(primary)
    expect(owner.textOverflow).toBe('ellipsis')
    expect(owner.whiteSpace).toBe('nowrap')
    expect(owner.overflow).toBe('hidden')
    expect(fixtureStyle('pinned-message').color).toBe(primary)
    expect(fixtureStyle('pinned-link').color).toBe(linkColor)
    expect(fixtureStyle('pinned-link').textDecorationLine).toBe('underline')
    expect(fixtureStyle('pinned-badge').color).toBe(ownerBadgeColor)

    expect(fixtureStyle('ordinary-content').color).toBe(nativePrimary)
    expect(fixtureStyle('ordinary-message').color).toBe(primary)
    expect(fixtureStyle('ordinary-link').color).toBe(linkColor)
    expect(fixtureStyle('ordinary-badge').color).toBe(ownerBadgeColor)
  })
})

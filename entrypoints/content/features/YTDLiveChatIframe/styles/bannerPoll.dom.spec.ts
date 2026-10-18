import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const styleDirectory = resolve(process.cwd(), 'entrypoints/content/features/YTDLiveChatIframe/styles')
const extensionStyles = ['core-theme.css', 'banners.css'].map(name => readFileSync(resolve(styleDirectory, name), 'utf8')).join('\n')
const nativePrimary = 'rgb(15, 15, 15)'
const nativeSecondary = 'rgb(96, 96, 96)'
const nativeBar = 'rgb(230, 230, 230)'
const badgeColor = 'rgb(123, 62, 219)'
const artworkColor = 'rgb(235, 153, 55)'
const palettes = [
  { name: 'light text', primary: 'rgb(245, 240, 230)', secondary: 'rgb(165, 160, 150)', control: 'rgba(245, 240, 230, 0.12)' },
  { name: 'custom text', primary: 'rgb(220, 80, 180)', secondary: 'rgb(150, 70, 130)', control: 'rgba(220, 80, 180, 0.12)' },
] as const

const menuButton = (name: string, attributes = '') => `
  <button data-fixture="${name}-button" class="ytSpecButtonShapeNextHost" ${attributes}>
    <div data-fixture="${name}-icon" class="ytSpecButtonShapeNextIcon">
      <span class="ytIconWrapperHost"><span data-fixture="${name}-shape" class="ytSpecIconShapeHost">
        <svg data-fixture="${name}-svg"><path data-fixture="${name}-path" d="M0 0h4v16H0z" /></svg>
      </span></span>
    </div>
  </button>`

const mountFixture = (palette: (typeof palettes)[number] = palettes[0]) => {
  document.body.className = 'custom-yt-app-live-chat-extension'
  // The IDs and button wrappers follow the observed native post-vote banner,
  // which is a different component from yt-live-chat-poll-renderer.
  document.body.innerHTML = `
    <yt-live-chat-renderer>
      <yt-live-chat-banner-renderer><div id="contents">
        <yt-live-chat-banner-poll-renderer>
          <div id="content-top">
            <yt-img-shadow id="creator-photo"><img data-fixture="creator-image" alt="" /></yt-img-shadow>
            <yt-formatted-string id="metadata-text" data-fixture="metadata" hidden>Poll details</yt-formatted-string>
            <yt-formatted-string id="collapsed-metadata-text" data-fixture="collapsed-metadata"><span data-fixture="collapsed-copy">Poll results</span></yt-formatted-string>
            <div id="menu">
              ${menuButton('enabled')}
              ${menuButton('disabled', 'disabled')}
              ${menuButton('aria-disabled', 'aria-disabled="true"')}
            </div>
          </div>
          <div id="main-content" data-fixture="main-content">
            <yt-formatted-string id="poll-question" data-fixture="question" hidden>Question</yt-formatted-string>
            <yt-live-chat-author-badge-renderer data-fixture="author-badge">Owner</yt-live-chat-author-badge-renderer>
            <div id="poll-choices-container" hidden>
              <yt-live-chat-banner-poll-choice has-voted>
                <div id="content"><div id="percentage-container">
                  <div id="vote-percentage-bar" data-fixture="result-bar" style="width: 63%"></div>
                </div><div id="text-container">
                  <yt-formatted-string id="label-text" data-fixture="choice-label">Choice</yt-formatted-string>
                  <yt-formatted-string id="vote-percentage-text" data-fixture="percentage">63%</yt-formatted-string>
                </div></div>
              </yt-live-chat-banner-poll-choice>
            </div>
          </div>
        </yt-live-chat-banner-poll-renderer>
      </div></yt-live-chat-banner-renderer>
      <yt-live-chat-paid-message-renderer data-fixture="paid-card">Paid message</yt-live-chat-paid-message-renderer>
    </yt-live-chat-renderer>`

  const nativeStyles = `
    yt-live-chat-banner-poll-renderer #metadata-text,
    yt-live-chat-banner-poll-renderer #collapsed-metadata-text,
    yt-live-chat-banner-poll-choice #label-text,
    yt-live-chat-banner-poll-choice #vote-percentage-text { color: ${nativeSecondary}; }
    yt-live-chat-banner-poll-renderer #main-content,
    yt-live-chat-banner-poll-renderer #poll-question,
    yt-live-chat-banner-poll-renderer #menu button,
    yt-live-chat-banner-poll-renderer #menu :is(.ytSpecButtonShapeNextIcon, .ytSpecIconShapeHost, svg, path) { color: ${nativePrimary}; }
    yt-live-chat-banner-poll-renderer #menu :is(svg, path) { fill: ${nativePrimary}; }
    yt-live-chat-banner-poll-renderer #menu button:is(:disabled, [aria-disabled="true"]),
    yt-live-chat-banner-poll-renderer #menu button:is(:disabled, [aria-disabled="true"]) :is(.ytSpecButtonShapeNextIcon, .ytSpecIconShapeHost, svg, path) {
      color: ${nativeSecondary}; fill: ${nativeSecondary};
    }
    yt-live-chat-banner-poll-choice #vote-percentage-bar { background: ${nativeBar}; }
    yt-live-chat-author-badge-renderer { color: ${badgeColor}; background: rgb(255, 255, 255); }
    yt-live-chat-paid-message-renderer { color: rgb(255, 255, 255); background: rgb(6, 95, 212); }
    yt-img-shadow img { color: ${artworkColor}; filter: none; opacity: 1; }
  `
  const style = document.createElement('style')
  // Resolve palette values for jsdom without replacing production selectors.
  style.textContent = `${nativeStyles}\n${extensionStyles
    .replaceAll('var(--extension-yt-live-font-color)', palette.primary)
    .replaceAll('var(--extension-yt-live-secondary-font-color)', palette.secondary)
    .replaceAll('var(--extension-yt-live-control-background-color)', palette.control)}`
  document.head.append(style)
}

const fixtureElement = (name: string) => {
  const element = document.querySelector<HTMLElement>(`[data-fixture="${name}"]`)
  if (!element) throw new Error(`Missing banner poll fixture: ${name}`)
  return element
}
const fixtureStyle = (name: string) => getComputedStyle(fixtureElement(name))

afterEach(() => {
  document.head.replaceChildren()
  document.body.replaceChildren()
  document.body.className = ''
})

describe('post-vote banner poll colors', () => {
  it.each(palettes)('themes collapsed and expanded text with $name without changing native state or result width', palette => {
    mountFixture(palette)

    for (const name of ['collapsed-metadata', 'collapsed-copy', 'main-content', 'question', 'choice-label', 'percentage']) {
      expect.soft(fixtureStyle(name).color, name).toBe(palette.primary)
    }
    expect.soft(fixtureStyle('metadata').color).toBe(palette.secondary)
    expect.soft(fixtureStyle('result-bar').backgroundColor).toBe(palette.control)
    expect(fixtureElement('metadata').hidden).toBe(true)
    expect(fixtureElement('question').hidden).toBe(true)
    expect(fixtureElement('choice-label').closest('yt-live-chat-banner-poll-choice')).toHaveAttribute('has-voted')
    expect(fixtureElement('result-bar').style.width).toBe('63%')
  })

  it.each(palettes)('themes the enabled banner menu and SVG with $name while preserving disabled controls', palette => {
    mountFixture(palette)

    for (const suffix of ['button', 'icon', 'shape', 'svg', 'path']) {
      expect.soft(fixtureStyle(`enabled-${suffix}`).color, suffix).toBe(palette.primary)
      expect.soft(fixtureStyle(`enabled-${suffix}`).fill, suffix).toBe(palette.primary)
      for (const name of ['disabled', 'aria-disabled']) {
        expect(fixtureStyle(`${name}-${suffix}`).color, `${name}-${suffix}`).toBe(nativeSecondary)
        expect(fixtureStyle(`${name}-${suffix}`).fill, `${name}-${suffix}`).toBe(nativeSecondary)
      }
    }
    expect(fixtureElement('disabled-button')).toBeDisabled()
    expect(fixtureElement('aria-disabled-button')).toHaveAttribute('aria-disabled', 'true')
  })

  it('restores native poll colors outside the extension body class', () => {
    mountFixture()
    document.body.className = ''

    for (const name of ['collapsed-metadata', 'collapsed-copy', 'metadata', 'choice-label', 'percentage']) {
      expect(fixtureStyle(name).color, name).toBe(nativeSecondary)
    }
    for (const name of ['main-content', 'question', 'enabled-button', 'enabled-icon', 'enabled-shape', 'enabled-svg', 'enabled-path']) {
      expect(fixtureStyle(name).color, name).toBe(nativePrimary)
    }
    expect(fixtureStyle('enabled-path').fill).toBe(nativePrimary)
    expect(fixtureStyle('result-bar').backgroundColor).toBe(nativeBar)
  })

  it('preserves paid-card pairs, author badges and creator artwork colors', () => {
    mountFixture()

    expect(fixtureStyle('paid-card').color).toBe('rgb(255, 255, 255)')
    expect(fixtureStyle('paid-card').backgroundColor).toBe('rgb(6, 95, 212)')
    expect(fixtureStyle('author-badge').color).toBe(badgeColor)
    expect(fixtureStyle('author-badge').backgroundColor).toBe('rgb(255, 255, 255)')
    expect(fixtureStyle('creator-image').color).toBe(artworkColor)
    expect(fixtureStyle('creator-image').filter).toBe('none')
    expect(fixtureStyle('creator-image').opacity).toBe('1')
  })
})

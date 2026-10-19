// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
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
  Array.from(iframeStylesWithoutComments.matchAll(/([^{}]+)\{\s*[^{}]*display\s*:\s*none(?:\s*!important)?\s*;[^{}]*\}/g)).flatMap(match =>
    match[1] ? [match[1].replace(/\s+/g, ' ').trim()] : [],
  )

const mountStyleFixture = (styles: string, markup: string) => {
  document.head.replaceChildren()
  document.body.className = 'custom-yt-app-live-chat-extension'
  document.body.innerHTML = markup
  const style = document.createElement('style')
  style.textContent = styles
  document.head.append(style)
}

const getFixtureStyle = (selector: string) => {
  const element = document.querySelector(selector)
  if (!element) throw new Error(`Missing style fixture element: ${selector}`)
  return getComputedStyle(element)
}

const getComputedColor = (selector: string) => getFixtureStyle(selector).color

afterEach(() => {
  document.head.replaceChildren()
  document.body.replaceChildren()
  document.body.className = ''
})

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
    mountStyleFixture(styleModules['frame.css'], '<yt-live-chat-renderer></yt-live-chat-renderer>')

    const body = getComputedStyle(document.body)
    expect(body.backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(body.margin).toBe('0px')
    expect(body.minHeight).toBe(`${window.innerHeight}px`)
    expect(body.position).toBe('relative')
    expect(body.width).toBe('100%')
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
    const coreThemeStyles = styleModules['core-theme.css']
      .replaceAll('var(--extension-yt-live-font-color)', 'rgb(18, 52, 86)')
      .replaceAll('var(--extension-yt-live-control-background-color)', 'rgb(30, 50, 70)')
    mountStyleFixture(
      `
        .ytSpecIconShapeHost svg { fill: currentColor; }
        yt-button-shape, yt-button-shape button, .ytSpecButtonShapeNextHost,
        a.ytSpecButtonShapeNextTonal, a.ytSpecButtonShapeNextTonal .ytSpecButtonShapeNextButtonTextContent {
          color: rgb(201, 80, 40);
        }
        ${coreThemeStyles}
      `,
      `
        <yt-live-chat-header-renderer>
          <yt-button-shape id="material-shape"><button id="material-button">Shape action</button></yt-button-shape>
          <button id="material-host" class="ytSpecButtonShapeNextHost">Header action</button>
          <a id="tonal-link" class="ytSpecButtonShapeNextTonal" href="#action">
            <span id="tonal-label" class="ytSpecButtonShapeNextButtonTextContent">Tonal action</span>
          </a>
          <button aria-label="More options">
            <span class="ytSpecButtonShapeNextIcon" style="color: rgb(201, 80, 40)">
              <span id="neutral-icon" class="ytSpecIconShapeHost"><svg><path id="neutral-icon-path" /></svg></span>
            </span>
          </button>
          <div id="viewer-leaderboard-entry-point">
            <button aria-label="0 XP">
              <span class="ytSpecButtonShapeNextIcon" style="color: rgb(123, 62, 219)">
                <span id="top-fans-crown" class="ytSpecIconShapeHost"><svg><path id="top-fans-crown-path" /></svg></span>
              </span>
            </button>
          </div>
        </yt-live-chat-header-renderer>
      `,
    )

    const materialHost = document.querySelector('#material-host')
    if (!materialHost) throw new Error('Missing Material header control')
    materialHost.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))

    for (const selector of ['#material-shape', '#material-button', '#material-host', '#tonal-link', '#tonal-label']) {
      expect(getComputedColor(selector), selector).toBe('rgb(18, 52, 86)')
    }
    expect(materialHost.matches(':hover')).toBe(true)
    expect(getFixtureStyle('#material-host').backgroundColor).toBe('rgb(30, 50, 70)')
    expect(getFixtureStyle('#tonal-link').backgroundColor).toBe('rgb(30, 50, 70)')
    expect(getComputedColor('#neutral-icon')).toBe('rgb(18, 52, 86)')
    expect(getComputedColor('#top-fans-crown')).toBe('rgb(123, 62, 219)')
    expect(getFixtureStyle('#neutral-icon-path').fill).toBe('rgb(18, 52, 86)')
    expect(getFixtureStyle('#top-fans-crown-path').fill).toBe('rgb(123, 62, 219)')
  })

  it.each(['245, 240, 230', '15, 15, 15', '220, 80, 180'])(
    'themes gift announcement copy with %s while preserving artwork and semantic colors',
    foreground => {
      const coreThemeStyles = styleModules['core-theme.css'].replaceAll('var(--extension-yt-live-font-color)', `rgb(${foreground})`)
      mountStyleFixture(
        `yt-gift-message-view-model, yt-attributed-string > .ytAttributedStringHost { color: rgb(15, 15, 15); }
         ${coreThemeStyles}`,
        `<yt-gift-message-view-model>
          <div id="content" class="style-scope yt-gift-message-view-model">
            <yt-attributed-string id="author-name-v2" class="style-scope yt-gift-message-view-model">
              <span class="ytAttributedStringHost"><span data-gift-author>@sample</span></span>
            </yt-attributed-string>
            <yt-attributed-string id="message-v2" class="style-scope yt-gift-message-view-model">
              <span class="ytAttributedStringHost"><span data-gift-message>Gift sent</span>
                <span data-semantic-text style="color: rgb(123, 62, 219)">Native badge</span>
              </span>
            </yt-attributed-string>
            <div id="gift-image" style="color: rgb(213, 158, 34)"><svg style="fill: currentColor"><path data-gift-art /></svg></div>
          </div>
        </yt-gift-message-view-model>
        <yt-attributed-string id="unrelated-copy"><span class="ytAttributedStringHost">Native copy</span></yt-attributed-string>
        <yt-live-chat-paid-message-renderer style="color: rgb(12, 34, 56); background: rgb(200, 220, 240)">Paid card</yt-live-chat-paid-message-renderer>`,
      )

      for (const selector of [
        '#author-name-v2',
        '#author-name-v2 > .ytAttributedStringHost',
        '[data-gift-author]',
        '#message-v2',
        '[data-gift-message]',
      ]) {
        expect(getComputedColor(selector), selector).toBe(`rgb(${foreground})`)
      }
      expect(getComputedColor('[data-semantic-text]')).toBe('rgb(123, 62, 219)')
      expect(getFixtureStyle('[data-gift-art]').fill).toBe('rgb(213, 158, 34)')
      expect(getComputedColor('#unrelated-copy > .ytAttributedStringHost')).toBe('rgb(15, 15, 15)')
      expect(getComputedColor('yt-live-chat-paid-message-renderer')).toBe('rgb(12, 34, 56)')
      expect(getFixtureStyle('yt-live-chat-paid-message-renderer').backgroundColor).toBe('rgb(200, 220, 240)')
    },
  )

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
    expect(iframeStyles).toContain('box-sizing: border-box !important;\n  opacity: 1 !important;\n  transform: translateY(0);')
    expect(iframeStyles).not.toContain('box-sizing: border-box !important;\n  overflow: hidden !important;\n  opacity: 1 !important;')
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

  it('scopes default edge padding and its transition while preserving native purchase/full-chat spacing', () => {
    // jsdom does not resolve padding custom properties; browser fixtures verify
    // the live targets and geometry, while this fixture checks CSS scoping.
    const spacingStyles = styleModules['chat-only.css']
      .replaceAll('var(--extension-chat-only-top-padding, 12px)', '12px')
      .replaceAll('var(--extension-chat-only-bottom-padding, 12px)', '12px')
    mountStyleFixture(
      `yt-live-chat-renderer { padding: 2px 6px 3px; }
       [data-nested-contents] { padding: 7px; }
       ${spacingStyles}`,
      `<yt-live-chat-renderer><tp-yt-iron-pages id="content-pages"><div id="chat-messages"><div id="contents">
        <div id="ticker"><yt-live-chat-ticker-renderer></yt-live-chat-ticker-renderer></div>
        <yt-live-chat-item-list-renderer><div id="contents" data-nested-contents></div></yt-live-chat-item-list-renderer>
      </div></div></tp-yt-iron-pages></yt-live-chat-renderer>`,
    )
    const renderer = 'yt-live-chat-renderer'
    expect(getFixtureStyle(renderer).paddingTop).toBe('2px')
    expect(getFixtureStyle(renderer).paddingBottom).toBe('3px')

    document.body.classList.add('chat-only-mode', 'chat-only-display')

    expect(getFixtureStyle(renderer).paddingTop).toBe('12px')
    expect(getFixtureStyle(renderer).paddingBottom).toBe('12px')
    expect(getFixtureStyle(renderer).paddingLeft).toBe('6px')
    expect(getFixtureStyle(renderer).boxSizing).toBe('border-box')
    expect(getFixtureStyle('[data-nested-contents]').paddingTop).toBe('7px')
    expect(getFixtureStyle('#ticker > yt-live-chat-ticker-renderer').marginTop).toBe('0px')

    document.body.classList.remove('chat-only-display')

    expect(getFixtureStyle(renderer).paddingTop).toBe('12px')
    expect(getFixtureStyle(renderer).paddingBottom).toBe('12px')
    expect(getFixtureStyle(renderer).boxSizing).toBe('border-box')

    expect(getFixtureStyle(renderer).transitionProperty).toBe('padding-top, padding-bottom')
    expect(getFixtureStyle(renderer).transitionDuration).toBe('260ms')

    document.body.classList.add('chat-only-measuring')
    expect(getFixtureStyle(renderer).paddingTop).toBe('12px')
    expect(getFixtureStyle(renderer).paddingBottom).toBe('12px')
    document.body.classList.remove('chat-only-measuring')

    document.body.classList.add('ylc-native-purchase-active')

    expect(getFixtureStyle(renderer).paddingTop).toBe('2px')
    expect(getFixtureStyle(renderer).paddingBottom).toBe('3px')

    document.body.classList.remove('ylc-native-purchase-active')

    expect(getFixtureStyle(renderer).paddingTop).toBe('12px')
    expect(getFixtureStyle(renderer).paddingBottom).toBe('12px')

    document.body.classList.remove('chat-only-mode')

    expect(getFixtureStyle(renderer).paddingTop).toBe('2px')
    expect(getFixtureStyle(renderer).paddingBottom).toBe('3px')
  })

  it('lets header menus escape while expanded and clips them while collapsed', () => {
    mountStyleFixture(
      styleModules['chat-only.css'],
      '<yt-live-chat-header-renderer><button>Chat mode</button></yt-live-chat-header-renderer>',
    )
    const header = document.querySelector('yt-live-chat-header-renderer')
    if (!header) throw new Error('Missing chat header.')

    const expanded = getComputedStyle(header)
    expect(expanded.height).toBe('56px')
    expect(expanded.overflow).toBe('visible')
    expect(expanded.position).toBe('relative')
    expect(expanded.zIndex).toBe('2')

    document.body.classList.add('chat-only-display')

    const collapsed = getComputedStyle(header)
    expect(collapsed.height).toBe('0px')
    expect(collapsed.overflow).toBe('hidden')
    expect(collapsed.opacity).toBe('0')
    expect(collapsed.pointerEvents).toBe('none')
  })

  it('keeps user display settings as iframe-internal variables', () => {
    expect(iframeStyles).toContain('#items yt-live-chat-author-chip.yt-live-chat-text-message-renderer')
    expect(iframeStyles).not.toContain('div#items')
    expect(iframeStyles).toContain('display: var(--extension-user-name-display);')
    expect(iframeStyles).toContain('display: var(--extension-user-icon-display);')
    expect(iframeStyles).toContain('display: var(--extension-super-chat-bar-display);')
  })

  it('themes menu surfaces, labels, and icons while preserving disabled and unrelated native colors', () => {
    const menuStyles = styleModules['menus.css']
      .replaceAll('var(--extension-yt-live-font-color)', 'rgb(18, 52, 86)')
      .replaceAll('var(--extension-yt-live-secondary-font-color)', 'rgb(92, 104, 116)')
      .replaceAll('var(--extension-yt-live-menu-background-color)', 'rgb(30, 50, 70)')
      .replaceAll('var(--extension-yt-live-menu-hover-background-color)', 'rgb(40, 60, 80)')
    mountStyleFixture(
      `
        tp-yt-iron-dropdown, ytd-menu-popup-renderer, tp-yt-paper-listbox, #items {
          background: rgb(250, 250, 250); color: rgb(15, 15, 15);
        }
        .item, yt-formatted-string, .ytSpecIconShapeHost, svg, path { color: rgb(201, 80, 40); }
        svg, path { fill: rgb(201, 80, 40); }
        ${menuStyles}
      `,
      `
        <tp-yt-iron-dropdown id="dropdown">
          <tp-yt-paper-listbox id="listbox">
            <tp-yt-paper-item id="enabled-item">
              <tp-yt-paper-item-body>
                <span id="menu-label" class="item">Menu item</span>
                <yt-icon><span id="menu-icon" class="ytSpecIconShapeHost"><svg><path id="menu-path" /></svg></span></yt-icon>
              </tp-yt-paper-item-body>
            </tp-yt-paper-item>
            <tp-yt-paper-item aria-disabled="true">
              <tp-yt-paper-item-body>
                <span id="disabled-menu-label" class="item">Disabled item</span>
                <yt-icon><span id="disabled-menu-icon" class="ytSpecIconShapeHost"><svg><path id="disabled-menu-path" /></svg></span></yt-icon>
              </tp-yt-paper-item-body>
            </tp-yt-paper-item>
          </tp-yt-paper-listbox>
        </tp-yt-iron-dropdown>
        <ytd-menu-popup-renderer id="popup">
          <div id="items">
            <ytd-menu-service-item-renderer>
              <yt-formatted-string id="service-label">Service action</yt-formatted-string>
              <yt-icon><svg><path id="service-path" /></svg></yt-icon>
            </ytd-menu-service-item-renderer>
            <ytd-menu-navigation-item-renderer disabled>
              <yt-formatted-string id="disabled-navigation-label">Disabled navigation</yt-formatted-string>
              <yt-icon><svg><path id="disabled-navigation-path" /></svg></yt-icon>
            </ytd-menu-navigation-item-renderer>
            <yt-live-chat-toggle-renderer><span id="toggle-label">Menu toggle</span></yt-live-chat-toggle-renderer>
          </div>
        </ytd-menu-popup-renderer>
        <svg><path id="unrelated-semantic-icon" /></svg>
      `,
    )

    for (const selector of ['#menu-label', '#menu-icon', '#menu-path', '#service-label', '#service-path', '#toggle-label']) {
      expect(getComputedColor(selector), selector).toBe('rgb(18, 52, 86)')
    }
    for (const selector of [
      '#disabled-menu-label',
      '#disabled-menu-icon',
      '#disabled-menu-path',
      '#disabled-navigation-label',
      '#disabled-navigation-path',
    ]) {
      expect(getComputedColor(selector), selector).toBe('rgb(92, 104, 116)')
    }
    for (const selector of ['#menu-path', '#service-path']) {
      expect(getFixtureStyle(selector).fill, selector).toBe('rgb(18, 52, 86)')
    }
    for (const selector of ['#disabled-menu-path', '#disabled-navigation-path']) {
      expect(getFixtureStyle(selector).fill, selector).toBe('rgb(92, 104, 116)')
    }
    expect(getFixtureStyle('#unrelated-semantic-icon').fill).toBe('rgb(201, 80, 40)')
    for (const selector of ['#dropdown', '#popup']) {
      const surface = getFixtureStyle(selector)
      expect(surface.backgroundColor, selector).toBe('rgba(0, 0, 0, 0)')
      expect(surface.borderRadius, selector).toBe('8px')
      expect(surface.overflow, selector).toBe('hidden')
    }
    expect(getFixtureStyle('#listbox').backgroundColor).toBe('rgb(30, 50, 70)')
    expect(getFixtureStyle('#items').backgroundColor).toBe('rgb(30, 50, 70)')
    document.querySelector('#enabled-item')?.classList.add('iron-selected')
    expect(getFixtureStyle('#enabled-item').backgroundColor).toBe('rgb(40, 60, 80)')
  })

  it('keeps purchase scrolling on the selected page without clipping the input picker', () => {
    mountStyleFixture(
      `yt-live-chat-app { min-width: 298px; min-height: 320px; }
       #panel-pages { overflow: visible; min-height: auto; }
       [hidden] { display: none !important; }
       ${styleModules['frame.css']}
       ${styleModules['monetization.css']}`,
      `<yt-live-chat-app><div id="panel-pages">
        <div id="input-panel" class="iron-selected"><yt-live-chat-message-input-renderer product-picker-open>
          <yt-live-chat-product-picker-panel-view-model></yt-live-chat-product-picker-panel-view-model>
        </yt-live-chat-message-input-renderer></div>
        <div id="buy-flow" hidden><yt-live-chat-message-buy-flow-renderer></yt-live-chat-message-buy-flow-renderer></div>
        <div id="super-sticker-buy-flow" hidden><yt-live-chat-paid-sticker-panel-renderer></yt-live-chat-paid-sticker-panel-renderer></div>
        <div id="sponsorships-gift-buy-flow" hidden><ytd-sponsorships-gift-offer-renderer></ytd-sponsorships-gift-offer-renderer></div>
      </div></yt-live-chat-app>`,
    )

    const app = document.querySelector('yt-live-chat-app')
    const pages = document.querySelector('#panel-pages')
    if (!app || !pages) throw new Error('Missing purchase layout fixture')
    expect(getComputedStyle(app).minHeight).toBe('0px')
    expect(getComputedStyle(app).minWidth).toBe('0px')
    expect(getComputedStyle(pages).overflow).toBe('visible')

    document.body.classList.add('ylc-native-purchase-active')
    expect(getComputedStyle(app).minHeight).toBe('0px')
    expect(getComputedStyle(app).minWidth).toBe('0px')
    expect(getComputedStyle(pages).overflow).toBe('visible')

    for (const selector of ['#buy-flow', '#super-sticker-buy-flow', '#sponsorships-gift-buy-flow']) {
      const flow = document.querySelector(selector)
      if (!flow) throw new Error(`Missing native purchase page: ${selector}`)
      expect(getComputedStyle(flow).display).toBe('none')
      flow.classList.add('iron-selected')
      flow.removeAttribute('hidden')
      expect(getComputedStyle(pages).overflow).toBe('auto')
      expect(getComputedStyle(pages).minHeight).toBe('0px')
      expect(getComputedStyle(pages).getPropertyValue('scrollbar-width')).toBe('thin')
      expect(getComputedStyle(pages).getPropertyValue('overscroll-behavior')).toBe('contain')
      flow.classList.remove('iron-selected')
      flow.setAttribute('hidden', '')
      expect(getComputedStyle(pages).overflow).toBe('visible')
    }

    document.body.classList.remove('ylc-native-purchase-active')
    expect(getComputedStyle(app).minHeight).toBe('0px')
    expect(getComputedStyle(app).minWidth).toBe('0px')
    document.body.classList.remove('custom-yt-app-live-chat-extension')
    expect(getComputedStyle(app).minHeight).toBe('320px')
    expect(getComputedStyle(app).minWidth).toBe('298px')
  })

  it.each(['yt-live-chat-message-input-renderer', 'yt-live-chat-restricted-participation-renderer'])(
    'lets an open picker escape the %s clipping boundary',
    inputTag => {
      mountStyleFixture(
        `#input-panel, ${inputTag} { overflow: hidden; }
         ${styleModules['frame.css']}
         ${styleModules['monetization.css']}`,
        `<div id="input-panel"><${inputTag}><yt-live-chat-product-picker-panel-view-model></yt-live-chat-product-picker-panel-view-model></${inputTag}></div>`,
      )

      const input = document.querySelector(inputTag)
      const panel = document.querySelector('#input-panel')
      const picker = document.querySelector('yt-live-chat-product-picker-panel-view-model')
      if (!input || !panel || !picker) throw new Error('Missing native input fixture')
      expect(getComputedStyle(panel).overflow).toBe('hidden')
      expect(getComputedStyle(input).overflow).toBe('hidden')

      input.setAttribute('product-picker-open', '')
      expect(getComputedStyle(panel).overflow).toBe('visible')
      expect(getComputedStyle(input).overflow).toBe('visible')
      expect(getComputedStyle(picker).overflowY).toBe('auto')
      expect(getComputedStyle(picker).getPropertyValue('scrollbar-width')).toBe('thin')
      expect(getComputedStyle(picker).getPropertyValue('overscroll-behavior')).toBe('contain')

      input.removeAttribute('product-picker-open')
      expect(getComputedStyle(panel).overflow).toBe('hidden')
      expect(getComputedStyle(input).overflow).toBe('hidden')
    },
  )

  it.each(
    [
      { palette: 'custom dark over native light', foreground: '245, 240, 230', nativeHover: '222, 241, 255' },
      { palette: 'custom white over native dark', foreground: '15, 15, 15', nativeHover: '38, 56, 80' },
    ].flatMap(palette => [false, true].map(hovered => ({ ...palette, hovered }))),
  )('keeps $palette gift quantities paired while hovered=$hovered', ({ foreground, nativeHover, hovered }) => {
    const monetization = styleModules['monetization.css']
      .replaceAll('var(--extension-yt-live-font-color)', `rgb(${foreground})`)
      .replaceAll('var(--extension-yt-live-menu-hover-background-color)', `rgba(${foreground}, 0.12)`)
    mountStyleFixture(
      `.ytSpecButtonShapeNextText { color: rgb(6, 95, 212); background: transparent; }
       .ytSpecButtonShapeNextText:hover { background: rgb(${nativeHover}); }
       #disabled-quantity, #aria-disabled-quantity { color: rgb(96, 96, 96); background: rgb(204, 204, 204); }
       #filled-quantity { color: rgb(241, 241, 241); background: rgb(6, 95, 212); }
       #tonal-quantity { color: rgb(6, 95, 212); background: rgb(222, 241, 255); }
       ${monetization}`,
      `<ytd-sponsorships-gift-offer-body-renderer>
        <button id="quantity" class="ytSpecButtonShapeNextText"><span class="ytSpecButtonShapeNextButtonTextContent">Price</span></button>
        <button id="disabled-quantity" class="ytSpecButtonShapeNextText" disabled>Unavailable</button>
        <button id="aria-disabled-quantity" class="ytSpecButtonShapeNextText" aria-disabled="true">Unavailable</button>
        <button id="filled-quantity" class="ytSpecButtonShapeNextText ytSpecButtonShapeNextFilled">Purchase</button>
        <button id="tonal-quantity" class="ytSpecButtonShapeNextText ytSpecButtonShapeNextTonal">Tonal action</button>
      </ytd-sponsorships-gift-offer-body-renderer>`,
    )

    const quantity = document.querySelector('#quantity')
    if (!quantity) throw new Error('Missing quantity action')
    // Read each fresh fixture only after the mouse event: jsdom otherwise caches
    // computed styles across hover changes. Browser fixtures cover real movement.
    if (hovered) quantity.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    expect(getComputedStyle(quantity).color).toBe(`rgb(${foreground})`)
    expect(getComputedColor('#quantity span')).toBe(`rgb(${foreground})`)
    expect(getComputedStyle(quantity).backgroundColor).toBe(hovered ? `rgba(${foreground}, 0.12)` : 'rgba(0, 0, 0, 0)')

    for (const selector of ['#disabled-quantity', '#aria-disabled-quantity']) {
      const disabled = document.querySelector(selector)
      if (!disabled) throw new Error('Missing disabled quantity action')
      expect(getComputedStyle(disabled).color).toBe('rgb(96, 96, 96)')
      expect(getComputedStyle(disabled).backgroundColor).toBe('rgb(204, 204, 204)')
    }
    const filled = document.querySelector('#filled-quantity')
    const tonal = document.querySelector('#tonal-quantity')
    if (!filled || !tonal) throw new Error('Missing native semantic quantity actions')
    expect(getComputedStyle(filled).color).toBe('rgb(241, 241, 241)')
    expect(getComputedStyle(filled).backgroundColor).toBe('rgb(6, 95, 212)')
    expect(getComputedStyle(tonal).color).toBe('rgb(6, 95, 212)')
    expect(getComputedStyle(tonal).backgroundColor).toBe('rgb(222, 241, 255)')
  })

  it('themes logged-in support and Super Chat picker surfaces', () => {
    expect(iframeStyles).toContain('yt-live-chat-product-picker-panel-view-model')
    expect(iframeStyles).toContain('yt-live-chat-product-picker-panel-item-view-model')
    expect(iframeStyles).toContain('yt-live-chat-paid-sticker-panel-renderer')
    expect(iframeStyles).toContain(
      'yt-live-chat-product-picker-panel-view-model {\n  background: var(--extension-yt-live-floating-panel-background-color) !important;',
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
    mountStyleFixture(
      styleModules['monetization.css']
        .replaceAll('var(--extension-yt-live-font-color)', 'rgb(240, 230, 220)')
        .replaceAll('var(--extension-yt-live-secondary-font-color)', 'rgb(160, 150, 140)'),
      `<yt-live-chat-product-picker-panel-view-model>
        <span class="ytSpecIconShapeHost"><svg><path /></svg></span>
        <yt-live-chat-product-picker-panel-item-view-model><div id="text">
          <yt-attributed-string><span id="picker-primary">Super Chat</span></yt-attributed-string>
          <yt-attributed-string><span id="picker-secondary">Purchase description</span></yt-attributed-string>
        </div></yt-live-chat-product-picker-panel-item-view-model>
      </yt-live-chat-product-picker-panel-view-model><yt-live-chat-message-buy-flow-renderer><div id="buy-flow">Native flow</div></yt-live-chat-message-buy-flow-renderer>`,
    )
    expect(getFixtureStyle('#buy-flow').backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(getComputedColor('.ytSpecIconShapeHost')).toBe('rgb(240, 230, 220)')
    expect(getComputedColor('#picker-primary')).toBe('rgb(240, 230, 220)')
    expect(getComputedColor('#picker-secondary')).toBe('rgb(160, 150, 140)')
    expect(iframeStyles).toContain('yt-live-chat-product-picker-panel-item-view-model:hover #container')
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
    expect(iframeStyles).toContain(
      '#title.yt-emoji-picker-category-renderer {\n  color: var(--extension-yt-live-secondary-font-color) !important;\n  background: var(--extension-yt-live-control-background-color) !important;\n}',
    )
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

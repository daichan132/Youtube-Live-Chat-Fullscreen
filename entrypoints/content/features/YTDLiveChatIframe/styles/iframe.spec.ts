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

  it('themes top fan text while preserving native badges and unrelated panels', () => {
    const styles = iframeStyles
      .replaceAll('var(--extension-yt-live-font-color)', 'rgb(18, 52, 86)')
      .replaceAll('var(--extension-yt-live-secondary-font-color)', 'rgb(92, 104, 116)')
    mountStyleFixture(
      `
        ytd-engagement-panel-section-list-renderer, ytvl-live-leaderboard-item-view-model,
        #title, .ytvlLiveLeaderboardItemViewModelRankNumber, .ytvlLiveLeaderboardItemChannelContentViewModelChannelName,
        .ytvlLiveLeaderboardItemViewModelPoints, .ytvlLiveLeaderboardItemActionContentViewModelActionDescription {
          color: rgb(201, 80, 40); background-color: rgb(240, 220, 180);
        }
        ${styles}
      `,
      `
        <ytvl-live-viewer-leaderboard-chat-entry-point-view-model id="entry">Top fans</ytvl-live-viewer-leaderboard-chat-entry-point-view-model>
        <ytd-engagement-panel-section-list-renderer target-id="PAlive_viewer_leaderboard" id="leaderboard">
          <ytd-engagement-panel-title-header-renderer>
            <span id="title">Top fans</span><svg><path id="header-icon" /></svg>
          </ytd-engagement-panel-title-header-renderer>
          <ytvl-live-leaderboard-item-view-model id="badge">
            <span id="rank" class="ytvlLiveLeaderboardItemViewModelRankNumber">1</span>
            <span id="name" class="ytvlLiveLeaderboardItemChannelContentViewModelChannelName">Viewer</span>
            <span id="points" class="ytvlLiveLeaderboardItemViewModelPoints">100 XP</span>
            <span id="description" class="ytvlLiveLeaderboardItemActionContentViewModelActionDescription">Details</span>
          </ytvl-live-leaderboard-item-view-model>
        </ytd-engagement-panel-section-list-renderer>
        <ytd-engagement-panel-section-list-renderer target-id="other"><span id="other-title">Other</span></ytd-engagement-panel-section-list-renderer>
      `,
    )

    for (const selector of ['#title', '#rank', '#name']) expect(getComputedColor(selector), selector).toBe('rgb(18, 52, 86)')
    for (const selector of ['#points', '#description']) expect(getComputedColor(selector), selector).toBe('rgb(92, 104, 116)')
    expect(getFixtureStyle('#header-icon').fill).toBe('rgb(18, 52, 86)')
    for (const selector of ['#leaderboard', '#badge', '#other-title']) expect(getComputedColor(selector), selector).toBe('rgb(201, 80, 40)')
    expect(getFixtureStyle('#badge').backgroundColor).toBe('rgb(240, 220, 180)')
    expect(getFixtureStyle('#entry').display).not.toBe('none')
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

  it('themes purchase surfaces and preserves the native backstory color pair', () => {
    const monetization = styleModules['monetization.css']
      .replaceAll('var(--extension-yt-live-font-color)', 'rgb(240, 230, 220)')
      .replaceAll('var(--extension-yt-live-secondary-font-color)', 'rgb(160, 150, 140)')
      .replaceAll('var(--extension-yt-live-floating-panel-background-color)', 'rgb(30, 40, 50)')
      .replaceAll('var(--extension-yt-live-backdrop-filter)', 'blur(8px)')
    mountStyleFixture(
      `yt-live-chat-product-picker-panel-view-model, yt-live-chat-message-buy-flow-renderer,
       yt-live-chat-paid-sticker-panel-renderer, yt-live-chat-super-sticker-preview-renderer,
       yt-live-chat-super-sticker-pack-renderer, #loading, #footer { background: rgb(250, 250, 250); }
       ${monetization}`,
      `<yt-live-chat-product-picker-panel-view-model id="picker">
        <span class="ytSpecIconShapeHost"><svg><path /></svg></span>
        <yt-live-chat-product-picker-panel-item-view-model><div id="text">
          <yt-attributed-string><span id="picker-primary">Super Chat</span></yt-attributed-string>
          <yt-attributed-string><span id="picker-secondary">Purchase description</span></yt-attributed-string>
        </div></yt-live-chat-product-picker-panel-item-view-model>
      </yt-live-chat-product-picker-panel-view-model>
      <yt-live-chat-message-buy-flow-renderer id="buy-flow"></yt-live-chat-message-buy-flow-renderer>
      <yt-live-chat-paid-sticker-panel-renderer id="sticker-panel"></yt-live-chat-paid-sticker-panel-renderer>
      <yt-live-chat-super-sticker-preview-renderer id="sticker-preview"><div id="footer"></div></yt-live-chat-super-sticker-preview-renderer>
      <yt-live-chat-super-sticker-pack-renderer id="sticker-pack"></yt-live-chat-super-sticker-pack-renderer>
      <yt-live-chat-super-sticker-pack-backstory-renderer id="backstory"><span id="content">Story</span></yt-live-chat-super-sticker-pack-backstory-renderer>
      <div id="panel-pages"><div id="loading" class="yt-live-chat-renderer"><tp-yt-paper-spinner-lite class="yt-live-chat-renderer"></tp-yt-paper-spinner-lite></div></div>`,
    )

    expect(getFixtureStyle('#picker').backgroundColor).toBe('rgb(30, 40, 50)')
    for (const selector of ['#buy-flow', '#sticker-panel', '#sticker-preview', '#sticker-pack', '#footer', '#loading']) {
      expect(getFixtureStyle(selector).backgroundColor, selector).toBe('rgba(0, 0, 0, 0)')
    }
    expect(getFixtureStyle('#sticker-pack').overflowY).toBe('auto')
    expect(getComputedColor('.ytSpecIconShapeHost')).toBe('rgb(240, 230, 220)')
    expect(getComputedColor('#picker-primary')).toBe('rgb(240, 230, 220)')
    expect(getComputedColor('#picker-secondary')).toBe('rgb(160, 150, 140)')
    expect(getComputedColor('#loading')).toBe('rgb(240, 230, 220)')
    expect(getFixtureStyle('tp-yt-paper-spinner-lite').getPropertyValue('--paper-spinner-color').replace(/\s/g, '')).toBe(
      'rgb(240,230,220)',
    )
    expect(getFixtureStyle('#backstory').backgroundColor).toBe('rgb(255, 255, 255)')
    expect(getComputedColor('#backstory #content')).toBe('rgb(15, 15, 15)')
  })
})

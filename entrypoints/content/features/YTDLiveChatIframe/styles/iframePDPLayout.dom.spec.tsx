import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, expect, it } from 'vitest'

const monetization = readFileSync(resolve(process.cwd(), 'entrypoints/content/features/YTDLiveChatIframe/styles/monetization.css'), 'utf8')
const nativeStyles = `
  [hidden] { display: none !important; }
  ytd-engagement-panel-section-list-renderer { display:flex; flex-direction:column; height:100%; }
  ytd-engagement-panel-section-list-renderer > #header { flex:none; height:56px; }
  ytd-engagement-panel-section-list-renderer > #content { height:100%; min-height:300px; overflow:hidden; }
  ytd-engagement-panel-title-header-renderer { color:rgb(15,15,15); }
  ytd-engagement-panel-title-header-renderer :is(button, svg, path) { color:rgb(15,15,15); fill:currentColor; }
  ytd-flow-root-renderer, ytd-flow-step-renderer { display:flex; flex-direction:column; }
  #flow-step.ytd-flow-root-renderer { flex:1; flex-basis:.000000001px; }
  #scroller.ytd-flow-step-renderer { height:300px; overflow:auto; }
  .bottom-bar-view-model.ytd-flow-step-renderer { margin:16px 24px 24px; }
  ytd-flow-step-renderer[bottom-bar] #content.ytd-flow-step-renderer { max-height:min(616px, 100vh - 230px); }
  ytd-flow-step-renderer[fit-content] #content.ytd-flow-step-renderer { max-height:fit-content; overflow-y:auto; }
  .ytPdpViewModelInternalScrolling .ytPdpViewModelColumnContainer { max-height:70vh; overflow-y:auto; }
  .ytPdpViewModelColumn { min-width:360px; padding:12px; box-sizing:border-box; }
  yt-live-chat-header-renderer { position:relative; z-index:2 !important; }
  #input-panel { position:relative; overflow:hidden; }
  yt-live-chat-product-picker-panel-view-model { position:absolute; bottom:128px; }
`
const markup = `
  <ytd-engagement-panel-section-list-renderer class="iron-selected" target-id="PAcommerce_catalog_selection">
    <div id="header"><ytd-engagement-panel-title-header-renderer>
      <h2 id="title"><span id="title-text">Buy Jewels</span></h2>
      <div id="navigation-button"><button><span class="ytSpecIconShapeHost"><svg><path id="back-path" /></svg></span></button></div>
      <div id="information-button"><button><svg><path id="info-path" /></svg></button></div>
    </ytd-engagement-panel-title-header-renderer></div>
    <div id="content" class="ytd-engagement-panel-section-list-renderer">
      <ytd-flow-root-renderer><div id="content" class="ytd-flow-root-renderer"><div id="flow-step" class="ytd-flow-root-renderer">
        <ytd-flow-step-renderer fit-content bottom-bar>
          <tp-yt-paper-dialog-scrollable id="scroller" class="ytd-flow-step-renderer"><div id="content" class="ytd-flow-step-renderer">
            <pdp-view-model class="ytPdpViewModelInternalScrolling"><div class="ytPdpViewModelColumnContainer"><div class="ytPdpViewModelColumn">
              <label id="price-card" style="background:rgb(255,255,255);color:rgb(15,15,15)">Native price</label>
              <span id="artwork" style="color:rgb(255,120,0)">Artwork</span>
            </div></div></pdp-view-model>
          </div></tp-yt-paper-dialog-scrollable>
          <div id="bottom-bar" class="ytd-flow-step-renderer"><pdp-view-model class="ytPdpViewModelUseBottomBarLayout">
            <div class="ytPdpViewModelColumnContainer"><div class="ytPdpViewModelColumn">
              <button id="buy" style="background:rgb(6,95,212);color:rgb(255,255,255)">Buy</button>
            </div></div>
          </pdp-view-model></div>
        </ytd-flow-step-renderer>
      </div></div></ytd-flow-root-renderer>
    </div>
  </ytd-engagement-panel-section-list-renderer>
  <ytd-engagement-panel-section-list-renderer id="other-panel"><ytd-engagement-panel-title-header-renderer>Other panel</ytd-engagement-panel-title-header-renderer></ytd-engagement-panel-section-list-renderer>
`
const mount = (content = markup, foreground = 'rgb(245, 240, 230)') => {
  document.body.className = 'custom-yt-app-live-chat-extension ylc-native-purchase-active'
  document.body.innerHTML = content
  const style = document.createElement('style')
  style.textContent = nativeStyles + monetization.replaceAll('var(--extension-yt-live-font-color)', foreground)
  document.head.append(style)
}
const styleOf = (selector: string) => {
  const element = document.querySelector(selector)
  if (!element) throw new Error(`Missing PDP fixture node ${selector}`)
  return getComputedStyle(element)
}
afterEach(() => {
  document.head.replaceChildren()
  document.body.replaceChildren()
  document.body.className = ''
})

it.each([false, true])('keeps one bounded Jewels scroller with native footer margin variant=%s', hasFooterMargins => {
  mount()
  if (hasFooterMargins) document.querySelector('#bottom-bar')?.classList.add('bottom-bar-view-model')
  const outer = styleOf('ytd-engagement-panel-section-list-renderer > #content')
  expect(outer.minHeight).toBe('0px')
  expect(outer.height).toBe('0px')
  expect(outer.flexGrow).toBe('1')
  expect(outer.overflow).toBe('auto')
  expect(outer.getPropertyValue('scroll-padding-block')).toBe('8px')
  expect(styleOf('#buy').getPropertyValue('scroll-margin-block')).toBe('8px')
  expect(outer.getPropertyValue('overscroll-behavior')).toBe('contain')
  for (const selector of [
    'ytd-flow-root-renderer',
    '#flow-step',
    'ytd-flow-step-renderer',
    '#scroller',
    '#content.ytd-flow-step-renderer',
    '.ytPdpViewModelColumnContainer',
  ]) {
    const inner = styleOf(selector)
    expect(inner.height, selector).toBe('auto')
    expect(inner.maxHeight, selector).toBe('none')
    expect(inner.overflow, selector).toBe('visible')
  }
  for (const column of document.querySelectorAll('.ytPdpViewModelColumn')) {
    expect(getComputedStyle(column).minWidth).toBe('0px')
    expect(getComputedStyle(column).width).toBe('100%')
  }
  expect(styleOf('#header').flexShrink).toBe('0')
  const footer = styleOf('#bottom-bar')
  if (hasFooterMargins) {
    expect(footer.marginLeft).toBe('24px')
    expect(footer.marginRight).toBe('24px')
  } else {
    expect(footer.marginLeft).not.toBe('24px')
  }
  expect(footer.width).toBe('auto')
})

it.each(['rgb(245, 240, 230)', 'rgb(15, 15, 15)'])('themes only neutral Jewels header chrome for %s', foreground => {
  mount(markup, foreground)
  for (const selector of ['#title-text', '#navigation-button button', '#back-path', '#info-path']) {
    expect(styleOf(selector).color, selector).toBe(foreground)
  }
  expect(styleOf('#price-card').backgroundColor).toBe('rgb(255, 255, 255)')
  expect(styleOf('#price-card').color).toBe('rgb(15, 15, 15)')
  expect(styleOf('#buy').backgroundColor).toBe('rgb(6, 95, 212)')
  expect(styleOf('#buy').color).toBe('rgb(255, 255, 255)')
  expect(styleOf('#artwork').color).toBe('rgb(255, 120, 0)')
  expect(styleOf('#other-panel ytd-engagement-panel-title-header-renderer').color).toBe('rgb(15, 15, 15)')
})

it('leaves inactive and hidden native panels under native control', () => {
  mount()
  const panel = document.querySelector('ytd-engagement-panel-section-list-renderer') as HTMLElement
  panel.classList.remove('iron-selected')
  expect(styleOf('.ytPdpViewModelColumn').minWidth).toBe('360px')
  expect(styleOf('#content.ytd-engagement-panel-section-list-renderer').overflow).toBe('hidden')
  panel.classList.add('iron-selected')
  panel.hidden = true
  expect(getComputedStyle(panel).display).toBe('none')
  document.body.classList.remove('ylc-native-purchase-active')
  expect(styleOf('.ytPdpViewModelColumn').minWidth).toBe('360px')
})

it.each(['yt-live-chat-message-input-renderer', 'yt-live-chat-restricted-participation-renderer'])(
  'raises only an open %s picker above the native header',
  tag => {
    mount(
      `<yt-live-chat-header-renderer></yt-live-chat-header-renderer><div id="input-panel"><${tag}></${tag}></div><${tag} id="fallback"></${tag}>`,
    )
    const input = document.querySelector(tag) as HTMLElement
    const panel = document.querySelector('#input-panel') as HTMLElement
    const fallback = document.querySelector('#fallback') as HTMLElement
    expect(getComputedStyle(panel).zIndex).not.toBe('3')
    input.setAttribute('product-picker-open', '')
    expect(getComputedStyle(panel).zIndex).toBe('3')
    expect(getComputedStyle(panel).overflow).toBe('visible')
    input.removeAttribute('product-picker-open')
    expect(getComputedStyle(panel).zIndex).not.toBe('3')
    fallback.setAttribute('product-picker-open', '')
    expect(getComputedStyle(fallback).zIndex).toBe('3')
    expect(getComputedStyle(fallback).position).toBe('relative')
    fallback.removeAttribute('product-picker-open')
    expect(getComputedStyle(fallback).zIndex).not.toBe('3')
  },
)

it('keeps legacy picker offsets at the current native bottom inset within the viewport height cap', () => {
  mount(`<yt-live-chat-message-input-renderer product-picker-open>
    <yt-live-chat-product-picker-panel-view-model></yt-live-chat-product-picker-panel-view-model>
  </yt-live-chat-message-input-renderer>`)
  const picker = 'yt-live-chat-product-picker-panel-view-model'
  expect(styleOf(picker).bottom).toBe('8px')
  expect(Number.parseFloat(styleOf(picker).maxHeight)).toBe(window.innerHeight - 16)
  expect(styleOf(picker).overflowY).toBe('auto')
  document.body.classList.remove('custom-yt-app-live-chat-extension')
  expect(styleOf(picker).bottom).toBe('128px')
})

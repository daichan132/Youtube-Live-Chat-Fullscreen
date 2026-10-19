import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, expect, it } from 'vitest'

const styles = readFileSync(resolve(process.cwd(), 'entrypoints/content/features/YTDLiveChatIframe/styles/monetization.css'), 'utf8')
const native = `
  yt-live-chat-message-buy-flow-renderer { color: rgb(15,15,15); }
  #revamped-price-input .input-content > input { color: rgb(15,15,15); }
  .info-subscript.yt-live-chat-message-buy-flow-renderer,
  #disclaimer-text.yt-live-chat-message-buy-flow-renderer { color: rgb(96,96,96); }
  yt-live-chat-message-buy-flow-heading-renderer #heading-title { color: rgb(15,15,15); }
  yt-live-chat-message-buy-flow-renderer[message-too-long] #revamped-characters,
  #invalid-input-error { color: rgb(200,30,40); }
  yt-live-chat-super-sticker-preview-renderer #header { background-color: rgb(255,255,255); }
  yt-live-chat-super-sticker-preview-renderer h3 { color: rgb(15,15,15); }
  yt-live-chat-super-sticker-preview-renderer #right { color: rgb(96,96,96); }
  yt-live-chat-super-sticker-preview-renderer #back-button { color: rgb(6,95,212); }
  yt-live-chat-paid-sticker-panel-renderer #scroll-forward-button :is(button, .ytSpecIconShapeHost) { color: rgb(15,15,15); }
  [data-sticker-art] { color: rgb(213,158,34); fill: currentColor; }
  [data-native-buy] { color: rgb(255,255,255); background: rgb(6,95,212); }
  [data-native-disabled] { color: rgba(15,15,15,.3); background: rgba(0,0,0,.05); }
  yt-live-chat-paid-message-renderer { color: rgb(12,34,56); background: rgb(180,210,240); }
  #goal-disclaimer-container a { color: rgb(6,95,212); }
`

const mount = (foreground: string) => {
  document.body.className = 'custom-yt-app-live-chat-extension ylc-native-purchase-active'
  document.body.innerHTML = `
    <yt-live-chat-message-buy-flow-renderer>
      <yt-live-chat-message-buy-flow-heading-renderer><span id="heading-title">Highlight your message</span></yt-live-chat-message-buy-flow-heading-renderer>
      <div id="price"><tp-yt-paper-input id="revamped-price-input" class="yt-live-chat-message-buy-flow-renderer"><div class="input-content tp-yt-paper-input-container"><input value="500" /></div></tp-yt-paper-input></div>
      <span class="info-subscript yt-live-chat-message-buy-flow-renderer">Characters</span>
      <span id="revamped-characters" class="yt-live-chat-message-buy-flow-renderer">12/50</span>
      <span id="invalid-input-error">Invalid amount</span>
      <div id="goal-disclaimer-container"><yt-attributed-string id="disclaimer-text" class="yt-live-chat-message-buy-flow-renderer"><span class="ytAttributedStringHost">Native terms <a href="#terms">Terms</a></span></yt-attributed-string></div>
      <yt-live-chat-paid-message-renderer>Native paid card</yt-live-chat-paid-message-renderer>
      <button data-native-buy>Buy</button><button data-native-disabled disabled>Unavailable</button>
    </yt-live-chat-message-buy-flow-renderer>
    <yt-live-chat-paid-sticker-panel-renderer>
      <div id="scroll-forward-button"><button><span class="ytSpecIconShapeHost"><svg><path /></svg></span></button></div>
      <yt-live-chat-super-sticker-pack-renderer><svg data-sticker-art><path /></svg></yt-live-chat-super-sticker-pack-renderer>
      <yt-live-chat-super-sticker-preview-renderer>
        <div id="header"><h3>Sticker preview</h3><div id="right">2 minutes</div></div>
        <div id="back-button">Choose another sticker</div><button data-native-buy>Buy</button>
      </yt-live-chat-super-sticker-preview-renderer>
    </yt-live-chat-paid-sticker-panel-renderer>
    <section id="outside"><span class="info-subscript yt-live-chat-message-buy-flow-renderer">Outside</span></section>
  `
  const sheet = document.createElement('style')
  sheet.textContent =
    native +
    styles
      .replaceAll('var(--extension-yt-live-font-color)', foreground)
      .replaceAll('var(--extension-yt-live-secondary-font-color)', 'rgb(160, 170, 180)')
      .replaceAll('var(--extension-yt-live-link-color)', 'rgb(110, 180, 255)')
      .replaceAll('var(--extension-yt-live-control-background-color)', 'rgb(35, 40, 50)')
  document.head.append(sheet)
}
const styleOf = (selector: string) => {
  const element = document.querySelector(selector)
  if (!element) throw new Error(`Missing standard purchase node: ${selector}`)
  return getComputedStyle(element)
}

afterEach(() => {
  document.head.replaceChildren()
  document.body.replaceChildren()
  document.body.className = ''
})

it.each(['rgb(245, 240, 230)', 'rgb(15, 15, 15)', 'rgb(240, 120, 210)'])(
  'keeps modern amount input and neutral sticker chrome legible with %s',
  foreground => {
    mount(foreground)
    for (const selector of [
      '#revamped-price-input input',
      '#heading-title',
      'yt-live-chat-super-sticker-preview-renderer h3',
      'yt-live-chat-super-sticker-preview-renderer #back-button',
      '#scroll-forward-button button',
      '#scroll-forward-button .ytSpecIconShapeHost',
    ]) {
      expect(styleOf(selector).color, selector).toBe(foreground)
    }
    expect(styleOf('yt-live-chat-super-sticker-preview-renderer #header').backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(styleOf('.info-subscript').color).toBe('rgb(160, 170, 180)')
    expect(styleOf('#disclaimer-text').color).toBe('rgb(160, 170, 180)')
    expect(styleOf('yt-live-chat-super-sticker-preview-renderer #right').color).toBe('rgb(160, 170, 180)')
    expect(styleOf('#goal-disclaimer-container a').color).toBe('rgb(110, 180, 255)')
    expect(styleOf('#goal-disclaimer-container a').textDecorationLine).toBe('underline')
  },
)

it('preserves validation, paid-card, artwork, disabled and purchase button color pairs', () => {
  mount('rgb(245, 240, 230)')
  document.querySelector('yt-live-chat-message-buy-flow-renderer')?.setAttribute('message-too-long', '')
  expect(styleOf('#revamped-characters').color).toBe('rgb(200, 30, 40)')
  expect(styleOf('#invalid-input-error').color).toBe('rgb(200, 30, 40)')
  expect(styleOf('yt-live-chat-paid-message-renderer').color).toBe('rgb(12, 34, 56)')
  expect(styleOf('yt-live-chat-paid-message-renderer').backgroundColor).toBe('rgb(180, 210, 240)')
  expect(styleOf('[data-sticker-art]').color).toBe('rgb(213, 158, 34)')
  expect(styleOf('[data-native-buy]').color).toBe('rgb(255, 255, 255)')
  expect(styleOf('[data-native-buy]').backgroundColor).toBe('rgb(6, 95, 212)')
  expect(styleOf('[data-native-disabled]').color).toBe('rgba(15, 15, 15, 0.3)')
  expect(styleOf('#outside .info-subscript').color).toBe('rgb(96, 96, 96)')
  document.body.className = ''
  expect(styleOf('#revamped-price-input input').color).toBe('rgb(15, 15, 15)')
})

it.each([
  { foreground: 'rgb(15, 15, 15)', background: 'rgb(255, 255, 255)' },
  { foreground: 'rgb(241, 241, 241)', background: 'rgb(15, 15, 15)' },
])('restores a complete native donation card pair with $background after chat surface tokens become transparent', palette => {
  document.body.className = 'custom-yt-app-live-chat-extension'
  document.body.innerHTML = `<ytd-donation-amount-picker-renderer live-chat><div id="container">
    <span id="campaign-copy">Campaign information</span>
    <span id="donation-error">Native validation error</span>
    <button id="donation-buy">Donate</button>
    <div id="suggested-amount-buttons-row"></div>
  </div></ytd-donation-amount-picker-renderer>`
  const sheet = document.createElement('style')
  sheet.textContent =
    `body { color:rgb(240,180,225); }
     ytd-donation-amount-picker-renderer #container { background:transparent; }
     #donation-error { color:rgb(200,30,40); }
     #donation-buy { color:rgb(255,255,255); background:rgb(6,95,212); }` +
    styles
      .replaceAll('var(--yt-spec-base-background, #fff)', palette.background)
      .replaceAll('var(--yt-live-chat-primary-text-color, var(--yt-spec-text-primary, #0f0f0f))', palette.foreground)
  document.head.append(sheet)
  expect(styleOf('#container').backgroundColor).toBe(palette.background)
  expect(styleOf('#campaign-copy').color).toBe(palette.foreground)
  expect(styleOf('#donation-error').color).toBe('rgb(200, 30, 40)')
  expect(styleOf('#donation-buy').color).toBe('rgb(255, 255, 255)')
  expect(styleOf('#donation-buy').backgroundColor).toBe('rgb(6, 95, 212)')
  expect(styleOf('#suggested-amount-buttons-row').flexWrap).toBe('wrap')
  document.querySelector('ytd-donation-amount-picker-renderer')?.removeAttribute('live-chat')
  expect(styleOf('#container').backgroundColor).toBe('rgba(0, 0, 0, 0)')
})

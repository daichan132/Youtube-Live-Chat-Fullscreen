// Native component boundaries and layout traps observed in the public YouTube
// chat templates/CSS. Content and handlers are synthetic; there is no payment SDK.
const icon = '<span class="ytSpecIconShapeHost"><svg width="20" height="20" viewBox="0 0 24 24"><path d="M5 5h14v14H5z" /></svg></span>'
const close = (label: string, id = 'close-button') => `<div id="${id}"><button type="button" aria-label="${label}">${icon}</button></div>`
const choices = ['Super Chat', 'Modern Super Chat', 'Super Stickers', 'Membership gifts', 'Membership', 'Donation']
const paidCard = `<yt-live-chat-paid-message-renderer>
  <div id="header">Native paid preview</div><yt-live-chat-text-input-field-renderer>
    <div id="input" class="yt-live-chat-text-input-field-renderer" contenteditable="true" role="textbox" aria-label="Paid message draft">hello</div>
  </yt-live-chat-text-input-field-renderer>
</yt-live-chat-paid-message-renderer>`

export const standardPurchaseUiHtml = `
<style>
  :root { --yt-spec-base-background:rgb(255,255,255); --yt-live-chat-primary-text-color:rgb(15,15,15); --yt-live-chat-action-panel-background-color:rgb(255,255,255); }
  html,body { height:100%; margin:0; overflow:hidden; font:14px Arial,sans-serif; }
  yt-live-chat-app { display:block; height:100vh; min-height:320px; min-width:298px; }
  yt-live-chat-renderer { display:block; position:relative; height:100%; }
  #content-pages { display:block; height:100%; }
  #chat-messages { display:flex; flex-direction:column; height:100%; }
  #contents { display:flex; flex-direction:column; flex:1; min-height:0; }
  #chat { flex:1; min-height:0; overflow:hidden; }
  yt-live-chat-header-renderer { display:block; flex:none; height:56px; }
  #panel-pages { display:block; flex:none; min-height:0; max-height:100%; overflow:visible; }
  #fixture-messages,yt-live-chat-item-list-renderer,#item-scroller { display:block; height:100%; }
  #items { padding:12px; }
  #input-panel,yt-live-chat-message-input-renderer { display:block; position:relative; height:108px; flex:none; }
  #product-picker { position:absolute; right:8px; bottom:8px; }
  button,input { font:inherit; box-sizing:border-box; }
  button { min-height:36px; cursor:pointer; }
  button:disabled { cursor:default; }
  [hidden] { display:none !important; }
  yt-live-chat-product-picker-panel-view-model { display:block; position:absolute; inset:auto 0 108px; }
  yt-live-chat-product-picker-panel-view-model #header { display:flex; justify-content:space-between; align-items:center; padding:8px; }
  yt-live-chat-product-picker-panel-item-view-model { display:block; }
  yt-live-chat-product-picker-panel-item-view-model > button { width:100%; text-align:start; padding:8px 12px; background:transparent; border:0; }
  yt-live-chat-product-picker-panel-item-view-model #text yt-attributed-string { display:block; color:rgb(15,15,15); }
  yt-live-chat-product-picker-panel-item-view-model #text yt-attributed-string:not(:first-child) { color:rgb(96,96,96); font-size:12px; }
  yt-live-chat-message-buy-flow-renderer { display:block; color:rgb(15,15,15); background:white; }
  #preview.yt-live-chat-message-buy-flow-renderer { display:flex; flex-direction:column; }
  #header.yt-live-chat-message-buy-flow-renderer { display:flex; align-items:center; padding:8px; }
  #help.yt-live-chat-message-buy-flow-renderer { margin-inline-start:auto; }
  #info.yt-live-chat-message-buy-flow-renderer { padding:4px 16px; color:rgb(96,96,96); }
  yt-live-chat-message-buy-flow-heading-renderer { display:block; margin:10px 0 12px; }
  #heading-title.yt-live-chat-message-buy-flow-heading-renderer { color:rgb(15,15,15); display:block; font-size:16px; }
  #heading-text.yt-live-chat-message-buy-flow-heading-renderer { display:block; }
  #message.yt-live-chat-message-buy-flow-renderer { margin:0 16px; }
  #price.yt-live-chat-message-buy-flow-renderer { margin:8px 16px; }
  #price-input-container.yt-live-chat-message-buy-flow-renderer,#info-panel.yt-live-chat-message-buy-flow-renderer { display:flex; align-items:center; justify-content:space-between; }
  #revamped-price-input-container.yt-live-chat-message-buy-flow-renderer,#char-limit,#duration { display:flex; flex-direction:column; align-items:center; min-width:0; }
  .dim.yt-live-chat-message-buy-flow-renderer,.info-subscript.yt-live-chat-message-buy-flow-renderer { color:rgb(96,96,96); }
  .info-subscript { margin:2px 0; font-size:12px; }
  .info-script { font-weight:500; }
  #price-input,#revamped-price-input { display:block; width:64px; }
  .input-content.tp-yt-paper-input-container > tp-yt-iron-input { display:block; color:rgb(15,15,15); }
  #price-input input,#revamped-price-input input { width:64px; color:rgb(15,15,15); border:0; border-bottom:1px solid; background:transparent; padding:4px 0; }
  #price-slider { width:100%; height:48px; }
  #goal-disclaimer-container { display:flex; flex-direction:column; }
  #disclaimer-header.yt-live-chat-message-buy-flow-renderer,#disclaimer-text.yt-live-chat-message-buy-flow-renderer { display:block; margin:0 16px 4px; color:rgb(96,96,96); line-height:20px; }
  #goal-disclaimer-container a { color:rgb(6,95,212); }
  #buy-button.yt-live-chat-message-buy-flow-renderer { display:block; margin:8px 16px 16px; }
  #buy-button button { width:100%; }
  .native-buy { background:rgb(6,95,212); color:rgb(255,255,255); border:0; }
  .native-buy:disabled { background:rgb(230,230,230); color:rgba(15,15,15,.3); }
  #invalid-input-error,yt-live-chat-message-buy-flow-renderer[message-too-long] #revamped-characters { color:rgb(200,30,40); }
  yt-live-chat-paid-message-renderer { display:block; border-radius:4px; padding:12px; color:rgb(255,255,255); background:rgb(0,90,155); --yt-live-chat-text-input-field-color:rgb(255,255,255); }
  yt-live-chat-paid-message-renderer #input { min-height:44px; color:rgb(255,255,255); overflow-wrap:anywhere; }
  yt-live-chat-paid-sticker-panel-renderer { display:block; background:white; }
  #header.yt-live-chat-paid-sticker-panel-renderer { padding-top:16px; background:rgb(245,245,245); }
  #header-top,#header-bottom { display:flex; justify-content:space-between; align-items:center; }
  #header-text h3 { color:rgb(15,15,15); margin:0; font-size:16px; }
  #header-text > span { color:rgb(96,96,96); font-size:12px; }
  #scroll-back-button[disabled] { color:rgba(15,15,15,.3); }
  #scroll-forward-button .ytSpecIconShapeHost { color:rgb(15,15,15); }
  #sticker-tabs { display:flex; overflow:hidden; }
  #sticker-tabs button { width:40px; flex:none; }
  yt-live-chat-super-sticker-pack-renderer { display:block; height:300px; max-height:300px; overflow:hidden auto; }
  #pack-stickers { display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); }
  yt-live-chat-super-sticker-pack-item-button-renderer { display:block; }
  yt-live-chat-super-sticker-pack-item-button-renderer > button { width:100%; padding:0; border:0; background:transparent; color:inherit; }
  #header button, #header-top button, #header-bottom button, #back-button button { border:0; background:transparent; color:inherit; }
  #sticker { display:flex; flex-direction:column; align-items:center; padding:12px 12px 24px; }
  [data-sticker-art] { color:rgb(213,158,34); fill:currentColor; }
  #price.yt-live-chat-super-sticker-pack-item-button-renderer { background:rgb(230,230,230); color:rgb(15,15,15); padding:4px; }
  yt-live-chat-super-sticker-pack-backstory-renderer { display:block; background:white; padding:12px; color:rgb(15,15,15); }
  yt-live-chat-super-sticker-preview-renderer { display:block; color:rgb(15,15,15); background:white; }
  #preview.yt-live-chat-super-sticker-preview-renderer { display:flex; flex-direction:column; }
  #header.yt-live-chat-super-sticker-preview-renderer { display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background-color:rgb(245,245,245); }
  #left.yt-live-chat-super-sticker-preview-renderer { display:flex; align-items:center; }
  h3.yt-live-chat-super-sticker-preview-renderer { color:rgb(15,15,15); font-size:16px; }
  #right.yt-live-chat-super-sticker-preview-renderer { color:rgb(96,96,96); font-size:12px; }
  yt-live-chat-paid-sticker-renderer { display:block; margin:12px; padding:24px; color:white; background:rgb(140,30,90); }
  #footer.yt-live-chat-super-sticker-preview-renderer { background:white; padding:12px; }
  #footer button { width:100%; margin-bottom:8px; }
  #back-button.yt-live-chat-super-sticker-preview-renderer { color:rgb(6,95,212); background:white; }
  ytd-sponsorships-gift-offer-renderer { display:block; max-height:400px; overflow:hidden auto; }
  ytd-sponsorships-gift-offer-header-renderer,ytd-sponsorships-gift-offer-body-renderer { display:block; background:white; color:rgb(15,15,15); }
  #header.ytd-sponsorships-gift-offer-header-renderer { display:flex; align-items:center; width:100%; padding:2px 0 2px 12px; }
  #details.ytd-sponsorships-gift-offer-header-renderer { width:100%; padding:0 12px 0 20px; }
  #info.ytd-sponsorships-gift-offer-body-renderer { display:flex; }
  #avatar.ytd-sponsorships-gift-offer-body-renderer { width:100px; height:100px; flex:none; margin:16px 0 12px 12px; }
  #details.ytd-sponsorships-gift-offer-body-renderer { margin:16px 8px 12px 12px; }
  #subtitle.ytd-sponsorships-gift-offer-body-renderer,.description.ytd-offer-section-renderer,.description.ytd-offer-content-renderer { color:rgb(96,96,96); font-size:12px; }
  #offer-section.ytd-sponsorships-gift-offer-body-renderer { margin:8px -28px 0 -12px; }
  ytd-offer-section-renderer { display:flex; flex-direction:column; padding:4px 0; }
  .heading.ytd-offer-section-renderer { padding:8px 24px; }
  .title.ytd-offer-section-renderer,.title.ytd-offer-content-renderer { color:rgb(15,15,15); }
  ytd-offer-content-renderer { padding:8px 16px 8px 24px; display:flex; flex-direction:column; }
  .offer-content.ytd-offer-content-renderer { display:flex; width:100%; align-items:center; gap:8px; }
  .text.ytd-offer-content-renderer { display:flex; flex-direction:column; flex-grow:1; }
  .ytSpecButtonShapeNextText { color:rgb(6,95,212); background:transparent; border:0; }
  .ytSpecButtonShapeNextText:disabled { color:rgba(15,15,15,.3); background:rgba(0,0,0,.05); }
  .ytSpecButtonShapeNextFilled { color:white; background:rgb(6,95,212); }
  ytd-donation-amount-picker-renderer[live-chat] { display:block; }
  ytd-donation-amount-picker-renderer[live-chat] > #container { background-color:var(--yt-live-chat-action-panel-background-color); }
  ytd-donation-amount-picker-renderer :is(#title,#campaign-title,#nonprofit-title) { color:var(--yt-live-chat-primary-text-color); }
  ytd-donation-amount-picker-renderer #top-box,ytd-donation-amount-picker-renderer #bottom-box { padding:16px 24px; }
  ytd-donation-amount-picker-renderer #title { display:flex; align-items:center; justify-content:space-between; }
  ytd-donation-amount-picker-renderer #campaign-subtitle { color:rgb(96,96,96); }
  ytd-donation-amount-picker-renderer #suggested-amount-buttons-row { display:flex; justify-content:space-between; margin-top:16px; }
  ytd-donation-amount-picker-renderer #suggested-amount-buttons-row button { min-width:5.14em; }
  ytd-donation-amount-picker-renderer #custom-amount-input { display:block; margin:12px 0; }
  ytd-donation-amount-picker-renderer input[type="text"] { width:100%; color:rgb(15,15,15); background:white; }
  ytd-donation-amount-picker-renderer #privacy-checkbox { display:block; margin:16px 0; }
  ytd-donation-amount-picker-renderer #button-row button { width:100%; }
  yt-live-chat-dialog-renderer { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.4); z-index:5; }
  #inner.yt-live-chat-dialog-renderer { max-width:calc(100% - 32px); margin:13px 16px; color:rgb(15,15,15); background:white; overflow-y:auto; padding:16px; box-sizing:border-box; }
  dialog { max-width:calc(100vw - 32px); max-height:calc(100vh - 32px); box-sizing:border-box; color:rgb(15,15,15); background:white; }
  .ytSpecIconShapeHost svg { fill:currentColor; }
</style>
<tp-yt-iron-pages id="content-pages"><div id="chat-messages" class="iron-selected"><yt-live-chat-header-renderer>Chat</yt-live-chat-header-renderer><div id="contents">
  <div id="chat">    <div id="fixture-messages" class="iron-selected"><yt-live-chat-item-list-renderer><div id="item-scroller"><div id="items">Synthetic native purchase UI fixture</div></div></yt-live-chat-item-list-renderer></div></div>
  <tp-yt-iron-pages id="panel-pages" class="yt-live-chat-renderer">
  <div id="input-panel" class="iron-selected"><yt-live-chat-message-input-renderer><div id="input-container"><div role="textbox" contenteditable="true" aria-label="Normal chat draft">Unsent draft</div></div><div id="product-picker"><button aria-label="Support creator">Support</button></div><yt-live-chat-product-picker-panel-view-model hidden><div id="header">Support creator<button aria-label="Close support choices">Close</button></div><div id="items">${choices.map((c, j) => `<yt-live-chat-product-picker-panel-item-view-model item-id="standard-${j}"><button aria-label="Open ${c}"><div id="text"><yt-attributed-string><span>${c}</span></yt-attributed-string><yt-attributed-string><span>Native purchase option</span></yt-attributed-string></div></button></yt-live-chat-product-picker-panel-item-view-model>`).join('')}</div></yt-live-chat-product-picker-panel-view-model></yt-live-chat-message-input-renderer></div>
    <div id="buy-flow" hidden><yt-live-chat-message-buy-flow-renderer>
      <div id="preview" class="yt-live-chat-message-buy-flow-renderer">
        <div id="header" class="yt-live-chat-message-buy-flow-renderer">${close('Close paid message')}<div id="title">Super Chat</div><div id="help" class="yt-live-chat-message-buy-flow-renderer"><button aria-label="Paid message help">${icon}</button></div></div>
        <div id="info" class="yt-live-chat-message-buy-flow-renderer"><yt-live-chat-message-buy-flow-heading-renderer><yt-formatted-string id="heading-title" class="yt-live-chat-message-buy-flow-heading-renderer">Highlight your message</yt-formatted-string><yt-formatted-string id="heading-text" class="yt-live-chat-message-buy-flow-heading-renderer">Choose an amount and add a message.</yt-formatted-string></yt-live-chat-message-buy-flow-heading-renderer></div>
        <div id="message" class="yt-live-chat-message-buy-flow-renderer">${paidCard}<div class="additional-info"><span id="invalid-input-error" hidden>Invalid amount</span></div></div>
        <div id="price" class="yt-live-chat-message-buy-flow-renderer">
          <div id="price-input-container" class="yt-live-chat-message-buy-flow-renderer"><span class="dim yt-live-chat-message-buy-flow-renderer">JPY</span><tp-yt-paper-input id="price-input" class="yt-live-chat-message-buy-flow-renderer"><div class="input-content tp-yt-paper-input-container"><tp-yt-iron-input><input aria-label="Legacy amount" value="500" inputmode="decimal" /></tp-yt-iron-input></div></tp-yt-paper-input></div>
          <div id="info-panel" class="yt-live-chat-message-buy-flow-renderer" hidden>
            <div id="revamped-price-input-container" class="yt-live-chat-message-buy-flow-renderer"><tp-yt-paper-input id="revamped-price-input" class="yt-live-chat-message-buy-flow-renderer"><div class="input-content tp-yt-paper-input-container"><tp-yt-iron-input><input aria-label="Modern amount" value="500" inputmode="decimal" /></tp-yt-iron-input></div></tp-yt-paper-input><span class="info-subscript yt-live-chat-message-buy-flow-renderer">JPY</span></div>
            <div id="char-limit"><span id="revamped-characters" class="info-script yt-live-chat-message-buy-flow-renderer">5/50</span><span class="info-subscript yt-live-chat-message-buy-flow-renderer">Characters</span></div><div id="duration"><span class="info-script">2 minutes</span><span class="info-subscript yt-live-chat-message-buy-flow-renderer">Pinned in chat</span></div>
          </div><input id="price-slider" aria-label="Amount slider" type="range" min="100" max="50000" value="500" />
        </div>
        <div id="goal-disclaimer-container"><yt-attributed-string id="disclaimer-header" class="yt-live-chat-message-buy-flow-renderer"><span class="ytAttributedStringHost">Before you purchase</span></yt-attributed-string><yt-attributed-string id="disclaimer-text" class="yt-live-chat-message-buy-flow-renderer"><span class="ytAttributedStringHost">${'Review the native purchase terms and public message information. '.repeat(5)}<a href="https://example.invalid/terms">Terms and conditions</a></span></yt-attributed-string></div>
        <div id="buy-button" class="yt-live-chat-message-buy-flow-renderer"><button class="native-buy" aria-label="Confirm paid message">Buy and send</button></div>
      </div>
      <div id="dialog"><yt-live-chat-dialog-renderer hidden><div id="inner" class="yt-live-chat-dialog-renderer"><h3>About Super Chat</h3><p>Native help and purchase information.</p><button aria-label="Close paid message help">Close help</button></div></yt-live-chat-dialog-renderer></div>
    </yt-live-chat-message-buy-flow-renderer></div>
    <div id="super-sticker-buy-flow" hidden><yt-live-chat-paid-sticker-panel-renderer>
      <div id="selection"><div id="header" class="yt-live-chat-paid-sticker-panel-renderer"><div id="header-top">${close('Close sticker catalog')}<div id="header-text"><h3>Super Stickers</h3><span>Choose a sticker pack</span></div><div id="help-button"><button aria-label="Sticker help">${icon}</button></div></div><div id="header-bottom"><div id="scroll-back-button" disabled><button aria-label="Previous sticker pack" disabled>${icon}</button></div><div id="sticker-tabs"><button aria-label="Sticker pack one">1</button><button aria-label="Sticker pack two">2</button></div><div id="scroll-forward-button"><button aria-label="Next sticker pack">${icon}</button></div></div></div>
        <div id="stickers-container"><yt-live-chat-super-sticker-pack-renderer><div id="pack"><div id="pack-stickers">${Array.from({ length: 8 }, (_, j) => `<yt-live-chat-super-sticker-pack-item-button-renderer><button aria-label="Sticker ${j + 1}"><div id="sticker"><svg data-sticker-art width="96" height="96"><path d="M4 4h88v88H4z" /></svg><span id="price" class="yt-live-chat-super-sticker-pack-item-button-renderer">JPY ${100 * (j + 1)}</span></div></button></yt-live-chat-super-sticker-pack-item-button-renderer>`).join('')}</div><div id="backstory"><yt-live-chat-super-sticker-pack-backstory-renderer><span id="title">Native artwork story</span><div id="content">Illustration credits remain on their native paired surface.</div></yt-live-chat-super-sticker-pack-backstory-renderer></div></div></yt-live-chat-super-sticker-pack-renderer></div>
      </div><yt-live-chat-super-sticker-preview-renderer id="preview" hidden><div id="preview" class="yt-live-chat-super-sticker-preview-renderer"><div id="header" class="yt-live-chat-super-sticker-preview-renderer"><div id="left" class="yt-live-chat-super-sticker-preview-renderer">${close('Close sticker preview', 'close')}<h3 class="yt-live-chat-super-sticker-preview-renderer">Sticker preview</h3></div><div id="right" class="yt-live-chat-super-sticker-preview-renderer">2 minutes</div></div><yt-live-chat-paid-sticker-renderer><svg data-sticker-art width="96" height="96"><path d="M4 4h88v88H4z" /></svg><div>Native paid sticker card</div></yt-live-chat-paid-sticker-renderer><div id="footer" class="yt-live-chat-super-sticker-preview-renderer"><div id="buy-button"><button class="native-buy" aria-label="Confirm sticker purchase">Buy and send</button></div><div id="back-button" class="yt-live-chat-super-sticker-preview-renderer"><button aria-label="Choose another sticker">Choose another sticker</button></div></div></div></yt-live-chat-super-sticker-preview-renderer>
    </yt-live-chat-paid-sticker-panel-renderer></div>
    <div id="sponsorships-gift-buy-flow" hidden><ytd-sponsorships-gift-offer-renderer>
      <ytd-sponsorships-gift-offer-header-renderer><div id="header" class="ytd-sponsorships-gift-offer-header-renderer">${close('Close gift offer')}<div id="details" class="ytd-sponsorships-gift-offer-header-renderer"><div id="title">Membership gifts</div></div></div></ytd-sponsorships-gift-offer-header-renderer>
      <ytd-sponsorships-gift-offer-body-renderer><div id="body"><div id="info" class="ytd-sponsorships-gift-offer-body-renderer"><div id="avatar" class="ytd-sponsorships-gift-offer-body-renderer"><svg data-sticker-art width="96" height="96"><path d="M4 4h88v88H4z" /></svg></div><div id="details" class="ytd-sponsorships-gift-offer-body-renderer"><div id="title">Share memberships with other viewers</div><div id="subtitle" class="ytd-sponsorships-gift-offer-body-renderer">Viewers must be eligible. <a href="https://example.invalid/gifts">Learn more</a></div></div></div><div id="offer-section" class="ytd-sponsorships-gift-offer-body-renderer"><ytd-offer-section-renderer><div class="heading ytd-offer-section-renderer"><yt-formatted-string class="title">Choose a gift quantity</yt-formatted-string><yt-formatted-string class="description ytd-offer-section-renderer">Only a native quantity preview</yt-formatted-string></div>${[5, 10, 20, 50, 100].map(n => `<ytd-offer-content-renderer><div class="offer-content ytd-offer-content-renderer"><div class="text ytd-offer-content-renderer"><yt-formatted-string class="title">${n} memberships</yt-formatted-string><yt-formatted-string class="description ytd-offer-content-renderer">Local preview</yt-formatted-string></div><button aria-label="Preview ${n} membership gifts" class="ytSpecButtonShapeNextText"><span class="ytSpecButtonShapeNextButtonTextContent">JPY ${n * 100}</span></button></div></ytd-offer-content-renderer>`).join('')}</ytd-offer-section-renderer></div></div></ytd-sponsorships-gift-offer-body-renderer>
      <button aria-label="Unavailable gift quantity" class="ytSpecButtonShapeNextText" disabled>Unavailable</button><button aria-label="Native filled gift action" class="ytSpecButtonShapeNextFilled" disabled>Native filled action</button>
    </ytd-sponsorships-gift-offer-renderer></div>
    <div id="donation-flow" hidden><ytd-donation-amount-picker-renderer live-chat><div id="container"><div id="top-box"><div id="title"><span>Donate to a fundraiser</span>${close('Close donation')}</div><div id="campaign-title">Synthetic nonprofit campaign</div><div id="campaign-subtitle">Native campaign information</div><div id="live-chat-description-column">${'Read the campaign and nonprofit information before donating. '.repeat(6)}</div></div><div id="bottom-box"><div id="nonprofit-title">Synthetic nonprofit</div><div id="amount-selector"><div id="suggested-amount-buttons-row"><button aria-label="Suggested donation 100">100</button><button aria-label="Suggested donation 500">500</button><button aria-label="Suggested donation 1000">1000</button><button aria-label="Custom donation amount">Custom</button></div><div id="custom-amount-container"><tp-yt-paper-input id="custom-amount-input"><input type="text" inputmode="numeric" aria-label="Donation amount" value="250" /></tp-yt-paper-input></div></div><label id="privacy-checkbox"><input type="checkbox" aria-label="Anonymous donation" />Keep this donation anonymous</label><div id="button-row"><button class="native-buy" aria-label="Confirm donation">Donate</button></div></div></div></ytd-donation-amount-picker-renderer></div>
  </tp-yt-iron-pages>

</div></div></tp-yt-iron-pages>
<dialog aria-label="Native membership offer"><h3>Membership</h3><p>Native account and recurring-price information.</p><button aria-label="Close native membership">Cancel</button><button class="native-buy" aria-label="Confirm membership">Join</button></dialog>
<script>
(() => {
  const q = selector => document.querySelector(selector);
  const probe = window.__ylcFixtureStandardPurchase = { entries:0, trustedEntries:0, preventedEntries:0, stickerSelections:0, packChanges:0, quantityPreviews:0, helpEntries:0, confirmations:0, sends:0 };
  const input=q('yt-live-chat-message-input-renderer'), picker=q('yt-live-chat-product-picker-panel-view-model'), panel=q('#panel-pages'), messages=q('#fixture-messages'), sc=q('yt-live-chat-message-buy-flow-renderer'), sticker=q('yt-live-chat-paid-sticker-panel-renderer');
  const count = event => { probe.entries++; if(event.isTrusted)probe.trustedEntries++; queueMicrotask(()=>{if(event.defaultPrevented)probe.preventedEntries++}); };
  const pages=[q('#buy-flow'),q('#super-sticker-buy-flow'),q('#sponsorships-gift-buy-flow'),q('#donation-flow')];
  const closeAll=()=>{ q('#input-panel').hidden=false;q('#input-panel').classList.add('iron-selected');for(const e of pages){e.hidden=true;e.classList.remove('iron-selected')} messages.hidden=false;messages.classList.add('iron-selected');input.removeAttribute('product-picker-open');picker.hidden=true;panel.scrollTop=0; };
  const openPage=(index,event)=>{count(event);q('#input-panel').hidden=true;q('#input-panel').classList.remove('iron-selected');picker.hidden=true;input.removeAttribute('product-picker-open');messages.hidden=true;messages.classList.remove('iron-selected');pages[index].hidden=false;pages[index].classList.add('iron-selected');panel.scrollTop=0};
  q('[aria-label="Support creator"]').addEventListener('click',event=>{count(event);picker.hidden=false;input.setAttribute('product-picker-open','')});
  q('[aria-label="Close support choices"]').addEventListener('click',closeAll);
  for(const [index,modern] of [[0,false],[1,true]]) q('[item-id="standard-'+index+'"] button').addEventListener('click',event=>{openPage(0,event);q('#price-input-container').hidden=modern;q('#info-panel').hidden=!modern;});
  q('[item-id="standard-2"] button').addEventListener('click',event=>{openPage(1,event);sticker.querySelector('#selection').hidden=false;sticker.querySelector('yt-live-chat-super-sticker-preview-renderer').hidden=true;});
  q('[item-id="standard-3"] button').addEventListener('click',event=>openPage(2,event));
  q('[item-id="standard-4"] button').addEventListener('click',event=>{count(event);picker.hidden=true;input.removeAttribute('product-picker-open');q('dialog').showModal();});
  q('[item-id="standard-5"] button').addEventListener('click',event=>openPage(3,event));
  for(const label of ['Close paid message','Close sticker catalog','Close sticker preview','Close gift offer','Close donation'])q('[aria-label="'+label+'"]').addEventListener('click',closeAll);
  q('[aria-label="Close native membership"]').addEventListener('click',()=>{q('dialog').close();closeAll()});
  for(const button of document.querySelectorAll('yt-live-chat-super-sticker-pack-item-button-renderer button'))button.addEventListener('click',()=>{probe.stickerSelections++;sticker.querySelector('#selection').hidden=true;sticker.querySelector('yt-live-chat-super-sticker-preview-renderer').hidden=false;panel.scrollTop=0});
  q('[aria-label="Choose another sticker"]').addEventListener('click',()=>{sticker.querySelector('#selection').hidden=false;sticker.querySelector('yt-live-chat-super-sticker-preview-renderer').hidden=true;panel.scrollTop=0});
  for(const label of ['Sticker pack one','Sticker pack two','Next sticker pack'])q('[aria-label="'+label+'"]').addEventListener('click',()=>probe.packChanges++);
  for(const button of document.querySelectorAll('[aria-label^="Preview "]'))button.addEventListener('click',()=>probe.quantityPreviews++);
  const help=q('yt-live-chat-dialog-renderer');q('[aria-label="Paid message help"]').addEventListener('click',()=>{probe.helpEntries++;help.hidden=false;});q('[aria-label="Close paid message help"]').addEventListener('click',()=>help.hidden=true);
  q('[aria-label="Sticker help"]').addEventListener('click',()=>probe.helpEntries++);
  const draft=q('[aria-label="Paid message draft"]');
  const validate=()=>{const modern=!q('#info-panel').hidden;const amount=q('[aria-label="'+(modern?'Modern':'Legacy')+' amount"]');const bad=!Number.isFinite(Number(amount.value))||Number(amount.value)<100||Number(amount.value)>50000;const tooLong=draft.textContent.length>50;sc.toggleAttribute('is-invalid-price',bad);sc.toggleAttribute('message-too-long',tooLong);q('#invalid-input-error').hidden=!bad;q('#revamped-characters').textContent=draft.textContent.length+'/50';q('[aria-label="Confirm paid message"]').disabled=bad||tooLong;};
  for(const field of document.querySelectorAll('[aria-label="Legacy amount"],[aria-label="Modern amount"],[aria-label="Paid message draft"]'))field.addEventListener('input',validate);
  for(const button of document.querySelectorAll('[aria-label^="Confirm "]'))button.addEventListener('click',()=>probe.confirmations++);
  q('[aria-label="Normal chat draft"]').addEventListener('keydown',event=>{if(event.key==='Enter')probe.sends++});
})();
</script>`

import { afterEach, describe, expect, it } from 'vitest'
import { CHAT_CSS_PRESETS } from './chatCssPresets'

// A selector regression fixture, NOT visual proof against the current YouTube UI.
// All sources are packaged by the extension. This is not an arbitrary-CSS sanitizer.
afterEach(() => {
  document.head.querySelector('[data-preset-test]')?.remove()
  document.body.classList.remove('custom-yt-app-live-chat-extension')
  document.body.replaceChildren()
})

describe('packaged preset selector boundaries', () => {
  it.each(CHAT_CSS_PRESETS)('$id targets regular list messages, not controls or paid/deleted/pinned items', preset => {
    document.body.classList.add('custom-yt-app-live-chat-extension')
    document.body.innerHTML = `
      <yt-live-chat-header-renderer><button>Menu</button></yt-live-chat-header-renderer>
      <yt-live-chat-item-list-renderer><div id="items">
        <yt-live-chat-text-message-renderer data-normal>
          <span id="author-name">Name</span><span id="message" data-normal>Message <a href="#">Link</a></span>
        </yt-live-chat-text-message-renderer>
        <yt-live-chat-text-message-renderer author-type="owner" data-normal>
          <span id="author-name">Owner</span><span id="message" data-normal>Owner message</span>
        </yt-live-chat-text-message-renderer>
        <yt-live-chat-text-message-renderer author-type="member" data-normal>
          <span id="author-name">Member</span><span id="message" data-normal>Member message</span>
        </yt-live-chat-text-message-renderer>
        <yt-live-chat-text-message-renderer is-deleted><span id="message">Removed</span></yt-live-chat-text-message-renderer>
        <yt-live-chat-paid-message-renderer><span id="message">Paid</span></yt-live-chat-paid-message-renderer>
      </div></yt-live-chat-item-list-renderer>
      <yt-live-chat-banner-renderer><yt-live-chat-text-message-renderer>
        <span id="message">Pinned outside the list</span>
      </yt-live-chat-text-message-renderer></yt-live-chat-banner-renderer>
      <yt-live-chat-message-input-renderer><div contenteditable="true">Composer</div></yt-live-chat-message-input-renderer>
    `
    const style = document.createElement('style')
    style.dataset.presetTest = 'true'
    style.textContent = preset.css
    document.head.appendChild(style)
    const rules = Array.from(style.sheet?.cssRules ?? [])
    expect(rules.length).toBeGreaterThan(0)
    for (const rule of rules) {
      expect(rule.type).toBe(CSSRule.STYLE_RULE)
      const matches = Array.from(document.querySelectorAll((rule as CSSStyleRule).selectorText))
      expect(matches.length).toBeGreaterThan(0)
      expect(matches.every(element => element.hasAttribute('data-normal'))).toBe(true)
    }
  })
})

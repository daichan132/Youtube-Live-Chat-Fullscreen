import { afterEach, describe, expect, it } from 'vitest'
import { CHAT_CSS_PRESETS, type ChatCssPreset } from './chatCssPresets'

// Selector/computed-style regression fixtures, not visual proof against current YouTube.
// The wrapped rows model #author-photo + #content > timestamp / author-chip / message.
// The flat row retains the simpler deterministic overlay fixture's structure.
const wrappedMessage = (id: string, authorType = '', avatar = true, hidden = false) => `
  <yt-live-chat-text-message-renderer data-case="${id}" author-type="${authorType}" data-normal>
    ${
      avatar
        ? `<yt-img-shadow id="author-photo" class="yt-live-chat-text-message-renderer" data-normal
            ${hidden ? 'style="display:none"' : ''}><img width="24" height="24" alt="" data-normal></yt-img-shadow>`
        : ''
    }
    <div id="content" class="yt-live-chat-text-message-renderer" data-normal>
      <span id="timestamp" class="yt-live-chat-text-message-renderer" style="display:${id === 'replay' ? 'inline' : 'none'};color:rgb(96,96,96)" data-normal>1:23</span>
      <yt-live-chat-author-chip class="yt-live-chat-text-message-renderer" data-normal ${hidden ? 'style="display:none"' : ''}>
        <span id="author-name" class="${authorType === 'member' ? 'member ' : ''}yt-live-chat-author-chip"
          style="color:${authorType === 'member' ? 'rgb(15,157,88)' : authorType === 'owner' ? 'rgb(255,193,7)' : 'rgb(120,120,120)'}" data-normal>Name</span>
        <yt-live-chat-author-badge-renderer style="color:rgb(15,157,88)">Member badge</yt-live-chat-author-badge-renderer>
      </yt-live-chat-author-chip>
      <span id="message" class="yt-live-chat-text-message-renderer" style="color:rgb(30,30,30)" data-normal>
        A long message with <a href="#" style="color:rgb(6,95,212)">a link</a>
        <img class="emoji yt-live-chat-text-message-renderer" alt="smile" style="width:20px;height:20px">
        andaverylongunbrokenwordthatmustremainavailableforwrapping
      </span>
    </div>
    <div id="menu"><button>Message menu</button></div>
  </yt-live-chat-text-message-renderer>
`

const installFixture = () => {
  document.body.classList.add('custom-yt-app-live-chat-extension')
  document.body.innerHTML = `
    <yt-live-chat-header-renderer><button>Menu</button></yt-live-chat-header-renderer>
    <yt-live-chat-item-list-renderer><div id="items">
      ${wrappedMessage('live')}
      ${wrappedMessage('owner', 'owner')}
      ${wrappedMessage('member', 'member')}
      ${wrappedMessage('replay')}
      ${wrappedMessage('no-avatar', '', false)}
      ${wrappedMessage('hidden', '', true, true)}
      <yt-live-chat-text-message-renderer data-case="flat" data-normal>
        <span id="author-photo" data-normal><img alt="" data-normal></span>
        <span id="author-name">Name</span><span id="message" data-normal>Flat message <a href="#">Link</a></span>
      </yt-live-chat-text-message-renderer>
      <yt-live-chat-text-message-renderer is-deleted><span id="message">Removed</span></yt-live-chat-text-message-renderer>
      <yt-live-chat-paid-message-renderer><span id="message">Paid</span></yt-live-chat-paid-message-renderer>
    </div></yt-live-chat-item-list-renderer>
    <yt-live-chat-banner-renderer><yt-live-chat-text-message-renderer>
      <span id="message">Pinned outside the list</span>
    </yt-live-chat-text-message-renderer></yt-live-chat-banner-renderer>
    <yt-live-chat-message-input-renderer><div contenteditable="true">Composer</div></yt-live-chat-message-input-renderer>
  `
}

const installStyle = (css: string) => {
  const style = document.createElement('style')
  style.dataset.presetTest = 'true'
  style.textContent = css
  document.head.appendChild(style)
  return style
}

const layoutPresets = CHAT_CSS_PRESETS.filter(preset => ['messenger', 'stage', 'timeline'].includes(preset.id))
const layoutPreset = (id: string) => {
  const preset = layoutPresets.find(candidate => candidate.id === id)
  if (!preset) throw new Error(`Layout preset is missing: ${id}`)
  return preset
}
const element = (selector: string, root: ParentNode = document) => {
  const result = root.querySelector<HTMLElement>(selector)
  if (!result) throw new Error(`Fixture element is missing: ${selector}`)
  return result
}
const computed = (selector: string, root: ParentNode = document) => getComputedStyle(element(selector, root))

// Seed the inline flow/visibility that the packaged sources replace or preserve.
// Colors and emoji dimensions on the fixture model the existing semantic styling.
const installNativeFlow = () =>
  installStyle(`
    yt-live-chat-text-message-renderer { display: block; }
    yt-live-chat-text-message-renderer > #content,
    yt-live-chat-text-message-renderer #message,
    yt-live-chat-author-chip { display: inline; }
    #menu, yt-live-chat-header-renderer, yt-live-chat-message-input-renderer { display: block; }
  `)

const semanticSnapshot = () =>
  ['live', 'owner', 'member', 'replay'].map(id => {
    const row = element(`[data-case="${id}"]`)
    return {
      name: computed('#author-name', row).color,
      badge: computed('yt-live-chat-author-badge-renderer', row).color,
      message: computed('#message', row).color,
      link: computed('a', row).color,
      emoji: [computed('.emoji', row).width, computed('.emoji', row).height],
      timestamp: [computed('#timestamp', row).display, computed('#timestamp', row).color],
      menu: computed('#menu', row).display,
    }
  })

const excludedSnapshot = () =>
  [
    'yt-live-chat-text-message-renderer[is-deleted]',
    'yt-live-chat-paid-message-renderer',
    'yt-live-chat-banner-renderer yt-live-chat-text-message-renderer',
    'yt-live-chat-header-renderer',
    'yt-live-chat-message-input-renderer',
  ].map(selector => {
    const style = computed(selector)
    return [style.display, style.padding, style.margin, style.border, style.backgroundColor, style.color]
  })

afterEach(() => {
  document.head.querySelectorAll('[data-preset-test]').forEach(style => {
    style.remove()
  })
  document.body.classList.remove('custom-yt-app-live-chat-extension')
  document.body.replaceChildren()
})

describe('packaged preset selector boundaries', () => {
  it.each(CHAT_CSS_PRESETS)('$id targets regular list messages, not controls or paid/deleted/pinned items', preset => {
    installFixture()
    const style = installStyle(preset.css)
    const rules = Array.from(style.sheet?.cssRules ?? [])
    expect(rules.length).toBeGreaterThan(0)
    for (const rule of rules) {
      expect(rule.type).toBe(CSSRule.STYLE_RULE)
      const matches = Array.from(document.querySelectorAll((rule as CSSStyleRule).selectorText))
      expect(matches.length).toBeGreaterThan(0)
      expect(matches.every(match => match.hasAttribute('data-normal'))).toBe(true)
    }
  })
})

describe('packaged message layout presets', () => {
  const installLayout = (preset: ChatCssPreset) => {
    installFixture()
    installNativeFlow()
    installStyle(preset.css)
  }

  it.each(layoutPresets)('$id stacks the author above the body instead of only changing typography', preset => {
    installLayout(preset)
    for (const id of ['live', 'owner', 'member', 'replay', 'no-avatar', 'hidden']) {
      const row = element(`[data-case="${id}"]`)
      expect(getComputedStyle(row).display).toBe('flex')
      expect(getComputedStyle(row).alignItems).toBe('flex-start')
      expect(computed('#content', row).display).toBe('flex')
      expect(computed('#content', row).flexDirection).toBe('column')
      expect(computed('#content', row).minWidth).toBe('0px')
      expect(computed('#message', row).display).toBe('block')
      expect(computed('#message', row).overflowWrap).toBe('anywhere')
      expect(element('yt-live-chat-author-chip', row).nextElementSibling).toBe(element('#message', row))
    }
    expect(computed('#author-photo', element('[data-case="hidden"]')).display).toBe('none')
    expect(computed('yt-live-chat-author-chip', element('[data-case="hidden"]')).display).toBe('none')
    expect(element('[data-case="no-avatar"]').querySelector('#author-photo')).toBeNull()
    expect(computed('#content', element('[data-case="no-avatar"]')).flexGrow).toBe('1')
  })

  it('messenger creates the bubble around the content and rounds the avatar', () => {
    installLayout(layoutPreset('messenger'))
    const row = element('[data-case="live"]')
    expect(computed('#content', row).borderRadius).toBe('18px')
    expect(computed('#content', row).padding).toBe('8px 12px')
    expect(computed('#content', row).backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(computed('#author-photo', row).borderRadius).toBe('50%')
  })

  it('stage gives the author its own header above the padded card body', () => {
    installLayout(layoutPreset('stage'))
    const row = element('[data-case="live"]')
    expect(computed('#content', row).borderTopWidth).toBe('1px')
    expect(computed('#content', row).borderRadius).toBe('8px')
    expect(computed('yt-live-chat-author-chip', row).borderBottomWidth).toBe('1px')
    expect(computed('yt-live-chat-author-chip', row).padding).toBe('8px 12px')
    expect(computed('#message', row).padding).toBe('10px 12px')
  })

  it('timeline puts a vertical line beside the content and a separator under the row', () => {
    installLayout(layoutPreset('timeline'))
    const row = element('[data-case="live"]')
    expect(computed('#content', row).borderInlineStartWidth).toBe('2px')
    expect(computed('#content', row).paddingInlineStart).toBe('12px')
    expect(getComputedStyle(row).borderBottomWidth).toBe('1px')
  })

  it.each(layoutPresets)('$id preserves semantic colors, timestamps, emoji and excluded UI', preset => {
    installFixture()
    installNativeFlow()
    const colors = semanticSnapshot()
    const excluded = excludedSnapshot()
    installStyle(preset.css)
    expect(semanticSnapshot()).toEqual(colors)
    expect(excludedSnapshot()).toEqual(excluded)
  })

  it.each(layoutPresets)('$id keeps flat markup usable and avoids clipping either structure', preset => {
    installLayout(preset)
    const flat = element('[data-case="flat"]')
    expect(getComputedStyle(flat).display).toBe('flow-root')
    expect(computed('#message', flat).display).toBe('block')
    expect(computed('#message', flat).overflowWrap).toBe('anywhere')
    for (const target of [flat, element('[data-case="no-avatar"]'), element('[data-case="replay"] #content')]) {
      const style = getComputedStyle(target)
      expect(style.height).toBe('auto')
      expect(style.maxHeight).toBe('none')
      expect(style.overflow).not.toBe('hidden')
      expect(style.overflow).not.toBe('clip')
    }
    // Even if a banner is inserted within #items, these layouts only target direct messages.
    const banner = document.createElement('yt-live-chat-banner-renderer')
    banner.innerHTML =
      '<yt-live-chat-text-message-renderer><span id="message">Nested pinned message</span></yt-live-chat-text-message-renderer>'
    element('#items').append(banner)
    expect(computed('yt-live-chat-text-message-renderer', banner).display).toBe('block')
    expect(computed('#message', banner).display).toBe('inline')
  })
})

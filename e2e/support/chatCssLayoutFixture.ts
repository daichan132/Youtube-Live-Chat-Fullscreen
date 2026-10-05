import type { FrameLocator, JSHandle, Page } from '@playwright/test'

const installChatPresetLayoutFixture = (page: Page) => page.evaluate(() => {
  const chatDocument = window.__ylcHelpers.getExtensionIframe()?.contentDocument
  const renderer = chatDocument?.querySelector('yt-live-chat-renderer')
  const list = renderer?.querySelector('yt-live-chat-item-list-renderer')
  if (!chatDocument?.head || !renderer || !list) throw new Error('The actual chat iframe has no playable message list.')

  // The scenario compiler deliberately supplies an empty playable list. Model
  // YouTube's nested normal-message structure inside that actual leased Document;
  // keep duplicate IDs in non-target renderers to catch overly broad CSS rules.
  const style = chatDocument.createElement('style')
  style.setAttribute('data-ylc-preset-layout-fixture', '')
  style.textContent = `
    :where(yt-live-chat-renderer) { display: flex; flex-direction: column; height: 100vh; }
    :where(yt-live-chat-item-list-renderer) { display: block; flex: 1; min-height: 0; overflow: auto; scrollbar-width: none; }
    :where(#items) { display: block; }
    :where(#items) { padding: 8px; }
    :where(yt-live-chat-text-message-renderer) { display: flex; align-items: center; gap: 8px; padding: 4px; }
    :where(#author-photo) { display: block; flex: none; width: 24px; height: 24px; background: #8b5cf6; }
    :where(#content) { display: block; min-width: 0; }
    :where(yt-live-chat-author-chip) { display: inline-block; }
    :where(#message) { display: inline; }
    :where([data-ylc-preset-control="paid"]) { display: block; padding: 7px; border: 2px solid #b45309; }
    :where(#input-panel) { display: block; flex-shrink: 0; padding: 5px; }
    :where(yt-live-chat-message-input-renderer) { display: block; }
    :where([data-ylc-preset-control="composer"] #input) { display: block; padding: 3px; min-height: 20px; }
  `
  chatDocument.head.prepend(style)
  list.innerHTML = `
    <div id="items">
      <yt-live-chat-text-message-renderer data-ylc-preset-message class="style-scope yt-live-chat-item-list-renderer">
        <yt-img-shadow id="author-photo" class="style-scope yt-live-chat-text-message-renderer"><img class="style-scope yt-img-shadow" alt=""></yt-img-shadow>
        <div id="content" class="style-scope yt-live-chat-text-message-renderer">
          <yt-live-chat-author-chip class="style-scope yt-live-chat-text-message-renderer">
            <span id="author-name" class="style-scope yt-live-chat-author-chip">Aiko</span>
          </yt-live-chat-author-chip>
          <span id="message" class="style-scope yt-live-chat-text-message-renderer">Hello from the fixture chat</span>
        </div>
      </yt-live-chat-text-message-renderer>
      <yt-live-chat-text-message-renderer data-ylc-preset-message class="style-scope yt-live-chat-item-list-renderer">
        <div id="content" class="style-scope yt-live-chat-text-message-renderer">
          <yt-live-chat-author-chip class="style-scope yt-live-chat-text-message-renderer">
            <span id="author-name" class="style-scope yt-live-chat-author-chip">Mina</span>
          </yt-live-chat-author-chip>
          <span id="message" class="style-scope yt-live-chat-text-message-renderer">Long messages still wrap within the message box, even without an author avatar.</span>
        </div>
      </yt-live-chat-text-message-renderer>
      <yt-live-chat-text-message-renderer is-deleted data-ylc-preset-control="deleted">
        <div id="content"><yt-live-chat-author-chip><span id="author-name">Deleted author</span></yt-live-chat-author-chip><span id="message">Deleted message</span></div>
      </yt-live-chat-text-message-renderer>
      <yt-live-chat-paid-message-renderer data-ylc-preset-control="paid">
        <div id="content"><yt-live-chat-author-chip><span id="author-name">Paid author</span></yt-live-chat-author-chip><span id="message">Paid message</span></div>
      </yt-live-chat-paid-message-renderer>
    </div>
  `
  const input = chatDocument.createElement('div')
  input.id = 'input-panel'
  input.innerHTML = `<yt-live-chat-message-input-renderer data-ylc-preset-control="composer">
    <div id="content"><span id="author-name">You</span><div id="input" contenteditable="true" role="textbox">Say something</div></div>
  </yt-live-chat-message-input-renderer>`
  renderer.append(input)
})

const readChatPresetLayout = (page: Page) => page.evaluate(() => {
  const chatDocument = window.__ylcHelpers.getExtensionIframe()?.contentDocument
  const chatWindow = chatDocument?.defaultView
  if (!chatDocument || !chatWindow) throw new Error('The actual chat iframe Document is missing.')
  const requireElement = (root: Element | Document, selector: string) => {
    const element = root.querySelector(selector)
    if (!element) throw new Error(`The chat layout fixture is missing ${selector}.`)
    return element
  }
  const styles = (element: Element) => {
    const style = chatWindow.getComputedStyle(element)
    const box = element.getBoundingClientRect()
    return {
      display: style.display, flexDirection: style.flexDirection, backgroundColor: style.backgroundColor,
      borderRadius: style.borderRadius, borderInlineStartWidth: style.borderInlineStartWidth,
      borderBottomWidth: style.borderBottomWidth, padding: style.padding, margin: style.margin,
      fontSize: style.fontSize, color: style.color, lineHeight: style.lineHeight,
      width: box.width, height: box.height,
    }
  }
  const rect = (element: Element) => {
    const box = element.getBoundingClientRect()
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height }
  }
  return {
    viewport: { width: chatWindow.innerWidth, height: chatWindow.innerHeight },
    scoped: chatDocument.body.classList.contains('custom-yt-app-live-chat-extension'),
    sources: [...chatDocument.querySelectorAll('style[data-ylc-user-css]')].map(style => style.textContent),
    messages: [...chatDocument.querySelectorAll('[data-ylc-preset-message]')].map(renderer => {
      const content = requireElement(renderer, '#content')
      const author = requireElement(content, 'yt-live-chat-author-chip')
      const message = requireElement(content, '#message')
      return { renderer: styles(renderer), content: styles(content), author: styles(author), message: styles(message),
        contentBox: rect(content), authorBox: rect(author), messageBox: rect(message) }
    }),
    controls: ['paid', 'deleted', 'composer'].map(name => {
      const root = requireElement(chatDocument, `[data-ylc-preset-control="${name}"]`)
      const content = requireElement(root, '#content')
      const author = requireElement(content, '#author-name')
      const text = requireElement(content, name === 'composer' ? '#input' : '#message')
      return { name, root: styles(root), content: styles(content), author: styles(author), text: styles(text),
        position: name === 'composer' ? rect(root) : null }
    }),
  }
})

/** Browser observations for packaged CSS, kept outside scenario assertions. */
export class ChatCssLayoutFixture {
  private previousDocument: JSHandle<Document | null | undefined> | null = null

  constructor(private readonly page: Page) {}

  install() {
    return installChatPresetLayoutFixture(this.page)
  }

  read() {
    return readChatPresetLayout(this.page)
  }

  readSettingsPreview(settings: FrameLocator, presetId: 'messenger' | 'stage' | 'timeline') {
    return settings.frameLocator(`iframe[data-ylc-css-preview="${presetId}"]`).locator('body').evaluate(body => {
      const previewWindow = body.ownerDocument.defaultView
      if (!previewWindow) throw new Error('The selected packaged preview Document is missing.')
      return {
        background: previewWindow.getComputedStyle(body).backgroundColor,
        sources: [...body.ownerDocument.querySelectorAll('style[data-ylc-css-preview-source]')].map(style => style.textContent),
        messages: [...body.querySelectorAll('yt-live-chat-text-message-renderer')].map(renderer => {
          const content = renderer.querySelector('#content')
          const message = renderer.querySelector('#message')
          if (!content || !message) throw new Error('The packaged preview is missing a message body.')
          const rendererStyle = previewWindow.getComputedStyle(renderer)
          const messageStyle = previewWindow.getComputedStyle(message)
          return { rendererFontSize: rendererStyle.fontSize, messageFontSize: messageStyle.fontSize,
            messageColor: messageStyle.color, bubbleColor: previewWindow.getComputedStyle(content).backgroundColor }
        }),
      }
    })
  }

  async captureCurrentDocument() {
    await this.previousDocument?.dispose()
    this.previousDocument = await this.page.evaluateHandle(() => window.__ylcHelpers.getExtensionIframe()?.contentDocument)
  }

  previousDocumentStyleCount() {
    if (!this.previousDocument) throw new Error('The previous chat Document was not captured.')
    return this.previousDocument.evaluate(chatDocument => chatDocument?.querySelectorAll('style[data-ylc-user-css]').length ?? -1)
  }

  mainDocumentStyleCount() {
    return this.page.evaluate(() => document.querySelectorAll('style[data-ylc-user-css]').length)
  }

  returnedNativeStyleCount() {
    return this.page.evaluate(() => {
      const iframe = document.querySelector<HTMLIFrameElement>('ytd-live-chat-frame > #chatframe')
      return iframe?.contentDocument?.querySelectorAll('style[data-ylc-user-css]').length ?? -1
    })
  }

  async dispose() {
    await this.previousDocument?.dispose()
    this.previousDocument = null
  }
}
